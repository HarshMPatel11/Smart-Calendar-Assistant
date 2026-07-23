import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(currentDirectory, "../../../.env") });

export const env = {
  port: Number(process.env.PORT) || 5000,
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
};
