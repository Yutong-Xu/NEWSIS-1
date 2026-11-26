/**
 * Registration domain service (DESIGN.md §8.2/§8.3).
 * Pure DB-logic module — no HTTP. Used by API routes and tests.
 *
 * Invariants enforced here:
 * - seat decrement is a conditional atomic update (no check-then-write race)
 * - one submission = one transaction; per-course outcomes recorded individually
 * - registered courses are snapshots: editing a plan never moves an enrollment
 * - eligibility priority: prereq → year → major → excluded → full → conflict → credit_limit → time_window
 */
import { db } from "@/lib/db/client";
import { checkEligibility, sectionsConflict, availableSeats } from "@/lib/db/domain";
import type { Prisma } from "@/prisma/generated/client";

export type FailReason =
  | "prereq" | "year" | "major" | "excluded"
  | "full" | "conflict" | "credit_limit" | "time_window"
  | "tutorial_full" | "tutorial_conflict";

export type ItemStatus = "registered" | "failed" | "waitlist";

export interface RegistrationOutcome {
  courseId: string;
  sectionId: string;
  status: ItemStatus;
  failReason?: FailReason;
  failDetailZh?: string;
  failDetailEn?: string;
  waitlistPosition?: number;
}

function sisNow(): Date {
  // time override is a development affordance and must never exist in production
  if (process.env.NODE_ENV !== "production" && process.env.SIS_TIME_OVERRIDE) {
    return new Date(process.env.SIS_TIME_OVERRIDE);
  }
  return new Date();
}

function registrationWindowOpen(term: { regOpenAt: Date; regCloseAt: Date }): boolean {
  const now = sisNow();
  return now >= term.regOpenAt && now <= term.regCloseAt;
}

function addDropWindowOpen(term: { regOpenAt: Date; addDropCloseAt: Date }): boolean {
  const now = sisNow();
  return now >= term.regOpenAt && now <= term.addDropCloseAt;
}

/**
 * Submit a plan for registration. Atomic: all validation and writes inside
 * one transaction. Returns per-course outcomes.
 */
export async function submitRegistration(userId: string, planId: string): Promise<{
  registrationId: string;
  outcomes: RegistrationOutcome[];
}> {
  return db.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { studentNo: userId } });
    const plan = await tx.plan.findFirstOrThrow({
      where: { id: planId, userId },
      include: {
        term: true,
        items: {
          where: { role: "primary" },
          include: { section: { include: { meetings: true, course: true } }, tutorialSection: { include: { meetings: true } } },
        },
      },
    });
    const term = plan.term;
    const completed = await tx.completedCourse.findMany({ where: { userId } });
    const enrolledSections = await tx.enrollment.findMany({
      where: { userId, termId: term.id, status: "enrolled" },
      include: { section: { include: { meetings: true } } },
    });

    const registration = await tx.registration.create({
      data: { userId, termId: term.id, planId },
    });

    const windowOpen = registrationWindowOpen(term);
    const outcomes: RegistrationOutcome[] = [];
    // running state inside the transaction
    const acceptedSections = [...enrolledSections.map((e) => e.section)];
    let creditRunning = 0;
    const countedCourses = new Set<string>();
    for (const e of enrolledSections) {
      // tutorials share the course credits with their lecture — count each course once
      if (countedCourses.has(e.section.courseId)) continue;
      countedCourses.add(e.section.courseId);
      const c = await tx.course.findUniqueOrThrow({ where: { id: e.section.courseId } });
      creditRunning += c.credits;
    }
    // count of waitlist joins in this batch, per section, for queue position
    const waitlistJoined: Record<string, number> = {};

    for (const item of plan.items) {
      const section = item.section;
      const course = section.course;
      const out: RegistrationOutcome = { courseId: course.id, sectionId: section.id, status: "registered" };
      const fail = (reason: FailReason, zh: string, en: string) => {
        out.status = "failed";
        out.failReason = reason;
        out.failDetailZh = zh;
        out.failDetailEn = en;
      };

      // already enrolled in this exact section → retained, no-op
      const alreadyEnrolled = enrolledSections.some((e) => e.section.courseId === course.id);
      if (alreadyEnrolled) {
        out.status = "registered";
        outcomes.push(out);
        continue;
      }

      // time window first-order check only when closed (it blocks everything)
      if (!windowOpen) {
        fail("time_window", "当前不在注册开放时间内", "Registration is not open");
      } else {
        const eligibility = checkEligibility(course, user, completed);
        if (eligibility.code !== "ok") {
          fail(eligibility.code as FailReason, eligibility.reasonZh, eligibility.reasonEn);
        } else if (availableSeats(section) <= 0) {
          // full: waitlist if open, otherwise failed
          const wlClaim = await tx.section.updateMany({
            where: { id: section.id, waitlistCount: { lt: section.waitlistCapacity } },
            data: { waitlistCount: { increment: 1 } },
          });
          if (wlClaim.count > 0) {
            // position is authoritative: read back after the atomic increment
            const after = await tx.section.findUniqueOrThrow({ where: { id: section.id } });
            out.status = "waitlist";
            out.waitlistPosition = after.waitlistCount;
          } else {
            fail("full", `课程已满额${section.reservedQuota > 0 ? "（部分名额为预留名额）" : ""}`, "Class is full");
          }
        } else {
          // tutorial checks
          const tut = item.tutorialSection;
          if (tut && availableSeats(tut) <= 0) {
            fail("tutorial_full", `辅导课班次 ${tut.sectionCode} 已满额，可尝试更换班次`, `Tutorial section ${tut.sectionCode} is full`);
          } else if (tut && acceptedSections.some((s) => sectionsConflict(s, tut))) {
            fail("tutorial_conflict", `辅导课班次 ${tut.sectionCode} 与已选课程时间冲突`, `Tutorial ${tut.sectionCode} conflicts with your schedule`);
          } else if (acceptedSections.some((s) => sectionsConflict(s, section))) {
            fail("conflict", "与已注册或已入选课程时间冲突", "Time conflict with enrolled or accepted courses");
          } else if (creditRunning + course.credits > term.creditLimit) {
            fail("credit_limit", `加入后将超过 ${term.creditLimit} 学分上限`, `Would exceed the ${term.creditLimit}-credit limit`);
          }
        }
      }

      if (out.status === "registered") {
        // conditional atomic seat decrement — the concurrency guard
        const claim = await tx.section.updateMany({
          where: { id: section.id, enrolledCount: { lt: section.capacity - section.reservedQuota } },
          data: { enrolledCount: { increment: 1 } },
        });
        if (claim.count === 0) {
          // lost the race — treat as full (same waitlist logic would apply; keep simple deterministic outcome)
          out.status = "failed";
          out.failReason = "full";
          out.failDetailZh = "课程已满额";
          out.failDetailEn = "Class is full";
        } else {
          if (item.tutorialSection) {
            const tutClaim = await tx.section.updateMany({
              where: { id: item.tutorialSection.id, enrolledCount: { lt: item.tutorialSection.capacity - item.tutorialSection.reservedQuota } },
              data: { enrolledCount: { increment: 1 } },
            });
            if (tutClaim.count === 0) {
              // tutorial filled up concurrently — release the lecture seat we just claimed
              await tx.section.update({ where: { id: section.id }, data: { enrolledCount: { decrement: 1 } } });
              out.status = "failed";
              out.failReason = "tutorial_full";
              out.failDetailZh = `辅导课班次 ${item.tutorialSection.sectionCode} 已满额`;
              out.failDetailEn = `Tutorial section ${item.tutorialSection.sectionCode} is full`;
              await tx.registrationItem.create({
                data: { registrationId: registration.id, sectionId: section.id, status: out.status, failReason: out.failReason, failDetailZh: out.failDetailZh, failDetailEn: out.failDetailEn, waitlistPosition: null },
              });
              outcomes.push(out);
              continue;
            }
            await tx.enrollment.upsert({
              where: { userId_sectionId_termId: { userId, sectionId: item.tutorialSection.id, termId: term.id } },
              update: { status: "enrolled", droppedAt: null },
              create: { userId, sectionId: item.tutorialSection.id, termId: term.id, source: "plan" },
            });
          }
          await tx.enrollment.upsert({
            where: { userId_sectionId_termId: { userId, sectionId: section.id, termId: term.id } },
            update: { status: "enrolled", droppedAt: null },
            create: { userId, sectionId: section.id, termId: term.id, source: "plan" },
          });
          acceptedSections.push(section);
          creditRunning += course.credits;
        }
      }

      await tx.registrationItem.create({
        data: {
          registrationId: registration.id,
          sectionId: section.id,
          status: out.status,
          failReason: out.failReason ?? null,
          failDetailZh: out.failDetailZh ?? null,
          failDetailEn: out.failDetailEn ?? null,
          waitlistPosition: out.waitlistPosition ?? null,
        },
      });
      outcomes.push(out);
    }

    return { registrationId: registration.id, outcomes };
  });
}

/**
 * Drop an enrolled course. Seat is released in the same transaction.
 * Fails with not_enrolled if the user is not enrolled.
 */
export async function dropEnrollment(userId: string, sectionId: string): Promise<{ ok: true } | { error: string; code: string }> {
  return db.$transaction(async (tx) => {
    const enrollment = await tx.enrollment.findFirst({
      where: { userId, sectionId, status: "enrolled" },
      include: { section: true, term: true },
    });
    if (!enrollment) return { error: "未注册该课程", code: "not_enrolled" };
    // dropping a tutorial alone is meaningless — operate on the lecture so the whole course goes
    if (enrollment.section.kind === "TUT") {
      const lec = await tx.enrollment.findFirst({
        where: { userId, termId: enrollment.termId, status: "enrolled", section: { courseId: enrollment.section.courseId, kind: "LEC" } },
      });
      if (lec) return dropEnrollment(userId, lec.sectionId);
      return { error: "不能单独退选辅导课班次", code: "tutorial_only" };
    }
    if (!addDropWindowOpen(enrollment.term)) return { error: "当前不在加退选开放时间内", code: "time_window" };
    await tx.enrollment.update({ where: { id: enrollment.id }, data: { status: "dropped", droppedAt: new Date() } });
    await tx.section.update({ where: { id: sectionId }, data: { enrolledCount: { decrement: 1 } } });
    // release the paired tutorial of the same course if enrolled
    const siblings = await tx.enrollment.findMany({
      where: { userId, termId: enrollment.termId, status: "enrolled", section: { courseId: enrollment.section.courseId, kind: "TUT" } },
    });
    for (const sib of siblings) {
      await tx.enrollment.update({ where: { id: sib.id }, data: { status: "dropped", droppedAt: new Date() } });
      await tx.section.update({ where: { id: sib.sectionId }, data: { enrolledCount: { decrement: 1 } } });
    }
    return { ok: true as const };
  });
}

/**
 * Safe swap: validate the target FIRST, only then commit the change.
 * mode "section": switch lecture/tutorial section of the same course.
 * mode "replace": replace an enrolled course with another course entirely.
 * On any validation failure the original enrollment is untouched.
 */
export async function safeSwap(
  userId: string,
  fromSectionId: string,
  toSectionId: string
): Promise<{ ok: true } | { error: string; code: FailReason | "not_enrolled" | "invalid_target" }> {
  return db.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { studentNo: userId } });
    const from = await tx.enrollment.findFirst({
      where: { userId, sectionId: fromSectionId, status: "enrolled" },
      include: { section: { include: { meetings: true, course: true } } },
    });
    if (!from) return { error: "未注册原课程", code: "not_enrolled" as const };
    const target = await tx.section.findUnique({
      where: { id: toSectionId },
      include: { meetings: true, course: true },
    });
    if (!target) return { error: "目标班次不存在", code: "invalid_target" as const };

    const sameCourse = target.courseId === from.section.courseId;
    const completed = await tx.completedCourse.findMany({ where: { userId } });

    // validation phase — nothing written yet
    if (!sameCourse) {
      const eligibility = checkEligibility(target.course, user, completed);
      if (eligibility.code !== "ok") return { error: eligibility.reasonZh, code: eligibility.code as FailReason };
    }
    if (availableSeats(target) <= 0) return { error: "目标班次已满额", code: "full" as const };

    const others = await tx.enrollment.findMany({
      where: { userId, termId: from.termId, status: "enrolled", NOT: { sectionId: fromSectionId }, section: { courseId: { not: from.section.courseId } } },
      include: { section: { include: { meetings: true } } },
    });
    if (others.some((o) => sectionsConflict(o.section, target))) {
      return { error: "目标班次与已注册课程时间冲突", code: "conflict" as const };
    }

    // commit phase: claim target seat first (atomic), then release old
    const claim = await tx.section.updateMany({
      where: { id: target.id, enrolledCount: { lt: target.capacity - target.reservedQuota } },
      data: { enrolledCount: { increment: 1 } },
    });
    if (claim.count === 0) return { error: "目标班次已满额", code: "full" as const };

    if (sameCourse && target.kind === from.section.kind) {
      // pure section change: move the enrollment record
      await tx.enrollment.update({ where: { id: from.id }, data: { sectionId: target.id, source: "swap" } });
      await tx.section.update({ where: { id: fromSectionId }, data: { enrolledCount: { decrement: 1 } } });
    } else {
      // replace: drop old, enroll new
      await tx.enrollment.update({ where: { id: from.id }, data: { status: "dropped", droppedAt: new Date() } });
      await tx.section.update({ where: { id: fromSectionId }, data: { enrolledCount: { decrement: 1 } } });
      await tx.enrollment.upsert({
        where: { userId_sectionId_termId: { userId, sectionId: target.id, termId: from.termId } },
        update: { status: "enrolled", droppedAt: null, source: "swap" },
        create: { userId, sectionId: target.id, termId: from.termId, source: "swap" },
      });
    }
    return { ok: true as const };
  });
}

/**
 * Plan-switch diff (P0-7): computed against actual enrollments, not the old plan.
 * Lists what switching to the target plan would keep / add / drop / swap.
 */
export async function planSwitchDiff(userId: string, targetPlanId: string) {
  const plan = await db.plan.findFirstOrThrow({
    where: { id: targetPlanId, userId },
    include: { items: { where: { role: "primary" }, include: { section: true } } },
  });
  const enrollments = await db.enrollment.findMany({
    where: { userId, termId: plan.termId, status: "enrolled" },
    include: { section: true },
  });

  const planCourses = new Map(plan.items.map((i) => [i.section.courseId, i]));
  const enrolledCourses = new Map(enrollments.filter((e) => e.section.kind === "LEC").map((e) => [e.section.courseId, e]));

  const keep = [...planCourses.keys()].filter((c) => enrolledCourses.has(c) && enrolledCourses.get(c)!.sectionId === planCourses.get(c)!.sectionId);
  const sectionSwap = [...planCourses.keys()].filter((c) => enrolledCourses.has(c) && enrolledCourses.get(c)!.sectionId !== planCourses.get(c)!.sectionId);
  const add = [...planCourses.keys()].filter((c) => !enrolledCourses.has(c));
  const drop = [...enrolledCourses.keys()].filter((c) => !planCourses.has(c));

  return {
    keep: keep.map((c) => ({ courseId: c, sectionId: planCourses.get(c)!.sectionId })),
    sectionSwap: sectionSwap.map((c) => ({
      courseId: c,
      fromSectionId: enrolledCourses.get(c)!.sectionId,
      toSectionId: planCourses.get(c)!.sectionId,
    })),
    add: add.map((c) => ({ courseId: c, sectionId: planCourses.get(c)!.sectionId })),
    drop: drop.map((c) => ({ courseId: c, sectionId: enrolledCourses.get(c)!.sectionId })),
  };
}
