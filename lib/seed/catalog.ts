/**
 * Seed catalog: course data modelled on the real CUHK-Shenzhen PeopleSoft SIS
 * field structure (verified against sis.cuhk.edu.cn class detail pages):
 *
 *   Class Detail fields: Status / Class Number / Session / Units /
 *   Instruction Mode / Class Components (Lecture+Tutorial required) /
 *   Course ID / Career / Dates / Grading / Campus /
 *   Meeting Information (Days & Times, Room, Instructor, Meeting Dates) /
 *   Enrollment Requirements / Class Attributes (Medium of Instruction) /
 *   Class Capacity / Enrollment Total / Wait List Capacity/Total /
 *   Available Seats / reserved quota / Description / Textbook.
 *
 * Design principles for the seed:
 * - Course codes follow the real CUHK-SZ numbering conventions of the prototype
 *   storyline (CSC/DDA/ECO/MAT/ENG/DMS/GED/PHI/ACT families, 4-digit catalog).
 * - Every course has LEC + TUT components like the real system; a few are
 *   lecture-only where that is realistic (language / GE courses).
 * - Restriction scenarios required by the P0/P1 spec are covered by real data:
 *   prereq unmet (CSC4100 for Yuqing), year restriction (CSC5130, PHI2001),
 *   full + waitlist (CSC4040), reserved quota (CSC4100, DDA2081, ECO3121),
 *   multiple lecture sections (DDA2081 L01/L02) for section-swap flows.
 * - Times use minutes since midnight; meetings match the prototype's
 *   conflict storyline exactly (verified against lib/courses.ts).
 */

export const TERM = {
  id: "2026-Fall",
  labelZh: "2026 秋季学期",
  labelEn: "Fall 2026",
  // wide window covering the review period (DESIGN.md §8.5)
  regOpenAt: new Date("2026-09-01T00:00:00+08:00"),
  regCloseAt: new Date("2027-01-15T23:59:00+08:00"),
  addDropCloseAt: new Date("2027-01-15T23:59:00+08:00"),
  creditLimit: 18,
  dateStart: "2026-09-07",
  dateEnd: "2026-12-11",
};

// minutes since midnight helpers, keep times readable
const hm = (h: number, m = 0) => h * 60 + m;

interface MeetingSeed {
  days: number[]; // 0=Mon..4=Fri, one Meeting row per day
  start: number;
  end: number;
  room: string;
}
interface SectionSeed {
  code: string; // "L01" | "T01"
  kind: "LEC" | "TUT";
  classNbr: number;
  capacity: number;
  enrolled: number;
  reservedQuota?: number;
  reservedForZh?: string;
  reservedForEn?: string;
  waitlistCapacity?: number;
  waitlistCount?: number;
  meetings: MeetingSeed[];
}
export interface CourseSeed {
  id: string;
  titleZh: string;
  titleEn: string;
  credits: number;
  category: string;
  instructorZh: string;
  instructorEn: string;
  rating?: number;
  reviews?: number;
  demand: string;
  workload: string;
  tone: string;
  descriptionZh: string;
  descriptionEn: string;
  grading?: string;
  minYear?: number;
  maxYear?: number;
  majorsAllowed?: string[];
  prereqCourseIds?: string[];
  excludedCourseIds?: string[];
  targetZh?: string;
  targetEn?: string;
  sections: SectionSeed[];
}

const CS_CORE_DESC_ZH = "结合理论、案例与实践项目，帮助学生理解核心概念，并将所学应用于真实问题。通过小组合作、课堂讨论与实践作业，培养分析与创新能力。";
const CS_CORE_DESC_EN = "Combines theory, case studies and practical projects to build core knowledge and apply it to real problems. Teamwork, discussions and assignments develop analytical and creative skills.";

export const COURSES: CourseSeed[] = [
  {
    id: "CSC4130",
    titleZh: "人机交互",
    titleEn: "Human-Computer Interaction",
    credits: 3, category: "major_elective",
    instructorZh: "冯思栋", instructorEn: "Sidong FENG",
    rating: 4.6, reviews: 28, demand: "高", workload: "中等", tone: "teal",
    prereqCourseIds: ["CSC3002"],
    targetZh: "CSE 大三–大四", targetEn: "CSE Year 3–4",
    descriptionZh: "介绍人机交互的基本原理、用户研究方法、交互设计流程与可用性评估技术。学生将在课程项目中完成从需求调研、原型设计到可用性测试的完整闭环。" + CS_CORE_DESC_ZH,
    descriptionEn: "Introduces HCI principles, user research methods, interaction design process and usability evaluation. The course project covers the full cycle from needfinding and prototyping to usability testing. " + CS_CORE_DESC_EN,
    sections: [
      { code: "L01", kind: "LEC", classNbr: 5101, capacity: 60, enrolled: 42,
        reservedQuota: 5, reservedForZh: "预留：CSE 大四学生", reservedForEn: "Reserved for CSE Year 4",
        meetings: [{ days: [1, 3], start: hm(14, 0), end: hm(15, 20), room: "Teaching Complex A402" }] },
      { code: "T01", kind: "TUT", classNbr: 5102, capacity: 30, enrolled: 21,
        meetings: [{ days: [1], start: hm(19, 0), end: hm(19, 50), room: "Teaching C Bldg 109" }] },
      { code: "T02", kind: "TUT", classNbr: 5103, capacity: 30, enrolled: 22,
        meetings: [{ days: [3], start: hm(19, 0), end: hm(19, 50), room: "Teaching C Bldg 109" }] },
    ],
  },
  {
    id: "DDA2081",
    titleZh: "数据分析导论",
    titleEn: "Introduction to Data Analytics",
    credits: 3, category: "major_required",
    instructorZh: "张伟", instructorEn: "Wei ZHANG",
    rating: 4.2, reviews: 41, demand: "高", workload: "较高", tone: "blue",
    descriptionZh: "介绍数据分析的基本流程：数据采集、清洗、探索性分析、可视化与统计建模基础，使用 Python 与常用数据分析库完成实践作业。",
    descriptionEn: "Introduces the data analytics pipeline: data collection, cleaning, exploratory analysis, visualization and basic statistical modelling, with hands-on assignments in Python.",
    sections: [
      // L01 = the prototype's default section; L02 = the alternate the demo storyline swaps to
      { code: "L01", kind: "LEC", classNbr: 5201, capacity: 50, enrolled: 46,
        reservedQuota: 10, reservedForZh: "预留：SDS 专业学生", reservedForEn: "Reserved for SDS majors",
        meetings: [{ days: [1, 3], start: hm(14, 0), end: hm(15, 15), room: "Teaching Complex C301" }] },
      { code: "L02", kind: "LEC", classNbr: 5202, capacity: 50, enrolled: 38,
        meetings: [{ days: [2], start: hm(16, 0), end: hm(17, 15), room: "Teaching Complex C301" }] },
      { code: "T01", kind: "TUT", classNbr: 5203, capacity: 32, enrolled: 30,
        meetings: [{ days: [2], start: hm(19, 0), end: hm(19, 50), room: "Teaching B Bldg 201" }] },
      { code: "T02", kind: "TUT", classNbr: 5204, capacity: 32, enrolled: 24,
        meetings: [{ days: [2], start: hm(20, 0), end: hm(20, 50), room: "Teaching B Bldg 201" }] },
    ],
  },
  {
    id: "ECO3121",
    titleZh: "行为经济学",
    titleEn: "Behavioral Economics",
    credits: 3, category: "free_elective",
    instructorZh: "陈雪", instructorEn: "Sarah CHEN",
    rating: 4.4, reviews: 52, demand: "中", workload: "中等", tone: "sand",
    descriptionZh: "结合心理学与经济学，研究有限理性、损失厌恶、时间偏好等对人类决策的影响，通过实验设计与案例分析理解行为经济学的核心方法。",
    descriptionEn: "Combines psychology and economics to study bounded rationality, loss aversion and time preference in human decision-making, using experiments and case analysis.",
    sections: [
      { code: "L01", kind: "LEC", classNbr: 5301, capacity: 80, enrolled: 62,
        reservedQuota: 15, reservedForZh: "预留：SME 专业学生", reservedForEn: "Reserved for SME majors",
        meetings: [{ days: [0, 2], start: hm(10, 0), end: hm(11, 15), room: "Administration Bldg E210" }] },
      // lecture-only course: no tutorial component (realistic for SME electives)
    ],
  },
  {
    id: "MAT3007",
    titleZh: "数学专题（演示）",
    titleEn: "Topics in Mathematics (Demo)",
    credits: 3, category: "major_elective",
    instructorZh: "李敏", instructorEn: "Min LI",
    rating: 4.2, reviews: 12, demand: "中", workload: "中等", tone: "sand",
    prereqCourseIds: ["MAT2041"],
    descriptionZh: "面向高年级本科生的数学专题课程，内容随学期调整，本学期主题为离散优化方法及其在数据科学中的应用。",
    descriptionEn: "A rotating topics course for senior undergraduates. This term: discrete optimization methods with applications in data science.",
    sections: [
      { code: "L01", kind: "LEC", classNbr: 5401, capacity: 45, enrolled: 29,
        meetings: [{ days: [0, 2], start: hm(10, 0), end: hm(11, 15), room: "Zhi Xin Bldg 110" }] },
      { code: "T01", kind: "TUT", classNbr: 5402, capacity: 45, enrolled: 29,
        meetings: [{ days: [4], start: hm(14, 0), end: hm(14, 50), room: "Zhi Xin Bldg 110" }] },
    ],
  },
  {
    id: "CSC3170",
    titleZh: "数据库系统",
    titleEn: "Database Systems",
    credits: 3, category: "major_required",
    instructorZh: "黄琳", instructorEn: "Lin HUANG",
    rating: 4.3, reviews: 37, demand: "中", workload: "较高", tone: "blue",
    prereqCourseIds: ["CSC3002"],
    descriptionZh: "介绍关系模型、SQL、数据库设计、事务处理与查询优化。课程项目要求设计并实现一个小型关系数据库应用。",
    descriptionEn: "Covers the relational model, SQL, database design, transaction processing and query optimization. The project requires designing and implementing a small relational database application.",
    sections: [
      { code: "L01", kind: "LEC", classNbr: 5501, capacity: 60, enrolled: 51,
        meetings: [{ days: [0, 2], start: hm(14, 0), end: hm(15, 20), room: "Teaching Complex A401" }] },
      { code: "T01", kind: "TUT", classNbr: 5502, capacity: 30, enrolled: 26,
        meetings: [{ days: [0], start: hm(19, 0), end: hm(19, 50), room: "Teaching D Bldg 201" }] },
      { code: "T02", kind: "TUT", classNbr: 5503, capacity: 30, enrolled: 25,
        meetings: [{ days: [2], start: hm(19, 0), end: hm(19, 50), room: "Teaching D Bldg 201" }] },
    ],
  },
  {
    id: "ENG2001A",
    titleZh: "学术英语",
    titleEn: "English for Academic Purposes",
    credits: 3, category: "general_education",
    instructorZh: "黄雅文", instructorEn: "Emily WONG",
    rating: 4.1, reviews: 19, demand: "中", workload: "较低", tone: "blue",
    descriptionZh: "培养学术场景下的英语读写能力：学术写作结构、文献引用、报告陈述与批判性阅读。",
    descriptionEn: "Develops English literacy for academic contexts: academic writing structure, citation, presentation and critical reading.",
    sections: [
      { code: "L01", kind: "LEC", classNbr: 5601, capacity: 30, enrolled: 22,
        meetings: [{ days: [0, 2], start: hm(12, 0), end: hm(13, 15), room: "Teaching D Bldg 113" }] },
    ],
  },
  {
    id: "DMS2030",
    titleZh: "供应链管理",
    titleEn: "Supply Chain Management",
    credits: 3, category: "major_elective",
    instructorZh: "周凯文", instructorEn: "Kevin ZHOU",
    rating: 3.9, reviews: 22, demand: "低", workload: "中等", tone: "teal",
    descriptionZh: "介绍供应链网络设计、库存管理、物流与需求预测的基本模型，结合企业案例理解供应链决策中的权衡。",
    descriptionEn: "Introduces supply chain network design, inventory management, logistics and demand forecasting, with case studies on trade-offs in supply chain decisions.",
    sections: [
      { code: "L01", kind: "LEC", classNbr: 5701, capacity: 45, enrolled: 33,
        meetings: [{ days: [1, 3], start: hm(14, 0), end: hm(15, 15), room: "Teaching B Bldg 104" }] },
      { code: "T01", kind: "TUT", classNbr: 5702, capacity: 45, enrolled: 33,
        meetings: [{ days: [1], start: hm(20, 0), end: hm(20, 50), room: "Teaching B Bldg 104" }] },
    ],
  },
  {
    id: "GED2003",
    titleZh: "可持续发展与社会",
    titleEn: "Sustainability and Society",
    credits: 3, category: "general_education",
    instructorZh: "李昂", instructorEn: "Alex LI",
    rating: 4.0, reviews: 31, demand: "低", workload: "较低", tone: "sand",
    descriptionZh: "从跨学科视角探讨可持续发展的环境、经济与社会维度，分析城市化进程中的资源、能源与公共政策议题。",
    descriptionEn: "Explores environmental, economic and social dimensions of sustainability from an interdisciplinary perspective, analysing resource, energy and public policy issues in urbanisation.",
    sections: [
      { code: "L01", kind: "LEC", classNbr: 5801, capacity: 60, enrolled: 36,
        meetings: [{ days: [4], start: hm(10, 0), end: hm(12, 30), room: "Administration Bldg E210" }] },
    ],
  },
  {
    id: "CSC4210",
    titleZh: "交互系统设计",
    titleEn: "Design of Interactive Systems",
    credits: 3, category: "major_elective",
    instructorZh: "谭梅", instructorEn: "Mei TAN",
    rating: 4.4, reviews: 17, demand: "中", workload: "中等", tone: "teal",
    prereqCourseIds: ["CSC4130"],
    targetZh: "CSE 大三–大四", targetEn: "CSE Year 3–4",
    descriptionZh: "在 HCI 基础上深入交互系统的架构与实现：设计系统、跨平台交互范式、可访问性工程与大规模用户测试方法。",
    descriptionEn: "Builds on HCI to cover the architecture and implementation of interactive systems: design systems, cross-platform interaction paradigms, accessibility engineering and large-scale user testing.",
    sections: [
      // same slot as CSC4130-L01 on purpose: it is the same-slot backup in the storyline
      { code: "L01", kind: "LEC", classNbr: 5901, capacity: 50, enrolled: 43,
        meetings: [{ days: [1, 3], start: hm(14, 0), end: hm(15, 20), room: "Teaching Complex C504" }] },
      { code: "T01", kind: "TUT", classNbr: 5902, capacity: 50, enrolled: 43,
        meetings: [{ days: [3], start: hm(20, 0), end: hm(20, 50), room: "Teaching Complex C504" }] },
    ],
  },
  {
    id: "CSC4040",
    titleZh: "可用性工程",
    titleEn: "Usability Engineering",
    credits: 3, category: "major_elective",
    instructorZh: "何俊", instructorEn: "Jun HO",
    rating: 4.5, reviews: 24, demand: "高", workload: "中等", tone: "blue",
    prereqCourseIds: ["CSC4130"],
    targetZh: "CSE 大三–大四", targetEn: "CSE Year 3–4",
    descriptionZh: "系统讲授可用性生命周期：启发式评估、认知走查、眼动实验与 A/B 测试。课程作业围绕真实产品的可用性改进展开。",
    descriptionEn: "Covers the usability engineering lifecycle: heuristic evaluation, cognitive walkthrough, eye-tracking studies and A/B testing, with coursework on improving real products.",
    sections: [
      // full with open waitlist — key demo scenario
      { code: "L01", kind: "LEC", classNbr: 6001, capacity: 45, enrolled: 45,
        waitlistCapacity: 20, waitlistCount: 8,
        meetings: [{ days: [1, 3], start: hm(14, 0), end: hm(15, 20), room: "Teaching Complex A402" }] },
      { code: "T01", kind: "TUT", classNbr: 6002, capacity: 45, enrolled: 45,
        meetings: [{ days: [1], start: hm(18, 0), end: hm(18, 50), room: "Teaching Complex A402" }] },
    ],
  },
  {
    id: "CSC4310",
    titleZh: "交互媒体设计",
    titleEn: "Interactive Media Design",
    credits: 3, category: "major_elective",
    instructorZh: "安娜·鲁伊兹", instructorEn: "Ana RUIZ",
    rating: 4.3, reviews: 15, demand: "中", workload: "中等", tone: "sand",
    prereqCourseIds: ["CSC4130"],
    targetZh: "CSE 大三–大四", targetEn: "CSE Year 3–4",
    descriptionZh: "探索交互媒体的设计与实现：动态图形、交互装置、网页动画与创意编程，期末作品以展览形式呈现。",
    descriptionEn: "Explores the design and implementation of interactive media: motion graphics, interactive installations, web animation and creative coding, ending with an exhibition.",
    sections: [
      { code: "L01", kind: "LEC", classNbr: 6101, capacity: 40, enrolled: 31,
        meetings: [{ days: [1, 3], start: hm(15, 30), end: hm(16, 50), room: "Teaching Complex C504" }] },
      { code: "T01", kind: "TUT", classNbr: 6102, capacity: 40, enrolled: 31,
        meetings: [{ days: [3], start: hm(18, 0), end: hm(18, 50), room: "Teaching Complex C504" }] },
    ],
  },
  {
    id: "CSC4100",
    titleZh: "机器学习",
    titleEn: "Machine Learning",
    credits: 3, category: "major_elective",
    instructorZh: "吴大卫", instructorEn: "David WU",
    rating: 4.7, reviews: 63, demand: "高", workload: "较高", tone: "blue",
    prereqCourseIds: ["CSC3170", "MAT2041"],
    descriptionZh: "介绍监督学习、无监督学习、模型评估与正则化，涵盖线性模型、决策树、神经网络基础与集成方法，配套编程作业与课程项目。",
    descriptionEn: "Covers supervised and unsupervised learning, model evaluation and regularisation: linear models, decision trees, neural network fundamentals and ensemble methods, with programming assignments and a project.",
    sections: [
      // full + big reserved quota + waitlist — the prototype's hardest scenario
      { code: "L01", kind: "LEC", classNbr: 6201, capacity: 50, enrolled: 50,
        reservedQuota: 10, reservedForZh: "预留：SDS 大三学生", reservedForEn: "Reserved for SDS Year 3",
        waitlistCapacity: 15, waitlistCount: 12,
        meetings: [{ days: [2, 4], start: hm(16, 0), end: hm(17, 15), room: "Teaching Complex A402" }] },
      { code: "T01", kind: "TUT", classNbr: 6202, capacity: 50, enrolled: 50,
        meetings: [{ days: [2], start: hm(19, 0), end: hm(19, 50), room: "Teaching Complex A402" }] },
    ],
  },
  // --- Courses added for P1 coverage ---
  {
    id: "CSC3002",
    titleZh: "C/C++ 程序设计",
    titleEn: "C/C++ Programming",
    credits: 3, category: "major_required",
    instructorZh: "黄锐", instructorEn: "Rui HUANG",
    rating: 4.2, reviews: 58, demand: "高", workload: "较高", tone: "blue",
    prereqCourseIds: ["CSC1001"],
    descriptionZh: "系统讲授 C/C++ 语言机制、内存模型、指针与对象语义，训练工程化编程能力与调试技巧。",
    descriptionEn: "Systematic coverage of C/C++ language mechanisms, memory model, pointers and object semantics, training engineering-grade programming and debugging skills.",
    sections: [
      { code: "L01", kind: "LEC", classNbr: 6301, capacity: 150, enrolled: 141,
        meetings: [{ days: [1, 3], start: hm(13, 30), end: hm(14, 50), room: "Teaching B Bldg 201" }] },
      { code: "T01", kind: "TUT", classNbr: 6302, capacity: 75, enrolled: 74,
        meetings: [{ days: [2], start: hm(18, 0), end: hm(18, 50), room: "Teaching Complex C504" }] },
      { code: "T02", kind: "TUT", classNbr: 6303, capacity: 75, enrolled: 66,
        meetings: [{ days: [2], start: hm(19, 0), end: hm(19, 50), room: "Teaching Complex C504" }] },
    ],
  },
  {
    id: "CSC1001",
    titleZh: "计算机科学导论：程序设计方法",
    titleEn: "Introduction to Computer Science: Programming Methodology",
    credits: 3, category: "major_required",
    instructorZh: "李同心", instructorEn: "Tongxin LI",
    rating: 4.4, reviews: 88, demand: "高", workload: "较高", tone: "blue",
    excludedCourseIds: ["CSC1003"],
    descriptionZh: "计算机科学入门课程，以 Python 为教学语言，覆盖程序设计基础、数据结构与算法入门、面向对象程序设计。",
    descriptionEn: "Introductory computer science course taught in Python: programming fundamentals, elementary data structures and algorithms, object-oriented programming.",
    sections: [
      { code: "L01", kind: "LEC", classNbr: 6401, capacity: 160, enrolled: 140,
        meetings: [{ days: [0, 2], start: hm(10, 30), end: hm(11, 50), room: "Teaching Complex A402" }] },
      { code: "T01", kind: "TUT", classNbr: 6402, capacity: 32, enrolled: 31,
        meetings: [{ days: [0], start: hm(19, 0), end: hm(19, 50), room: "Teaching C Bldg 109" }] },
      { code: "T02", kind: "TUT", classNbr: 6403, capacity: 32, enrolled: 28,
        meetings: [{ days: [0], start: hm(20, 0), end: hm(20, 50), room: "Teaching C Bldg 109" }] },
    ],
  },
  {
    id: "CSC5130",
    titleZh: "人机交互研究专题",
    titleEn: "Advanced Topics in Human-Computer Interaction",
    credits: 3, category: "major_elective",
    instructorZh: "冯思栋", instructorEn: "Sidong FENG",
    demand: "中", workload: "较高", tone: "teal",
    minYear: 4,
    targetZh: "本科四年级或研究生", targetEn: "Year 4 or postgraduate",
    descriptionZh: "研究生级别研讨课，阅读并复现 HCI 顶级会议论文，完成一项原创性小型研究。开课信息以学院最终通知为准。",
    descriptionEn: "Graduate-level seminar reading and replicating top-tier HCI papers, plus an original mini-research project. Offering details subject to final school confirmation.",
    sections: [
      { code: "L01", kind: "LEC", classNbr: 6501, capacity: 30, enrolled: 14,
        meetings: [{ days: [4], start: hm(14, 0), end: hm(16, 30), room: "Cheng Dao Bldg 102" }] },
    ],
  },
  {
    id: "PHI2001",
    titleZh: "伦理学导论",
    titleEn: "Introduction to Ethics",
    credits: 3, category: "general_education",
    instructorZh: "王雪石", instructorEn: "Xueshi WANG",
    demand: "低", workload: "较低", tone: "sand",
    minYear: 2,
    descriptionZh: "介绍伦理学的主要理论框架——功利主义、义务论与德性伦理，讨论技术时代的伦理困境。仅面向大二及以上学生开放。",
    descriptionEn: "Introduces major ethical frameworks — utilitarianism, deontology and virtue ethics — and discusses ethical dilemmas of the technological age. Open to Year 2 and above only.",
    sections: [
      { code: "L01", kind: "LEC", classNbr: 6601, capacity: 80, enrolled: 41,
        meetings: [{ days: [3], start: hm(18, 0), end: hm(20, 50), room: "Teaching B Bldg 104" }] },
    ],
  },
  {
    id: "ACT2121",
    titleZh: "财务会计导论",
    titleEn: "Introduction to Financial Accounting",
    credits: 3, category: "free_elective",
    instructorZh: "郑明", instructorEn: "Ming ZHENG",
    demand: "低", workload: "中等", tone: "sand",
    majorsAllowed: ["SME", "FIN", "ACC"],
    descriptionZh: "介绍财务会计基本概念、复式记账与财务报表编制。本课程主要面向经管学院学生开放。",
    descriptionEn: "Introduces financial accounting concepts, double-entry bookkeeping and financial statement preparation. Primarily open to SME students.",
    sections: [
      { code: "L01", kind: "LEC", classNbr: 6701, capacity: 60, enrolled: 37,
        meetings: [{ days: [1, 3], start: hm(10, 30), end: hm(11, 50), room: "Teaching B Bldg 201" }] },
    ],
  },
];
