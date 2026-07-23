import * as React from "react";
import { Link, useLocation } from "wouter";
import { 
  CalendarDays, 
  CalendarCheck2,
  CalendarPlus,
  LayoutDashboard, 
  List, 
  Menu,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/appointments", label: "Appointments", icon: List },
  { href: "/book", label: "Book Appointment", icon: CalendarPlus },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-gradient-to-b from-sidebar via-sidebar to-primary/[0.04] shadow-sm md:flex">
        <div className="flex h-20 shrink-0 items-center px-5 border-b border-border">
          <Link href="/" className="group flex items-center gap-3 text-sidebar-foreground">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform group-hover:scale-105">
              <CalendarCheck2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Appointment platform
              </div>
              <div className="text-lg font-bold tracking-tight">SmartBook</div>
            </div>
          </Link>
        </div>
        <div className="px-5 pt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Workspace
        </div>
        <nav className="flex-1 space-y-1.5 p-3 pt-3 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className={cn("h-[18px] w-[18px]", !isActive && "text-muted-foreground group-hover:text-foreground")} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary via-primary to-slate-800 p-3.5 text-primary-foreground shadow-md">
            <div className="absolute -right-6 -top-7 h-20 w-20 rounded-full bg-white/10 blur-sm" />
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 text-white">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <span className="text-sm font-semibold text-white">Smart scheduling</span>
            </div>
            <p className="relative text-xs leading-relaxed text-white/70">
              AI and manual booking with a real-time calendar.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b bg-background px-4 md:hidden">
          <Link href="/" className="flex items-center gap-2 font-semibold text-lg text-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <CalendarCheck2 className="h-5 w-5" />
            </div>
            SmartBook
          </Link>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle navigation"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </header>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="absolute inset-x-0 top-16 z-50 border-b bg-background p-4 shadow-lg md:hidden animate-in slide-in-from-top-2">
            <nav className="flex flex-col space-y-2">
              {navItems.map((item) => {
                const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-accent"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}

        <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 via-background to-blue-50/50">
          <div className="mx-auto w-full max-w-6xl p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
