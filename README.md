# New SIS — Interactive Course Registration Prototype

**CUHK-Shenzhen CSC4130 / CSC3160 Assignment 2 — Undergraduate Team 2 — Phase 4**

New SIS is a course planning and registration workspace for undergraduates at
CUHK-Shenzhen. It is a **fully static browser application**: no backend, no
database server, no login — open it and you are in.

## Data boundary (final architecture)

| Storage | Content |
|---|---|
| **Static modules** (`lib/seed/catalog.ts`, `lib/content.ts`) | Fixed reference data: course catalog, sections, degree requirements, term windows, notifications |
| **Browser localStorage** | Everything personal: the visitor persona (random per browser), plans, candidates, registration/waitlist/drop results, language preference |
| **Nothing else** | No server database, no school-system integration of any kind |

- **No login**: each browser gets a random UUID on first visit. The UUID
  deterministically assigns one of three persona templates (`lib/persona.ts`) —
  a CSE junior, a CSE freshman, or an SME senior — each with a coherent academic
  history that drives eligibility checks, so different visitors experience
  different restriction scenarios.
- **Registration is a browser-local simulation** (`lib/registration.ts`
  `submitRegistration`): priority-ordered validation (time window → already
  enrolled → eligibility → time conflict → credit limit → seats), waitlist
  positions for full courses, results persisted in localStorage across reloads.

## Run it

```sh
pnpm install
pnpm dev    # http://localhost:3000
```

No environment variables, no database setup, no accounts.

## Stack

Next.js 16 + React 19 + TypeScript, Tailwind CSS 4, base-ui/react primitives.
