# New SIS 最终项目设计方案

> 基于对真实 sis.cuhk.edu.cn（PeopleSoft Campus Solutions）的全面排查与 P0/P1 修改清单。
> 排查日期：2026-11-26，排查账号登录成功，遍历 Class Search / Enrollment / Academic Planning / Class Detail / Enrollment Dates 全部主要模块。

---

## 0. 真实 SIS 排查结论速览

| 维度 | 真实 SIS 现状 |
|---|---|
| 技术栈 | Oracle PeopleSoft Campus Solutions（`csprd`），iframe 架构（`TargetContent`），服务端状态机 |
| 认证 | 学校统一 ADFS SSO（STS.cuhk.edu.cn OAuth2），SIS 本身不验证密码，只消费 OAuth code |
| 课程检索 | 无关键词搜索；必须 Term + Subject + Catalog Nbr 至少 2 项条件 |
| 课程结构 | Course → Section（L01-LEC/T01-TUT）→ Meeting（days/times/room/instructor/dates）+ EnrollmentRequirement + 余量/候补容量 |
| 选课流 | Shopping Cart → Validate（资格预检）→ Enroll / Drop / Swap / Edit，状态 Enrolled/Dropped/Wait Listed |
| i18n | 页面 UI 全英文固定；「Data Language」只切换数据语言且未生效；面包屑中英混杂 |
| 数据示例 | CSC1005 L01 满 159/160 有「the remaining quota is reserved」预留名额提示 |

---

## 1. 五个问题的回答

### 1.1 登录验证方式

**结论：已实测打通，可以完全程序化登录并抓取真实数据。**

实现位于 `lib/sis-sso.ts`（已验证：1.5–2 秒完成全链路，成功抓取 My Class Schedule 真实数据，含学期列表与个人信息）。要点：

- SIS 本身无登录表单，重定向到学校 ADFS SSO（`STS.cuhk.edu.cn/adfs/oauth2/authorize`，client_id `3f09a73c-…`）。
- ADFS 是无 MFA 的普通表单认证。三个关键细节缺一不可（均从浏览器真实流量逆向确认）：
  1. **用户名必须带域前缀 `cuhksz\`**——登录页 JS 在输入不含 `@`/`\` 时自动拼接；裸学号会被拒（「用户名或密码不正确」）。
  2. **用户名/密码分页是纯客户端 JS**，两个字段在**同一个 POST** 提交到带 `client-request-id` 的表单 action URL。
  3. **OAuth code 短时效**——302 跳转绝不能读取响应体（服务器缓慢流式传输，读体会把链路拖过 code 有效期，cmd=login 报 errorCode=105）。
- ADFS 之后的 PeopleSoft 签到是重放 `dologin.html` 的隐藏表单（`userid=CUSZ_SSO_LOGIN` 服务账号 + 随机 pwd + code）。

参考实现：本机 ITSO-Student-Assistant-Platform（`backend/internal/service/sis/client.go`）使用同一套流程，但其裸用户名写法在现行 ADFS 上已不可用——本项目实现已修正。

**方案**：实现 `POST /api/auth/verify`（server-side 走上述 ADFS 流程）作为**可选增强**；默认使用**演示账户登录**（数据库种子用户）。这样：(a) 评分演示无外部依赖；(b) 真实凭证验证可用但可关闭；(c) 真实数据抓取仅用于对照校验，不作为运行时数据源（见 1.2）。课程允许 "data or services may be simulated"。

### 1.2 课程数据来源

**结论：课程数据固定在数据库种子中，不从真实 SIS 抓取。**

依据：
- 实测真实目录中 **CSC4130（2025-26 Term 1）不存在**——原型课程是课程作业语境下的虚构/改编集（原型中 CSC4100=机器学习、CSC4130=HCI 与真实编号不符）。
- 原型数据是为演示场景精心设计的：满额课、不可选课、候补场景、满员恢复剧情。真实数据无法控制这些剧情。
- PeopleSoft 无公开 JSON API，抓取成本高（iframe 状态机 + 会话票据）且数据每分钟变动，演示不可复现。

**方案**：`courses`/`sections`/`meetings`/`enrollment_requirements` 全部入库并 seed；以真实 SIS 的字段结构（class number、component、reserved quota、waitlist capacity）为**建模参照**，字段名向真实系统对齐，便于报告论述「与真实系统一致性」。

### 1.3 可复用内容（排查清单）

从真实系统复用到我们设计中的：

1. **LEC/TUT 成对班次模型** —— L01-LEC 必选 + T01-TUT 必选，选课以 Lecture 为主、Tutorial 跟随。直接对应 P0-3。
2. **Swap 操作语义** —— 先校验成功才替换，失败保留原课。对应 P0-8「安全换课」。
3. **Validate-before-enroll** —— 提交前资格预检、失败逐门给原因。对应 P0-5/6。
4. **Wait List Capacity/Total** 与 **reserved quota** 的显式字段 —— 对应 P0-9。
5. **Enrollment Dates** 按 term 的开放窗口 —— 对应 P0-10 的注册时间状态。
6. **Enrollment Requirement 文本结构**（如 "For Y1-Y2 SSE; Students who have taken CSC1001 cannot take this course"）—— 我们升级为**结构化字段**（minYear/major/prereqCourses/excludedCourses），支撑自动判定原因。
7. **状态机**：Enrolled / Dropped / Wait Listed + Units/Grading/Grade。
8. 课程详情字段集：Class Number、Session、Units、Instruction Mode、Grading、Meeting Information、Class Attributes（Medium of Instruction）、Description。
9. 搜索筛选维度：subject/catalog/career/open-only。

不复用：iframe 门户导航、无关键词搜索的限制、中英混杂的 UI。

### 1.4 i18n 机制

**真实 SIS：不统一。** UI 英文固定；「Data Language」切换无效（实测切到 Simplified Chinese 后所有 UI 与课程数据仍英文）；面包屑却出现「自助服务」中文；教师名中英双格式并存。

**我们当前原型：也不统一。** 三套机制并存：
1. `lib/translations.ts` 巨型硬编码字符串→英文词典（regex 逐条替换，含不完整句子拼接）；
2. `components/new-sis.tsx` 内联 `tr(zh,en)` 调用；
3. `Localized` 组件递归遍历 React children 做字符串替换（脆弱、对拼接文本无效）。

**方案（统一）**：
- UI 文案：单一消息目录 `messages/zh.json` + `messages/en.json`，按命名空间分键（`nav.registration`、`course.conflict`），组件内 `t('nav.registration')`，删除 `Localized` 正则机制和内联 `tr()` 双写。
- 数据文案（课程名/教师/类别）：数据库字段双语列 `title_zh/title_en` 等，渲染时按语言取列。
- 语言切换状态存 localStorage（纯 UI 偏好）。

### 1.5 数据库边界

**入库（服务端权威数据）：**

| 内容 | 理由 |
|---|---|
| 课程/班次/上课时间/容量/余量/候补 | 多用户共享、需事务性扣减（注册成功扣余位） |
| 学生账户（演示）与学籍属性（专业/年级/已修学分） | 资格判定依据 |
| 选课计划（多 Plan）与计划项、候选课 | P0-1 要求跨会话持久化，且注册结果需与计划对账 |
| 注册结果/已注册课表/候补队列 | 核心业务状态，服务端校验的唯一事实源 |
| 注册开放窗口（per term） | P0-10 统一时间状态 |
| 毕业要求（demo 版结构化规则） | 学业进度缺口计算 |
| 通知/课程变更事件 | P1-11 通知跳转 |

**不入库（localStorage）：**
- 界面语言偏好、新手引导完成标记、最近搜索关键词（纯本地便利数据，非业务状态）。
- 未登录访客的临时草稿（可选；登录后合并入库）。

**边界理由**：修改建议 P0-1 要求「刷新后恢复进度」。若只存 localStorage，换浏览器/换设备即丢失，且注册扣余位必须在服务端（或单一权威数据源）做事务，否则多人演示时容量数据失真。用户信息不放 localStorage——学业数据是资格判定输入，属于业务数据。

---

## 2. 目标架构

```
Next.js 16 App Router（单仓库，同现结构）
├─ app/                     页面（样式尽量不变）
│  └─ api/                  REST API routes（Route Handlers）
│     ├─ courses/           GET 列表/详情（含 sections+meetings）
│     ├─ plans/             CRUD 计划/计划项/备选项
│     ├─ candidates/        CRUD 候选课
│     ├─ registration/      POST 提交注册（事务）、GET 状态
│     ├─ enrollment/        POST drop / swap-section / replace（安全换课）
│     ├─ progress/          GET 学业进度（已修/已注册/计划学分）
│     └─ auth/              POST 演示登录 + 可选 ADFS verify
├─ lib/
│  ├─ db/                   Prisma client + 领域服务（registration.ts 逻辑迁移到服务端）
│  └─ seed/                 种子数据（扩展现有 12 门课 + LEC/TUT 班次 + 限制场景课程）
├─ messages/zh.json en.json 统一 i18n 目录
└─ prisma/schema.prisma     SQLite（dev/演示）→ Postgres 可切换（同一 schema）
```

**数据库选型：SQLite + Prisma。** 理由：零外部服务、`pnpm dev` 即跑、Vercel/本地演示无依赖；事务（注册扣余位）SQLite 单文件足够；schema 保持 Postgres 兼容，需要时只换 connection string。作业评分场景没有并发压力。

## 3. 数据库 Schema 设计（Prisma 逻辑模型）

```
User            id, studentNo, passwordHash, nameZh, nameEn, major, year, creditsCompleted
Term            id, code("2026-Fall"), regOpenAt, regCloseAt, addDropCloseAt
Course          id, code("CSC4130"), titleZh, titleEn, credits, category(major_required/…),
                descriptionZh/En, instructor, rating, demand, workload,
                minYear?, majorsAllowed[], prereqCourseIds[], excludedCourseIds[], grading
Section         id, courseId→Course, kind(LEC/TUT), sectionCode("L01"),
                capacity, enrolledCount, reservedQuota, reservedForZh/En, waitlistCapacity, waitlistCount,
                classNbr(对照真实系统 4 位编号)
Meeting         id, sectionId→Section, dayOfWeek(0-4), startMin, endMin, room, dateStart, dateEnd
                （一门 LEC 可多天 = 多条 meeting）
Plan            id, userId→User, name, termId→Term, createdAt
PlanItem        id, planId→Plan, sectionId→Section（主选班次）, tutorialSectionId?,
                priority, role(primary/backup), backupOfItemId?, addedAt
Candidate       id, userId→User, courseId→Course, addedAt
Registration    id, userId, termId, submittedAt, status(draft/submitted)
RegistrationItem id, registrationId, sectionId, status(registered/failed/waitlist/dropped),
                failReason?, waitlistPosition?
Enrollment      id, userId, sectionId, termId, status(enrolled/dropped), source(plan/manual/swap),
                createdAt, droppedAt?          —— 已注册课表的唯一事实源
CompletedCourse id, userId, courseCode, credits, grade, term      —— 学业进度「已修」
DegreeRequirement id, major, category, requiredCredits
Notification    id, userId?, courseId?, kind, bodyZh, bodyEn, createdAt, readAt?
SearchHistory   —— 不入库，localStorage
```

关键不变式：
- `Section.enrolledCount` 只能由服务端注册/退选事务增减；`waitlistPosition` 由 per-section 队列顺序导出。
- 一个 PlanItem 指向具体 Section（不是 Course），冲突检测/课表/换班共用 meetings 数据 —— 直接满足 P0-3。
- 注册 = 单次事务：逐项校验（资格/满员/冲突/时间窗）→ 成功的写 Enrollment 并 `enrolledCount++`，满员且 waitlist 开放写 waitlist 项。

## 4. P0/P1 映射（实现顺序）

| 条目 | 实现要点 |
|---|---|
| P0-1 持久化 | 登录后全部状态入库；未登录时 localStorage 草稿 + 登录合并 |
| P0-2 新建/复制计划 | POST /api/plans（blank 或 copyFrom），name 必填唯一，上限 6 个；首页状态卡 per-plan |
| P0-3 LEC/TUT | seed 每门课补 TUT 班次；选课时选 L01+T02 组合；冲突按 meeting 全集 |
| P0-4 备选可操作 | planItem role=backup + backupOfItemId；冲突卡动作调 enrollment API |
| P0-5 资格前移 | Course 结构化限制字段 + GET /api/courses 返回 per-user eligibility + 原因码 |
| P0-6 模拟注册 | POST /api/registration 按当前计划逐项执行，事务写 Enrollment；「模拟变化」改为服务端可控的演示开关（将指定课置满）作用于用户真实所选 |
| P0-7 切换计划 diff | GET /api/plans/:id/diff 以 Enrollment 为基准计算 keep/add/drop/replace |
| P0-8 退选/换班/安全换课 | POST /api/enrollment/drop|swap|replace，先校验后提交，失败保留原状并返回原因码 |
| P0-9 余位/候补统一 | enrolledCount/waitlistCount 事务更新；候补位置 = 队列序号 |
| P0-10 时间窗统一 | GET /api/term 返回窗口状态；首页/按钮/提交三处共用 |
| P1-11~16 | 通知跳转 courseId 深链、进度三分量、搜索规范化（去空格大小写）+ 最近搜索 localStorage、推荐卡带 requirement 依据、引导改「下一步」按钮、CSS 对比度微调（不改设计体系） |

## 5. i18n 实施

- `messages/zh.json` / `en.json` 按页面命名空间；`useT()` hook 读 React context；语言偏好存 localStorage。
- 数据双语列；`displayName(course, lang)` 取列。
- 删除 `Localized` 正则替换引擎与 `translations.ts` 巨型词典（迁移进消息目录）。

## 6. 里程碑（对应 12 月 18 日截止）

1. **M1 数据层**：Prisma schema + seed（扩展课程与 LEC/TUT + 限制场景）+ /api/courses —— 前端改用真实 API 但外观不变。
2. **M2 计划与持久化**：auth 演示登录、plans/candidates API、前端 useState → API 同步层。
3. **M3 注册闭环**：registration/enrollment/waitlist 事务 API + diff + add/drop/swap。
4. **M4 打磨**：i18n 目录化、P1 全项、对比度微调、README 按 final(2).pdf 要求重写。
5. **M5 报告素材**：架构决策记录进 OneDrive 过程文档。

## 7. 开放风险

- **ADFS 凭证**：给定账号实测被 ADFS 拒绝（可能是密码过期或非正式账号）。若要做「真实验证」演示需先人工确认凭证可用；否则仅保留演示登录。
- PeopleSoft 会话抓取复杂度高，已决定不做（见 1.2）。
- SQLite 不适合多人同时在线压测，但演示/评分场景足够；schema 保持 Postgres 兼容兜底。
