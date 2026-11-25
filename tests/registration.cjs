const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
 module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}
 }).outputText, filename);
};
const {findCourse} = require('../lib/courses.ts');
const {registrationCheck, registrationBatch} = require('../lib/registration.ts');
const common=['ECO3121','CSC3170','ENG2001A','GED2003'].map(findCourse);
const planA=[...common,findCourse('CSC4130')];
const planB=[...common,findCourse('DMS2030')];
const failed=registrationBatch(planA,[],'CSC4130');
assert.equal(failed.results.CSC4130,'failed');
assert.equal(failed.successful.length,4);
const check=registrationCheck(planB,failed.successful);
assert.equal(check.credits,17);
assert.equal(check.conflicts.length,0);
assert.deepEqual(check.additions.map(c=>c.id),['DMS2030']);
const recovered=registrationBatch(planB,failed.successful);
assert.deepEqual(recovered.successful.map(c=>c.id),['DMS2030']);
assert.equal(recovered.results.DMS2030,'registered');
assert.equal(registrationBatch(planB,[...common,findCourse('DMS2030')]).successful.length,0);
// Existing courses outside the fallback plan must count toward conflicts and credits.
assert.equal(registrationCheck([findCourse('DMS2030')],[...common,findCourse('CSC4130')]).credits,21);
assert.equal(registrationCheck([findCourse('DMS2030')],[findCourse('CSC4130')]).conflicts.length,1);
assert.equal(registrationCheck([findCourse('CSC4100')],[]).ineligible.length,1);
assert.equal(registrationBatch([findCourse('CSC4040')],[]).results.CSC4040,'failed');
assert.equal(registrationCheck([{...findCourse('CSC3170'),start:16}],common).sectionChanges.length,1);
assert.equal(registrationBatch([findCourse('CSC4130')],[]).results.CSC4130,'registered');
console.log('PASS: partial failure, actual Plan B, no duplicate registration, retained courses, limits, conflicts, prerequisites, capacity and section changes.');
