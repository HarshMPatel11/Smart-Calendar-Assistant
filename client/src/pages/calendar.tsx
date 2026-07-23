import * as React from "react";
import { Link } from "wouter";
import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { CalendarDays, Clock, Lock, Plus, Trash2 } from "lucide-react";
import {
  useCalendarBlocks,
  useCreateBlock,
  useDeleteBlock,
  useListAppointments,
} from "@/api";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type View = "day" | "week" | "month";
const HOURS = Array.from({ length: 9 }, (_, index) => `${String(index + 9).padStart(2, "0")}:00`);

export default function CalendarPage() {
  const [date, setDate] = React.useState<Date>(new Date());
  const [view, setView] = React.useState<View>("month");
  const [showBlockForm, setShowBlockForm] = React.useState(false);
  const [block, setBlock] = React.useState({ startTime: "09:00", endTime: "10:00", reason: "Unavailable" });

  const range = React.useMemo(() => {
    if (view === "day") return { start: date, end: date };
    if (view === "week") return { start: startOfWeek(date, { weekStartsOn: 1 }), end: endOfWeek(date, { weekStartsOn: 1 }) };
    return { start: startOfMonth(date), end: endOfMonth(date) };
  }, [date, view]);
  const params = { startDate: format(range.start, "yyyy-MM-dd"), endDate: format(range.end, "yyyy-MM-dd") };
  const { data: appointments = [], isLoading } = useListAppointments(params);
  const { data: blocks = [] } = useCalendarBlocks(params);
  const createBlock = useCreateBlock();
  const deleteBlock = useDeleteBlock();

  const selectedDate = format(date, "yyyy-MM-dd");
  const selectedAppointments = appointments.filter((item) => item.date === selectedDate);
  const selectedBlocks = blocks.filter((item) => item.date === selectedDate);
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(range.start, index));

  const move = (amount: number) => setDate((current) => addDays(current, view === "day" ? amount : view === "week" ? amount * 7 : amount * 30));
  const submitBlock = (event: React.FormEvent) => {
    event.preventDefault();
    createBlock.mutate({ date: selectedDate, ...block }, { onSuccess: () => setShowBlockForm(false) });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground mt-1">Live appointments, availability, and blocked time.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => move(-1)}>Previous</Button>
          <Button variant="outline" onClick={() => setDate(new Date())}>Today</Button>
          <Button variant="outline" onClick={() => move(1)}>Next</Button>
          <Tabs value={view} onValueChange={(value) => setView(value as View)}>
            <TabsList>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => setShowBlockForm((value) => !value)}><Lock className="h-4 w-4 mr-2" />Block time</Button>
        </div>
      </div>

      {showBlockForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">Block time on {format(date, "MMMM d, yyyy")}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submitBlock} className="grid gap-3 md:grid-cols-4">
              <Input type="time" value={block.startTime} onChange={(event) => setBlock({ ...block, startTime: event.target.value })} required />
              <Input type="time" value={block.endTime} onChange={(event) => setBlock({ ...block, endTime: event.target.value })} required />
              <Input value={block.reason} onChange={(event) => setBlock({ ...block, reason: event.target.value })} placeholder="Reason" required />
              <Button disabled={createBlock.isPending}><Plus className="h-4 w-4 mr-2" />Add block</Button>
              {createBlock.error && <p className="text-sm text-destructive md:col-span-4">{createBlock.error.message}</p>}
            </form>
          </CardContent>
        </Card>
      )}

      {view === "month" && (
        <div className="grid gap-6 xl:grid-cols-[auto_1fr]">
          <Card><CardContent className="p-4">
            <CalendarUI
              mode="single"
              selected={date}
              onSelect={(value) => value && setDate(value)}
              modifiers={{
                booked: appointments.map((item) => parseISO(item.date)),
                blocked: blocks.map((item) => parseISO(item.date)),
              }}
              modifiersStyles={{
                booked: { fontWeight: "bold", textDecoration: "underline" },
                blocked: { color: "#ef4444", backgroundColor: "rgba(239,68,68,.1)" },
              }}
            />
          </CardContent></Card>
          <DayAgenda
            date={date}
            appointments={selectedAppointments}
            blocks={selectedBlocks}
            onDeleteBlock={(id) => {
              if (window.confirm("Remove this blocked time? This action cannot be undone.")) {
                deleteBlock.mutate(id);
              }
            }}
            loading={isLoading}
          />
        </div>
      )}

      {view === "week" && (
        <Card className="overflow-x-auto">
          <CardContent className="p-0 min-w-[900px]">
            <div className="grid grid-cols-7 border-b">
              {weekDays.map((day) => (
                <button key={day.toISOString()} onClick={() => { setDate(day); setView("day"); }} className="p-4 border-r text-center hover:bg-muted">
                  <div className="text-xs text-muted-foreground">{format(day, "EEE")}</div>
                  <div className="font-semibold">{format(day, "MMM d")}</div>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-7 min-h-[520px]">
              {weekDays.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                return <div key={key} className="border-r p-2 space-y-2">
                  {blocks.filter((item) => item.date === key).map((item) => <ScheduleItem key={`b${item.id}`} blocked title={item.reason} start={item.startTime} end={item.endTime} />)}
                  {appointments.filter((item) => item.date === key).map((item) => <Link key={item.id} href={`/appointments/${item.id}`}><ScheduleItem title={item.name} start={item.startTime} end={item.endTime} /></Link>)}
                </div>;
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {view === "day" && (
        <Card>
          <CardHeader><CardTitle>{format(date, "EEEE, MMMM d, yyyy")}</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {HOURS.map((hour) => {
              const end = `${String(Number(hour.slice(0, 2)) + 1).padStart(2, "0")}:00`;
              const appointment = selectedAppointments.find((item) => item.startTime < end && item.endTime > hour);
              const blocked = selectedBlocks.find((item) => item.startTime < end && item.endTime > hour);
              return <div key={hour} className="grid grid-cols-[80px_1fr] min-h-16 border-t">
                <div className="pt-3 text-sm text-muted-foreground">{hour}</div>
                <div className="p-2">
                  {blocked ? <ScheduleItem blocked title={blocked.reason} start={blocked.startTime} end={blocked.endTime} /> :
                   appointment ? <Link href={`/appointments/${appointment.id}`}><ScheduleItem title={appointment.name} start={appointment.startTime} end={appointment.endTime} /></Link> :
                   <div className="h-full rounded-md border border-dashed p-3 text-sm text-emerald-600">Available</div>}
                </div>
              </div>;
            })}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-primary" />Booked</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-red-500" />Blocked</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded border border-dashed border-emerald-500" />Available</span>
      </div>
    </div>
  );
}

function DayAgenda({ date, appointments, blocks, onDeleteBlock, loading }: {
  date: Date; appointments: Array<{ id: number; name: string; purpose: string; startTime: string; endTime: string; status: string }>;
  blocks: Array<{ id: number; reason: string; startTime: string; endTime: string }>; onDeleteBlock: (id: number) => void; loading: boolean;
}) {
  return <Card><CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5" />{format(date, "EEEE, MMMM d, yyyy")}</CardTitle></CardHeader>
    <CardContent className="space-y-3">
      {loading && <p className="text-muted-foreground">Loading schedule…</p>}
      {blocks.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50/50 p-3">
        <Lock className="h-4 w-4 text-red-500" /><div className="flex-1"><strong>{item.reason}</strong><div className="text-sm text-muted-foreground">{item.startTime}–{item.endTime}</div></div>
        <Button size="icon" variant="ghost" onClick={() => onDeleteBlock(item.id)}><Trash2 className="h-4 w-4" /></Button>
      </div>)}
      {appointments.map((item) => <Link key={item.id} href={`/appointments/${item.id}`}><div className="rounded-lg border p-4 hover:border-primary">
        <div className="flex justify-between"><strong>{item.name}</strong><Badge>{item.status}</Badge></div>
        <div className="text-sm text-muted-foreground mt-1"><Clock className="inline h-3 w-3 mr-1" />{item.startTime}–{item.endTime} · {item.purpose}</div>
      </div></Link>)}
      {!loading && !appointments.length && !blocks.length && <p className="py-16 text-center text-muted-foreground">This day is fully available.</p>}
    </CardContent></Card>;
}

function ScheduleItem({ title, start, end, blocked = false }: { title: string; start: string; end: string; blocked?: boolean }) {
  return <div className={`rounded-md p-2 text-xs ${blocked ? "bg-red-100 text-red-800 border border-red-200" : "bg-primary/10 text-primary border border-primary/20"}`}>
    <div className="font-semibold truncate">{blocked && <Lock className="inline h-3 w-3 mr-1" />}{title}</div>
    <div>{start}–{end}</div>
  </div>;
}
