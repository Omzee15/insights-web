import { createFileRoute, Link, notFound, useLoaderData, redirect } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowLeft } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatCard } from "@/components/stat-card";
import { getSiteStats } from "@/lib/analytics.functions";
import { listSites } from "@/lib/analytics.functions";

export const Route = createFileRoute("/sites/$siteId")({
  component: SiteDetail,
  notFoundComponent: () => (
    <DashboardLayout>
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold">Site not found</h2>
        <Link to="/sites" className="text-accent hover:underline text-sm mt-2 inline-block">
          Back to websites
        </Link>
      </div>
    </DashboardLayout>
  ),
  loader: async ({ params }) => {
    try {
      const dbSites = await listSites();
      const site = dbSites.find((s) => s.id === params.siteId);
      if (!site) throw notFound();

      const stats = await getSiteStats({ data: { siteId: params.siteId, days: 30 } });
      return { site, stats };
    } catch (e: any) {
      if (e instanceof Response && e.status === 401) {
        throw redirect({ to: "/auth" });
      }
      throw notFound();
    }
  },
});

function SiteDetail() {
  const { site, stats } = Route.useLoaderData();

  function formatDuration(seconds: number) {
    if (!seconds) return "0s";
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}m ${sec}s`;
  }

  return (
    <DashboardLayout>
      <Link
        to="/sites"
        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> All websites
      </Link>

      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{site.name}</h1>
          <a
            href={`https://${site.domain}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-accent hover:underline mt-1 inline-block"
          >
            {site.domain}
          </a>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground mb-1">Tracking ID</div>
          <code className="text-xs bg-muted px-2 py-1 rounded">{site.trackingId}</code>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Unique Visitors" value={stats.totals.visitors.toLocaleString()} />
        <StatCard label="Total Pageviews" value={stats.totals.pageviews.toLocaleString()} />
        <StatCard label="Avg. Visit Duration" value={formatDuration(stats.totals.avgDurationSec)} />
      </div>

      <div className="rounded-xl border border-border bg-card p-6 mb-8">
        <h3 className="font-semibold mb-6">Traffic Over Time (30 days)</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.daily} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPageviews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                dy={10}
                tickFormatter={(val) => {
                  const d = new Date(val);
                  return `${d.getMonth() + 1}/${d.getDate()}`;
                }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.5rem",
                  fontSize: "12px",
                }}
              />
              <Area
                type="monotone"
                dataKey="visitors"
                name="Visitors"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorVisitors)"
              />
              <Area
                type="monotone"
                dataKey="pageviews"
                name="Pageviews"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorPageviews)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-5 border-b border-border">
            <h3 className="font-semibold">Top Pages</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
              <tr>
                <th className="text-left font-medium px-5 py-3">Path</th>
                <th className="text-right font-medium px-5 py-3">Views</th>
              </tr>
            </thead>
            <tbody>
              {stats.topPages.map((p: any) => (
                <tr key={p.path} className="border-t border-border hover:bg-muted/30">
                  <td className="px-5 py-3">{p.path}</td>
                  <td className="px-5 py-3 text-right font-medium">{p.views.toLocaleString()}</td>
                </tr>
              ))}
              {stats.topPages.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-5 py-8 text-center text-muted-foreground">
                    No data yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-5 border-b border-border">
            <h3 className="font-semibold">Top Referriers</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
              <tr>
                <th className="text-left font-medium px-5 py-3">Source</th>
                <th className="text-right font-medium px-5 py-3">Visits</th>
              </tr>
            </thead>
            <tbody>
              {stats.topSources.map((s: any) => (
                <tr key={s.source} className="border-t border-border hover:bg-muted/30">
                  <td className="px-5 py-3">{s.source}</td>
                  <td className="px-5 py-3 text-right font-medium">{s.visits.toLocaleString()}</td>
                </tr>
              ))}
              {stats.topSources.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-5 py-8 text-center text-muted-foreground">
                    No data yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
