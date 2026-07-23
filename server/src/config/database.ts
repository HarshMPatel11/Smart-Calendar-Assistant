import mongoose from "mongoose";
import { logger } from "../lib/logger.js";

export async function connectDatabase(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is required. Add it to the root .env file.");
  }

  await mongoose.connect(mongoUri);
  logger.info("Connected to MongoDB");
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
