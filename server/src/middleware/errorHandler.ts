import type { NextFunction, Request, Response } from "express";
import { logger } from "../lib/logger.js";

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  logger.error({ err: error }, "Unhandled request error");

  if (res.headersSent) return;
  res.status(500).json({ error: "Internal server error" });
}
