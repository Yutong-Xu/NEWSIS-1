/**
 * Idempotent seed: everything is upserted, safe to re-run.
 * Data sources: lib/seed/catalog.ts (courses), lib/seed/users.ts (accounts/academics).
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { COURSES, TERM } from "../lib/seed/catalog.ts";
import { DEMO_USERS, DEGREE_REQUIREMENTS, NOTIFICATIONS } from "../lib/seed/users.ts";

const db = new PrismaClient();

async function main() {
  // term
  await db.term.upsert({
    where: { id: TERM.id },
    update: {},
    create: {
      id: TERM.id,
      labelZh: TERM.labelZh,
      labelEn: TERM.labelEn,
      regOpenAt: TERM.regOpenAt,
      regCloseAt: TERM.regCloseAt,
      addDropCloseAt: TERM.addDropCloseAt,
      creditLimit: TERM.creditLimit,
    },
  });

  // courses + sections + meetings (full replace per course for idempotency:
  // delete then recreate keeps it simple — seed data is authoritative)
  for (const c of COURSES) {
    await db.course.upsert({
      where: { id: c.id },
      update: {
        titleZh: c.titleZh, titleEn: c.titleEn, credits: c.credits, category: c.category,
        instructorZh: c.instructorZh, instructorEn: c.instructorEn,
        rating: c.rating ?? null, reviews: c.reviews ?? null,
        demand: c.demand, workload: c.workload, tone: c.tone,
        descriptionZh: c.descriptionZh, descriptionEn: c.descriptionEn,
        grading: c.grading ?? "Graded",
        minYear: c.minYear ?? null,
        majorsAllowed: c.majorsAllowed ? JSON.stringify(c.majorsAllowed) : null,
        prereqCourseIds: c.prereqCourseIds ? JSON.stringify(c.prereqCourseIds) : null,
        excludedCourseIds: c.excludedCourseIds ? JSON.stringify(c.excludedCourseIds) : null,
        targetZh: c.targetZh ?? null, targetEn: c.targetEn ?? null,
      },
      create: {
        id: c.id, termId: TERM.id,
        titleZh: c.titleZh, titleEn: c.titleEn, credits: c.credits, category: c.category,
        instructorZh: c.instructorZh, instructorEn: c.instructorEn,
        rating: c.rating ?? null, reviews: c.reviews ?? null,
        demand: c.demand, workload: c.workload, tone: c.tone,
        descriptionZh: c.descriptionZh, descriptionEn: c.descriptionEn,
        grading: c.grading ?? "Graded",
        minYear: c.minYear ?? null,
        majorsAllowed: c.majorsAllowed ? JSON.stringify(c.majorsAllowed) : null,
        prereqCourseIds: c.prereqCourseIds ? JSON.stringify(c.prereqCourseIds) : null,
        excludedCourseIds: c.excludedCourseIds ? JSON.stringify(c.excludedCourseIds) : null,
        targetZh: c.targetZh ?? null, targetEn: c.targetEn ?? null,
      },
    });
    for (const s of c.sections) {
      const sectionId = `${c.id}-${s.code}`;
      // only reset enrollment numbers when the section is (re)created —
      // re-seeding must not wipe live registration state
      const existing = await db.section.findUnique({ where: { id: sectionId } });
      await db.section.upsert({
        where: { id: sectionId },
        update: {
          capacity: s.capacity, reservedQuota: s.reservedQuota ?? 0,
          reservedForZh: s.reservedForZh ?? null, reservedForEn: s.reservedForEn ?? null,
          waitlistCapacity: s.waitlistCapacity ?? 0,
        },
        create: {
          id: sectionId, courseId: c.id, kind: s.kind, sectionCode: s.code, classNbr: s.classNbr,
          capacity: s.capacity, enrolledCount: s.enrolled,
          reservedQuota: s.reservedQuota ?? 0,
          reservedForZh: s.reservedForZh ?? null, reservedForEn: s.reservedForEn ?? null,
          waitlistCapacity: s.waitlistCapacity ?? 0, waitlistCount: s.waitlistCount ?? 0,
        },
      });
      if (!existing) {
        for (const m of s.meetings) {
          for (const day of m.days) {
            await db.meeting.create({
              data: {
                sectionId, dayOfWeek: day, startMin: m.start, endMin: m.end,
                room: m.room, dateStart: TERM.dateStart, dateEnd: TERM.dateEnd,
              },
            });
          }
        }
      }
    }
  }

  // demo users + academic history
  for (const u of DEMO_USERS) {
    const passwordHash = bcrypt.hashSync(u.password, 10);
    await db.user.upsert({
      where: { studentNo: u.studentNo },
      update: { nameZh: u.nameZh, nameEn: u.nameEn, major: u.major, year: u.year, creditsCompleted: u.creditsCompleted },
      create: {
        studentNo: u.studentNo, passwordHash, authSource: "demo",
        nameZh: u.nameZh, nameEn: u.nameEn, major: u.major, year: u.year,
        creditsCompleted: u.creditsCompleted,
      },
    });
    for (const cc of u.completed) {
      await db.completedCourse.upsert({
        where: { userId_courseCode: { userId: u.studentNo, courseCode: cc.courseCode } },
        update: { credits: cc.credits, grade: cc.grade, term: cc.term },
        create: { userId: u.studentNo, ...cc },
      });
    }
  }

  // degree requirements
  for (const r of DEGREE_REQUIREMENTS) {
    await db.degreeRequirement.upsert({
      where: { major_category: { major: r.major, category: r.category } },
      update: { requiredCredits: r.requiredCredits, labelZh: r.labelZh, labelEn: r.labelEn },
      create: r,
    });
  }

  // notifications: broadcast ones are recreated only if none exist (they are content seed, not state)
  const existingNotifs = await db.notification.count();
  if (existingNotifs === 0) {
    for (const n of NOTIFICATIONS) {
      await db.notification.create({
        data: { userId: null, courseId: n.courseId, kind: n.kind, bodyZh: n.bodyZh, bodyEn: n.bodyEn },
      });
    }
  }

  console.log(`seed ok: ${COURSES.length} courses, ${DEMO_USERS.length} users, ${DEGREE_REQUIREMENTS.length} requirements`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
