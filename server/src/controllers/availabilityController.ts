import type { Request, Response } from "express";
import { AppointmentModel } from "../models/Appointment.js";
import { CalendarBlockModel } from "../models/CalendarBlock.js";

const WORK_START_MIN = 9 * 60;
const WORK_END_MIN = 18 * 60;
const SLOT_STEP_MIN = 30;

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function toTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${remainder.toString().padStart(2, "0")}`;
}

export async function getAvailability(req: Request, res: Response): Promise<void> {
  const date = typeof req.query.date === "string" ? req.query.date : undefined;
  if (!date) {
    res.status(400).json({ error: "date query param is required" });
    return;
  }

  const parsedDuration = Number.parseInt(String(req.query.duration ?? "60"), 10);
  const duration = Number.isNaN(parsedDuration)
    ? 60
    : Math.max(15, Math.min(480, parsedDuration));
  const [appointments, blocks] = await Promise.all([
    AppointmentModel.find({ date, status: { $ne: "cancelled" } }).select({ startTime: 1, endTime: 1 }).lean(),
    CalendarBlockModel.find({ date }).select({ startTime: 1, endTime: 1 }).lean(),
  ]);

  const slots = [];
  for (let start = WORK_START_MIN; start + duration <= WORK_END_MIN; start += SLOT_STEP_MIN) {
    const end = start + duration;
    const isBooked = [...appointments, ...blocks].some(
      (appointment) =>
        toMinutes(appointment.startTime) < end &&
        toMinutes(appointment.endTime) > start,
    );
    slots.push({
      startTime: toTimeString(start),
      endTime: toTimeString(end),
      available: !isBooked,
    });
  }

  res.json({ date, slots });
}
