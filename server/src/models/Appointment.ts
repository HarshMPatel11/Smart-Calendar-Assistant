import { model, Schema, type HydratedDocument } from "mongoose";
import { nextSequence } from "./Counter.js";

export const appointmentStatuses = ["pending", "confirmed", "cancelled"] as const;
export type AppointmentStatus = (typeof appointmentStatuses)[number];

export interface Appointment {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  purpose: string;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const appointmentSchema = new Schema<Appointment>(
  {
    id: { type: Number, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, default: null },
    purpose: { type: String, required: true, trim: true },
    date: { type: String, required: true, index: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    startTime: { type: String, required: true, match: /^\d{2}:\d{2}$/ },
    endTime: { type: String, required: true, match: /^\d{2}:\d{2}$/ },
    status: { type: String, enum: appointmentStatuses, default: "pending", index: true },
    notes: { type: String, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_document, result) {
        const output = result as Record<string, unknown>;
        delete output._id;
        delete output.__v;
        return output;
      },
    },
  },
);

appointmentSchema.index({ date: 1, startTime: 1 });

appointmentSchema.pre("save", async function (this: HydratedDocument<Appointment>) {
  if (this.isNew && this.id == null) {
    this.id = await nextSequence("appointment");
  }
});

export const AppointmentModel = model<Appointment>("Appointment", appointmentSchema);
