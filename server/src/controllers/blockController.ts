import type { Request, Response } from "express";
import { z } from "zod";
import { CalendarBlockModel } from "../models/CalendarBlock.js";
import { emitCalendarChanged } from "../services/realtimeService.js";
import {
  hasScheduleConflict,
  SchedulingConflictError,
  withDateLock,
} from "../services/schedulingService.js";

const blockSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  reason: z.string().trim().min(1).default("Unavailable"),
});

export async function listBlocks(req: Request, res: Response): Promise<void> {
  const query: Record<string, unknown> = {};
  if (req.query.date) query.date = req.query.date;
  if (req.query.startDate || req.query.endDate) {
    query.date = {
      ...(req.query.startDate ? { $gte: req.query.startDate } : {}),
      ...(req.query.endDate ? { $lte: req.query.endDate } : {}),
    };
  }
  res.json(await CalendarBlockModel.find(query).sort({ date: 1, startTime: 1 }));
}

export async function createBlock(req: Request, res: Response): Promise<void> {
  const parsed = blockSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid blocked time" });
    return;
  }
  if (parsed.data.startTime >= parsed.data.endTime) {
    res.status(400).json({ error: "End time must be after start time" });
    return;
  }
  try {
    const block = await withDateLock(parsed.data.date, async () => {
      if (await hasScheduleConflict(parsed.data.date, parsed.data.startTime, parsed.data.endTime)) {
        throw new SchedulingConflictError("Blocked time overlaps with an appointment or another block.");
      }
      return CalendarBlockModel.create(parsed.data);
    });
    emitCalendarChanged();
    res.status(201).json(block);
  } catch (error) {
    if (error instanceof SchedulingConflictError) {
      res.status(409).json({ error: error.message });
      return;
    }
    throw error;
  }
}

export async function deleteBlock(req: Request, res: Response): Promise<void> {
  const id = Number.parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const block = await CalendarBlockModel.findOneAndDelete({ id });
  if (!block) {
    res.status(404).json({ error: "Blocked time not found" });
    return;
  }
  emitCalendarChanged();
  res.status(204).send();
}
