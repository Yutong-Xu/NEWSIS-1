# New SIS — Full-Stack Course Registration System

**CSC4130 / CSC3160 Assignment · CUHK-Shenzhen**

New SIS is a course planning and registration workspace for undergraduates at CUHK-Shenzhen. It is now a **full-stack application**: Next.js frontend + API routes + Prisma/SQLite database, with optional real-university SSO verification (ADFS).

## Architecture

```
┌─────────────────────────────────────────────┐
│ Browser                                     │
│  React components (visual structure kept    │
│  from the high-fidelity prototype)          │
└──────────────┬──────────────────────────────┘
               │ fetch /api/*
┌──────────────▼──────────────────────────────┐
│ Next.js 16 API routes (app/api/*)           │
│  auth · courses · plans · candidates ·      │
│  registration · enrollment · progress ·     │
│  term · notifications                       │
├─────────────────────────────────────────────┤
│ lib/db/registration-service.ts              │
│  transactional registration engine:         │
│  eligibility → conflict → seat decrement    │
│  (conditional atomic updateMany) → waitlist │
├─────────────────────────────────────────────┤
│ Prisma 6 + SQLite (dev.db)                  │
│  11 tables: users, sessions, courses,       │
│  sections, meetings, plans, candidates,     │
│  registrations, enrollments, terms,         │
│  requirements, notifications                │
└─────────────────────────────────────────────┘
```

- **Seat accounting is race-free**: seats decrement via `UPDATE … WHERE enrolledCount + reservedQuota < capacity` — a conditional atomic update; zero affected rows means full, no check-then-write race.
- **Waitlist**: when a section is full with open waitlist capacity, the registration item records the queue position (`wl#N`).
- **Tutorials**: lecture sections carry linked tutorial sections; enrollment creates both records.
- **Auth**: demo accounts are bcrypt-verified locally; any other student number is verified against the university ADFS SSO (`lib/sis-sso.ts`, reverse-engineered and verified end-to-end). Sessions are random-token cookies in the Session table.

## Run it

You need **Node.js 22+** and **pnpm**.

```sh
pnpm install --frozen-lockfile
cp .env.example .env        # DATABASE_URL="file:./dev.db"
npx prisma migrate deploy   # create the database
node --experimental-strip-types prisma/seed.ts   # seed courses + demo users
pnpm dev                    # http://localhost:3000
```

### Demo accounts

| Student No | Password | Notes |
|---|---|---|
| `123090873` | `demo123456` | 林语晴 · CSE Year 3 |
| `123090456` | `demo123456` | 陈可 · SME Year 2 |
| `123078899` | `demo123456` | 王博 · CSE Year 4 |

Any **other** student number is verified against the real CUHK-Shenzhen ADFS SSO. This requires campus-network reachability of `sts.cuhk.edu.cn` and `sis.cuhk.edu.cn`; off campus it simply rejects the login.

## API surface

| Endpoint | Methods | Purpose |
|---|---|---|
| `/api/auth/login` `/logout` `/me` | POST/GET | demo bcrypt or ADFS-SSO login, session cookies |
| `/api/courses` | GET | catalog search/filter; section availability; eligibility per user |
| `/api/plans` `[id]` `[id]/items` `[id]/diff` | GET/POST/DELETE | plan CRUD, item add/remove, enrollment-based diff |
| `/api/candidates` | GET/POST/DELETE | candidate list |
| `/api/registration` | GET/POST | submit a plan transactionally; per-course outcomes |
| `/api/enrollment` | GET/POST | enrolled sections; drop / safe-swap |
| `/api/progress` | GET | completed/enrolled/planned credits vs degree requirements |
| `/api/term` | GET | registration windows, credit limit, server time |
| `/api/notifications` | GET | user + broadcast notifications |

## Tests

```sh
node tests/registration.test.cjs   # domain logic: conflicts, eligibility, seat accounting
```

## Project layout

```
app/            Next.js app router pages + API routes
components/     React UI (visual structure preserved from prototype)
lib/
  api.ts        frontend fetch layer + hooks + legacy-shape adapter
  courses.ts    legacy Course type + pure timetable/conflict helpers
  sis-sso.ts    verified programmatic ADFS+PeopleSoft login client
  db/
    client.ts   Prisma singleton
    auth.ts     session resolution helpers
    domain.ts   conflict/eligibility/seat domain logic
    registration-service.ts  transactional registration engine
  seed/
    catalog.ts  17 courses with LEC/TUT sections (PeopleSoft field structure)
    users.ts    demo accounts, academic records
prisma/
  schema.prisma 11-model schema
  seed.ts       idempotent seed (upsert, safe to re-run)
DESIGN.md       full design document incl. real-SIS comparison
```

## Notes

- SQLite is the development default; the schema stays Postgres-compatible — switching is a connection-string change.
- See `DESIGN.md` for the full comparison with the real sis.cuhk.edu.cn (PeopleSoft) and the design rationale.
