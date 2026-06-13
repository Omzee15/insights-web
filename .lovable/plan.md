# Plan: Real analytics backend (Neon Postgres)

Wire the dashboard to a Neon Postgres database. Sites created in the UI get a tracking ID; a small JS snippet on the target site pings our public endpoint on every page view; the dashboard reads aggregated stats from Neon.

## 1. Database connection
- Store the Neon connection string as a server-side secret `DATABASE_URL` (via the secrets tool — never hardcoded, and we'll ask you to rotate the password you pasted in chat since it's now exposed).
- Add `@neondatabase/serverless` (HTTP/WebSocket driver, works in the Cloudflare Worker runtime). Do **not** use `pg` — it needs Node TCP sockets that the Worker doesn't support.
- Create `src/lib/db.server.ts` exporting a `sql` tagged-template client built from `process.env.DATABASE_URL`. Imported only from `*.server.ts` / inside server-fn handlers.

## 2. Schema (run as SQL against Neon on first boot, or via a one-shot migration script)
- `users` — `id uuid pk`, `email unique`, `password_hash`, `created_at`.
- `sites` — `id uuid pk`, `user_id uuid fk`, `tracking_id text unique` (`PLS-XXXXXXXX`), `name`, `domain`, `created_at`.
- `sessions_track` — `id text pk` (client-generated), `site_id uuid fk`, `started_at`, `last_seen_at`, `pages int`, `country`, `device`.
- `pageviews` — `id bigserial pk`, `site_id uuid fk`, `session_id text fk`, `path`, `referrer`, `created_at`.
- Indexes on `pageviews(site_id, created_at)`, `sessions_track(site_id, started_at)`, `sites(tracking_id)`.

Since we're on Neon directly (not Supabase), there's no RLS — access control is enforced in server functions using the session's `user_id`.

## 3. Auth (lightweight, app-managed)
Without Supabase Auth we roll our own minimal flow:
- Email + password sign-up / sign-in server functions. Hash with `bcryptjs` (pure JS, Worker-safe).
- Issue a signed session cookie using TanStack's `useSession` from `@tanstack/react-start/server` (encrypted cookie, secret in `SESSION_SECRET`).
- `requireUser()` helper used by every protected server fn — reads the session cookie and returns `userId` or throws 401.
- Routes that need auth go under `src/routes/_authenticated/`; the layout calls a `getCurrentUser` server fn and redirects to `/auth` if absent.

Secrets to add: `DATABASE_URL`, `SESSION_SECRET`.

## 4. Public ingest endpoint
`src/routes/api/public/collect.ts` (server route, no auth, CORS `*`, handles `OPTIONS`):
- Accepts `POST` JSON and `GET` querystring (for `<img>`/`sendBeacon` fallback).
- Payload: `{ id: trackingId, sid: sessionId, path, referrer, event: "view" | "ping" | "end" }`.
- Looks up `sites` by `tracking_id`. On `view`: insert pageview, upsert session (increment `pages`, set `last_seen_at`). On `ping`/`end`: bump `last_seen_at`.
- Best-effort `country` from `cf-ipcountry` header, `device` parsed from UA.
- Unknown tracking ID → silent 204.

## 5. Tracker snippet
Served from `src/routes/p[.]js.ts` so users embed:
```html
<script async src="https://<app>/p.js" data-id="PLS-XXXX"></script>
```
The script:
- Reuses/creates a session ID in `sessionStorage`.
- Sends `view` on load and on SPA `pushState` / `popstate`.
- Sends `ping` every 15s while tab is visible.
- Sends `end` with duration via `navigator.sendBeacon` on `visibilitychange` / `pagehide`.

The "Add website" page shows the same snippet, prefilled with the new tracking ID.

## 6. Server functions for the dashboard
`src/lib/analytics.functions.ts` (all auth-protected via `requireUser`):
- `listSites()` — user's sites + 7-day visitor count + avg session duration.
- `createSite({ name, domain })` — generates `PLS-XXXXXXXX` (retry on unique collision), inserts row.
- `getSiteStats({ siteId, range })` — totals, daily series, top pages, top referrers, device split.

Dashboard pages swap mock data for `useSuspenseQuery` against these.

## 7. UI changes
- Keep current warm-cream design and the grid/list toggle.
- Sites list + detail driven by real data; empty states for "no sites yet" and "no traffic yet — paste the snippet".
- Snippet box on `sites/new` **and** every site detail page so users can grab it later.
- New `/auth` page (sign in / sign up tabs).

## Technical notes
- Driver: `@neondatabase/serverless` — uses `fetch`, works in Workers.
- Avg time = `avg(last_seen_at - started_at)` over sessions with ≥2 events, ignoring sessions idle > 30 min.
- Visitors = distinct `session_id` per day; Page views = pageview row count.
- All DB code lives in `.server.ts` files; `*.functions.ts` only `await import('@/lib/db.server')` inside `.handler()` to keep server-only modules out of the client bundle.

## Security note about the pasted connection string
The Neon URL you pasted in chat (including the password) is now in conversation history. After we wire it up via the secrets tool, please rotate it in the Neon dashboard and update the `DATABASE_URL` secret with the new value.

## Out of scope (v1)
Custom events, funnels, real-time live view, team sharing, data export, social logins.
