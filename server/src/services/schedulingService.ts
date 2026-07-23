import { randomUUID } from "node:crypto";
import type { Appointment } from "../models/Appointment.js";
import { AppointmentModel } from "../models/Appointment.js";
import { CalendarBlockModel } from "../models/CalendarBlock.js";
import { DateLockModel } from "../models/DateLock.js";

export class SchedulingConflictError extends Error {}

export async function withDateLock<T>(date: string, operation: () => Promise<T>): Promise<T> {
  const lockId = `${date}:${randomUUID()}`;
  const deadline = Date.now() + 5000;

  while (Date.now() < deadline) {
    await DateLockModel.deleteMany({ _id: new RegExp(`^${date}:`), expiresAt: { $lte: new Date() } });
    const active = await DateLockModel.exists({ _id: new RegExp(`^${date}:`) });
    if (!active) {
      try {
        await DateLockModel.create({ _id: lockId, expiresAt: new Date(Date.now() + 10_000) });
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 40));
        continue;
      }

      const competing = await DateLockModel.find({ _id: new RegExp(`^${date}:`) }).sort({ _id: 1 }).lean();
      if (competing[0]?._id === lockId) {
        try {
          return await operation();
        } finally {
          await DateLockModel.deleteOne({ _id: lockId });
        }
      }
      await DateLockModel.deleteOne({ _id: lockId });
    }
    await new Promise((resolve) => setTimeout(resolve, 40));
  }
  throw new Error("The selected date is busy. Please try again.");
}

export async function hasScheduleConflict(
  date: string,
  startTime: string,
  endTime: string,
  excludeAppointmentId?: number,
  excludeBlockId?: number,
): Promise<boolean> {
  const appointmentQuery: Record<string, unknown> = {
    date,
    status: { $ne: "cancelled" },
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  };
  if (excludeAppointmentId !== undefined) appointmentQuery.id = { $ne: excludeAppointmentId };

  const blockQuery: Record<string, unknown> = {
    date,
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  };
  if (excludeBlockId !== undefined) blockQuery.id = { $ne: excludeBlockId };

  const [appointment, block] = await Promise.all([
    AppointmentModel.exists(appointmentQuery),
    CalendarBlockModel.exists(blockQuery),
  ]);
  return Boolean(appointment || block);
}

export async function createScheduledAppointment(
  input: Omit<Appointment, "id" | "createdAt" | "updatedAt">,
) {
  return withDateLock(input.date, async () => {
    if (await hasScheduleConflict(input.date, input.startTime, input.endTime)) {
      throw new SchedulingConflictError("This time slot overlaps with an appointment or blocked time.");
    }
    return AppointmentModel.create(input);
  });
}
