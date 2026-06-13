import { createServerFn } from "@tanstack/react-start";
import bcrypt from "bcryptjs";
import { z } from "zod";

const sessionConfig = {
  password: process.env.SESSION_SECRET!,
  name: "pulse_session",
  maxAge: 60 * 60 * 24 * 7,
};

export const signUp = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ email: z.string().email(), password: z.string().min(6) }).parse(data)
  )
  .handler(async ({ data }) => {
    const { sql } = await import("@/lib/db.server");
    const existing = await sql`SELECT id FROM users WHERE email = ${data.email}`;
    if (existing.length > 0) {
      throw new Error("Email already registered");
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const [user] = await sql`
      INSERT INTO users (email, password_hash)
      VALUES (${data.email}, ${passwordHash})
      RETURNING id, email
    `;

    const { updateSession } = await import("@tanstack/react-start/server");
    await updateSession(sessionConfig, { userId: user.id as string });

    return { user: { id: user.id as string, email: user.email as string } };
  });

export const signIn = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ email: z.string().email(), password: z.string() }).parse(data)
  )
  .handler(async ({ data }) => {
    const { sql } = await import("@/lib/db.server");
    const rows = await sql`SELECT id, email, password_hash FROM users WHERE email = ${data.email}`;
    const user = rows[0] as { id: string; email: string; password_hash: string } | undefined;
    if (!user) {
      throw new Error("Invalid email or password");
    }

    const valid = await bcrypt.compare(data.password, user.password_hash);
    if (!valid) {
      throw new Error("Invalid email or password");
    }

    const { updateSession } = await import("@tanstack/react-start/server");
    await updateSession(sessionConfig, { userId: user.id });

    return { user: { id: user.id, email: user.email } };
  });

export const getCurrentUser = createServerFn({ method: "GET" }).handler(async () => {
  const { useSession } = await import("@tanstack/react-start/server");
  const session = await useSession<{ userId: string }>(sessionConfig);

  if (!session.data?.userId) return null;

  const { sql } = await import("@/lib/db.server");
  const rows = await sql`SELECT id, email FROM users WHERE id = ${session.data.userId}`;
  const user = rows[0] as { id: string; email: string } | undefined;
  return user ?? null;
});

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  const { clearSession } = await import("@tanstack/react-start/server");
  await clearSession(sessionConfig);
  return { success: true };
});
