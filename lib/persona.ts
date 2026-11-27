/**
 * Visitor personas — personalization without accounts.
 *
 * Each visitor picks a start mode once (fresh / preset, see onboarding) and a
 * persona template. Templates carry a coherent academic history, so different
 * visitors experience different eligibility scenarios. Preset mode additionally
 * seeds in-progress term state; fresh mode starts empty.
 *
 * State keys: student numbers are fixed per template so persona switching is
 * addressable; each persona's simulated state is isolated per key.
 */

export interface CompletedCourse {
  courseCode: string;
  credits: number;
  grade: string;
  term: string;
}

export interface PersonaPreset {
  plans: Record<string, string[]>;
  registeredIds: string[];
  candidates: string[];
}

export interface Persona {
  studentNo: string;
  nameZh: string;
  nameEn: string;
  major: string;
  year: number;
  /** what a visitor experiences with this persona (bilingual, shown on the start screen) */
  scenarioZh: string;
  scenarioEn: string;
  completed: CompletedCourse[];
  preset: PersonaPreset;
}

const TEMPLATES: Persona[] = [
  {
    // the primary storyline persona: CSC3002 done → CSC4130 prereq met;
    // CSC3170+MAT2041 mix missing → CSC4100 blocked; CSC1003 done → excluded from CSC1001
    studentNo: "900000001",
    nameZh: "林语晴", nameEn: "Yuqing LIN", major: "CSE", year: 3,
    scenarioZh: "先修已满足，可完整体验选课→注册→候补→退选全流程",
    scenarioEn: "Prerequisites met — full journey: plan, register, waitlist, drop",
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
    preset: {
      plans: { "Plan A": ["CSC3170", "CSC4130", "ENG2001A", "GED2003"] },
      registeredIds: ["CSC3170", "ENG2001A"],
      candidates: ["DDA2081"],
    },
  },
  {
    // freshman: nothing completed — every prereq-gated course is blocked,
    // year-restricted courses are blocked; preset only uses open courses
    studentNo: "900000002",
    nameZh: "陈可", nameEn: "Ke CHEN", major: "CSE", year: 1,
    scenarioZh: "大一新生：先修/年级限制会挡住大部分高阶课",
    scenarioEn: "Freshman: prereq and year rules block most advanced courses",
    completed: [],
    preset: {
      plans: { "Plan A": ["ENG2001A", "GED2003"] },
      registeredIds: ["GED2003"],
      candidates: ["ECO3121"],
    },
  },
  {
    // SME senior: major restriction scenarios invert (ACT open, CSE-targeted gated)
    studentNo: "900000003",
    nameZh: "王博", nameEn: "Bo WANG", major: "SME", year: 4,
    scenarioZh: "商科学生：专业限制反转，CS 课大多不可选",
    scenarioEn: "Business major: restrictions invert — CS courses mostly gated",
    completed: [
      { courseCode: "ACT1010", credits: 3, grade: "A", term: "2023-24 Term 1" },
      { courseCode: "ECO2011", credits: 3, grade: "A-", term: "2023-24 Term 2" },
      { courseCode: "MAT1001", credits: 3, grade: "A-", term: "2023-24 Term 1" },
      { courseCode: "MAT1002", credits: 3, grade: "B+", term: "2023-24 Term 2" },
      { courseCode: "ENG1001", credits: 3, grade: "A", term: "2023-24 Term 1" },
      { courseCode: "GEW1001", credits: 3, grade: "PA", term: "2023-24 Term 1" },
    ],
    preset: {
      plans: { "Plan A": ["ECO3121", "GED2003"] },
      registeredIds: ["ECO3121"],
      candidates: [],
    },
  },
];

// ---------- visitor record (mode + template choice, persisted once) ----------

export type StartMode = "fresh" | "preset";

export interface VisitorRecord {
  mode: StartMode;
  template: number; // index into TEMPLATES
}

const VISITOR_KEY = "newsis:v1:visitor";

export function loadVisitor(): VisitorRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(VISITOR_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && (parsed.mode === "fresh" || parsed.mode === "preset") && Number.isInteger(parsed.template)) {
      return parsed as VisitorRecord;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveVisitor(record: VisitorRecord): void {
  try {
    localStorage.setItem(VISITOR_KEY, JSON.stringify(record));
  } catch {
    // storage unavailable — the choice simply won't persist
  }
}

export function clearVisitor(): void {
  try {
    localStorage.removeItem(VISITOR_KEY);
  } catch {
    // ignore
  }
}

/** The persona templates. Index order is the UI order. */
export function personaTemplates(): Persona[] {
  return TEMPLATES;
}

export function personaAt(index: number): Persona {
  return TEMPLATES[Math.max(0, Math.min(TEMPLATES.length - 1, index))];
}
