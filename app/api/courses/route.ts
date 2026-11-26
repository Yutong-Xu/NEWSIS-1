import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { availableSeats, checkEligibility } from "@/lib/db/domain";
import { getSessionUser } from "@/lib/db/auth";

/**
 * GET /api/courses
 * Query params:
 *   q        — code/title/instructor keyword, space/case-insensitive ("CSC 4130" = "CSC4130")
 *   category — exact category filter
 *   eligibleOnly=true — only courses the session user is eligible for
 *   availableOnly=true — only courses with at least one LEC with available seats
 * Response: { items: CourseDto[], total }
 * CourseDto includes per-user eligibility when logged in.
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  const params = req.nextUrl.searchParams;
  const q = (params.get("q") ?? "").replace(/\s+/g, "").toLowerCase();
  const category = params.get("category");
  const eligibleOnly = params.get("eligibleOnly") === "true";
  const availableOnly = params.get("availableOnly") === "true";

  const courses = await db.course.findMany({
    include: { sections: { include: { meetings: true }, orderBy: { sectionCode: "asc" } } },
    orderBy: { id: "asc" },
  });
  const completed = user
    ? await db.completedCourse.findMany({ where: { userId: user.studentNo } })
    : [];

  let items = courses.map((c) => {
    const eligibility = user ? checkEligibility(c, user, completed) : null;
    return {
      id: c.id,
      titleZh: c.titleZh,
      titleEn: c.titleEn,
      credits: c.credits,
      category: c.category,
      instructorZh: c.instructorZh,
      instructorEn: c.instructorEn,
      rating: c.rating,
      reviews: c.reviews,
      demand: c.demand,
      workload: c.workload,
      tone: c.tone,
      descriptionZh: c.descriptionZh,
      descriptionEn: c.descriptionEn,
      grading: c.grading,
      targetZh: c.targetZh,
      targetEn: c.targetEn,
      eligibility,
      sections: c.sections.map((s) => ({
        id: s.id,
        kind: s.kind,
        sectionCode: s.sectionCode,
        classNbr: s.classNbr,
        capacity: s.capacity,
        enrolledCount: s.enrolledCount,
        availableSeats: availableSeats(s),
        reservedQuota: s.reservedQuota,
        reservedForZh: s.reservedForZh,
        reservedForEn: s.reservedForEn,
        waitlistCapacity: s.waitlistCapacity,
        waitlistCount: s.waitlistCount,
        meetings: s.meetings.map((m) => ({
          dayOfWeek: m.dayOfWeek, startMin: m.startMin, endMin: m.endMin,
          room: m.room, dateStart: m.dateStart, dateEnd: m.dateEnd,
        })),
      })),
    };
  });

  if (q) {
    items = items.filter((c) =>
      `${c.id}${c.titleZh}${c.titleEn}${c.instructorZh}${c.instructorEn}`
        .replace(/\s+/g, "")
        .toLowerCase()
        .includes(q)
    );
  }
  if (category) items = items.filter((c) => c.category === category);
  if (eligibleOnly) items = items.filter((c) => c.eligibility?.code === "ok");
  if (availableOnly) {
    items = items.filter((c) =>
      c.sections.some((s) => s.kind === "LEC" && s.availableSeats > 0)
    );
  }

  return NextResponse.json({ items, total: items.length });
}
