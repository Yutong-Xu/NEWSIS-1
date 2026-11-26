import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getSessionUser, unauthorized } from "@/lib/db/auth";

/** GET /api/notifications — broadcast + user-targeted notifications, newest first. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const items = await db.notification.findMany({
    where: { OR: [{ userId: null }, { userId: user.studentNo }] },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    items: items.map((n) => ({
      id: n.id, courseId: n.courseId, kind: n.kind,
      bodyZh: n.bodyZh, bodyEn: n.bodyEn, createdAt: n.createdAt, read: n.readAt != null,
    })),
    total: items.length,
  });
}
