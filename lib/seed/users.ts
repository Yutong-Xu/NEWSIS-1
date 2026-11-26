/**
 * Demo accounts + academic seed data.
 * Demo passwords are bcrypt-hashed at seed time (cost 10); plaintext only here.
 *
 *学籍差异是设计出来的（DESIGN.md §3）：不同年级/专业/已修课程驱动不同的
 * 资格判定结果，让 P0-5 的限制场景可以用不同账号实际演示。
 */

export const DEMO_USERS = [
  {
    username: "demo",
    studentNo: "900000001",
    password: "demo123456",
    nameZh: "林语晴",
    nameEn: "Yuqing LIN",
    major: "CSE",
    year: 3,
    creditsCompleted: 36,
    // history consistent with the storyline:
    // has CSC3002 → CSC4130 prereq met; lacks CSC3170+MAT2041 mix → CSC4100 blocked;
    // has MAT2041 → MAT3007 prereq met; took CSC1003 → excluded from CSC1001.
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
    username: "demo2",
    studentNo: "900000002",
    password: "demo123456",
    nameZh: "陈可",
    nameEn: "Ke CHEN",
    major: "CSE",
    year: 1,
    creditsCompleted: 0,
    // freshman: no prerequisites met at all — PHI2001 year-blocked, everything prereq-blocked
    completed: [],
  },
  {
    username: "demo3",
    studentNo: "900000003",
    password: "demo123456",
    nameZh: "王博",
    nameEn: "Bo WANG",
    major: "SME",
    year: 4,
    creditsCompleted: 96,
    // SME senior: eligible for ACT2121 (major match), blocked from CSE-targeted courses scenario variety
    completed: [
      { courseCode: "ACT1010", credits: 3, grade: "A", term: "2023-24 Term 1" },
      { courseCode: "ECO2011", credits: 3, grade: "A-", term: "2023-24 Term 2" },
    ],
  },
];

export const DEGREE_REQUIREMENTS = [
  // CSE bachelor requirements (demo-scale numbers matching the storyline:
  // Yuqing 36 done + plans 12 this term → narrative in P1-12)
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

/**
 * Notifications seeded for P1-11: MAT3007 clickable update,
 * CSC5130 with offering-details-pending marker.
 */
export const NOTIFICATIONS = [
  {
    courseId: "MAT3007",
    kind: "course_update",
    bodyZh: "MAT3007 数学专题（演示）已更新至 2026 秋季学期开课计划，上课时间与教师信息现已确认。",
    bodyEn: "MAT3007 Topics in Mathematics (Demo) has been updated for Fall 2026 — schedule and instructor are now confirmed.",
  },
  {
    courseId: "CSC5130",
    kind: "course_update",
    bodyZh: "CSC5130 人机交互研究专题的开课信息仍待学院最终确认，当前暂不支持加入选课计划。",
    bodyEn: "The offering details of CSC5130 Advanced Topics in HCI are pending final confirmation. It cannot be added to plans yet.",
  },
  {
    courseId: "CSC4130",
    kind: "course_update",
    bodyZh: "CSC4130 教师已由 Prof. James Wang 变更为 Prof. Sidong Feng。1 门课程受影响，其余计划不变。",
    bodyEn: "CSC4130 instructor changed from Prof. James Wang to Prof. Sidong Feng. One course is affected; the rest of your plan is unchanged.",
  },
  {
    courseId: null,
    kind: "requirement_change",
    bodyZh: "2026 秋季学期修读计划已发布：CSE 专业选修学分要求由 15 分调整为 18 分。请检查你的学业进度。",
    bodyEn: "Fall 2026 study scheme published: CSE major elective requirement increased from 15 to 18 credits. Check your degree progress.",
  },
];
