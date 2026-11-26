/**
 * Static content: notifications and degree requirements.
 * Reference data — part of the fixed catalog world, not user state.
 */

export interface NotificationItem {
  id: string;
  courseId: string | null;
  kind: string;
  bodyZh: string;
  bodyEn: string;
  createdAt: string;
  read: boolean;
}

export const NOTIFICATIONS: NotificationItem[] = [
  {
    id: "n1",
    courseId: "MAT3007",
    kind: "course_update",
    bodyZh: "MAT3007 数学专题已更新至 2026 秋季学期开课计划，上课时间与教师信息现已确认。",
    bodyEn: "MAT3007 Topics in Mathematics has been updated for Fall 2026 — schedule and instructor are now confirmed.",
    createdAt: "2026-09-10T09:00:00+08:00",
    read: false,
  },
  {
    id: "n2",
    courseId: "CSC5130",
    kind: "course_update",
    bodyZh: "CSC5130 人机交互研究专题的开课信息仍待学院最终确认，当前暂不支持加入选课计划。",
    bodyEn: "The offering details of CSC5130 Advanced Topics in HCI are pending final confirmation. It cannot be added to plans yet.",
    createdAt: "2026-09-08T14:00:00+08:00",
    read: false,
  },
  {
    id: "n3",
    courseId: "CSC4130",
    kind: "instructor_change",
    bodyZh: "CSC4130 教师已由 Prof. James Wang 变更为 Prof. Sidong Feng。1 门课程受影响，其余计划不变。",
    bodyEn: "CSC4130 instructor changed from Prof. James Wang to Prof. Sidong Feng. One course is affected; the rest of your plan is unchanged.",
    createdAt: "2026-09-05T10:00:00+08:00",
    read: false,
  },
  {
    id: "n4",
    courseId: null,
    kind: "requirement_change",
    bodyZh: "2026 秋季学期修读计划已发布：CSE 专业选修学分要求由 15 分调整为 18 分。请检查你的学业进度。",
    bodyEn: "Fall 2026 study scheme published: CSE major elective requirement increased from 15 to 18 credits. Check your degree progress.",
    createdAt: "2026-09-01T08:00:00+08:00",
    read: false,
  },
];

export interface DegreeRequirement {
  major: string;
  category: string;
  requiredCredits: number;
  labelZh: string;
  labelEn: string;
}

export const DEGREE_REQUIREMENTS: DegreeRequirement[] = [
  { major: "CSE", category: "total", requiredCredits: 120, labelZh: "毕业总学分", labelEn: "Total credits for graduation" },
  { major: "CSE", category: "major_required", requiredCredits: 48, labelZh: "专业必修", labelEn: "Major required" },
  { major: "CSE", category: "major_elective", requiredCredits: 18, labelZh: "专业选修", labelEn: "Major elective" },
  { major: "CSE", category: "general_education", requiredCredits: 24, labelZh: "通识教育", labelEn: "General education" },
  { major: "CSE", category: "free_elective", requiredCredits: 12, labelZh: "自由选修", labelEn: "Free elective" },
  { major: "SME", category: "total", requiredCredits: 120, labelZh: "毕业总学分", labelEn: "Total credits for graduation" },
  { major: "SME", category: "major_required", requiredCredits: 54, labelZh: "专业必修", labelEn: "Major required" },
  { major: "SME", category: "major_elective", requiredCredits: 15, labelZh: "专业选修", labelEn: "Major elective" },
  { major: "SME", category: "general_education", requiredCredits: 24, labelZh: "通识教育", labelEn: "General education" },
  { major: "SME", category: "free_elective", requiredCredits: 12, labelZh: "自由选修", labelEn: "Free elective" },
];
