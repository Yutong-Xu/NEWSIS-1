/**
 * Server-side domain logic: section-aware course model helpers.
 * Pure functions over DB shapes — shared by API routes and tests.
 * Time model: minutes since midnight, days 0=Mon..4=Fri.
 */
import type { Course, Section, Meeting, User, CompletedCourse } from "@prisma/client";

export type SectionWithMeetings = Section & { meetings: Meeting[] };
export type CourseWithSections = Course & { sections: SectionWithMeetings[] };

export function parseJsonArray(value: string | null): string[] {
  if (!value) return [];
  try { return JSON.parse(value); } catch { return []; }
}

export function meetingsOverlap(a: Meeting, b: Meeting): boolean {
  return a.dayOfWeek === b.dayOfWeek && a.startMin < b.endMin && b.startMin < a.endMin;
}

/** Any meeting overlap between two sections. */
export function sectionsConflict(a: SectionWithMeetings, b: SectionWithMeetings): boolean {
  if (a.id === b.id) return false;
  return a.meetings.some((ma) => b.meetings.some((mb) => meetingsOverlap(ma, mb)));
}

/** Conflicting pairs across a list of sections (LEC+TUT of same course do not conflict). */
export function conflictPairs(sections: SectionWithMeetings[]): [SectionWithMeetings, SectionWithMeetings][] {
  const pairs: [SectionWithMeetings, SectionWithMeetings][] = [];
  for (let i = 0; i < sections.length; i++) {
    for (let j = i + 1; j < sections.length; j++) {
      const [a, b] = [sections[i], sections[j]];
      if (a.courseId === b.courseId) continue;
      if (sectionsConflict(a, b)) pairs.push([a, b]);
    }
  }
  return pairs;
}

export type EligibilityCode = "ok" | "prereq" | "year" | "major" | "excluded";

export interface EligibilityResult {
  code: EligibilityCode;
  reasonZh: string;
  reasonEn: string;
}

/**
 * Per-user eligibility for a course, evaluated in the documented priority order
 * (DESIGN.md §8.3): prereq → year → major → excluded.
 */
export function checkEligibility(
  course: Course,
  user: User,
  completed: CompletedCourse[]
): EligibilityResult {
  const completedCodes = new Set(completed.map((c) => c.courseCode));
  const prereqs = parseJsonArray(course.prereqCourseIds);
  const missing = prereqs.filter((p) => !completedCodes.has(p));
  if (missing.length > 0) {
    return {
      code: "prereq",
      reasonZh: `缺少先修课程：${missing.join("、")}`,
      reasonEn: `Missing prerequisite: ${missing.join(", ")}`,
    };
  }
  if (course.minYear != null && user.year < course.minYear) {
    return {
      code: "year",
      reasonZh: `仅面向 ${course.minYear} 年级及以上学生（你当前为 ${user.year} 年级）`,
      reasonEn: `Open to Year ${course.minYear} and above only (you are Year ${user.year})`,
    };
  }
  const majors = parseJsonArray(course.majorsAllowed);
  if (majors.length > 0 && !majors.includes(user.major)) {
    return {
      code: "major",
      reasonZh: `仅面向 ${majors.join("/")} 专业学生`,
      reasonEn: `Open to ${majors.join("/")} majors only`,
    };
  }
  const excluded = parseJsonArray(course.excludedCourseIds);
  const hit = excluded.find((e) => completedCodes.has(e));
  if (hit) {
    return {
      code: "excluded",
      reasonZh: `已修读 ${hit}，不可重复修读本课程`,
      reasonEn: `You have completed ${hit}, which excludes this course`,
    };
  }
  return { code: "ok", reasonZh: "", reasonEn: "" };
}

/** Effective available seats accounting for reserved quota (DESIGN.md: reserved quota restricts availability). */
export function availableSeats(section: Section): number {
  return section.capacity - section.enrolledCount - section.reservedQuota;
}

export function formatTime(minutes: number): string {
  return `${Math.floor(minutes / 60).toString().padStart(2, "0")}:${(minutes % 60).toString().padStart(2, "0")}`;
}

export const DAY_NAMES_ZH = ["周一", "周二", "周三", "周四", "周五"];
export const DAY_NAMES_EN = ["Mon", "Tue", "Wed", "Thu", "Fri"];
