import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getSessionUser, unauthorized } from "@/lib/db/auth";
import { dropEnrollment, safeSwap } from "@/lib/db/registration-service";

function err(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** GET /api/enrollment — the user's enrolled sections for the current term. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const items = await db.enrollment.findMany({
    where: { userId: user.studentNo, status: "enrolled" },
    include: { section: { include: { meetings: true, course: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({
    items: items.map((e) => ({
      sectionId: e.sectionId,
      courseId: e.section.courseId,
      kind: e.section.kind,
      sectionCode: e.section.sectionCode,
      credits: e.section.course.credits,
      source: e.source,
      meetings: e.section.meetings.map((m) => ({
        dayOfWeek: m.dayOfWeek, startMin: m.startMin, endMin: m.endMin, room: m.room,
      })),
    })),
    total: items.length,
  });
}

/**
 * POST /api/enrollment — add/drop operations.
 * { action: "drop", sectionId }
 * { action: "swap", fromSectionId, toSectionId } — validated first, original kept on failure
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  let body: { action?: string; sectionId?: string; fromSectionId?: string; toSectionId?: string };
  try { body = await req.json(); } catch { return err(400, "bad_request", "请求格式错误"); }

  if (body.action === "drop" && body.sectionId) {
    const result = await dropEnrollment(user.studentNo, body.sectionId);
    if ("error" in result) return err(404, result.code, result.error);
    return NextResponse.json({ ok: true });
  }
  if (body.action === "swap" && body.fromSectionId && body.toSectionId) {
    const result = await safeSwap(user.studentNo, body.fromSectionId, body.toSectionId);
    if ("error" in result) return err(409, result.code, result.error);
    return NextResponse.json({ ok: true });
  }
  return err(400, "bad_request", "不支持的操作");
}
