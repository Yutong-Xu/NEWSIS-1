import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getSessionUser, unauthorized, checkOrigin } from "@/lib/db/auth";
import { conflictPairs } from "@/lib/db/domain";

function err(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json({ error: { code, message, details } }, { status });
}

/**
 * POST /api/plans/:id/items — add a course (section) to a plan.
 * Body: { courseId, sectionId?, tutorialSectionId?, role?, backupOfItemId?, force? }
 * Returns 409 conflict info unless force=true (the frontend's pending-conflict flow).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkOrigin(req)) return err(403, "csrf", "跨站请求被拒绝 / Cross-site request rejected");
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id: planId } = await params;
  const plan = await db.plan.findFirst({ where: { id: planId, userId: user.studentNo }, include: { items: { include: { section: { include: { meetings: true } } } } } });
  if (!plan) return err(404, "not_found", "计划不存在");

  let body: { courseId?: string; sectionId?: string; tutorialSectionId?: string; role?: string; backupOfItemId?: string; force?: boolean };
  try { body = await req.json(); } catch { return err(400, "bad_request", "请求格式错误"); }
  const role = body.role === "backup" ? "backup" : "primary";

  // resolve target section: explicit, or first LEC of the course
  let section = body.sectionId
    ? await db.section.findUnique({ where: { id: body.sectionId }, include: { meetings: true } })
    : null;
  if (!section && body.courseId) {
    section = await db.section.findFirst({
      where: { courseId: body.courseId, kind: "LEC" },
      orderBy: { sectionCode: "asc" },
      include: { meetings: true },
    });
  }
  if (!section) return err(404, "section_not_found", "未找到该课程的班次");

  const already = plan.items.some((i) => i.section.courseId === section.courseId && i.role === role);
  if (already) return err(409, "already_in_plan", "该课程已在计划中");

  // conflict detection against existing primary items (same role scope)
  if (role === "primary" && !body.force) {
    const existing = plan.items.filter((i) => i.role === "primary").flatMap((i) => [i.section]);
    const pairs = conflictPairs([...existing, section]);
    const hit = pairs.find(([a, b]) => a.id === section.id || b.id === section.id);
    if (hit) {
      const other = hit[0].id === section.id ? hit[1] : hit[0];
      return err(409, "conflict", `与计划中的 ${other.courseId} 存在时间冲突`, {
        conflictWith: { courseId: other.courseId, sectionId: other.id },
      });
    }
  }

  const maxPrio = Math.max(-1, ...plan.items.filter((i) => i.role === "backup").map((i) => i.priority));
  const item = await db.planItem.create({
    data: {
      planId, sectionId: section.id,
      tutorialSectionId: body.tutorialSectionId ?? null,
      role, backupOfItemId: body.backupOfItemId ?? null,
      priority: role === "backup" ? maxPrio + 1 : 0,
    },
  });
  return NextResponse.json({ ok: true, itemId: item.id }, { status: 201 });
}

/** DELETE /api/plans/:id/items?itemId= — remove a plan item. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkOrigin(req)) return err(403, "csrf", "跨站请求被拒绝 / Cross-site request rejected");
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id: planId } = await params;
  const itemId = req.nextUrl.searchParams.get("itemId");
  if (!itemId) return err(400, "bad_request", "缺少 itemId");
  const item = await db.planItem.findFirst({ where: { id: itemId, planId, plan: { userId: user.studentNo } } });
  if (!item) return err(404, "not_found", "计划项不存在");
  await db.planItem.delete({ where: { id: itemId } });
  return NextResponse.json({ ok: true });
}

/**
 * PATCH /api/plans/:id/items — update a plan item.
 * Body: { itemId, sectionId?, tutorialSectionId?, priority?, backupOfItemId? }
 * Section swap inside the plan (P0-3: user can change section within the plan).
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkOrigin(req)) return err(403, "csrf", "跨站请求被拒绝 / Cross-site request rejected");
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id: planId } = await params;
  let body: { itemId?: string; sectionId?: string; tutorialSectionId?: string; priority?: number; backupOfItemId?: string };
  try { body = await req.json(); } catch { return err(400, "bad_request", "请求格式错误"); }
  if (!body.itemId) return err(400, "bad_request", "缺少 itemId");
  const item = await db.planItem.findFirst({ where: { id: body.itemId, planId, plan: { userId: user.studentNo } } });
  if (!item) return err(404, "not_found", "计划项不存在");
  await db.planItem.update({
    where: { id: item.id },
    data: {
      sectionId: body.sectionId ?? item.sectionId,
      tutorialSectionId: body.tutorialSectionId !== undefined ? body.tutorialSectionId : item.tutorialSectionId,
      priority: body.priority ?? item.priority,
      backupOfItemId: body.backupOfItemId !== undefined ? body.backupOfItemId : item.backupOfItemId,
    },
  });
  return NextResponse.json({ ok: true });
}
