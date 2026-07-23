import { z } from "zod";
import { appointmentStatuses } from "../models/Appointment.js";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD");
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must use HH:MM");

export const createAppointmentSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: z.string().trim().optional(),
  purpose: z.string().trim().min(1),
  date,
  startTime: time,
  endTime: time,
  notes: z.string().trim().optional(),
  status: z.enum(appointmentStatuses).optional(),
});

export const updateAppointmentSchema = createAppointmentSchema.partial();

export const updateAppointmentStatusSchema = z.object({
  status: z.enum(appointmentStatuses),
});

export const aiChatSchema = z.object({
  message: z.string().min(1),
  conversationHistory: z
    .array(z.object({ role: z.string(), content: z.string() }))
    .optional(),
});
