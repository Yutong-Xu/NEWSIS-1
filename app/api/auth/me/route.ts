import { NextResponse } from "next/server";
import { getSessionUser, unauthorized } from "@/lib/db/auth";

/** GET /api/auth/me — current session user profile. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  return NextResponse.json({
    studentNo: user.studentNo,
    nameZh: user.nameZh,
    nameEn: user.nameEn,
    major: user.major,
    year: user.year,
    creditsCompleted: user.creditsCompleted,
    authSource: user.authSource,
  });
}
