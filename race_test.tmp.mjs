// concurrency race test: 8 parallel users fight for a section with 2 seats left
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '/Users/dsanying/Desktop/Github/NEWSIS-1/prisma/generated/client.ts';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
process.chdir('/Users/dsanying/Desktop/Github/NEWSIS-1');
const url = 'file:' + path.resolve('prisma/dev.db');
const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });

// setup: pick a section, set it nearly full
const sec = await db.section.findFirst({ where: { kind: 'LEC', capacity: { gte: 50 } } });
await db.section.update({ where: { id: sec.id }, data: { enrolledCount: sec.capacity - sec.reservedQuota - 2 } });
console.log(`test section ${sec.id}: cap ${sec.capacity}, quota ${sec.reservedQuota}, avail 2`);

// create 8 temp users
const users = [];
for (let i = 0; i < 8; i++) {
  const no = 'racetest' + i;
  await db.user.upsert({ where: { studentNo: no }, update: {}, create: { studentNo: no, authSource: 'demo', nameZh: 't', nameEn: 't', major: 'CSE', year: 3 } });
  users.push(no);
}
// clear enrollments for the course
await db.enrollment.deleteMany({ where: { sectionId: sec.id } });

// each user submits a plan containing the section — simulate via service logic inline
const { submitRegistration } = await import('/Users/dsanying/Desktop/Github/NEWSIS-1/lib/db/registration-service.ts');
// need db client to be same db: registration-service uses lib/db/client which reads .env — same file. ok.

// create plans
for (const no of users) {
  const term = await db.term.findFirst();
  const plan = await db.plan.upsert({
    where: { userId_name: { userId: no, name: 'R' } },
    update: {},
    create: { userId: no, name: 'R', termId: term.id },
  });
  await db.planItem.deleteMany({ where: { planId: plan.id } });
  await db.planItem.create({ data: { planId: plan.id, sectionId: sec.id } });
}

const results = await Promise.allSettled(users.map(async no => {
  const plan = await db.plan.findFirst({ where: { userId: no } });
  return submitRegistration(no, plan.id);
}));

let registered = 0, failed = 0;
for (const r of results) {
  if (r.status === 'fulfilled') {
    for (const o of r.value.outcomes) {
      if (o.status === 'registered') registered++;
      else failed++;
    }
  } else console.log('rejected:', r.reason?.message?.slice(0, 80));
}
const final = await db.section.findUnique({ where: { id: sec.id } });
const enrollmentRows = await db.enrollment.count({ where: { sectionId: sec.id, status: 'enrolled' } });
console.log(`registered=${registered} failed=${failed}`);
console.log(`final enrolledCount=${final.enrolledCount}, actual enrollment rows=${enrollmentRows}, cap-reserved=${final.capacity - final.reservedQuota}`);
console.log(`RACE VERDICT: ${final.enrolledCount <= final.capacity - final.reservedQuota && final.enrolledCount === enrollmentRows + (await db.enrollment.count({where:{sectionId:sec.id,status:'enrolled'}}) - enrollmentRows) ? 'PASS - no oversell' : 'CHECK'}`);
console.log(`enrolledCount(${final.enrolledCount}) === rows(${enrollmentRows})?`, final.enrolledCount === enrollmentRows ? 'consistent' : 'INCONSISTENT');
console.log(`oversold?`, final.enrolledCount > final.capacity - final.reservedQuota ? 'YES - BUG' : 'no');
await db.$disconnect();
