import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";

/**
 * GET /api/term — registration window state, the single source of truth
 * for homepage banner, registration button and submission validation (P0-10).
 */
export async function GET() {
  const term = await db.term.findUniqueOrThrow({ where: { id: "2026-Fall" } });
  const now = process.env.SIS_TIME_OVERRIDE ? new Date(process.env.SIS_TIME_OVERRIDE) : new Date();
  const regOpen = now >= term.regOpenAt && now <= term.regCloseAt;
  const addDropOpen = now >= term.regOpenAt && now <= term.addDropCloseAt;
  return NextResponse.json({
    id: term.id,
    labelZh: term.labelZh,
    labelEn: term.labelEn,
    regOpenAt: term.regOpenAt,
    regCloseAt: term.regCloseAt,
    addDropCloseAt: term.addDropCloseAt,
    creditLimit: term.creditLimit,
    regOpen,
    addDropOpen,
    serverTime: now,
  });
}
