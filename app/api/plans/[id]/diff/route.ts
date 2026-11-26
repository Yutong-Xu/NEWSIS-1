import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getSessionUser, unauthorized } from "@/lib/db/auth";
import { planSwitchDiff } from "@/lib/db/registration-service";

/** GET /api/plans/:id/diff — enrollment-based diff for switching to this plan (P0-7). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const plan = await db.plan.findFirst({ where: { id, userId: user.studentNo } });
  if (!plan) {
    return NextResponse.json({ error: { code: "not_found", message: "计划不存在" } }, { status: 404 });
  }
  const diff = await planSwitchDiff(user.studentNo, id);
  return NextResponse.json(diff);
}
