/**
 * Domain logic tests: eligibility against personas, seat accounting,
 * client registration engine. Runs with plain node — pure functions.
 */
import assert from "node:assert/strict";
import { catalogFor } from "../lib/api.ts";
import { submitRegistration } from "../lib/registration.ts";

// a minimal persona shape (mirrors lib/persona.ts)
const persona = (overrides) => ({
  studentNo: "1", nameZh: "x", nameEn: "x", major: "CSE", year: 3, completed: [], ...overrides,
});
const done = (courseCode) => ({ courseCode, credits: 3, grade: "A", term: "t" });

// --- eligibility: static catalog shaped per persona
{
  const yuqing = persona({ completed: [done("CSC3002"), done("MAT2041"), done("CSC1003")] });
  const cat = catalogFor(yuqing);
  const csc4130 = cat.find((c) => c.id === "CSC4130");
  assert.equal(csc4130.eligibility, null, "CSC4130 eligible with CSC3002 done");
  const csc4100 = cat.find((c) => c.id === "CSC4100");
  assert.equal(csc4100?.eligibility?.code, "prereq", "CSC4100 blocked without CSC3170");

  const freshman = persona({ year: 1, completed: [] });
  const catFresh = catalogFor(freshman);
  assert.equal(catFresh.find((c) => c.id === "CSC4130")?.eligibility?.code, "prereq", "freshman missing prereq");
  const yearGated = catFresh.find((c) => c.eligibility?.code === "year");
  assert.ok(yearGated || catFresh.every((c) => c.eligibility?.code !== "ok"), "freshman faces restrictions");
}

// --- seat accounting: available seats respect reserved quota
{
  const cat = catalogFor(persona());
  const csc4130 = cat.find((c) => c.id === "CSC4130");
  const lec = csc4130.sections.find((s) => s.kind === "LEC");
  assert.equal(lec.availableSeats, Math.max(0, lec.capacity - lec.enrolledCount - lec.reservedQuota), "reserved quota deducted");
}

// --- registration engine: priority-ordered validation
{
  const mkCourse = (id, overrides) => ({
    id, title: id, english: id, instructor: "x", days: [1], start: 14, end: 15.25,
    seats: 10, capacity: 60, quota: 0, wait: 0, category: "专业选修", workload: "中",
    demand: "中", tone: "teal", eligible: true, credits: 3, ...overrides,
  });
  const opts = { creditLimit: 18, windowOpen: true, registered: [] };
  const c1 = mkCourse("A1000");
  const clash = mkCourse("B1000"); // same time → conflict when combined
  const full = mkCourse("C1000", { seats: 0, wait: 3 });
  const ineligible = mkCourse("D1000", { eligible: false });

  const r1 = submitRegistration([c1], opts);
  assert.equal(r1.outcomes[0].status, "registered", "plain course registers");

  const r2 = submitRegistration([c1, clash], opts);
  assert.equal(r2.outcomes[1].status, "failed", "second same-time course conflicts");
  assert.equal(r2.outcomes[1].failReason, "conflict");

  const r3 = submitRegistration([full], opts);
  assert.equal(r3.outcomes[0].status, "waitlist", "full course joins waitlist");
  assert.equal(r3.outcomes[0].waitlistPosition, 4, "position derives from queue count");

  const r4 = submitRegistration([ineligible], opts);
  assert.equal(r4.outcomes[0].status, "failed");
  assert.equal(r4.outcomes[0].failReason, "prereq");

  const r5 = submitRegistration([c1], { ...opts, windowOpen: false });
  assert.equal(r5.outcomes[0].failReason, "time_window", "window closed blocks everything");

  // credit limit: 18 cap, two 9-credit courses fit, third does not
  const big = (id, day) => mkCourse(id, { credits: 9, days: [day] });
  const r6 = submitRegistration([big("E1000", 1), big("F1000", 2), big("G1000", 3)], opts);
  assert.equal(r6.outcomes[2].failReason, "credit_limit", "third 9-credit course exceeds limit");
}

console.log("PASS: persona eligibility, seat accounting, client registration engine");
