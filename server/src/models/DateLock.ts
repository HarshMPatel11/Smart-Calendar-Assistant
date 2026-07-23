import { model, Schema } from "mongoose";

const dateLockSchema = new Schema({
  _id: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

export const DateLockModel = model("DateLock", dateLockSchema);
