import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

function generateTrackingId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const suffix = Array.from({ length: 8 })
    .map(() => chars[Math.floor(Math.random() * chars.length)])
    .join("");
  return `PLS-${suffix}`;
}

export const listSites = createServerFn({ method: "GET" }).handler(async () => {
  const { sql } = await import("@/lib/db.server");
  const { requireUser } = await import("@/lib/auth.server");
  const user = await requireUser();

  const rows = await sql`
    SELECT s.id, s.tracking_id, s.name, s.domain, s.created_at,
      (SELECT COUNT(DISTINCT session_id) FROM pageviews WHERE site_id = s.id AND created_at > NOW() - INTERVAL '7 days') as visitors_7d,
      (SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (st.last_seen_at - st.started_at))), 0)
       FROM sessions_track st WHERE st.site_id = s.id AND st.pages > 1 AND st.last_seen_at > st.started_at
       AND st.started_at > NOW() - INTERVAL '7 days') as avg_duration
    FROM sites s
    WHERE s.user_id = ${user.id}
    ORDER BY s.created_at DESC
  `;

  return rows.map((r) => ({
    id: r.id as string,
    trackingId: r.tracking_id as string,
    name: r.name as string,
    domain: r.domain as string,
    visitors7d: Number(r.visitors_7d ?? 0),
    avgDurationSec: Number(r.avg_duration ?? 0),
    createdAt: r.created_at as string,
  }));
});

export const createSite = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ name: z.string().min(1), domain: z.string().min(1) }).parse(data)
  )
  .handler(async ({ data }) => {
    const { sql } = await import("@/lib/db.server");
    const { requireUser } = await import("@/lib/auth.server");
    const user = await requireUser();

    let trackingId = generateTrackingId();
    for (let i = 0; i < 10; i++) {
      const existing = await sql`SELECT id FROM sites WHERE tracking_id = ${trackingId}`;
      if (existing.length === 0) break;
      trackingId = generateTrackingId();
    }

    const [site] = await sql`
      INSERT INTO sites (user_id, tracking_id, name, domain)
      VALUES (${user.id}, ${trackingId}, ${data.name}, ${data.domain})
      RETURNING id, tracking_id, name, domain
    `;

    return {
      id: site.id as string,
      trackingId: site.tracking_id as string,
      name: site.name as string,
      domain: site.domain as string,
    };
  });

export const getSiteStats = createServerFn({ method: "GET" })
  .inputValidator((data) =>
    z.object({ siteId: z.string().uuid(), days: z.number().min(1).max(90).optional() }).parse(data)
  )
  .handler(async ({ data }) => {
    const { sql } = await import("@/lib/db.server");
    const { requireUser } = await import("@/lib/auth.server");
    const user = await requireUser();

    const siteRows = await sql`SELECT id FROM sites WHERE id = ${data.siteId} AND user_id = ${user.id}`;
    if (siteRows.length === 0) throw new Response("Not found", { status: 404 });

    const days = data.days ?? 14;

    const totals = await sql`
      SELECT
        COUNT(DISTINCT session_id) as visitors,
        COUNT(*) as pageviews,
        COALESCE(AVG(EXTRACT(EPOCH FROM (st.last_seen_at - st.started_at))), 0) as avg_duration
      FROM pageviews pv
      LEFT JOIN sessions_track st ON st.id = pv.session_id
      WHERE pv.site_id = ${data.siteId} AND pv.created_at > NOW() - INTERVAL '${days} days'
    `;

    const daily = await sql`
      SELECT DATE(created_at) as day,
        COUNT(DISTINCT session_id) as visitors,
        COUNT(*) as pageviews
      FROM pageviews
      WHERE site_id = ${data.siteId} AND created_at > NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY day
    `;

    const topPages = await sql`
      SELECT path, COUNT(*) as views
      FROM pageviews
      WHERE site_id = ${data.siteId} AND created_at > NOW() - INTERVAL '${days} days'
      GROUP BY path
      ORDER BY views DESC
      LIMIT 10
    `;

    const topSources = await sql`
      SELECT COALESCE(NULLIF(referrer, ''), 'Direct') as source, COUNT(*) as visits
      FROM pageviews
      WHERE site_id = ${data.siteId} AND created_at > NOW() - INTERVAL '${days} days'
      GROUP BY COALESCE(NULLIF(referrer, ''), 'Direct')
      ORDER BY visits DESC
      LIMIT 10
    `;

    const devices = await sql`
      SELECT COALESCE(device, 'desktop') as name, COUNT(DISTINCT session_id) as value
      FROM sessions_track
      WHERE site_id = ${data.siteId} AND started_at > NOW() - INTERVAL '${days} days'
      GROUP BY COALESCE(device, 'desktop')
    `;

    return {
      totals: {
        visitors: Number(totals[0]?.visitors ?? 0),
        pageviews: Number(totals[0]?.pageviews ?? 0),
        avgDurationSec: Number(totals[0]?.avg_duration ?? 0),
      },
      daily: daily.map((r) => ({
        day: r.day as string,
        visitors: Number(r.visitors),
        pageviews: Number(r.pageviews),
      })),
      topPages: topPages.map((r) => ({
        path: r.path as string,
        views: Number(r.views),
      })),
      topSources: topSources.map((r) => ({
        source: r.source as string,
        visits: Number(r.visits),
      })),
      devices: devices.map((r) => ({
        name: r.name as string,
        value: Number(r.value),
      })),
    };
  });

export const getOverviewStats = createServerFn({ method: "GET" })
  .inputValidator((data) =>
    z.object({ days: z.number().min(1).max(90).optional() }).parse(data || {})
  )
  .handler(async ({ data }) => {
    const { sql } = await import("@/lib/db.server");
    const { requireUser } = await import("@/lib/auth.server");
    const user = await requireUser();

    const days = data.days ?? 14;

    const siteRows = await sql`SELECT id FROM sites WHERE user_id = ${user.id}`;
    if (siteRows.length === 0) {
      return {
        totals: { visitors: 0, pageviews: 0, avgDurationSec: 0, bounceRate: 0 },
        daily: [],
        topPages: [],
        topSources: [],
        devices: [],
      };
    }

    const siteIds = siteRows.map(r => r.id);
    
    // Instead of using IN array, we can just join sites table 
    const totals = await sql`
      SELECT
        COUNT(DISTINCT session_id) as visitors,
        COUNT(*) as pageviews,
        COALESCE(AVG(EXTRACT(EPOCH FROM (st.last_seen_at - st.started_at))), 0) as avg_duration
      FROM pageviews pv
      JOIN sites s on s.id = pv.site_id
      LEFT JOIN sessions_track st ON st.id = pv.session_id
      WHERE s.user_id = ${user.id} AND pv.created_at > NOW() - INTERVAL '${days} days'
    `;

    const daily = await sql`
      SELECT DATE(pv.created_at) as day,
        COUNT(DISTINCT pv.session_id) as visitors,
        COUNT(*) as pageviews
      FROM pageviews pv
      JOIN sites s on s.id = pv.site_id
      WHERE s.user_id = ${user.id} AND pv.created_at > NOW() - INTERVAL '${days} days'
      GROUP BY DATE(pv.created_at)
      ORDER BY day
    `;

    const topPages = await sql`
      SELECT pv.path, COUNT(*) as views
      FROM pageviews pv
      JOIN sites s on s.id = pv.site_id
      WHERE s.user_id = ${user.id} AND pv.created_at > NOW() - INTERVAL '${days} days'
      GROUP BY pv.path
      ORDER BY views DESC
      LIMIT 10
    `;

    const topSources = await sql`
      SELECT COALESCE(NULLIF(pv.referrer, ''), 'Direct') as source, COUNT(*) as visits
      FROM pageviews pv
      JOIN sites s on s.id = pv.site_id
      WHERE s.user_id = ${user.id} AND pv.created_at > NOW() - INTERVAL '${days} days'
      GROUP BY COALESCE(NULLIF(pv.referrer, ''), 'Direct')
      ORDER BY visits DESC
      LIMIT 10
    `;

    const devices = await sql`
      SELECT COALESCE(st.device, 'desktop') as name, COUNT(DISTINCT st.id) as value
      FROM sessions_track st
      JOIN sites s on s.id = st.site_id
      WHERE s.user_id = ${user.id} AND st.started_at > NOW() - INTERVAL '${days} days'
      GROUP BY COALESCE(st.device, 'desktop')
    `;

    return {
      totals: {
        visitors: Number(totals[0]?.visitors ?? 0),
        pageviews: Number(totals[0]?.pageviews ?? 0),
        avgDurationSec: Number(totals[0]?.avg_duration ?? 0),
        bounceRate: 0,
      },
      daily: daily.map((r) => ({
        day: r.day as string,
        visitors: Number(r.visitors),
        pageviews: Number(r.pageviews),
      })),
      topPages: topPages.map((r) => ({
        path: r.path as string,
        views: Number(r.views),
      })),
      topSources: topSources.map((r) => ({
        source: r.source as string,
        visits: Number(r.visits),
      })),
      devices: devices.map((r) => ({
        name: r.name as string,
        value: Number(r.value),
      })),
    };
  });
