/**
 * Browser-local persistence for simulated user state.
 *
 * Boundary (authoritative):
 * - Server database: fixed reference data (courses, sections, degree
 *   requirements, accounts) + auth sessions. Read-only for the simulation.
 * - localStorage: everything the user "writes" — plans, candidates,
 *   registration results, registered courses. Per-browser demo state,
 *   keyed by student number so demo accounts on one browser stay isolated.
 * - The school system is never written to; authentication is read-only.
 */

export interface StoredState {
  plans: Record<string, string[]>; // plan name -> course ids
  planPriorities?: Record<string, string[]>; // plan name -> conflict-resolution priority order
  candidates: string[];
  dismissedCandidates?: string[];
  registeredIds: string[];
  results: Record<string, 'registered' | 'failed' | 'waitlist'>;
  waitlistPositions: Record<string, number>;
}

const key = (studentNo: string) => `newsis:v1:${studentNo}`;

export function loadState(studentNo: string): StoredState | null {
  try {
    const raw = localStorage.getItem(key(studentNo));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    return {
      plans: parsed.plans ?? {},
      planPriorities: parsed.planPriorities ?? undefined,
      candidates: parsed.candidates ?? [],
      dismissedCandidates: parsed.dismissedCandidates ?? [],
      registeredIds: parsed.registeredIds ?? [],
      results: parsed.results ?? {},
      waitlistPositions: parsed.waitlistPositions ?? {},
    };
  } catch {
    return null;
  }
}

export function saveState(studentNo: string, state: StoredState): void {
  try {
    localStorage.setItem(key(studentNo), JSON.stringify(state));
  } catch {
    // storage full or unavailable — simulation continues in memory
  }
}

export function clearState(studentNo: string): void {
  try {
    localStorage.removeItem(key(studentNo));
  } catch {
    // ignore
  }
}
