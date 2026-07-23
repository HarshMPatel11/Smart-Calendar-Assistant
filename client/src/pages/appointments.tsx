import * as React from "react";
import { Link } from "wouter";
import { useListAppointments } from "@/api";
import { format, parseISO } from "date-fns";
import { 
  Search, 
  Filter, 
  MoreHorizontal,
  FileText
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export default function AppointmentsList() {
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [search, setSearch] = React.useState("");

  const { data: appointments, isLoading } = useListAppointments({});

  const filteredAppointments = React.useMemo(() => {
    if (!appointments) return [];
    
    return appointments.filter(apt => {
      const matchesStatus = statusFilter === "all" || apt.status === statusFilter;
      const matchesSearch = 
        apt.name.toLowerCase().includes(search.toLowerCase()) || 
        apt.email.toLowerCase().includes(search.toLowerCase()) ||
        apt.purpose.toLowerCase().includes(search.toLowerCase());
        
      return matchesStatus && matchesSearch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [appointments, statusFilter, search]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Appointments</h1>
          <p className="text-muted-foreground mt-1">Manage and view all your client appointments.</p>
        </div>
        <Link href="/book">
          <Button>Book Appointment</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col gap-4 border-b p-4 md:flex-row md:items-center md:justify-between bg-muted/10 rounded-t-xl">
            <Tabs defaultValue="all" value={statusFilter} onValueChange={setStatusFilter} className="w-full md:w-auto">
              <TabsList className="grid w-full grid-cols-4 md:w-auto">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
                <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="relative w-full md:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search name, email, purpose..."
                className="w-full bg-background pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead>Client</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-10 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-10 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredAppointments.length > 0 ? (
                  filteredAppointments.map((apt) => (
                    <TableRow key={apt.id} className="group cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <div className="font-medium text-foreground">{apt.name}</div>
                        <div className="text-xs text-muted-foreground">{apt.email}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{format(parseISO(apt.date), "MMM d, yyyy")}</div>
                        <div className="text-xs text-muted-foreground">{apt.startTime} - {apt.endTime}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm truncate max-w-[200px]" title={apt.purpose}>
                          {apt.purpose}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          apt.status === "confirmed" ? "success" : 
                          apt.status === "pending" ? "warning" : "neutral"
                        } className="capitalize">
                          {apt.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/appointments/${apt.id}`}>
                          <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            View details
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <FileText className="h-8 w-8 text-muted-foreground opacity-30 mb-2" />
                        <h3 className="text-sm font-medium text-foreground">No appointments found</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {search ? "Try adjusting your search or filters." : "You don't have any appointments in this category."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
