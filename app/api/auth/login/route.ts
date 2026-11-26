import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db/client";
import { SESSION_COOKIE, SESSION_TTL_MS } from "@/lib/db/auth";
import { sisLogin } from "@/lib/sis-sso";

/**
 * POST /api/auth/login { studentNo, password } — `studentNo` accepts a demo username or a real student number
 *
 * Branch logic (DESIGN.md §8.1): lookup decides the path, not the client.
 * - demo account (authSource="demo") → bcrypt verify locally, works offline
 * - unknown or sso account → real ADFS/PeopleSoft flow via lib/sis-sso;
 *   real school passwords are NEVER persisted
 */
export async function POST(req: NextRequest) {
  let body: { studentNo?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return err(400, "bad_request", "请求格式错误 / Malformed request");
  }
  const studentNo = (body.studentNo ?? "").trim();
  const password = body.password ?? "";
  if (!studentNo || !password) {
    return err(400, "missing_fields", "请输入用户名或学号和密码 / Username or student ID and password are required");
  }

  // demo accounts are looked up by username; real students by student number.
  // the lookup decides the path — the client cannot choose or bypass it.
  const existing = await db.user.findFirst({
    where: { OR: [{ username: studentNo }, { studentNo }] },
  });

  if (existing?.authSource === "demo" && existing.passwordHash) {
    if (!bcrypt.compareSync(password, existing.passwordHash)) {
      return err(401, "invalid_credentials", "用户名或密码不正确 / Incorrect username or password");
    }
    return issueSession(existing.studentNo);
  }

  // SSO path: verify against the university ADFS, never store the password
  try {
    const session = await sisLogin(studentNo, password);
    // extract the display name from the homepage greeting if possible
    const nameMatch = session.homepageHtml.match(/([\u4e00-\u9fa5]{2,4})\s*\([A-Z]+,\s*[A-Za-z]+\)/);
    const nameZh = nameMatch?.[1] ?? studentNo;
    const nameEn = nameMatch ? nameMatch[0].match(/\(([^)]+)\)/)?.[1] ?? studentNo : studentNo;
    const user = await db.user.upsert({
      where: { studentNo },
      update: { nameZh, nameEn },
      create: {
        studentNo, passwordHash: null, authSource: "sso",
        nameZh, nameEn, major: "CSE", year: 3, creditsCompleted: 0,
      },
    });
    return issueSession(user.studentNo);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("rejected")) {
      return err(401, "invalid_credentials", "用户名或密码不正确 / Incorrect username or password");
    }
    return err(503, "sso_unreachable", "无法连接学校认证服务，演示账号仍可登录 / University authentication is unreachable; demo accounts still work");
  }
}

function err(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

async function issueSession(studentNo: string) {
  const id = randomBytes(32).toString("hex");
  await db.session.create({
    data: { id, userId: studentNo, expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
  });
  const res = NextResponse.json({ ok: true, studentNo });
  res.cookies.set(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_MS / 1000,
    path: "/",
  });
  return res;
}
