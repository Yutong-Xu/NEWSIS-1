import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getSessionUser, unauthorized } from "@/lib/db/auth";

/**
 * GET /api/progress — completed-credit history and degree requirements.
 * Enrolled/planned credits are simulated browser-side (registration is a
 * localStorage simulation) and merged by the client; the server only owns
 * fixed reference data.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const completed = await db.completedCourse.findMany({ where: { userId: user.studentNo } });
  const completedCredits = completed.reduce((s, c) => s + c.credits, 0);

  // map completed course codes to catalog categories when the course exists
  const codes = completed.map((c) => c.courseCode);
  const catalogCourses = await db.course.findMany({ where: { id: { in: codes } }, select: { id: true, category: true } });
  const catOf = new Map(catalogCourses.map((c) => [c.id, c.category]));
  const completedByCategory: Record<string, number> = {};
  for (const c of completed) {
    const cat = catOf.get(c.courseCode) ?? "free_elective";
    completedByCategory[cat] = (completedByCategory[cat] ?? 0) + c.credits;
  }

  const requirements = await db.degreeRequirement.findMany({
    where: { OR: [{ major: user.major }, { major: "*" }] },
    orderBy: { category: "asc" },
  });

  return NextResponse.json({
    totalRequired: requirements.find((r) => r.category === "total")?.requiredCredits ?? 120,
    completedCredits,
    completedByCategory,
    completedCourses: completed.map((c) => ({ courseCode: c.courseCode, credits: c.credits, grade: c.grade, term: c.term })),
    requirements: requirements.map((r) => ({
      id: r.id, category: r.category, labelZh: r.labelZh, labelEn: r.labelEn,
      requiredCredits: r.requiredCredits,
      completed: r.category === "total" ? completedCredits : (completedByCategory[r.category] ?? 0),
    })),
  });
}
