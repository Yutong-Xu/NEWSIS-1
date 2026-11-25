# New SIS — Interactive High-Fidelity Prototype

**CSC4130 / CSC3160 Assignment 2 · Undergraduate Team 2 · Phase 4**

**Live prototype:** https://new-sis-highfi.vercel.app (no installation or login needed)

New SIS is a course planning and registration workspace for undergraduates at The Chinese University of Hong Kong, Shenzhen (CUHK-Shenzhen). It helps students find courses, build and compare timetable plans, respond when course or degree information changes, and recover when a course fails at registration without rebuilding their whole schedule. This is an assessed prototype with simulated data. It does not register anyone for real courses.

---

## 1. Access and setup

### Option A: open the live link (recommended)

Open **https://new-sis-highfi.vercel.app** in a desktop browser (Chrome, Edge, Firefox or Safari). The interface starts in **Chinese**; use the language menu in the top bar to switch to English. Reloading the page resets all plans and registration results to the starting state.

### Option B: run it locally

You need **Node.js 22 or later** and **pnpm**. The project declares pnpm 12.3.4 in `package.json`. Internet access is required the first time to install dependencies. No account, API key or database is needed.

1. Extract the ZIP and open the folder that contains `package.json` (the `new-sis-highfi` folder).
2. Open a terminal in that folder. On Windows, click File Explorer's address bar, type `powershell` and press Enter.
3. If pnpm is missing, run `npm install --global pnpm`.
4. Install dependencies and start the development server:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

5. Open **http://localhost:3000** in your browser. If the terminal prints a different address, such as `http://localhost:3001`, use that one instead.
6. Press **Ctrl+C** in the terminal to stop the server.

For a production preview, run `pnpm build` and then `pnpm start`.

---

## 2. Target device

- **Platform:** desktop web browser on a laptop or desktop computer.
- **Reference viewport:** 1440 × 900. The layout adapts to narrower windows, and below about 700 px the sidebar collapses into a menu. Desktop is the platform we designed and evaluated for.
- **Input:** mouse or trackpad, plus keyboard. Every core action can be completed by clicking a button, so drag-and-drop is never required.

---

## 3. Context of use

**Who.** CUHK-Shenzhen undergraduates who plan and register for courses each semester. This includes first-year students who are new to the process and senior students managing more complex timetables.

**When and where.** On the student's own laptop at three moments: before registration opens, when exploring courses and preparing plans; on registration day, when submitting a plan and handling any course that fails; and during the add/drop period, when reviewing and adjusting registered courses.

**What students can accomplish.**

- Search and filter the catalogue, and check a course's time, credits, seats and prerequisites.
- Save interesting courses as **Candidates**, then place them into **Plan A**, **Plan B** or additional plans.
- See time conflicts before a course enters a plan, and keep alternative plans for comparison.
- Read important updates, such as a change in degree requirements, and revise a plan in response.
- Submit a plan for registration and recover from a failure by using Plan B, a priority backup course, the waitlist or another course.
- Review registered courses in **Add / Drop** and check credit progress in **Degree Progress**.

---

## 4. Operating instructions

### Starting state

- The left sidebar leads to **Overview, Explore Courses, My Course Plans, Registration, Add / Drop** and **Degree Progress**. The top bar holds the language menu, the current term (Fall 2026) and the notification bell.
- **Plan A** starts with ECO3121, CSC3170, ENG2001A and GED2003 (14 credits). **Plan B** starts with the same courses plus DMS2030 (17 credits). The Candidates list starts empty. The demo credit limit is 18 credits.
- On the first visit, an **eight-step guided walkthrough** points to each real control in order. Click the highlighted control, or anywhere on the screen, to advance, or choose **Skip guide**. Replay it at any time with **Registration Guide** in the sidebar.

### Task 1 (simple): find a course

1. Open **Explore Courses**.
2. Search by course code, title or instructor, for example `CSC4130`. You can also rerun a **recent search** or narrow the list with the **filters** (department, level, credits, day, time, instructor, category, eligibility and available seats).
3. Click **View Course Details** to check the meeting time, credits, seats, prerequisites, assessment and workload.
4. Click **Add to Candidates** to save the course for later, or use **Add to Plan…** to put it directly into a plan you choose.

**Done when:** the course appears in the Candidates list or in the chosen plan, and a confirmation message appears.

### Task 2 (moderate): build a plan

1. Open **My Course Plans** and select the plan tab you want to edit (Plan A, Plan B or a plan you created).
2. In the Candidates list, click **Add to Plan** on each course. Each course is placed on the weekly timetable at its meeting time in the demo data, and the plan's credit total updates.
3. If a course would clash with one already in the plan, a warning names both courses and the time before anything changes. Choose **Cancel**, a conflict-free alternative section where one exists, or **Add anyway**.
4. Use **Remove** to take a course out of a plan; it returns to Candidates. Adding a course to a plan, removing it from a plan, and removing a candidate offer **Undo** in the confirmation message.
5. Optional: **New plan** copies the current plan; **Delete plan** asks for confirmation first; **Compare plans** shows credits, conflicts and workload side by side.

**Done when:** the plan shows the courses you want, with no conflicts and no more than 18 credits.

### Task 3 (complex): revise a plan after an update

1. Click the notification **bell** or go to **Overview**, and open **Fall 2026 degree requirements updated** under **Important Updates**.
2. The details show that **MAT3007** and **CSC5130** were added to the 2026 requirements. They are not added to any plan automatically.
3. Find **MAT3007** in Explore Courses and add it to Candidates.
4. Try adding MAT3007 to **Plan A**. It clashes with **ECO3121** (Mon / Wed 10:00–11:15), and New SIS warns you before changing the plan.
5. Keep Plan A as it is. Switch to **Plan B**, remove ECO3121 (it returns to Candidates), and add MAT3007.

**Done when:** Plan B includes MAT3007 with no conflicts, and Plan A remains available for comparison.

You can also click **Simulate a change** in My Course Plans to rehearse other changes, such as a full course or a new meeting time. The affected course is marked **Updated** and offers **Keep course** or **Replace course**; the rest of the plan stays unchanged.

### Extra flow: recover from a registration failure

**Preset demo (recommended for reviewers).** Open **Registration** and click **Start demo**. Click **Register Plan A**: four courses succeed, and CSC4130 fails because the course is full. Then choose one of three recovery options:

- **Register Plan B now** replaces CSC4130 with DMS2030 (5 courses, 17 credits).
- **Register priority course** follows Plan A's course priority and registers the first eligible, unregistered course that fits the schedule.
- **Register other courses** lets you pick another compatible course.

All three options keep the four successful registrations. This demo uses its own fixed plans and does not change your editable plans or registration results.

**Connected flow.** In **My Course Plans**, click **Pre-registration check** to review credits, conflicts and eligibility. Then click **Continue to registration**, choose a plan and submit it. Each course shows its own result. If one fails, choose the waitlist, a backup course, another plan or **Register other courses**, which creates a **Recovery Plan** that keeps your registered courses. Successful courses then appear in **Add / Drop**, where dropping a course requires confirmation. **Degree Progress** summarizes credits by requirement category.

### Simulated interactions and predefined inputs

- All data is hard-coded: 12 mock courses, their seats, times and eligibility, the four important updates, ratings and timestamps.
- The CSC4130 failure in the preset demo is predefined. In the connected flow, a course fails only if it has no seats or if you tick the **Simulate CSC4130 filling up** option before submitting.
- Processing indicators use fixed delays, and no request is sent to any server.

---

## 5. Development approach and technical considerations

**Platform and tools.** The prototype is a web application built with **Next.js 16** (React 19) and written in **TypeScript**. Styling uses **Tailwind CSS** and custom CSS. Dialogs come from Base UI, icons from Lucide and notifications from Sonner. The live version is hosted on **Vercel**.

**Project structure.**

| Path | Purpose |
| --- | --- |
| `lib/courses.ts` | Mock course records, conflict detection, plan metrics and backup recommendations |
| `lib/registration.ts` | Pre-registration checks and simulated registration batches |
| `lib/translations.ts`, `components/language.tsx` | English and Chinese interface text |
| `components/new-sis.tsx` | Navigation, Explore Courses, Candidates, plans, course details and Add / Drop |
| `components/timetable.tsx` | Weekly timetable, conflict labels and the readable course list |
| `components/update-feed.tsx` | Important updates and their detail views |
| `components/recovery-flow.tsx` | Connected registration and recovery flow |
| `components/plan-registration-demo.tsx` | Preset registration-recovery demo |
| `components/guided-walkthrough.tsx` | First-visit guided walkthrough |
| `app/globals.css` | Colour tokens, layout and accessibility styles |
| `tests/registration.cjs` | Automated checks of the registration logic |

**How the backend is simulated.** There is no database or server. Course records live in `lib/courses.ts`, and React state connects Candidates, plans, pre-registration checks, registration results and Add / Drop within one browser session. Rule-based functions check prerequisites, the 18-credit limit, time conflicts and section differences, and they rank backup courses by the student's course priority. Recommendations come from these explicit rules, not from a trained AI model.

**Key challenges.**

- **Keeping several plans and partial results consistent.** A student may register part of Plan A and then switch to Plan B. Registered courses are therefore stored as snapshots, and every recovery option re-checks the combined schedule so that no course is submitted twice and no new conflict slips through.
- **Repeatable demonstrations.** Real seat counts change constantly, so the registration failure is a fixed scenario that behaves the same every time.
- **Two languages with one state.** Interface text is translated at display time, so switching language never resets plans or registration results.

A production version would replace the fixtures with university data services, add authentication and persistent storage, and move registration checks to the server, while keeping the same task flows.

**Verification.** Run these commands in the project folder:

```sh
pnpm exec tsc --noEmit      # type check
node tests/registration.cjs # registration logic tests
pnpm build                  # production build
```

The tests cover partial failure, registering Plan B after a failure, duplicate prevention, retained credits, conflicts, prerequisites, full courses and section changes. These are functional checks, not a usability study with participants.

---

## 6. Design refinements from the heuristic evaluation

The high-fidelity version responds to the team's heuristic evaluation of the mid-fidelity prototype (32 violations, 6 rated major). Key changes:

- Students choose the destination plan, and the system checks for conflicts **before** a course is added (H5).
- Updates open to their full before/after content, and affected courses carry an **Updated** badge (H6).
- Prerequisites and eligibility are visible on course cards and checked again before registration (H5).
- Registration failures explain the cause in plain language and offer several recovery paths that keep successful courses (H9).
- Confirmations protect destructive actions (removing candidates, deleting plans, dropping courses). Adding or removing a course from a plan and removing a candidate offer Undo (H3).
- Conflicts are labelled with text and icons as well as colour (H11).
- A full English/Chinese interface supports students who are more comfortable in either language (H12).

---

## 7. Limitations and accessibility

**Data and functionality**

- All students, courses, updates, seats, ratings, timestamps and the 18-credit limit are demonstration data. There is no login, live university database, real seat reservation or real waitlist processing.
- Plans, candidates and registration results are kept in memory and reset on reload. Only the walkthrough's "seen" setting is stored in the browser. **Save plan** does not save to a server.
- The catalogue has 12 courses, so search and filters operate on a small data set, and not every institutional rule is modelled.

**Accessibility**

- **Implemented:** visible focus outlines; native buttons and form controls; text and icon labels for conflict and full states; a readable course list below the timetable; accessible names on timetable blocks; click alternatives for every drag action; selected colour pairs checked against WCAG AA contrast; and a reduced-motion setting.
- **Not yet verified:** screen-reader behaviour, full keyboard order across every page, zoom and reflow, forced-colours mode and mobile use. These need testing with participants and assistive technology. Our checks do not amount to an accessibility certification.

