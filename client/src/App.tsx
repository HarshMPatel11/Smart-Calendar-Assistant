import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Shell } from '@/components/layout/shell';

// Pages
import Dashboard from '@/pages/dashboard';
import CalendarPage from '@/pages/calendar';
import AppointmentsList from '@/pages/appointments';
import AppointmentDetail from '@/pages/appointment-detail';
import BookAppointment from '@/pages/book';
import NotFound from '@/pages/not-found';
import { useRealtimeCalendar } from '@/hooks/use-realtime-calendar';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function Router() {
  useRealtimeCalendar();
  return (
    <Shell>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/calendar" component={CalendarPage} />
        <Route path="/appointments" component={AppointmentsList} />
        <Route path="/appointments/:id">
          {(params) => {
            // Protect against "new" or other string IDs if we add them later
            if (params.id === 'new') return <NotFound />;
            return <AppointmentDetail />;
          }}
        </Route>
        <Route path="/book" component={BookAppointment} />
        <Route component={NotFound} />
      </Switch>
    </Shell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
