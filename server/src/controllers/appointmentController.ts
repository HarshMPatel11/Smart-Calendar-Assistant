import type { Request, Response } from "express";
import { AppointmentModel } from "../models/Appointment.js";
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  updateAppointmentStatusSchema,
} from "../validation/appointment.js";
import { emitCalendarChanged } from "../services/realtimeService.js";
import {
  createScheduledAppointment,
  hasScheduleConflict,
  SchedulingConflictError,
  withDateLock,
} from "../services/schedulingService.js";

function getStartOfWeek(now: Date): string {
  const date = new Date(now);
  const day = date.getDay();
  date.setDate(date.getDate() - day + (day === 0 ? -6 : 1));
  return date.toISOString().slice(0, 10);
}

function getEndOfWeek(now: Date): string {
  const date = new Date(now);
  const day = date.getDay();
  date.setDate(date.getDate() - day + (day === 0 ? 0 : 7));
  return date.toISOString().slice(0, 10);
}

function getEndOfMonth(now: Date): string {
  return new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);
}

function parseId(req: Request): number | null {
  const id = Number.parseInt(String(req.params.id), 10);
  return Number.isNaN(id) ? null : id;
}

export async function listAppointments(req: Request, res: Response): Promise<void> {
  const { date, startDate, endDate, status } = req.query as Record<
    string,
    string | undefined
  >;
  const query: Record<string, unknown> = {};

  if (date) query.date = date;
  if (startDate || endDate) {
    query.date = {
      ...(startDate ? { $gte: startDate } : {}),
      ...(endDate ? { $lte: endDate } : {}),
    };
  }
  if (status) query.status = status;

  const appointments = await AppointmentModel.find(query)
    .sort({ date: 1, startTime: 1 })
    .lean({ virtuals: true });
  res.json(appointments.map(toApiAppointment));
}

export async function getAppointmentStats(_req: Request, res: Response): Promise<void> {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const startOfWeek = getStartOfWeek(now);
  const endOfWeek = getEndOfWeek(now);
  const startOfMonth = `${today.slice(0, 7)}-01`;
  const endOfMonth = getEndOfMonth(now);

  const [
    totalToday,
    totalThisWeek,
    totalThisMonth,
    totalPending,
    totalConfirmed,
    totalCancelled,
    totalUpcoming,
  ] = await Promise.all([
    AppointmentModel.countDocuments({ date: today }),
    AppointmentModel.countDocuments({ date: { $gte: startOfWeek, $lte: endOfWeek } }),
    AppointmentModel.countDocuments({ date: { $gte: startOfMonth, $lte: endOfMonth } }),
    AppointmentModel.countDocuments({ status: "pending" }),
    AppointmentModel.countDocuments({ status: "confirmed" }),
    AppointmentModel.countDocuments({ status: "cancelled" }),
    AppointmentModel.countDocuments({ date: { $gte: today }, status: { $ne: "cancelled" } }),
  ]);

  res.json({
    totalToday,
    totalThisWeek,
    totalThisMonth,
    totalPending,
    totalConfirmed,
    totalCancelled,
    totalUpcoming,
  });
}

export async function listUpcomingAppointments(req: Request, res: Response): Promise<void> {
  const requestedLimit = Number.parseInt(String(req.query.limit ?? "10"), 10);
  const limit = Number.isNaN(requestedLimit) ? 10 : Math.min(Math.max(requestedLimit, 1), 50);
  const today = new Date().toISOString().slice(0, 10);
  const appointments = await AppointmentModel.find({
    date: { $gte: today },
    status: { $ne: "cancelled" },
  })
    .sort({ date: 1, startTime: 1 })
    .limit(limit)
    .lean();

  res.json(appointments.map(toApiAppointment));
}

export async function getAppointment(req: Request, res: Response): Promise<void> {
  const id = parseId(req);
  if (id === null) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const appointment = await AppointmentModel.findOne({ id }).lean();
  if (!appointment) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }
  res.json(toApiAppointment(appointment));
}

export async function createAppointment(req: Request, res: Response): Promise<void> {
  const parsed = createAppointmentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid appointment" });
    return;
  }
  if (parsed.data.startTime >= parsed.data.endTime) {
    res.status(400).json({ error: "End time must be after start time" });
    return;
  }
  try {
    const appointment = await createScheduledAppointment({
      ...parsed.data,
      phone: parsed.data.phone ?? null,
      notes: parsed.data.notes ?? null,
      status: parsed.data.status ?? "pending",
    });
    emitCalendarChanged();
    res.status(201).json(appointment);
  } catch (error) {
    if (error instanceof SchedulingConflictError) {
      res.status(409).json({ error: error.message });
      return;
    }
    throw error;
  }
}

export async function updateAppointment(req: Request, res: Response): Promise<void> {
  const id = parseId(req);
  if (id === null) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const appointment = await AppointmentModel.findOne({ id });
  if (!appointment) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }
  const parsed = updateAppointmentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid appointment" });
    return;
  }

  const date = parsed.data.date ?? appointment.date;
  const startTime = parsed.data.startTime ?? appointment.startTime;
  const endTime = parsed.data.endTime ?? appointment.endTime;
  if (startTime >= endTime) {
    res.status(400).json({ error: "End time must be after start time" });
    return;
  }
  await withDateLock(date, async () => {
    if (
      (parsed.data.date || parsed.data.startTime || parsed.data.endTime) &&
      (await hasScheduleConflict(date, startTime, endTime, id))
    ) {
      throw new SchedulingConflictError("This time slot overlaps with an appointment or blocked time.");
    }
    appointment.set(parsed.data);
    await appointment.save();
  }).catch((error) => {
    if (error instanceof SchedulingConflictError) {
      res.status(409).json({ error: error.message });
      return;
    }
    throw error;
  });
  if (res.headersSent) return;
  emitCalendarChanged();
  res.json(appointment);
}

export async function deleteAppointment(req: Request, res: Response): Promise<void> {
  const id = parseId(req);
  if (id === null) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const appointment = await AppointmentModel.findOneAndDelete({ id });
  if (!appointment) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }
  emitCalendarChanged();
  res.status(204).send();
}

export async function updateAppointmentStatus(req: Request, res: Response): Promise<void> {
  const id = parseId(req);
  if (id === null) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = updateAppointmentStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid status" });
    return;
  }
  const appointment = await AppointmentModel.findOneAndUpdate(
    { id },
    { status: parsed.data.status },
    { new: true, runValidators: true },
  );
  if (!appointment) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }
  emitCalendarChanged();
  res.json(appointment);
}

function toApiAppointment(appointment: object): Record<string, unknown> {
  const { _id, __v, ...apiAppointment } = appointment as Record<string, unknown>;
  return apiAppointment;
}
