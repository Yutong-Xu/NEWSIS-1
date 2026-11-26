import { conflicts, type Course } from './courses.ts';

export type RegistrationStatus = 'registered' | 'failed' | 'waitlist';
export type RegistrationResults = Record<string, RegistrationStatus>;

/**
 * Client-side registration engine — the single source of truth for simulated
 * registration. All write operations (register / waitlist / drop / swap) are
 * browser-local simulations; nothing is written to any school system and the
 * server database stores only read-only reference data (catalog, requirements,
 * accounts) plus auth sessions.
 */

export type FailReason = 'prereq' | 'year' | 'excluded' | 'full' | 'conflict' | 'credit_limit' | 'time_window' | 'already_enrolled';

export interface RegistrationOutcome {
  courseId: string;
  status: RegistrationStatus;
  failReason?: FailReason;
  failDetailZh?: string;
  failDetailEn?: string;
  waitlistPosition?: number;
}

// Registered sections are snapshots: editing a plan never moves an enrolled class.
export function registrationCheck(target: Course[], registered: Course[]) {
 const existing = new Set(registered.map(c => c.id));
 const additions = target.filter(c => !existing.has(c.id));
 const combined = [...registered, ...additions];
 return {
  additions,
  retained: registered,
  credits: combined.reduce((sum,c) => sum+c.credits,0),
  conflicts: conflicts(combined),
  ineligible: additions.filter(c => !c.eligible || c.program === false),
  full: additions.filter(c => c.seats <= 0),
  sectionChanges: target.filter(c => {
   const previous=registered.find(r=>r.id===c.id);
   return previous && (previous.start!==c.start || previous.end!==c.end || previous.days.join(',')!==c.days.join(','));
  }),
 };
}

export interface EngineOptions {
  creditLimit: number;
  windowOpen: boolean;
  registered: Course[];
}

/**
 * Simulated registration submission, per-course outcomes.
 * Mirrors the real SIS rules in priority order:
 * time window → already enrolled → eligibility → conflict → credit limit → seats.
 * A full course with remaining waitlist capacity joins the queue instead of failing;
 * positions are simulated from the catalog's current waitlist count (single-browser
 * demo: positions are indicative, not shared across users).
 */
export function submitRegistration(target: Course[], opts: EngineOptions): { outcomes: RegistrationOutcome[]; successful: Course[]; waitlisted: Course[] } {
  const { creditLimit, windowOpen, registered } = opts;
  const enrolledIds = new Set(registered.map(c => c.id));
  const outcomes: RegistrationOutcome[] = [];
  const successful: Course[] = [];
  const waitlisted: Course[] = [];
  // credit running total includes already-registered courses and each new success
  let creditRunning = registered.reduce((s, c) => s + c.credits, 0);
  const scheduleSoFar = [...registered];

  for (const course of target) {
    const out: RegistrationOutcome = { courseId: course.id, status: 'failed' };
    if (!windowOpen) {
      out.failReason = 'time_window';
      out.failDetailZh = '当前不在注册开放时间内';
      out.failDetailEn = 'Outside the registration window';
    } else if (enrolledIds.has(course.id)) {
      out.status = 'registered';
      successful.push(course);
    } else if (!course.eligible || course.program === false) {
      out.failReason = 'prereq';
      out.failDetailZh = '未满足选课资格（先修/年级/专业）';
      out.failDetailEn = 'Eligibility requirements not met';
    } else if (conflicts([...scheduleSoFar, course]).length > conflicts(scheduleSoFar).length) {
      out.failReason = 'conflict';
      out.failDetailZh = '与已选课程时间冲突';
      out.failDetailEn = 'Time conflict with enrolled courses';
    } else if (creditRunning + course.credits > creditLimit) {
      out.failReason = 'credit_limit';
      out.failDetailZh = `超过 ${creditLimit} 学分上限`;
      out.failDetailEn = `Exceeds the ${creditLimit}-credit limit`;
    } else if (course.seats <= 0) {
      // full: join the waitlist if the queue is not yet saturated (simulated threshold)
      if ((course.wait ?? 0) < 20) {
        out.status = 'waitlist';
        out.waitlistPosition = (course.wait ?? 0) + 1;
        waitlisted.push(course);
      } else {
        out.failReason = 'full';
        out.failDetailZh = '课程及候补均已满额';
        out.failDetailEn = 'Course and waitlist are both full';
      }
    } else {
      out.status = 'registered';
      successful.push(course);
      creditRunning += course.credits;
      scheduleSoFar.push(course);
    }
    outcomes.push(out);
  }
  return { outcomes, successful, waitlisted };
}

/** Simulated drop: trivially succeeds for any registered course (window-gated by caller). */
export function dropCourse(registered: Course[], courseId: string): Course[] {
  return registered.filter(c => c.id !== courseId);
}

/** Simulated swap: validate target first, only then commit the change. */
export function swapCourse(registered: Course[], fromId: string, target: Course, opts: EngineOptions): { ok: true; registered: Course[] } | { ok: false; outcome: RegistrationOutcome } {
  const without = registered.filter(c => c.id !== fromId);
  const probe = submitRegistration([target], { ...opts, registered: without });
  const out = probe.outcomes[0];
  if (out.status === 'registered' || out.status === 'waitlist') {
    return { ok: true, registered: out.status === 'registered' ? [...without, target] : without };
  }
  return { ok: false, outcome: out };
}

// Legacy batch helper retained for the guided demo components.
export function registrationBatch(target: Course[], registered: Course[], simulatedFull = '') {
 const existing = new Set(registered.map(c=>c.id));
 const results: RegistrationResults = {};
 const successful: Course[] = [];
 for (const course of target) {
  if (existing.has(course.id)) { results[course.id]='registered'; continue; }
  const failed = course.seats<=0 || course.id===simulatedFull;
  results[course.id]=failed?'failed':'registered';
  if (!failed) successful.push(course);
 }
 return {results,successful};
}
