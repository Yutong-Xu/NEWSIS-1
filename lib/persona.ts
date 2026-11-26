/**
 * Visitor personas — personalization without accounts.
 *
 * Each browser gets a random UUID on first visit (localStorage). The UUID
 * deterministically selects one of the persona templates below, so every
 * visitor sees a coherent academic profile (major / year / completed courses)
 * that drives eligibility checks, degree progress and the demo storylines —
 * with no login, no server, and nothing tying state to a real person.
 *
 * Templates are deliberately different (year/major/history) so different
 * visitors encounter different restriction scenarios, as the spec requires.
 */

export interface CompletedCourse {
  courseCode: string;
  credits: number;
  grade: string;
  term: string;
}

export interface Persona {
  studentNo: string;
  nameZh: string;
  nameEn: string;
  major: string;
  year: number;
  completed: CompletedCourse[];
}

interface PersonaTemplate extends Omit<Persona, "studentNo"> {}

const TEMPLATES: PersonaTemplate[] = [
  {
    // the primary storyline persona: CSC3002 done → CSC4130 prereq met;
    // CSC3170+MAT2041 mix missing → CSC4100 blocked; CSC1003 done → excluded from CSC1001
    nameZh: "林语晴", nameEn: "Yuqing LIN", major: "CSE", year: 3,
    completed: [
      { courseCode: "CSC1003", credits: 3, grade: "A", term: "2024-25 Term 1" },
      { courseCode: "CSC3002", credits: 3, grade: "A-", term: "2025-26 Term 1" },
      { courseCode: "MAT1001", credits: 3, grade: "B+", term: "2024-25 Term 1" },
      { courseCode: "MAT2041", credits: 3, grade: "B", term: "2024-25 Term 2" },
      { courseCode: "ENG1001", credits: 3, grade: "B+", term: "2024-25 Term 1" },
      { courseCode: "GEW1001", credits: 3, grade: "PA", term: "2024-25 Term 1" },
      { courseCode: "CEC1000", credits: 3, grade: "PA", term: "2024-25 Term 2" },
      { courseCode: "PED1001", credits: 1, grade: "B", term: "2024-25 Term 1" },
      { courseCode: "CSC1005", credits: 3, grade: "A-", term: "2024-25 Term 2" },
      { courseCode: "MAT1002", credits: 3, grade: "B", term: "2024-25 Term 2" },
      { courseCode: "PHY1001", credits: 3, grade: "B+", term: "2025-26 Term 1" },
      { courseCode: "GED1001", credits: 2, grade: "A", term: "2025-26 Term 1" },
      { courseCode: "CSC2050", credits: 3, grade: "A-", term: "2025-26 Term 2" },
    ],
  },
  {
    // freshman: nothing completed — every prereq-gated course is blocked,
    // year-restricted courses are blocked
    nameZh: "陈可", nameEn: "Ke CHEN", major: "CSE", year: 1,
    completed: [],
  },
  {
    // SME senior: major restriction scenarios invert (ACT open, CSE-targeted gated)
    nameZh: "王博", nameEn: "Bo WANG", major: "SME", year: 4,
    completed: [
      { courseCode: "ACT1010", credits: 3, grade: "A", term: "2023-24 Term 1" },
      { courseCode: "ECO2011", credits: 3, grade: "A-", term: "2023-24 Term 2" },
      { courseCode: "MAT1001", credits: 3, grade: "A-", term: "2023-24 Term 1" },
      { courseCode: "MAT1002", credits: 3, grade: "B+", term: "2023-24 Term 2" },
      { courseCode: "ENG1001", credits: 3, grade: "A", term: "2023-24 Term 1" },
      { courseCode: "GEW1001", credits: 3, grade: "PA", term: "2023-24 Term 1" },
    ],
  },
];

const VISITOR_KEY = "newsis:v1:visitor";

function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Deterministic template selection from the visitor UUID. */
function templateIndex(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return hash % TEMPLATES.length;
}

/**
 * The visitor's persona. Generated once per browser, stable afterwards.
 * Server-side rendering falls back to the first template (client corrects on hydration).
 */
export function getPersona(): Persona {
  if (typeof window === "undefined") {
    return { studentNo: "900000001", ...TEMPLATES[0] };
  }
  let id: string | null = null;
  try {
    id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = uuid();
      localStorage.setItem(VISITOR_KEY, id);
    }
  } catch {
    id = "fallback";
  }
  const t = TEMPLATES[templateIndex(id)];
  // student number derived from the uuid — unique per browser, meaningless anywhere else
  const num = 900000000 + (templateIndex(id) * 100000) + (id.charCodeAt(0) * 97 + id.charCodeAt(id.length - 1)) % 99999;
  return { studentNo: String(num), ...t };
}

/** All templates, for the profile switcher (lets a visitor experience other scenarios). */
export function personaTemplates(): PersonaTemplate[] {
  return TEMPLATES;
}
