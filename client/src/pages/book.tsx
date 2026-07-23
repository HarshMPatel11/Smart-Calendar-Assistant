import * as React from "react";
import { Link, useLocation } from "wouter";
import { 
  useAiChat, 
  useCreateAppointment, 
  useGetAvailability,
  useListAppointments,
  getListAppointmentsQueryKey,
  getListUpcomingAppointmentsQueryKey,
  getGetAppointmentStatsQueryKey,
  AssistantReply
} from "@/api";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Send, 
  Bot, 
  User, 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle2,
  RefreshCw,
  Sparkles,
  RotateCcw
} from "lucide-react";
import { format, parseISO } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

const CHAT_GREETING: Message = {
  role: "assistant",
  content: "Hello! I'm the SmartBook assistant. I can help you schedule an appointment. What would you like to come in for, and when roughly works best for you?",
};

const BOOKING_STEPS = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "purpose", label: "Purpose" },
  { key: "date", label: "Date" },
  { key: "startTime", label: "Time" },
] as const;

export default function BookAppointment() {
  const [mode, setMode] = React.useState<"ai" | "manual">("ai");

  return (
    <div className="space-y-4">
      <div className="mx-auto flex max-w-4xl rounded-lg border bg-muted/30 p-1">
        <Button
          className="flex-1"
          variant={mode === "ai" ? "default" : "ghost"}
          onClick={() => setMode("ai")}
        >
          <Sparkles className="mr-2 h-4 w-4" /> AI Assistant
        </Button>
        <Button
          className="flex-1"
          variant={mode === "manual" ? "default" : "ghost"}
          onClick={() => setMode("manual")}
        >
          <CalendarIcon className="mr-2 h-4 w-4" /> Manual Booking
        </Button>
      </div>
      {mode === "ai" ? <AiBookingAssistant /> : <ManualBookingForm />}
    </div>
  );
}

function AiBookingAssistant() {
  const [messages, setMessages] = React.useState<Message[]>([CHAT_GREETING]);
  const [inputValue, setInputValue] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const chatMutation = useAiChat();
  const createMutation = useCreateAppointment();
  
  // Track the latest assistant reply for action rendering (slots, confirm intent)
  const [latestReply, setLatestReply] = React.useState<AssistantReply | null>(null);
  const missingFields = latestReply?.bookingIntent?.missingFields ?? BOOKING_STEPS.map((step) => step.key);
  const showProgress = latestReply?.action === "book";

  const quickReplies = React.useMemo(() => {
    if (latestReply?.action === "done") return [];
    if (!latestReply) return ["I'd like to book an appointment", "What times are available tomorrow?"];
    if (missingFields.includes("purpose")) return ["General Consultation", "Follow-up", "Dental check-up"];
    if (missingFields.includes("date")) return ["Tomorrow", "Next Monday", "Next Friday"];
    if (missingFields.includes("startTime")) {
      const slots = latestReply.suggestedSlots?.filter((slot) => slot.available).slice(0, 4);
      if (slots?.length) return slots.map((slot) => slot.startTime);
      return ["9:00 AM", "11:00 AM", "2:00 PM", "4:00 PM"];
    }
    return [];
  }, [latestReply, missingFields]);

  // Auto-scroll to bottom
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, latestReply]);

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    
    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInputValue("");
    setLatestReply(null); // Clear previous actions while loading

    chatMutation.mutate({ 
      data: { 
        message: text, 
        conversationHistory: messages.map(m => ({ role: m.role, content: m.content }))
      } 
    }, {
      onSuccess: (reply) => {
        setMessages(prev => [
          ...prev,
          { role: "assistant", content: reply.reply },
          {
            role: "system",
            content: JSON.stringify({
              intent: reply.action === "book" ? "book" : "",
              data: reply.bookingIntent ?? {},
            }),
          },
        ]);
        setLatestReply(reply);
        if (reply.action === "done") {
          queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListUpcomingAppointmentsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAppointmentStatsQueryKey() });
          toast({ title: "Appointment booked", description: "The calendar has been updated in real time." });
        }
      },
      onError: (error) => {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `I couldn't process that message. ${error.message || "Please try again."}`,
        }]);
        toast({ title: "Message failed", description: error.message || "Please try again.", variant: "destructive" });
      }
    });
  };

  const handleConfirmBooking = () => {
    if (!latestReply?.bookingIntent || !latestReply.bookingIntent.isComplete) return;
    
    const intent = latestReply.bookingIntent;
    
    if (!intent.name || !intent.email || !intent.purpose || !intent.date || !intent.startTime || !intent.endTime) return;
    
    createMutation.mutate({
      data: {
        name: intent.name,
        email: intent.email,
        phone: intent.phone || undefined,
        purpose: intent.purpose,
        date: intent.date,
        startTime: intent.startTime,
        endTime: intent.endTime,
        notes: intent.notes || undefined,
        status: "pending"
      }
    }, {
      onSuccess: (newApt) => {
        queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListUpcomingAppointmentsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAppointmentStatsQueryKey() });
        
        // Add final success message
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: `Great! I've booked your appointment for ${format(parseISO(intent.date!), "MMMM d")} at ${intent.startTime}. Your booking is saved.` 
        }]);
        setLatestReply({ reply: "", action: "done" });
        toast({ title: "Appointment booked", description: "Your appointment is now on the calendar." });
      }
    });
  };

  const resetConversation = () => {
    setMessages([CHAT_GREETING]);
    setInputValue("");
    setLatestReply(null);
    chatMutation.reset();
    createMutation.reset();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(inputValue);
    }
  };

  return (
    <div className="flex h-[calc(100vh-10rem)] max-w-4xl mx-auto flex-col rounded-xl border bg-card shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-500">
      <div className="flex items-center gap-3 border-b bg-muted/30 px-4 py-4 sm:px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-lg">AI Booking Assistant</h2>
          <p className="text-xs text-muted-foreground">Fast, intelligent scheduling</p>
        </div>
        <Button variant="ghost" size="sm" onClick={resetConversation} className="shrink-0">
          <RotateCcw className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">New conversation</span>
          <span className="sm:hidden">Reset</span>
        </Button>
      </div>

      {showProgress && (
        <div className="border-b bg-background px-4 py-3 sm:px-6">
          <div className="flex items-center gap-1 overflow-x-auto">
            {BOOKING_STEPS.map((step, index) => {
              const complete = !missingFields.includes(step.key);
              return (
                <React.Fragment key={step.key}>
                  {index > 0 && <div className={`h-px min-w-3 flex-1 ${complete ? "bg-primary" : "bg-border"}`} />}
                  <div className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
                    complete ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    {complete ? "✓ " : ""}{step.label}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}
      
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6"
      >
        {messages.map((msg, i) => (
          msg.role === 'system' ? null : (
            <div key={i} className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`flex gap-3 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <Avatar className="h-8 w-8 shrink-0 mt-1">
                  {msg.role === "assistant" ? (
                    <>
                      <div className="bg-primary flex h-full w-full items-center justify-center text-primary-foreground">
                        <Bot className="h-4 w-4" />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bg-muted flex h-full w-full items-center justify-center text-muted-foreground">
                        <User className="h-4 w-4" />
                      </div>
                    </>
                  )}
                </Avatar>
                <div className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${
                  msg.role === "user" 
                    ? "bg-primary text-primary-foreground rounded-tr-sm" 
                    : "bg-muted/50 text-foreground border border-border/50 rounded-tl-sm"
                }`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
              </div>
            </div>
          )
        ))}
        
        {chatMutation.isPending && (
          <div className="flex w-full justify-start">
            <div className="flex gap-3 max-w-[80%] flex-row">
              <Avatar className="h-8 w-8 shrink-0 mt-1">
                <div className="bg-primary/50 animate-pulse flex h-full w-full items-center justify-center text-primary-foreground">
                  <Bot className="h-4 w-4" />
                </div>
              </Avatar>
              <div className="rounded-2xl px-4 py-3 text-sm shadow-sm bg-muted/50 text-foreground border border-border/50 rounded-tl-sm flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="h-1.5 w-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="h-1.5 w-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        
        {/* Render suggested slots */}
        {latestReply?.suggestedSlots && latestReply.suggestedSlots.length > 0 && (
          <div className="flex w-full justify-start pl-11">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full max-w-lg mt-2">
              {latestReply.suggestedSlots.map((slot, i) => (
                <button
                  key={i}
                  disabled={!slot.available || chatMutation.isPending}
                  onClick={() => handleSend(`I'll take the ${slot.startTime} slot.`)}
                  className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition-all
                    ${slot.available 
                      ? "hover:border-primary hover:bg-primary/5 text-foreground cursor-pointer" 
                      : "opacity-50 cursor-not-allowed bg-muted"}`}
                >
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  {slot.startTime}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Render confirmation intent */}
        {latestReply?.action === "book" && latestReply.bookingIntent?.isComplete && (
          <div className="flex w-full justify-start pl-11">
            <Card className="w-full max-w-md mt-2 shadow-md border-primary/20 bg-primary/5 animate-in slide-in-from-bottom-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Ready to Book
                </CardTitle>
                <CardDescription>Please review the details below.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="col-span-2 font-medium">{latestReply.bookingIntent.name}</span>
                  
                  <span className="text-muted-foreground">Email:</span>
                  <span className="col-span-2 font-medium">{latestReply.bookingIntent.email}</span>
                  
                  <span className="text-muted-foreground">Date:</span>
                  <span className="col-span-2 font-medium">
                    {latestReply.bookingIntent.date ? format(parseISO(latestReply.bookingIntent.date), "EEEE, MMM d, yyyy") : "-"}
                  </span>
                  
                  <span className="text-muted-foreground">Time:</span>
                  <span className="col-span-2 font-medium">
                    {latestReply.bookingIntent.startTime} - {latestReply.bookingIntent.endTime}
                  </span>
                  
                  <span className="text-muted-foreground">Purpose:</span>
                  <span className="col-span-2 font-medium line-clamp-2">{latestReply.bookingIntent.purpose}</span>
                </div>
                
                <Button 
                  className="w-full mt-4 gap-2" 
                  onClick={handleConfirmBooking}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CalendarIcon className="h-4 w-4" />}
                  Confirm Appointment
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Render completion state */}
        {latestReply?.action === "done" && (
          <div className="flex w-full justify-center pt-4">
            <Link href="/appointments">
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                View All Appointments
              </Button>
            </Link>
          </div>
        )}
      </div>

      <div className="p-4 bg-background border-t">
        {quickReplies.length > 0 && (
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {quickReplies.map((reply) => (
              <Button
                key={reply}
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 rounded-full"
                disabled={chatMutation.isPending}
                onClick={() => handleSend(reply)}
              >
                {reply}
              </Button>
            ))}
          </div>
        )}
        <form 
          className="flex gap-2 relative max-w-4xl mx-auto"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(inputValue);
          }}
        >
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="flex-1 rounded-full px-6 py-6 shadow-sm border-muted-foreground/20 focus-visible:ring-primary/20"
            disabled={chatMutation.isPending || latestReply?.action === "done" || createMutation.isPending}
          />
          <Button 
            type="submit" 
            size="icon" 
            className="absolute right-2 top-2 h-9 w-9 rounded-full"
            disabled={!inputValue.trim() || chatMutation.isPending || latestReply?.action === "done" || createMutation.isPending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

const initialManualForm = {
  name: "",
  email: "",
  phone: "",
  purpose: "",
  date: "",
  startTime: "09:00",
  endTime: "10:00",
  notes: "",
};

function ManualBookingForm() {
  const [form, setForm] = React.useState(initialManualForm);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const createMutation = useCreateAppointment();
  const { toast } = useToast();

  const duration = React.useMemo(() => {
    const toMinutes = (time: string) => {
      const [hours, minutes] = time.split(":").map(Number);
      return hours * 60 + minutes;
    };
    return Math.max(15, toMinutes(form.endTime) - toMinutes(form.startTime));
  }, [form.startTime, form.endTime]);

  const availability = useGetAvailability(
    { date: form.date || "1970-01-01", duration },
  );

  const selectedSlot = availability.data?.slots.find(
    (slot) => slot.startTime === form.startTime && slot.endTime === form.endTime,
  );

  const update = (field: keyof typeof form) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    createMutation.mutate(
      {
        data: {
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          purpose: form.purpose,
          date: form.date,
          startTime: form.startTime,
          endTime: form.endTime,
          notes: form.notes || undefined,
          status: "pending",
        },
      },
      {
        onSuccess: (appointment) => {
          queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListUpcomingAppointmentsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAppointmentStatsQueryKey() });
          toast({ title: "Appointment booked", description: "The calendar has been updated." });
          setLocation(`/appointments/${appointment.id}`);
        },
        onError: (error) => {
          toast({ title: "Booking failed", description: error.message, variant: "destructive" });
        },
      },
    );
  };

  return (
    <Card className="mx-auto max-w-4xl">
      <CardHeader>
        <CardTitle>Book an Appointment Manually</CardTitle>
        <CardDescription>Enter the appointment details and choose an available time.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-5 md:grid-cols-2">
          <Field label="Full name">
            <Input value={form.name} onChange={update("name")} required />
          </Field>
          <Field label="Email address">
            <Input type="email" value={form.email} onChange={update("email")} required />
          </Field>
          <Field label="Phone number (optional)">
            <Input type="tel" value={form.phone} onChange={update("phone")} />
          </Field>
          <Field label="Purpose">
            <Input value={form.purpose} onChange={update("purpose")} required />
          </Field>
          <Field label="Date">
            <Input
              type="date"
              min={new Date().toISOString().slice(0, 10)}
              value={form.date}
              onChange={update("date")}
              required
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start time">
              <Input type="time" value={form.startTime} onChange={update("startTime")} required />
            </Field>
            <Field label="End time">
              <Input type="time" value={form.endTime} onChange={update("endTime")} required />
            </Field>
          </div>

          {form.date && (
            <div className="md:col-span-2 rounded-lg border bg-muted/20 p-4">
              <p className="mb-3 text-sm font-medium">Available starting times</p>
              {availability.isLoading ? (
                <p className="text-sm text-muted-foreground">Checking availability…</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {availability.data?.slots.filter((slot) => slot.available).map((slot) => (
                    <Button
                      key={`${slot.startTime}-${slot.endTime}`}
                      type="button"
                      size="sm"
                      variant={slot.startTime === form.startTime && slot.endTime === form.endTime ? "default" : "outline"}
                      onClick={() => setForm((current) => ({
                        ...current,
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                      }))}
                    >
                      {slot.startTime}–{slot.endTime}
                    </Button>
                  ))}
                </div>
              )}
              {selectedSlot?.available === false && (
                <p className="mt-3 text-sm text-destructive">The selected time is unavailable. Choose another slot.</p>
              )}
            </div>
          )}

          <Field label="Notes (optional)" className="md:col-span-2">
            <Textarea value={form.notes} onChange={update("notes")} />
          </Field>

          {createMutation.error && (
            <p className="text-sm text-destructive md:col-span-2">
              {createMutation.error.message || "Unable to create the appointment."}
            </p>
          )}

          <div className="flex justify-end md:col-span-2">
            <Button
              type="submit"
              disabled={
                createMutation.isPending ||
                form.startTime >= form.endTime ||
                selectedSlot?.available === false
              }
            >
              {createMutation.isPending ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CalendarIcon className="mr-2 h-4 w-4" />
              )}
              Book Appointment
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
