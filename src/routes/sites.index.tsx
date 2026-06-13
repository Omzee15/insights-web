import { createFileRoute, Link, useLoaderData, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { ExternalLink, LayoutGrid, List } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { cn } from "@/lib/utils";
import { listSites } from "@/lib/analytics.functions";

export const Route = createFileRoute("/sites/")({
  component: SitesPage,
  loader: async () => {
    try {
      const sites = await listSites();
      return { sites };
    } catch (e: any) {
      if (e instanceof Response && e.status === 401) {
        throw redirect({ to: "/auth" });
      }
      return { sites: [] };
    }
  },
});

function SitesPage() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const { sites } = useLoaderData({ from: "/sites/" });

  function formatDuration(seconds: number) {
    if (!seconds) return "0s";
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}m ${sec}s`;
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Websites</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {sites.length} active sites being tracked
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-border bg-card p-0.5">
            <button
              onClick={() => setView("grid")}
              className={cn(
                "h-8 w-8 rounded flex items-center justify-center transition-colors",
                view === "grid"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("list")}
              className={cn(
                "h-8 w-8 rounded flex items-center justify-center transition-colors",
                view === "list"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <Link
            to="/sites/new"
            className="h-9 px-4 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 flex items-center"
          >
            + New website
          </Link>
        </div>
      </div>

      {view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sites.map((s) => (
            <Link
              key={s.id}
              to="/sites/$siteId"
              params={{ siteId: s.id }}
              className="group rounded-xl border border-border bg-card p-5 hover:border-accent/60 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="min-w-0">
                  <div className="font-medium truncate">{s.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                    {s.domain}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </div>
                </div>
                <span className="h-2 w-2 rounded-full bg-chart-2 mt-2" title="Active" />
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-lg bg-card-tile p-3">
                  <div className="text-xs text-muted-foreground">Visitors (7d)</div>
                  <div className="text-xl font-semibold mt-0.5">
                    {s.visitors7d.toLocaleString()}
                  </div>
                </div>
                <div className="rounded-lg bg-card-tile p-3">
                  <div className="text-xs text-muted-foreground">Avg. time</div>
                  <div className="text-xl font-semibold mt-0.5">{formatDuration(s.avgDurationSec)}</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <code className="bg-muted px-2 py-1 rounded text-muted-foreground">
                  {s.trackingId}
                </code>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="text-left font-medium px-5 py-3">Site</th>
                <th className="text-left font-medium px-5 py-3">Tracking ID</th>
                <th className="text-right font-medium px-5 py-3">Visitors (7d)</th>
                <th className="text-right font-medium px-5 py-3">Avg. time</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {sites.map((s) => (
                <tr key={s.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-5 py-4">
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      {s.domain}
                      <ExternalLink className="h-3 w-3" />
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <code className="text-xs bg-muted px-2 py-1 rounded">{s.trackingId}</code>
                  </td>
                  <td className="px-5 py-4 text-right font-medium">
                    {s.visitors7d.toLocaleString()}
                  </td>
                  <td className="px-5 py-4 text-right text-muted-foreground">{formatDuration(s.avgDurationSec)}</td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      to="/sites/$siteId"
                      params={{ siteId: s.id }}
                      className="text-sm text-accent hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
