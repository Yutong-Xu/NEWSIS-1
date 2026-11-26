import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getSessionUser, unauthorized } from "@/lib/db/auth";

function err(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

async function ownedPlan(userId: string, id: string) {
  return db.plan.findFirst({ where: { id, userId } });
}

/** PATCH /api/plans/:id { name? } — rename. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const plan = await ownedPlan(user.studentNo, id);
  if (!plan) return err(404, "not_found", "计划不存在");
  let body: { name?: string };
  try { body = await req.json(); } catch { return err(400, "bad_request", "请求格式错误"); }
  const name = (body.name ?? "").trim();
  if (!name || name.length > 30) return err(400, "invalid_name", "计划名称须为 1–30 个字符");
  const dupe = await db.plan.findFirst({ where: { userId: user.studentNo, name, NOT: { id } } });
  if (dupe) return err(409, "duplicate_name", "已存在同名计划");
  await db.plan.update({ where: { id }, data: { name } });
  return NextResponse.json({ ok: true });
}

/** DELETE /api/plans/:id — removes the plan only; enrollments are independent. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const plan = await ownedPlan(user.studentNo, id);
  if (!plan) return err(404, "not_found", "计划不存在");
  await db.plan.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
