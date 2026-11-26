import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getSessionUser, unauthorized, checkOrigin } from "@/lib/db/auth";
import { submitRegistration } from "@/lib/db/registration-service";

function err(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** POST /api/registration { planId } — submit a plan for registration. */
export async function POST(req: NextRequest) {
  if (!checkOrigin(req)) return err(403, "csrf", "跨站请求被拒绝 / Cross-site request rejected");
  const user = await getSessionUser();
  if (!user) return unauthorized();
  let body: { planId?: string };
  try { body = await req.json(); } catch { return err(400, "bad_request", "请求格式错误"); }
  if (!body.planId) return err(400, "bad_request", "缺少 planId");
  const plan = await db.plan.findFirst({ where: { id: body.planId, userId: user.studentNo } });
  if (!plan) return err(404, "not_found", "计划不存在");
  try {
    const result = await submitRegistration(user.studentNo, body.planId);
    return NextResponse.json(result);
  } catch (e) {
    console.error("registration failed", e);
    return err(500, "internal", "注册提交失败，请重试");
  }
}

/** GET /api/registration — latest registration with per-item outcomes. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const registration = await db.registration.findFirst({
    where: { userId: user.studentNo },
    orderBy: { submittedAt: "desc" },
    include: { items: { include: { section: true } } },
  });
  if (!registration) return NextResponse.json({ items: [], total: 0 });
  return NextResponse.json({
    id: registration.id,
    planId: registration.planId,
    submittedAt: registration.submittedAt,
    items: registration.items.map((i) => ({
      courseId: i.section.courseId,
      sectionId: i.sectionId,
      status: i.status,
      failReason: i.failReason,
      failDetailZh: i.failDetailZh,
      failDetailEn: i.failDetailEn,
      waitlistPosition: i.waitlistPosition,
    })),
    total: registration.items.length,
  });
}
