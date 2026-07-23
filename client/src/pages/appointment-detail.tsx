import * as React from "react";
import { useParams, Link, useLocation } from "wouter";
import { 
  useGetAppointment, 
  useUpdateAppointmentStatus,
  useDeleteAppointment,
  getGetAppointmentQueryKey
} from "@/api";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Mail, 
  Phone, 
  User, 
  AlertCircle,
  Trash2,
  CheckCircle2,
  XCircle,
  RefreshCw
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";

export default function AppointmentDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: apt, isLoading, isError } = useGetAppointment(id, {
    query: { enabled: !!id, queryKey: getGetAppointmentQueryKey(id) }
  });

  const updateStatus = useUpdateAppointmentStatus();
  const deleteApt = useDeleteAppointment();

  const handleStatusChange = (newStatus: string) => {
    updateStatus.mutate({ id, data: { status: newStatus } }, {
      onSuccess: (updatedData) => {
        // Optimistic update
        queryClient.setQueryData(getGetAppointmentQueryKey(id), updatedData);
      }
    });
  };

  const handleDelete = () => {
    deleteApt.mutate({ id }, {
      onSuccess: () => {
        setLocation("/appointments");
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError || !apt) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold">Appointment Not Found</h2>
        <p className="text-muted-foreground mt-2">This appointment may have been deleted or does not exist.</p>
        <Link href="/appointments" className="mt-6">
          <Button>Back to Appointments</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/appointments">
          <Button variant="outline" size="icon" className="shrink-0 h-10 w-10 rounded-full">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            {apt.name}
            <Badge variant={
              apt.status === "confirmed" ? "success" : 
              apt.status === "pending" ? "warning" : "neutral"
            } className="text-sm capitalize px-3 py-1">
              {apt.status}
            </Badge>
          </h1>
          <p className="text-muted-foreground mt-1">Appointment details and management.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 shadow-sm border-border/50">
          <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="p-6 grid gap-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Client Name</p>
                  <p className="text-base font-semibold">{apt.name}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Date</p>
                  <p className="text-base font-semibold">{format(parseISO(apt.date), "EEEE, MMMM d, yyyy")}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Time</p>
                  <p className="text-base font-semibold">{apt.startTime} - {apt.endTime}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <a href={`mailto:${apt.email}`} className="text-base font-semibold text-primary hover:underline">
                    {apt.email}
                  </a>
                </div>
              </div>
              {apt.phone && (
                <div className="flex items-start gap-3 md:col-span-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Phone</p>
                    <a href={`tel:${apt.phone}`} className="text-base font-semibold text-primary hover:underline">
                      {apt.phone}
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 pt-6 border-t border-border/50">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Purpose of Visit</h3>
              <p className="text-base leading-relaxed bg-muted/30 p-4 rounded-lg">{apt.purpose}</p>
            </div>

            {apt.notes && (
              <div className="mt-2">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Additional Notes</h3>
                <p className="text-sm text-foreground whitespace-pre-wrap">{apt.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="shadow-sm border-border/50">
            <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
              <CardTitle>Actions</CardTitle>
              <CardDescription>Manage this appointment</CardDescription>
            </CardHeader>
            <CardContent className="p-6 flex flex-col gap-3">
              {apt.status !== "confirmed" && (
                <Button 
                  className="w-full justify-start gap-2 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleStatusChange("confirmed")}
                  disabled={updateStatus.isPending}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Confirm Appointment
                </Button>
              )}
              {apt.status !== "cancelled" && (
                <Button 
                  variant="outline"
                  className="w-full justify-start gap-2 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => handleStatusChange("cancelled")}
                  disabled={updateStatus.isPending}
                >
                  <XCircle className="h-4 w-4" />
                  Cancel Appointment
                </Button>
              )}
              {apt.status !== "pending" && (
                <Button 
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => handleStatusChange("pending")}
                  disabled={updateStatus.isPending}
                >
                  <RefreshCw className="h-4 w-4" />
                  Mark as Pending
                </Button>
              )}

              <div className="h-px bg-border my-2" />

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="destructive" className="w-full justify-start gap-2">
                    <Trash2 className="h-4 w-4" />
                    Delete Permanently
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Appointment</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete this appointment for {apt.name}? This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="mt-4">
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button 
                      variant="destructive" 
                      onClick={handleDelete}
                      disabled={deleteApt.isPending}
                    >
                      {deleteApt.isPending ? "Deleting..." : "Delete"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

            </CardContent>
          </Card>
          
          <div className="text-xs text-center text-muted-foreground">
            Created on {format(parseISO(apt.createdAt), "MMM d, yyyy 'at' h:mm a")}
          </div>
        </div>
      </div>
    </div>
  );
}
