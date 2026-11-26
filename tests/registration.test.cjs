/**
 * Domain logic tests: conflict detection, eligibility, seat accounting.
 * Runs with plain node — no DB needed (pure functions over mock shapes).
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => {
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText,
    filename
  );
};
const { sectionsConflict, conflictPairs, checkEligibility, availableSeats } = require("../lib/db/domain.ts");

const meeting = (dayOfWeek, startMin, endMin) => ({ dayOfWeek, startMin, endMin });
const section = (id, courseId, meetings) => ({ id, courseId, meetings });
const course = (overrides) => ({
  id: "X", minYear: null, majorsAllowed: null, prereqCourseIds: null, excludedCourseIds: null, ...overrides,
});
const user = (overrides) => ({ studentNo: "1", year: 3, major: "CSE", ...overrides });
const done = (code) => ({ courseCode: code });

// --- conflict detection: section-aware, cross-course only
{
  const a = section("CSC4130-L01", "CSC4130", [meeting(1, 840, 920)]);
  const overlap = section("CSC3170-L01", "CSC3170", [meeting(1, 850, 930)]);
  const apart = section("DMS2030-L01", "DMS2030", [meeting(1, 930, 1000)]);
  const otherDay = section("ECO3121-L01", "ECO3121", [meeting(2, 840, 920)]);
  assert.equal(sectionsConflict(a, overlap), true, "overlapping same-day meetings conflict");
  assert.equal(sectionsConflict(a, apart), false, "back-to-back meetings do not conflict");
  assert.equal(sectionsConflict(a, otherDay), false, "different days do not conflict");
  // LEC+TUT of the same course never conflict with each other
  const tut = section("CSC4130-T01", "CSC4130", [meeting(1, 840, 920)]);
  const pairs = conflictPairs([a, tut, overlap]);
  // tut DOES conflict with CSC3170 (different course, overlapping time) — correct;
  // the exclusion applies only to same-course pairs (a,tut)
  assert.equal(pairs.length, 2, "tut also conflicts with the overlapping other-course section");
  assert.ok(!pairs.some(([x, y]) => x.courseId === y.courseId), "same-course sections excluded from conflict pairs");
}

// --- eligibility priority order: prereq → year → major → excluded
{
  const c = course({
    prereqCourseIds: JSON.stringify(["CSC3002"]),
    minYear: 4,
    majorsAllowed: JSON.stringify(["CSE"]),
    excludedCourseIds: JSON.stringify(["CSC1001"]),
  });
  const u = user({ year: 2, major: "SME" });
  const completed = [done("CSC1001")];
  assert.equal(checkEligibility(c, u, []).code, "prereq", "missing prereq reported first");
  assert.equal(checkEligibility(c, u, [done("CSC3002")]).code, "year", "year check second");
  assert.equal(checkEligibility(c, user({ major: "SME", year: 4 }), [done("CSC3002")]).code, "major", "major check third (year satisfied)");
  assert.equal(checkEligibility(course({ excludedCourseIds: JSON.stringify(["CSC1001"]) }), u, completed).code, "excluded");
  assert.equal(checkEligibility(course({ prereqCourseIds: JSON.stringify(["CSC3002"]) }), u, [done("CSC3002")]).code, "ok");
  // real storyline: Yuqing (year 3 CSE, has CSC3002) is eligible for CSC4130, blocked from CSC4100
  const yuqingDone = [done("CSC3002"), done("MAT2041"), done("CSC1003")];
  assert.equal(checkEligibility(course({ prereqCourseIds: JSON.stringify(["CSC3002"]) }), user(), yuqingDone).code, "ok");
  assert.equal(checkEligibility(course({ prereqCourseIds: JSON.stringify(["CSC3170", "MAT2041"]) }), user(), yuqingDone).code, "prereq");
  // malformed JSON must not crash
  assert.equal(checkEligibility(course({ prereqCourseIds: "{oops" }), user(), []).code, "ok");
}

// --- seat accounting: reserved quota reduces availability
{
  assert.equal(availableSeats({ capacity: 60, enrolledCount: 42, reservedQuota: 5 }), 13);
  assert.equal(availableSeats({ capacity: 45, enrolledCount: 45, reservedQuota: 0 }), 0);
  assert.equal(availableSeats({ capacity: 50, enrolledCount: 50, reservedQuota: 10 }), -10, "over-reserved shows negative");
}

console.log("PASS: conflict pairs, eligibility priority order, seat accounting with reserved quota");
