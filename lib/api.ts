/**
 * Frontend API layer: fetch helpers + hooks + the compatibility adapter
 * that shapes API course data into the legacy Course interface used by
 * the existing components (lib/courses.ts). Visual structure unchanged.
 */
import { useCallback, useEffect, useState } from "react";
import type { Course } from "@/lib/courses";

// ---------- types mirroring the API DTOs ----------

export interface ApiMeeting { dayOfWeek: number; startMin: number; endMin: number; room: string }
export interface ApiSection {
  id: string; kind: "LEC" | "TUT"; sectionCode: string; classNbr: number;
  capacity: number; enrolledCount: number; availableSeats: number;
  reservedQuota: number; reservedForZh: string | null; reservedForEn: string | null;
  waitlistCapacity: number; waitlistCount: number;
  meetings: ApiMeeting[];
}
export interface ApiCourse {
  id: string; titleZh: string; titleEn: string; credits: number; category: string;
  instructorZh: string; instructorEn: string; rating: number | null; reviews: number | null;
  demand: string; workload: string; tone: string;
  descriptionZh: string; descriptionEn: string; grading: string;
  targetZh: string | null; targetEn: string | null;
  eligibility: { code: string; reasonZh: string; reasonEn: string } | null;
  sections: ApiSection[];
}
export interface ApiPlanItem { id: string; courseId: string; sectionId: string; tutorialSectionId: string | null }
export interface ApiPlan { id: string; name: string; items: ApiPlanItem[]; backups: { id: string; courseId: string; sectionId: string }[] }
export interface ApiTerm {
  id: string; labelZh: string; labelEn: string; creditLimit: number;
  regOpenAt: string; regCloseAt: string; addDropCloseAt: string;
  regOpen: boolean; addDropOpen: boolean;
}
export interface ApiEnrollment {
  sectionId: string; courseId: string; kind: string; sectionCode: string; credits: number;
  meetings: ApiMeeting[];
}
export interface ApiMe {
  studentNo: string; nameZh: string; nameEn: string; major: string; year: number;
  creditsCompleted: number; authSource: string;
}

// ---------- fetch helper ----------

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
  }
}

export async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: init?.body ? { "content-type": "application/json", ...init?.headers } : init?.headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = data?.error ?? {};
    throw new ApiError(res.status, e.code ?? "unknown", e.message ?? `HTTP ${res.status}`, e.details);
  }
  return data as T;
}

// ---------- generic resource hook ----------

export function useApiResource<T>(path: string | null): {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!path) return;
    let alive = true;
    setLoading(true);
    api<T>(path)
      .then((d) => { if (alive) { setData(d); setError(null); } })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : "error"); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [path, tick]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, loading, error, reload };
}

// ---------- legacy shape adapter ----------

const minToHour = (m: number) => m / 60;

/**
 * Adapt an API course to the legacy Course shape the components were built on.
 * Section data is attached as `_sections` so new features can use it while
 * the existing rendering keeps working untouched.
 */
export function adaptCourse(c: ApiCourse): Course & { _sections: ApiSection[]; _eligibility: ApiCourse["eligibility"] } {
  const lecs = c.sections.filter((s) => s.kind === "LEC");
  const lec = lecs[0];
  // collapse meetings: same start/end across days is the norm in our catalog
  const meetings = lec?.meetings ?? [];
  const days = meetings.map((m) => m.dayOfWeek).sort();
  const start = meetings[0] ? minToHour(meetings[0].startMin) : 0;
  const end = meetings[0] ? minToHour(meetings[0].endMin) : 0;
  const seats = lec ? Math.max(0, lec.availableSeats) : 0;
  return {
    id: c.id,
    title: c.titleZh,
    english: c.titleEn,
    instructor: c.instructorEn,
    days,
    start,
    end,
    seats,
    capacity: lec?.capacity ?? 0,
    quota: lec?.reservedQuota ?? 0,
    wait: lec?.waitlistCount ?? 0,
    category: ({ major_required: "专业必修", major_elective: "专业选修", general_education: "通识教育", free_elective: "自由选修" } as Record<string, string>)[c.category] ?? c.category,
    workload: c.workload,
    demand: c.demand,
    tone: c.tone,
    eligible: c.eligibility ? c.eligibility.code === "ok" : true,
    credits: c.credits,
    target: c.targetZh ?? undefined,
    rating: c.rating ?? undefined,
    reviews: c.reviews ?? undefined,
    _sections: c.sections,
    _eligibility: c.eligibility,
  };
}
