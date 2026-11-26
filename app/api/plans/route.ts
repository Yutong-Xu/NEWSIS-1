import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import type { Plan, PlanItem } from "@/prisma/generated/client";
import { getSessionUser, unauthorized, checkOrigin } from "@/lib/db/auth";

export const PLAN_LIMIT = 6;

function err(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

async function planDto(planId: string) {
  const plan = await db.plan.findUniqueOrThrow({
    where: { id: planId },
    include: { items: { include: { section: true, tutorialSection: true }, orderBy: { addedAt: "asc" } } },
  });
  return {
    id: plan.id,
    name: plan.name,
    items: plan.items.filter((i) => i.role === "primary").map((i) => ({
      id: i.id,
      courseId: i.section.courseId,
      sectionId: i.sectionId,
      tutorialSectionId: i.tutorialSectionId,
    })),
    backups: plan.items.filter((i) => i.role === "backup").sort((a, b) => a.priority - b.priority).map((i) => ({
      id: i.id,
      courseId: i.section.courseId,
      sectionId: i.sectionId,
      backupOfItemId: i.backupOfItemId,
    })),
  };
}

/**
 * GET /api/plans — the user's plans. First call lazily creates the demo
 * starting plans (Plan A / Plan B) matching the prototype's initial state.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  let plans = await db.plan.findMany({ where: { userId: user.studentNo }, orderBy: { createdAt: "asc" } });
  if (plans.length === 0) {
    // first-use defaults, same content as the original prototype
    const seedPlans: [string, string[]][] = [
      ["Plan A", ["ECO3121", "CSC3170", "ENG2001A", "GED2003"]],
      ["Plan B", ["ECO3121", "CSC3170", "ENG2001A", "DMS2030", "GED2003"]],
    ];
    for (const [name, courseIds] of seedPlans) {
      const plan = await db.plan.create({ data: { userId: user.studentNo, name, termId: "2026-Fall" } });
      for (const courseId of courseIds) {
        const lec = await db.section.findFirst({ where: { courseId, kind: "LEC" }, orderBy: { sectionCode: "asc" } });
        const tut = await db.section.findFirst({ where: { courseId, kind: "TUT" }, orderBy: { sectionCode: "asc" } });
        if (lec) {
          await db.planItem.create({
            data: { planId: plan.id, sectionId: lec.id, tutorialSectionId: tut?.id ?? null, role: "primary" },
          });
        }
      }
    }
    // default backups for the recovery storyline (CSC4210 → CSC4040 → CSC4310)
    const planA = await db.plan.findFirst({ where: { userId: user.studentNo, name: "Plan A" } });
    if (planA) {
      let prio = 0;
      for (const courseId of ["CSC4210", "CSC4040", "CSC4310"]) {
        const lec = await db.section.findFirst({ where: { courseId, kind: "LEC" }, orderBy: { sectionCode: "asc" } });
        if (lec) {
          await db.planItem.create({
            data: { planId: planA.id, sectionId: lec.id, role: "backup", priority: prio++ },
          });
        }
      }
    }
    plans = await db.plan.findMany({ where: { userId: user.studentNo }, orderBy: { createdAt: "asc" } });
  }

  const items = await Promise.all(plans.map((p) => planDto(p.id)));
  return NextResponse.json({ items, total: items.length });
}

/**
 * POST /api/plans { name, copyFrom? } — create blank or copy an existing plan.
 * Limits: 6 per user, unique non-empty name ≤ 30 chars (P0-2).
 */
export async function POST(req: NextRequest) {
  if (!checkOrigin(req)) return err(403, "csrf", "跨站请求被拒绝 / Cross-site request rejected");
  const user = await getSessionUser();
  if (!user) return unauthorized();
  let body: { name?: string; copyFrom?: string };
  try { body = await req.json(); } catch { return err(400, "bad_request", "请求格式错误"); }
  const name = (body.name ?? "").trim();
  if (!name || name.length > 30) return err(400, "invalid_name", "计划名称须为 1–30 个字符");
  const count = await db.plan.count({ where: { userId: user.studentNo } });
  if (count >= PLAN_LIMIT) return err(409, "plan_limit", `最多创建 ${PLAN_LIMIT} 个计划`);
  const dupe = await db.plan.findFirst({ where: { userId: user.studentNo, name } });
  if (dupe) return err(409, "duplicate_name", "已存在同名计划");

  // validate the copy source before creating anything — no orphan plans on failure
  type PlanWithItems = Plan & { items: PlanItem[] };
  let source: PlanWithItems | null = null;
  if (body.copyFrom) {
    source = await db.plan.findFirst({ where: { id: body.copyFrom, userId: user.studentNo }, include: { items: true } });
    if (!source) return err(404, "not_found", "要复制的计划不存在");
  }

  const plan = await db.plan.create({ data: { userId: user.studentNo, name, termId: "2026-Fall" } });
  if (source) {
    for (const item of source.items) {
      await db.planItem.create({
        data: {
          planId: plan.id, sectionId: item.sectionId,
          tutorialSectionId: item.tutorialSectionId, role: item.role, priority: item.priority,
        },
      });
    }
  }
  return NextResponse.json(await planDto(plan.id), { status: 201 });
}
