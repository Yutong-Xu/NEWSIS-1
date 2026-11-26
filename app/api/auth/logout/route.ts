import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db/client";
import { SESSION_COOKIE } from "@/lib/db/auth";

export async function POST() {
  const store = await cookies();
  const id = store.get(SESSION_COOKIE)?.value;
  if (id) await db.session.deleteMany({ where: { id } });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { maxAge: 0, path: "/" });
  return res;
}
