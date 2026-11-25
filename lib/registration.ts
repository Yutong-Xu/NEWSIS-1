import { conflicts, type Course } from './courses';

export type RegistrationStatus = 'registered' | 'failed' | 'waitlist';
export type RegistrationResults = Record<string, RegistrationStatus>;

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
