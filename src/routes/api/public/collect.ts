import { createFileRoute } from "@tanstack/react-router";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const Route = createFileRoute("/api/public/collect")({
  server: {
    handlers: {
      OPTIONS: async () => {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
      },

      POST: async ({ request }) => {
        try {
          const { sql } = await import("@/lib/db.server");

          let payload: Record<string, unknown>;
          try {
            payload = (await request.json()) as Record<string, unknown>;
          } catch {
            return new Response("Bad request", { status: 400, headers: CORS_HEADERS });
          }

          const trackingId = String(payload.id ?? "");
          const sessionId = String(payload.sid ?? "");
          const path = String(payload.path ?? "/");
          const referrer = String(payload.referrer ?? "");
          const event = String(payload.event ?? "view");

          if (!trackingId || !sessionId) {
            return new Response("Missing id or sid", { status: 400, headers: CORS_HEADERS });
          }

          const siteRows = await sql`SELECT id FROM sites WHERE tracking_id = ${trackingId}`;
          if (siteRows.length === 0) {
            return new Response(null, { status: 204, headers: CORS_HEADERS });
          }
          const siteId = siteRows[0].id as string;

          const country = (request.headers.get("cf-ipcountry") ?? "").slice(0, 2);
          const ua = request.headers.get("user-agent") ?? "";
          let device = "desktop";
          if (/mobile|android|iphone|ipod/i.test(ua)) {
            device = "mobile";
          } else if (/ipad|tablet|kindle|silk/i.test(ua)) {
            device = "tablet";
          }

          if (event === "view") {
            await sql`
              INSERT INTO pageviews (site_id, session_id, path, referrer)
              VALUES (${siteId}, ${sessionId}, ${path}, ${referrer})
            `;

            const existingSession = await sql`
              SELECT id FROM sessions_track WHERE id = ${sessionId}
            `;
            if (existingSession.length === 0) {
              await sql`
                INSERT INTO sessions_track (id, site_id, country, device)
                VALUES (${sessionId}, ${siteId}, ${country}, ${device})
              `;
            } else {
              await sql`
                UPDATE sessions_track
                SET last_seen_at = NOW(), pages = pages + 1
                WHERE id = ${sessionId}
              `;
            }
          } else {
            await sql`
              UPDATE sessions_track
              SET last_seen_at = NOW()
              WHERE id = ${sessionId}
            `;
          }

          return new Response(null, { status: 204, headers: CORS_HEADERS });
        } catch (err) {
          console.error("collect error:", err);
          return new Response("Internal error", { status: 500, headers: CORS_HEADERS });
        }
      },

      GET: async ({ request }) => {
        try {
          const { sql } = await import("@/lib/db.server");
          const url = new URL(request.url);
          const trackingId = url.searchParams.get("id") ?? "";
          const sessionId = url.searchParams.get("sid") ?? "";
          const path = url.searchParams.get("path") ?? "/";
          const referrer = url.searchParams.get("referrer") ?? "";

          if (!trackingId || !sessionId) {
            return new Response("1x1", {
              status: 200,
              headers: { "Content-Type": "image/gif", ...CORS_HEADERS },
            });
          }

          const siteRows = await sql`SELECT id FROM sites WHERE tracking_id = ${trackingId}`;
          if (siteRows.length === 0) {
            return new Response("1x1", {
              status: 200,
              headers: { "Content-Type": "image/gif", ...CORS_HEADERS },
            });
          }
          const siteId = siteRows[0].id as string;

          const country = (request.headers.get("cf-ipcountry") ?? "").slice(0, 2);
          const ua = request.headers.get("user-agent") ?? "";
          let device = "desktop";
          if (/mobile|android|iphone|ipod/i.test(ua)) {
            device = "mobile";
          } else if (/ipad|tablet|kindle|silk/i.test(ua)) {
            device = "tablet";
          }

          await sql`
            INSERT INTO pageviews (site_id, session_id, path, referrer)
            VALUES (${siteId}, ${sessionId}, ${path}, ${referrer})
          `;

          const existingSession = await sql`
            SELECT id FROM sessions_track WHERE id = ${sessionId}
          `;
          if (existingSession.length === 0) {
            await sql`
              INSERT INTO sessions_track (id, site_id, country, device)
              VALUES (${sessionId}, ${siteId}, ${country}, ${device})
            `;
          } else {
            await sql`
              UPDATE sessions_track
              SET last_seen_at = NOW(), pages = pages + 1
              WHERE id = ${sessionId}
            `;
          }

          return new Response("1x1", {
            status: 200,
            headers: { "Content-Type": "image/gif", ...CORS_HEADERS },
          });
        } catch (err) {
          console.error("collect get error:", err);
          return new Response("1x1", {
            status: 200,
            headers: { "Content-Type": "image/gif", ...CORS_HEADERS },
          });
        }
      },
    },
  },
});
