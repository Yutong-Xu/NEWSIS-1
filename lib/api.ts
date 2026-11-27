/**
 * Static data layer: shapes the seed catalog into the legacy Course interface
 * the components use, with eligibility computed against the visitor persona.
 * No network, no server — everything derives from static modules.
 */
import type { Course } from "./courses.ts";
import { COURSES, TERM, type CourseSeed } from "./seed/catalog.ts";
import type { Persona } from "./persona.ts";

// ---------- types mirroring the catalog shape ----------

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
export interface ApiTerm {
  id: string;
  labelZh: string;
  labelEn: string;
  regOpenAt: string;
  regCloseAt: string;
  addDropCloseAt: string;
  creditLimit: number;
  regOpen: boolean;
  addDropOpen: boolean;
  serverTime: string;
}
export interface ApiMe {
  studentNo: string; nameZh: string; nameEn: string; major: string; year: number;
  creditsCompleted: number; authSource: string;
}

// ---------- static catalog shaping ----------

function shapeCourse(c: CourseSeed, persona: Persona): ApiCourse {
  const completed = new Set(persona.completed.map((x) => x.courseCode));
  let eligibility: ApiCourse["eligibility"] = null;
  const missing = (c.prereqCourseIds ?? []).filter((p) => !completed.has(p));
  if (missing.length) {
    eligibility = { code: "prereq", reasonZh: `缺少先修课程：${missing.join("、")}`, reasonEn: `Missing prerequisite: ${missing.join(", ")}` };
  } else if (c.minYear != null && persona.year < c.minYear) {
    eligibility = { code: "year", reasonZh: `仅面向 ${c.minYear} 年级及以上学生（你当前为 ${persona.year} 年级）`, reasonEn: `Open to Year ${c.minYear} and above only (you are Year ${persona.year})` };
  } else if (c.majorsAllowed?.length && !c.majorsAllowed.includes(persona.major)) {
    eligibility = { code: "major", reasonZh: `仅面向 ${c.majorsAllowed.join("/")} 专业学生`, reasonEn: `Open to ${c.majorsAllowed.join("/")} majors only` };
  } else {
    const hit = (c.excludedCourseIds ?? []).find((e) => completed.has(e));
    if (hit) eligibility = { code: "excluded", reasonZh: `已修读 ${hit}，不可重复修读本课程`, reasonEn: `You have completed ${hit}, which excludes this course` };
  }
  return {
    id: c.id, titleZh: c.titleZh, titleEn: c.titleEn, credits: c.credits, category: c.category,
    instructorZh: c.instructorZh, instructorEn: c.instructorEn,
    rating: c.rating ?? null, reviews: c.reviews ?? null,
    demand: c.demand, workload: c.workload, tone: c.tone,
    descriptionZh: c.descriptionZh, descriptionEn: c.descriptionEn, grading: c.grading ?? "A–F",
    targetZh: c.targetZh ?? null, targetEn: c.targetEn ?? null,
    eligibility,
    sections: c.sections.map((s) => ({
      id: `${c.id}-${s.code}`, kind: s.kind, sectionCode: s.code, classNbr: s.classNbr,
      capacity: s.capacity, enrolledCount: s.enrolled,
      availableSeats: Math.max(0, s.capacity - s.enrolled - (s.reservedQuota ?? 0)),
      reservedQuota: s.reservedQuota ?? 0,
      reservedForZh: s.reservedForZh ?? null, reservedForEn: s.reservedForEn ?? null,
      waitlistCapacity: s.waitlistCapacity ?? 0, waitlistCount: s.waitlistCount ?? 0,
      meetings: s.meetings.flatMap((m) => m.days.map((d) => ({ dayOfWeek: d, startMin: m.start, endMin: m.end, room: m.room }))),
    })),
  };
}

/** Static catalog shaped for the current visitor. */
export function catalogFor(persona: Persona): ApiCourse[] {
  return COURSES.map((c) => shapeCourse(c, persona));
}

/** Static term state, computed against the real clock. */
export function termState(): ApiTerm {
  const now = new Date();
  return {
    id: TERM.id, labelZh: TERM.labelZh, labelEn: TERM.labelEn,
    regOpenAt: TERM.regOpenAt.toISOString(), regCloseAt: TERM.regCloseAt.toISOString(),
    addDropCloseAt: TERM.addDropCloseAt.toISOString(),
    creditLimit: TERM.creditLimit,
    regOpen: now >= TERM.regOpenAt && now <= TERM.regCloseAt,
    addDropOpen: now >= TERM.regOpenAt && now <= TERM.addDropCloseAt,
    serverTime: now.toISOString(),
  };
}

/** Persona as the profile shape components expect. */
export function personaAsMe(persona: Persona): ApiMe {
  return {
    studentNo: persona.studentNo, nameZh: persona.nameZh, nameEn: persona.nameEn,
    major: persona.major, year: persona.year,
    creditsCompleted: persona.completed.reduce((s, c) => s + c.credits, 0),
    authSource: "local",
  };
}

// ---------- adapter: ApiCourse -> legacy Course ----------

export function adaptCourse(c: ApiCourse): Course {
  const lec = c.sections.find((s) => s.kind === "LEC");
  const firstMeeting = lec?.meetings[0];
  const daySet = new Set<number>();
  for (const m of lec?.meetings ?? []) daySet.add(m.dayOfWeek);
  const days = [...daySet].sort();
  const start = firstMeeting ? firstMeeting.startMin / 60 : 9;
  const end = firstMeeting ? firstMeeting.endMin / 60 : 10;
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
    section: lec?.sectionCode ? `Section ${lec.sectionCode}` : undefined,
    target: c.targetZh ?? undefined,
    rating: c.rating ?? undefined,
    reviews: c.reviews ?? undefined,
    _sections: c.sections,
    _eligibility: c.eligibility,
  } as Course;
}


/**
 * Re-project a legacy Course onto chosen sections.
 * `choice` is "LEC" alone or "LEC:TUT" — the LEC drives timing/seats, and an
 * optional TUT's meetings are merged into the projected timetable so conflict
 * checks see lecture+tutorial together. Nothing mutates the base course.
 */
export function withSection(base: Course, choice: string | undefined): Course {
  const sections = (base as Course & { _sections?: ApiSection[] })._sections;
  if (!sections) return base;
  const [lecCode, tutCode] = (choice ?? "").split(":");
  const lecs = sections.filter((s) => s.kind === "LEC");
  const lec = lecs.find((s) => s.sectionCode === lecCode) ?? lecs[0];
  if (!lec) return base;
  const tut = tutCode ? sections.find((s) => s.kind === "TUT" && s.sectionCode === tutCode) : undefined;
  const firstMeeting = lec.meetings[0];
  const daySet = new Set<number>();
  for (const m of lec.meetings) daySet.add(m.dayOfWeek);
  // projected slot window must span lecture AND tutorial so conflict checks and
  // the timetable see both meetings
  let start = firstMeeting ? firstMeeting.startMin / 60 : base.start;
  let end = firstMeeting ? firstMeeting.endMin / 60 : base.end;
  if (tut) {
    for (const m of tut.meetings) {
      daySet.add(m.dayOfWeek);
      start = Math.min(start, m.startMin / 60);
      end = Math.max(end, m.endMin / 60);
    }
  }
  const label = tut ? `Section ${lec.sectionCode} · ${tut.sectionCode}` : `Section ${lec.sectionCode}`;
  return {
    ...base,
    days: [...daySet].sort(),
    start,
    end,
    seats: Math.max(0, lec.availableSeats),
    capacity: lec.capacity,
    quota: lec.reservedQuota,
    wait: lec.waitlistCount,
    section: label,
    _tut: tut,
    // the projected course carries ONLY the chosen sections' meetings — per-meeting
    // conflict checks must not see the unchosen alternatives
    _sections: tut ? [lec, tut] : [lec],
  } as Course;
}

/** Sections of one kind available for a course (for pickers). */
export function sectionsOfKind(base: Course, kind: "LEC" | "TUT"): ApiSection[] {
  const sections = (base as Course & { _sections?: ApiSection[] })._sections;
  return sections ? sections.filter((s) => s.kind === kind) : [];
}

/** Back-compat: lecture sections. */
export function lectureSections(base: Course): ApiSection[] {
  return sectionsOfKind(base, "LEC");
}
