import * as React from "react";
import { Link } from "wouter";
import { 
  CalendarDays, 
  Clock, 
  CheckCircle2, 
  XCircle,
  ArrowRight,
  TrendingUp,
  User
} from "lucide-react";
import { useGetAppointmentStats, useListUpcomingAppointments } from "@/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetAppointmentStats();
  const { data: upcoming, isLoading: upcomingLoading } = useListUpcomingAppointments({ limit: 5 });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Overview</h1>
          <p className="text-muted-foreground mt-1">Here's what's happening in your practice today.</p>
        </div>
        <Link href="/book" className="w-full md:w-auto">
          <Button className="w-full gap-2">
            <CalendarDays className="h-4 w-4" />
            New Appointment
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Today's Appointments" 
          value={stats?.totalToday} 
          icon={<CalendarDays className="h-4 w-4 text-muted-foreground" />} 
          loading={statsLoading} 
          tone="blue"
        />
        <StatCard 
          title="Pending Approval" 
          value={stats?.totalPending} 
          icon={<Clock className="h-4 w-4 text-amber-500" />} 
          loading={statsLoading} 
          tone="amber"
        />
        <StatCard 
          title="Confirmed (Upcoming)" 
          value={stats?.totalUpcoming} 
          icon={<CheckCircle2 className="h-4 w-4 text-green-500" />} 
          loading={statsLoading} 
          tone="emerald"
        />
        <StatCard 
          title="Cancelled (This Month)" 
          value={stats?.totalCancelled} 
          icon={<XCircle className="h-4 w-4 text-slate-400" />} 
          loading={statsLoading} 
          tone="slate"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-5 flex flex-col rounded-xl border-slate-200/80 bg-white/90 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle>Upcoming Appointments</CardTitle>
            <CardDescription>
              Your schedule for the next few days.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {upcomingLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16 w-full rounded-md" />
                ))}
              </div>
            ) : upcoming && upcoming.length > 0 ? (
              <div className="space-y-4">
                {upcoming.map((apt) => (
                  <Link key={apt.id} href={`/appointments/${apt.id}`}>
                    <div className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md cursor-pointer mb-3 last:mb-0">
                      <div className="flex items-center gap-4">
                        <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary sm:flex">
                          <User className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium leading-none">{apt.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(parseISO(apt.date), "MMM d, yyyy")} at {apt.startTime}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant={
                          apt.status === "confirmed" ? "success" : 
                          apt.status === "pending" ? "warning" : "neutral"
                        } className="capitalize">
                          {apt.status}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-50 transition-transform group-hover:translate-x-1 group-hover:text-primary group-hover:opacity-100" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center rounded-lg border border-dashed">
                <div className="text-center">
                  <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground opacity-50 mb-2" />
                  <p className="text-sm font-medium text-muted-foreground">No upcoming appointments</p>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="pt-0">
            <Link href="/appointments" className="w-full">
              <Button variant="outline" className="w-full">View all appointments</Button>
            </Link>
          </CardFooter>
        </Card>

        <Card className="relative overflow-hidden lg:col-span-2 rounded-xl border-primary/10 bg-gradient-to-br from-white via-white to-primary/[0.07] shadow-sm">
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/[0.06]" />
          <CardHeader>
            <CardTitle>Quick Summary</CardTitle>
            <CardDescription>This week's volume</CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="flex flex-col gap-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.totalThisWeek || 0}</p>
                    <p className="text-xs text-muted-foreground">Total appointments this week</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Confirmed</span>
                    <span className="font-medium">{stats?.totalConfirmed || 0}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full" 
                      style={{ width: `${Math.min(100, ((stats?.totalConfirmed || 0) / Math.max(1, (stats?.totalThisWeek || 1))) * 100)}%` }}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Pending</span>
                    <span className="font-medium">{stats?.totalPending || 0}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div 
                      className="h-full bg-amber-500 rounded-full" 
                      style={{ width: `${Math.min(100, ((stats?.totalPending || 0) / Math.max(1, (stats?.totalThisWeek || 1))) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const statTones = {
  blue: "border-blue-100 bg-gradient-to-br from-white to-blue-50/80 before:bg-blue-500",
  amber: "border-amber-100 bg-gradient-to-br from-white to-amber-50/80 before:bg-amber-500",
  emerald: "border-emerald-100 bg-gradient-to-br from-white to-emerald-50/80 before:bg-emerald-500",
  slate: "border-slate-200 bg-gradient-to-br from-white to-slate-50 before:bg-slate-400",
};

function StatCard({
  title,
  value,
  icon,
  loading,
  tone,
}: {
  title: string;
  value?: number;
  icon: React.ReactNode;
  loading: boolean;
  tone: keyof typeof statTones;
}) {
  return (
    <Card className={`relative overflow-hidden rounded-xl shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md before:absolute before:inset-x-0 before:top-0 before:h-1 ${statTones[tone]}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/80 shadow-sm ring-1 ring-black/[0.04]">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-3xl font-bold tracking-tight">{value !== undefined ? value : "-"}</div>
        )}
      </CardContent>
    </Card>
  );
}
