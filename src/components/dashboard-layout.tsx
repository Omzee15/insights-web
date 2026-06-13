import { Link, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { BarChart3, Globe, Plus, Settings, Bell, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/lib/auth.functions";

const navItems = [
  { to: "/", label: "Overview", icon: BarChart3 },
  { to: "/sites", label: "Websites", icon: Globe },
  { to: "/sites/new", label: "Add site", icon: Plus },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function DashboardLayout({ children }: { children: ReactNode }) {
  const location = useLocation();

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      try {
        return await getCurrentUser();
      } catch {
        return null;
      }
    },
  });

  const email = user?.email || "user@example.com";
  const initial = email.charAt(0).toUpperCase();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-60 shrink-0 border-r border-sidebar-border bg-sidebar p-5 flex flex-col">
        <div className="flex items-center gap-2 mb-8">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <BarChart3 className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sidebar-foreground">Insights</span>
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const active =
              item.to === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto pt-6 border-t border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center text-accent-foreground text-sm font-medium">
              {initial}
            </div>
            <div className="text-sm min-w-0">
              <div className="font-medium text-sidebar-foreground truncate" title={email}>{email}</div>
              <div className="text-xs text-muted-foreground">Free plan</div>
            </div>
          </div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b border-border flex items-center px-8 gap-4 bg-background/80 backdrop-blur">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Search sites, events…"
              className="w-full h-9 pl-9 pr-3 rounded-md bg-muted border border-transparent focus:border-ring focus:outline-none text-sm"
            />
          </div>
          <button className="h-9 w-9 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground">
            <Bell className="h-4 w-4" />
          </button>
        </header>
        <main className="flex-1 p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
