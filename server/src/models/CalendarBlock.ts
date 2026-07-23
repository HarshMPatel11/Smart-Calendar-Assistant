import { model, Schema } from "mongoose";
import { nextSequence } from "./Counter.js";

export interface CalendarBlock {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
  createdAt: Date;
  updatedAt: Date;
}

const calendarBlockSchema = new Schema<CalendarBlock>(
  {
    id: { type: Number, unique: true, index: true },
    date: { type: String, required: true, index: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    startTime: { type: String, required: true, match: /^\d{2}:\d{2}$/ },
    endTime: { type: String, required: true, match: /^\d{2}:\d{2}$/ },
    reason: { type: String, required: true, trim: true, default: "Unavailable" },
  },
  { timestamps: true },
);

calendarBlockSchema.pre("save", async function () {
  if (this.isNew && this.id == null) this.id = await nextSequence("calendarBlock");
});

calendarBlockSchema.set("toJSON", {
  transform(_document, result) {
    const output = result as unknown as Record<string, unknown>;
    delete output._id;
    delete output.__v;
    return output;
  },
});

export const CalendarBlockModel = model<CalendarBlock>("CalendarBlock", calendarBlockSchema);
