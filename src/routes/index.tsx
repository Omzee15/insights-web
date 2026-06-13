import { createFileRoute, Link, useLoaderData, redirect } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatCard } from "@/components/stat-card";
import { getOverviewStats } from "@/lib/analytics.functions";

export const Route = createFileRoute("/")({
  component: Index,
  loader: async () => {
    try {
      const stats = await getOverviewStats({ data: { days: 14 } });
      return { stats };
    } catch (e: any) {
      if (e instanceof Response && e.status === 401) {
        throw redirect({ to: "/auth" });
      }
      return { stats: null };
    }
  },
});

const PIE_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

function Index() {
  const { stats } = Route.useLoaderData();

  if (!stats) {
    return (
      <DashboardLayout>
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground text-sm">Failed to load overview data or unauthorized.</p>
        </div>
      </DashboardLayout>
    );
  }

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
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Last 14 days · all websites
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/sites/new"
            className="h-9 px-4 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 flex items-center"
          >
            + New website
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total visitors" value={stats.totals.visitors.toLocaleString()} />
        <StatCard label="Page views" value={stats.totals.pageviews.toLocaleString()} />
        <StatCard label="Avg. visit time" value={formatDuration(stats.totals.avgDurationSec)} />
        <StatCard label="Bounce rate" value="-" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-medium">Traffic</h3>
              <p className="text-xs text-muted-foreground">Visitors and pageviews</p>
            </div>
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-chart-1" /> Visitors
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-chart-2" /> Pageviews
              </span>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.daily} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis 
                  dataKey="day" 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(val) => {
                    const d = new Date(val);
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                  }}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} width={40} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="pageviews" name="Pageviews" stroke="hsl(var(--chart-2))" fill="url(#g2)" strokeWidth={2} />
                <Area type="monotone" dataKey="visitors" name="Visitors" stroke="hsl(var(--chart-1))" fill="url(#g1)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-medium mb-1">Devices</h3>
          <p className="text-xs text-muted-foreground mb-4">Visitor breakdown</p>
          <div className="h-48">
            {stats.devices.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.devices} dataKey="value" nameKey="name" innerRadius={50} outerRadius={75} paddingAngle={3}>
                    {stats.devices.map((_: any, i: number) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                No data
              </div>
            )}
          </div>
          <div className="space-y-2 mt-2">
            {stats.devices.map((d: any, i: number) => (
              <div key={d.name} className="flex items-center justify-between text-sm capitalize">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  {d.name}
                </span>
                <span className="text-muted-foreground font-medium">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-medium mb-4">Top pages</h3>
          <div className="space-y-3">
            {stats.topPages.map((p: any) => (
              <div key={p.path} className="flex items-center justify-between text-sm">
                <span className="font-mono text-xs">{p.path}</span>
                <div className="flex gap-4 text-muted-foreground">
                  <span className="text-foreground font-medium w-16 text-right">
                    {p.views.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
            {stats.topPages.length === 0 && (
              <div className="text-sm text-muted-foreground py-4 text-center">No data yet</div>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-medium mb-4">Top sources</h3>
          <div className="space-y-3">
            {stats.topSources.map((s: any) => {
              const max = Math.max(...stats.topSources.map((ts: any) => ts.visits));
              const pct = max > 0 ? (s.visits / max) * 100 : 0;
              return (
                <div key={s.source}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>{s.source}</span>
                    <span className="text-muted-foreground text-xs">
                      {s.visits.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-accent"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
            {stats.topSources.length === 0 && (
              <div className="text-sm text-muted-foreground py-4 text-center">No data yet</div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
