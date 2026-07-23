import type { Request, Response } from "express";
import { AppointmentModel } from "../models/Appointment.js";
import { CalendarBlockModel } from "../models/CalendarBlock.js";
import { aiChatSchema } from "../validation/appointment.js";
import { createScheduledAppointment } from "../services/schedulingService.js";
import { emitCalendarChanged } from "../services/realtimeService.js";

// ----------- NLP helpers -----------

interface BookingData {
  name?: string;
  email?: string;
  phone?: string;
  purpose?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
}

type Intent = "book" | "check_availability" | "cancel_flow" | "list" | "greet" | "confirm" | "unknown";

function detectIntent(msg: string): Intent {
  const m = msg.toLowerCase();
  if (/\b(cancel|stop|never\s*mind|start over|reset)\b/.test(m)) return "cancel_flow";
  if (/\b(yes|yeah|yep|sure|confirm|looks good|correct|proceed|go ahead|book it|confirm it)\b/.test(m)) return "confirm";
  if (/\b(book|schedule|make|create|set up|arrange|reserve|need)\b/.test(m) && /\b(appointment|meeting|slot|session|consult|visit)\b/.test(m)) return "book";
  if (/\b(available|availability|free|open|slots?|times?)\b/.test(m)) return "check_availability";
  if (/\b(list|show|view|see)\b/.test(m) && /\b(appointment|booking|schedule)\b/.test(m)) return "list";
  if (/\b(hi|hello|hey|good morning|good afternoon|howdy|greetings)\b/.test(m)) return "greet";
  return "unknown";
}

function parseDate(text: string): string | undefined {
  const now = new Date();
  const m = text.toLowerCase();

  if (/\btoday\b/.test(m)) return now.toISOString().slice(0, 10);

  if (/\btomorrow\b/.test(m)) {
    const t = new Date(now);
    t.setDate(t.getDate() + 1);
    return t.toISOString().slice(0, 10);
  }

  // "this/next Monday/Tuesday/..."
  const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  for (let i = 0; i < weekdays.length; i++) {
    const re = new RegExp(`\\b(?:this\\s+|next\\s+)?${weekdays[i]}\\b`);
    if (re.test(m)) {
      const d = new Date(now);
      let diff = (i - d.getDay() + 7) % 7;
      if (diff === 0) diff = 7; // always future
      d.setDate(d.getDate() + diff);
      return d.toISOString().slice(0, 10);
    }
  }

  // "July 25", "July 25th", "25th July", "Aug 5"
  const months: Record<string, number> = {
    jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
    apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
    aug: 7, august: 7, sep: 8, september: 8, oct: 9, october: 9,
    nov: 10, november: 10, dec: 11, december: 11,
  };
  const monthNames = Object.keys(months).join("|");
  const monthDayRe = new RegExp(`(${monthNames})\\s+(\\d{1,2})(?:st|nd|rd|th)?|(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthNames})`, "i");
  const mdMatch = m.match(monthDayRe);
  if (mdMatch) {
    const monthStr = (mdMatch[1] || mdMatch[4]).toLowerCase();
    const day = parseInt(mdMatch[2] || mdMatch[3], 10);
    const monthIdx = months[monthStr];
    if (monthIdx !== undefined && day >= 1 && day <= 31) {
      const yr = now.getFullYear();
      const candidate = new Date(yr, monthIdx, day);
      if (candidate < now) candidate.setFullYear(yr + 1);
      return candidate.toISOString().slice(0, 10);
    }
  }

  // ISO YYYY-MM-DD
  const isoMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) return isoMatch[1];

  // M/D or M/D/YYYY
  const slashMatch = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/);
  if (slashMatch) {
    const mo = parseInt(slashMatch[1], 10) - 1;
    const day = parseInt(slashMatch[2], 10);
    const yr = slashMatch[3] ? parseInt(slashMatch[3], 10) : now.getFullYear();
    const d = new Date(yr, mo, day);
    if (d < now) d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  }

  return undefined;
}

function parseTime(text: string): string | undefined {
  // "3:30 PM", "3pm", "15:00", "3 pm", "3.30pm"
  const match = text.match(/\b(\d{1,2})(?:[.:](\d{2}))?\s*(am|pm)\b/i)
    || text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (!match) return undefined;

  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const period = match[3]?.toLowerCase();

  if (period === "pm" && hours !== 12) hours += 12;
  else if (period === "am" && hours === 12) hours = 0;
  else if (!period && hours < 9) hours += 12; // assume PM for 1-8 without period (business hours)

  if (hours > 23 || minutes > 59) return undefined;

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

function parseEmail(text: string): string | undefined {
  const m = text.match(/\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/);
  return m?.[0];
}

function parsePhone(text: string): string | undefined {
  const match = text.match(/(?:phone|mobile|contact|number)(?:\s+(?:is|:))?\s*(\+?[\d][\d\s()-]{6,18}\d)/i);
  return match?.[1]?.replace(/[^\d+]/g, "");
}

function parseName(text: string): string | undefined {
  const patterns = [
    /(?:my name is|i(?:'m| am)|name[: ]+|i go by)\s+([A-Z][a-zA-Z]+(?: [A-Z][a-zA-Z]+)?)/i,
    /(?:call me|book(?:ing)? for)\s+([A-Z][a-zA-Z]+(?: [A-Z][a-zA-Z]+)?)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) return m[1].trim();
  }
  return undefined;
}

function parsePurpose(text: string): string | undefined {
  const specific = text.match(/\b(general consultation|check-?up|follow-?up|new patient|dental|medical|legal|financial|therapy|counseling|assessment|review|annual physical|vaccination|eye exam)\b/i);
  if (specific) return specific[0];

  const patterns = [
    /(?:appointment\s+(?:is\s+)?for|booking\s+for|reason(?:\s+is)?[: ]+|purpose[: ]+|regarding|it(?:'s| is) for)\s+([^.!\n]{4,60})/i,
    /(?:i need|i want|i'd like)\s+(?:a |an )?(.{4,60}?)\s+(?:appointment|consultation|session|meeting)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1] && m[1].trim().length > 3) {
      const candidate = m[1].trim();
      if (!/^(?:to\s+)?(?:book|schedule|make|create|set up|arrange|reserve)(?:\s+(?:a|an))?$/i.test(candidate)) {
        return candidate;
      }
    }
  }
  return undefined;
}

function extractEntities(msg: string): BookingData {
  return {
    name: parseName(msg),
    email: parseEmail(msg),
    phone: parsePhone(msg),
    date: parseDate(msg),
    startTime: parseTime(msg),
    purpose: parsePurpose(msg),
  };
}

function extractContextualAnswer(text: string, previousQuestion?: string): BookingData {
  if (!previousQuestion) return {};

  const question = previousQuestion.toLowerCase();
  const answer = text.trim();

  if (
    question.includes("full name") &&
    /^[a-z][a-z .'-]{1,79}$/i.test(answer) &&
    !/\b(that|this|name|yes|no)\b/i.test(answer)
  ) {
    return { name: answer.replace(/\s+/g, " ") };
  }

  if (question.includes("email")) {
    return { email: parseEmail(answer) };
  }

  if (question.includes("appointment for") || question.includes("purpose")) {
    if (answer.length >= 3 && answer.length <= 100) return { purpose: answer };
  }

  if (question.includes("what date") || question.includes("which date")) {
    return { date: parseDate(answer) };
  }

  if (question.includes("what time") || question.includes("which time")) {
    return { startTime: parseTime(answer) };
  }

  return {};
}

function mergeData(base: BookingData, incoming: BookingData): BookingData {
  const merged = { ...base };
  if (incoming.name) merged.name = incoming.name;
  if (incoming.email) merged.email = incoming.email;
  if (incoming.date) merged.date = incoming.date;
  if (incoming.startTime) merged.startTime = incoming.startTime;
  if (incoming.purpose) merged.purpose = incoming.purpose;
  if (incoming.phone) merged.phone = incoming.phone;
  return merged;
}

function addEndTime(data: BookingData, durationMin = 60): void {
  if (data.startTime && !data.endTime) {
    const [h, m] = data.startTime.split(":").map(Number);
    const total = h * 60 + m + durationMin;
    data.endTime = `${Math.floor(total / 60).toString().padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`;
  }
}

const REQUIRED_FIELDS = ["name", "email", "purpose", "date", "startTime"] as const;

function getMissing(data: BookingData): string[] {
  return REQUIRED_FIELDS.filter((f) => !data[f]);
}

const FIELD_QUESTIONS: Record<string, string> = {
  name: "What's your full name?",
  email: "What's your email address?",
  purpose: "What's the appointment for? (e.g., General Consultation, Follow-up, Dental Check-up)",
  date: "What date works for you? (e.g., tomorrow, next Wednesday, August 5)",
  startTime: "What time would you prefer? (e.g., 10:00 AM, 2:30 PM)",
};

// ----------- Availability helpers -----------

function toMin(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function toHHMM(minutes: number): string {
  return `${Math.floor(minutes / 60).toString().padStart(2, "0")}:${(minutes % 60).toString().padStart(2, "0")}`;
}

function formatDate(d: string): string {
  const dt = new Date(d + "T12:00:00");
  return dt.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

async function fetchSlots(date: string): Promise<{ startTime: string; endTime: string; available: boolean }[]> {
  const WORK_START = 9 * 60;
  const WORK_END = 18 * 60;
  const DUR = 60;

  const [appointments, blocks] = await Promise.all([
    AppointmentModel.find({ date, status: { $ne: "cancelled" } }).lean(),
    CalendarBlockModel.find({ date }).lean(),
  ]);
  const existing = [...appointments, ...blocks];

  const slots = [];
  for (let s = WORK_START; s + DUR <= WORK_END; s += 60) {
    const e = s + DUR;
    const startTime = toHHMM(s);
    const endTime = toHHMM(e);
    const isBooked = existing.some(
      (a) => toMin(a.startTime) < e && toMin(a.endTime) > s
    );
    slots.push({ startTime, endTime, available: !isBooked });
  }
  return slots;
}

async function isSlotFree(date: string, start: string, end: string): Promise<boolean> {
  const slots = await fetchSlots(date);
  return slots.some((s) => s.startTime === start && s.endTime === end && s.available)
    || !slots.some((s) => s.available === false && start < s.endTime && end > s.startTime);
}

// ----------- Route -----------

export async function chat(req: Request, res: Response) {
  const parsed = aiChatSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }

  const { message, conversationHistory = [] } = parsed.data;

  // Rebuild accumulated booking data by scanning conversation history
  let data: BookingData = {};
  let activeIntent = "";
  let previousAssistantMessage: string | undefined;
  const historyMessages = conversationHistory.filter(
    (historyMessage, index) =>
      !(
        index === conversationHistory.length - 1 &&
        historyMessage.role === "user" &&
        historyMessage.content.trim() === message.trim()
      ),
  );

  for (const msg of historyMessages) {
    if (msg.role === "system") {
      try {
        const sys = JSON.parse(msg.content);
        if (sys.data) data = { ...data, ...sys.data };
        if (sys.intent) activeIntent = sys.intent;
      } catch { /* ignore */ }
    }
    // Also extract entities from past user messages for robustness
    if (msg.role === "user") {
      data = mergeData(data, extractEntities(msg.content));
      data = mergeData(data, extractContextualAnswer(msg.content, previousAssistantMessage));
      if (detectIntent(msg.content) === "book") activeIntent = "book";
    }
    if (msg.role === "assistant") previousAssistantMessage = msg.content;
  }

  // Extract entities from current message and merge
  const current = extractEntities(message);
  const previousStartTime = data.startTime;
  data = mergeData(data, current);
  if (current.startTime && previousStartTime && current.startTime !== previousStartTime) {
    data.endTime = undefined;
  }
  data = mergeData(data, extractContextualAnswer(message, previousAssistantMessage));

  const intent = detectIntent(message);

  if (intent === "cancel_flow") {
    return res.json({
      reply: "No problem — I cleared this booking request. You can start again whenever you're ready.",
      action: "cancelled",
      bookingIntent: {
        name: null, email: null, phone: null, purpose: null, date: null,
        startTime: null, endTime: null, notes: null, isComplete: false,
        missingFields: ["name", "email", "purpose", "date", "startTime"],
      },
      suggestedSlots: [],
    });
  }

  // ---- Greeting ----
  if (intent === "greet" && !activeIntent) {
    return res.json({
      reply: "Hello! I'm your AI scheduling assistant. I can help you book an appointment, check available time slots, or answer questions about your schedule. What can I do for you today?",
      action: "none",
      bookingIntent: { name: null, email: null, phone: null, purpose: null, date: null, startTime: null, endTime: null, notes: null, isComplete: false, missingFields: ["name", "email", "purpose", "date", "startTime"] },
      suggestedSlots: [],
    });
  }

  // ---- Availability check ----
  if (intent === "check_availability" && activeIntent !== "book") {
    const checkDate = current.date;
    if (!checkDate) {
      return res.json({
        reply: "Sure! Which date would you like to check availability for?",
        action: "check_availability",
        bookingIntent: { name: null, email: null, phone: null, purpose: null, date: null, startTime: null, endTime: null, notes: null, isComplete: false, missingFields: getMissing(data) },
        suggestedSlots: [],
      });
    }
    const slots = await fetchSlots(checkDate);
    const available = slots.filter((s) => s.available);
    if (available.length === 0) {
      return res.json({
        reply: `${formatDate(checkDate)} is fully booked. Would you like to check a different date?`,
        action: "check_availability",
        bookingIntent: { name: null, email: null, phone: null, purpose: null, date: checkDate, startTime: null, endTime: null, notes: null, isComplete: false, missingFields: getMissing(data) },
        suggestedSlots: slots,
      });
    }
    return res.json({
      reply: `Here are the available time slots for ${formatDate(checkDate)}. Would you like to book one?`,
      action: "check_availability",
      bookingIntent: { name: null, email: null, phone: null, purpose: null, date: checkDate, startTime: null, endTime: null, notes: null, isComplete: false, missingFields: getMissing(data) },
      suggestedSlots: slots,
    });
  }

  // ---- Booking flow ----
  const isInBookingFlow = intent === "book" || activeIntent === "book";

  if (isInBookingFlow) {
    const today = new Date().toISOString().slice(0, 10);
    if (data.date && data.date < today) {
      data.date = undefined;
      data.startTime = undefined;
      data.endTime = undefined;
      return res.json({
        reply: "That date is in the past. Please choose today or a future date.",
        action: "book",
        bookingIntent: {
          name: data.name ?? null, email: data.email ?? null, phone: data.phone ?? null,
          purpose: data.purpose ?? null, date: null, startTime: null, endTime: null,
          notes: data.notes ?? null, isComplete: false, missingFields: getMissing(data),
        },
        suggestedSlots: [],
      });
    }

    if (data.startTime && (data.startTime < "09:00" || data.startTime > "17:00")) {
      data.startTime = undefined;
      data.endTime = undefined;
      const slots = data.date ? await fetchSlots(data.date) : [];
      return res.json({
        reply: "Appointments are available from 9:00 AM to 6:00 PM. Please choose one of the available starting times.",
        action: "book",
        bookingIntent: {
          name: data.name ?? null, email: data.email ?? null, phone: data.phone ?? null,
          purpose: data.purpose ?? null, date: data.date ?? null, startTime: null, endTime: null,
          notes: data.notes ?? null, isComplete: false, missingFields: getMissing(data),
        },
        suggestedSlots: slots.filter((slot) => slot.available),
      });
    }
    // If user confirmed a complete booking
    if (intent === "confirm" && getMissing(data).length === 0) {
      addEndTime(data);
      const free = await isSlotFree(data.date!, data.startTime!, data.endTime!);
      if (free) {
        // Create the appointment
        const appointment = await createScheduledAppointment({
          name: data.name!,
          email: data.email!,
          phone: data.phone ?? null,
          purpose: data.purpose!,
          date: data.date!,
          startTime: data.startTime!,
          endTime: data.endTime!,
          notes: data.notes ?? null,
          status: "pending",
        });
        emitCalendarChanged();
        return res.json({
          reply: `Your appointment has been booked! Here's your confirmation:\n\n**Name:** ${data.name}\n**Email:** ${data.email}\n**Purpose:** ${data.purpose}\n**Date:** ${formatDate(data.date!)}\n**Time:** ${formatTime(data.startTime!)} – ${formatTime(data.endTime!)}\n\nYour booking is saved. Is there anything else I can help you with?`,
          action: "done",
          bookingIntent: {
            name: data.name ?? null, email: data.email ?? null, phone: data.phone ?? null,
            purpose: data.purpose ?? null, date: data.date ?? null,
            startTime: data.startTime ?? null, endTime: data.endTime ?? null,
            notes: data.notes ?? null, isComplete: true, missingFields: [],
          },
          suggestedSlots: [],
        });
      } else {
        // Slot taken - suggest alternatives
        data.startTime = undefined;
        data.endTime = undefined;
        const slots = await fetchSlots(data.date!);
        return res.json({
          reply: `Sorry, that time slot was just taken. Here are still-available slots for ${formatDate(data.date!)} — which works for you?`,
          action: "book",
          bookingIntent: {
            name: data.name ?? null, email: data.email ?? null, phone: data.phone ?? null,
            purpose: data.purpose ?? null, date: data.date ?? null,
            startTime: null, endTime: null,
            notes: data.notes ?? null, isComplete: false, missingFields: ["startTime"],
          },
          suggestedSlots: slots.filter((s) => s.available),
        });
      }
    }

    const missing = getMissing(data);
    addEndTime(data);

    // All collected — ask for confirmation
    if (missing.length === 0) {
      const free = await isSlotFree(data.date!, data.startTime!, data.endTime!);
      if (!free) {
        data.startTime = undefined;
        data.endTime = undefined;
        const slots = await fetchSlots(data.date!);
        return res.json({
          reply: `That time slot isn't available. Here are open slots for ${formatDate(data.date!)} — which works for you?`,
          action: "book",
          bookingIntent: {
            name: data.name ?? null, email: data.email ?? null, phone: data.phone ?? null,
            purpose: data.purpose ?? null, date: data.date ?? null,
            startTime: null, endTime: null,
            notes: data.notes ?? null, isComplete: false, missingFields: ["startTime"],
          },
          suggestedSlots: slots.filter((s) => s.available),
        });
      }

      return res.json({
        reply: `Here's a summary of your appointment:\n\n**Name:** ${data.name}\n**Email:** ${data.email}\n**Purpose:** ${data.purpose}\n**Date:** ${formatDate(data.date!)}\n**Time:** ${formatTime(data.startTime!)} – ${formatTime(data.endTime!)}\n\nShall I confirm this booking?`,
        action: "book",
        bookingIntent: {
          name: data.name ?? null, email: data.email ?? null, phone: data.phone ?? null,
          purpose: data.purpose ?? null, date: data.date ?? null,
          startTime: data.startTime ?? null, endTime: data.endTime ?? null,
          notes: data.notes ?? null, isComplete: true, missingFields: [],
        },
        suggestedSlots: [],
      });
    }

    // Ask for the next missing field
    const nextField = missing[0];
    let reply: string;
    if (activeIntent !== "book" && intent === "book") {
      reply = `I'll help you book an appointment. ${FIELD_QUESTIONS[nextField]}`;
    } else {
      reply = FIELD_QUESTIONS[nextField] ?? `Could you provide your ${nextField}?`;
    }

    return res.json({
      reply,
      action: "book",
      bookingIntent: {
        name: data.name ?? null, email: data.email ?? null, phone: data.phone ?? null,
        purpose: data.purpose ?? null, date: data.date ?? null,
        startTime: data.startTime ?? null, endTime: data.endTime ?? null,
        notes: data.notes ?? null, isComplete: false, missingFields: missing,
      },
      suggestedSlots: [],
    });
  }

  // ---- Unknown / fallback ----
  return res.json({
    reply: "I can help you book an appointment or check availability. Try saying something like:\n\n- \"I'd like to book an appointment\"\n- \"What slots are available next Monday?\"\n- \"Schedule a consultation for tomorrow at 2 PM\"",
    action: "none",
    bookingIntent: {
      name: null, email: null, phone: null, purpose: null, date: null,
      startTime: null, endTime: null, notes: null, isComplete: false,
      missingFields: ["name", "email", "purpose", "date", "startTime"],
    },
    suggestedSlots: [],
  });
}
