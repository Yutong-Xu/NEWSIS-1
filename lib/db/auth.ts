/**
 * Session helpers: server-side session resolution for API routes.
 * Login/logout endpoints live in app/api/auth/.
 */
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db/client";
import type { User } from "@/prisma/generated/client";

export const SESSION_COOKIE = "sis_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days, sliding

export async function getSessionUser(): Promise<User | null> {
  const store = await cookies();
  const id = store.get(SESSION_COOKIE)?.value;
  if (!id || !/^[0-9a-f]{64}$/.test(id)) return null;
  const session = await db.session.findUnique({ where: { id }, include: { user: true } });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id } }).catch(() => {});
    return null;
  }
  // sliding expiration
  await db.session.update({
    where: { id },
    data: { expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
  });
  return session.user;
}

/**
 * CSRF defense-in-depth on top of SameSite=Lax: mutating requests must carry
 * an Origin matching the host, or none at all (same-origin navigations,
 * curl/server-to-server). Cross-site form posts always carry a foreign Origin.
 */
export function checkOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

export function unauthorized() {
  return Response.json(
    { error: { code: "unauthorized", message: "未登录或会话已过期 / Not signed in" } },
    { status: 401 }
  );
}
