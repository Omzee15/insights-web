import { getRequestIP, getRequestHeader } from "@tanstack/react-start/server";
import { sql } from "@/lib/db.server";

export async function requireUser() {
  const { useSession } = await import("@tanstack/react-start/server");

  const sessionConfig = {
    password: process.env.SESSION_SECRET!,
    name: "pulse_session",
    maxAge: 60 * 60 * 24 * 7,
  };

  const session = await useSession<{ userId: string }>(sessionConfig);
  if (!session.data?.userId) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const rows = await sql`SELECT id, email FROM users WHERE id = ${session.data.userId}`;
  const user = rows[0] as { id: string; email: string } | undefined;
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return user;
}

export function getClientInfo() {
  const ip = getRequestIP({ xForwardedFor: true }) ?? "unknown";
  const country = getRequestHeader("cf-ipcountry") ?? "";
  const ua = getRequestHeader("user-agent") ?? "";

  let device = "desktop";
  if (/mobile|android|iphone|ipad|ipod/i.test(ua)) {
    device = /ipad/i.test(ua) ? "tablet" : "mobile";
  } else if (/tablet|kindle|silk/i.test(ua)) {
    device = "tablet";
  }

  return { ip, country, device, ua };
}
