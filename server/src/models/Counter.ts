import { model, Schema } from "mongoose";

interface CounterDocument {
  _id: string;
  sequence: number;
}

const counterSchema = new Schema<CounterDocument>({
  _id: { type: String, required: true },
  sequence: { type: Number, required: true, default: 0 },
});

export const Counter = model<CounterDocument>("Counter", counterSchema);

export async function nextSequence(name: string): Promise<number> {
  const counter = await Counter.findByIdAndUpdate(
    name,
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean();

  return counter.sequence;
}
