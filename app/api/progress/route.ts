import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getSessionUser, unauthorized } from "@/lib/db/auth";

/**
 * GET /api/progress — three-component credit view (P1-12):
 * completed / enrolled / planned, plus per-requirement projected gaps.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const completed = await db.completedCourse.findMany({ where: { userId: user.studentNo } });
  const completedCredits = completed.reduce((s, c) => s + c.credits, 0);

  const enrollments = await db.enrollment.findMany({
    where: { userId: user.studentNo, status: "enrolled", section: { kind: "LEC" } },
    include: { section: { include: { course: true } } },
  });
  const enrolledCredits = enrollments.reduce((s, e) => s + e.section.course.credits, 0);
  const enrolledByCategory: Record<string, number> = {};
  for (const e of enrollments) {
    enrolledByCategory[e.section.course.category] = (enrolledByCategory[e.section.course.category] ?? 0) + e.section.course.credits;
  }

  const plans = await db.plan.findMany({
    where: { userId: user.studentNo },
    include: { items: { where: { role: "primary" }, include: { section: { include: { course: true } } } } },
  });
  const planDtos = plans.map((p) => {
    const credits = p.items.reduce((s, i) => s + i.section.course.credits, 0);
    const byCategory: Record<string, number> = {};
    for (const i of p.items) {
      byCategory[i.section.course.category] = (byCategory[i.section.course.category] ?? 0) + i.section.course.credits;
    }
    return { id: p.id, name: p.name, credits, byCategory };
  });

  const requirements = await db.degreeRequirement.findMany({ where: { major: user.major } });
  // completed credits per category requires mapping courseCode → category; use course ids where present
  const catalog = await db.course.findMany({ select: { id: true, category: true } });
  const catOf = new Map(catalog.map((c) => [c.id, c.category]));
  const completedByCategory: Record<string, number> = {};
  for (const c of completed) {
    const cat = catOf.get(c.courseCode) ?? "major_required";
    completedByCategory[cat] = (completedByCategory[cat] ?? 0) + c.credits;
  }

  return NextResponse.json({
    completedCredits,
    enrolledCredits,
    plans: planDtos,
    requirements: requirements.map((r) => ({
      category: r.category,
      labelZh: r.labelZh,
      labelEn: r.labelEn,
      requiredCredits: r.requiredCredits,
      completed: r.category === "total" ? completedCredits : (completedByCategory[r.category] ?? 0),
      enrolled: r.category === "total" ? enrolledCredits : (enrolledByCategory[r.category] ?? 0),
    })),
  });
}
