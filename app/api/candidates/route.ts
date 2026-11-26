import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getSessionUser, unauthorized } from "@/lib/db/auth";

function err(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** GET /api/candidates — the user's candidate courses (dismissed flagged). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const items = await db.candidate.findMany({
    where: { userId: user.studentNo },
    orderBy: { addedAt: "asc" },
  });
  return NextResponse.json({
    items: items.map((c) => ({ courseId: c.courseId, dismissed: c.dismissed, addedAt: c.addedAt })),
    total: items.length,
  });
}

/** POST /api/candidates { courseId } — add candidate (undismisses if previously dismissed). */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  let body: { courseId?: string };
  try { body = await req.json(); } catch { return err(400, "bad_request", "请求格式错误"); }
  if (!body.courseId) return err(400, "bad_request", "缺少 courseId");
  const course = await db.course.findUnique({ where: { id: body.courseId } });
  if (!course) return err(404, "not_found", "课程不存在");
  await db.candidate.upsert({
    where: { userId_courseId: { userId: user.studentNo, courseId: body.courseId } },
    update: { dismissed: false },
    create: { userId: user.studentNo, courseId: body.courseId },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}

/** DELETE /api/candidates?courseId= — soft-dismiss (undoable, matches the prototype's toast undo). */
export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const courseId = req.nextUrl.searchParams.get("courseId");
  if (!courseId) return err(400, "bad_request", "缺少 courseId");
  await db.candidate.updateMany({
    where: { userId: user.studentNo, courseId },
    data: { dismissed: true },
  });
  return NextResponse.json({ ok: true });
}
