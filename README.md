# Study OS

**AI-Powered JEE Main + RBSE Class 12 Study Tracker**
_Plan. Study. Practice. Improve._

A study operating system for a Class 12 RBSE student preparing for JEE Main at the same time: one
priority-ranked syllabus hierarchy (Exam → Subject → Chapter → Topic → Subtopic) drives the
dashboard, progress tracking, revision engine, analytics, AI features and PDF export — nothing is
hardcoded per-subject.

---

## 1. What's actually implemented (read this first)

This was built in a single pass. Everything below is **real and working**, not a mockup:

- Supabase Auth (email/password) with session refresh via middleware and route protection
- Full Prisma/Postgres schema (30+ models) covering every entity in the spec
- Seed script loading real, researched JEE Main + RBSE Class 12 syllabus data (52 JEE chapters,
  60+ RBSE chapters, Hindi/English grammar & writing tables) — see `prisma/seed-data/`
- Dashboard: real streak, real today's-study-minutes vs goal, real weighted progress, real
  weak-topic detection, real revision-due count, all computed from your actual data
- Study hierarchy pages (Exam → Subject → Chapter → Topic) with a full Topic detail page:
  Overview / Learn / Practice / Performance / Revision / AI Assistant tabs
- Manual progress tracking (5 states) that automatically schedules spaced-repetition revision
- Study timer (Focus/Short Break/Long Break) that saves real `StudySession` rows and feeds the
  streak, daily goal and analytics
- Daily targets: manual add/toggle/delete, plus an AI-generated plan you can apply in one click
- Revision engine: adaptive 0/1/3/7/14/30-day spacing that speeds up or slows down based on your
  actual accuracy on review
- Rule-based weak-topic scoring (not an AI call — see `src/lib/domain/weakness.ts`) combining
  accuracy, time-per-question, revision gap, progress state and confidence
- Notes: full CRUD, pin, AI-generated notes you can save as a real editable note
- AI provider abstraction (`AIProvider` interface) with a working Gemini implementation, structured
  JSON output validated with Zod, a DB-backed rate limiter, and 24h caching of AI notes
- AI features: Notes Generator, Question Generator (labeled "AI Generated", never claimed as real
  PYQs), context-aware Study Assistant (hint-before-solution by default), Study Planner that reads
  your actual completed/weak/revision-due topics before generating a plan
- Analytics: Recharts bar charts (completion / study time / accuracy / questions solved per
  subject) plus chapter-wise progress bars, all from real `StudySession`/`QuestionAttempt` data
- Streak page with a 90-day heatmap and weekly/monthly consistency
- PDF export: full exam guide, subject guide, chapter guide, topic notes, weak-topic report and
  weekly report — generated server-side from live DB data via headless Chromium
- Admin CMS: chapter priority editing, deleted-topic toggling, and JSON syllabus import, gated
  behind `profile.isAdmin`
- Global search across chapters/topics/notes
- Responsive layout: desktop sidebar, mobile bottom nav

**Deliberately scoped down / left as groundwork**, so nothing above overclaims:

- Flashcards: schema exists (`Flashcard`, `FlashcardReview`) but there's no dedicated UI yet
- PYQ import: the `Question` model supports `source: PYQ_METADATA` with a `sourceRef` citation
  field, but no PYQ content is seeded — per the brief, we do not fabricate or scrape real past
  papers. Use the admin JSON import or `createQuestionAction` to add verified metadata yourself
- Achievements: schema exists, nothing unlocks them yet
- Admin topic-level editing UI: only chapters have inline edit rows; use JSON import for topics

---

## 2. Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router), TypeScript, React 19 |
| Styling | Tailwind CSS v4, shadcn/ui (Radix), Framer Motion |
| Database | PostgreSQL via **Supabase**, Prisma ORM 6 |
| Auth | **Supabase Auth** (email/password + session refresh middleware) |
| AI | Gemini (`@google/generative-ai`) behind a swappable `AIProvider` interface |
| PDF | Puppeteer (headless Chromium) rendering server-built HTML |
| Charts | Recharts |
| Validation | Zod (everywhere: forms, server actions, AI structured output) |
| Forms | React Hook Form |

---

## 3. Setup instructions

### 3.1 Install dependencies

```bash
npm install
```

(`postinstall` runs `prisma generate` automatically.)

### 3.2 Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project.
2. **Project Settings → API**: copy the Project URL, `anon` public key, and `service_role` key.
3. **Project Settings → Database → Connection string**: copy both the pooled connection (port
   `6543`, for `DATABASE_URL`) and the direct connection (port `5432`, for `DIRECT_URL`).

### 3.3 Environment variables

```bash
cp .env.example .env.local
```

Fill in every value in `.env.local` from step 3.2. The Prisma CLI only reads `.env` (not
`.env.local`), so also copy `DATABASE_URL`/`DIRECT_URL` into a plain `.env` file, or run:

```bash
cp .env.local .env
```

### 3.4 Database setup & migration

```bash
npm run db:migrate      # creates every table from prisma/schema.prisma
```

Then, in the **Supabase SQL Editor**, run the contents of
`prisma/sql/001_profile_trigger_and_rls.sql`. This:

- creates a Postgres trigger that auto-inserts a `profiles` row whenever someone signs up via
  Supabase Auth
- enables Row Level Security on every user-data table so a user can only ever read/write their
  own rows (the Next.js server also scopes every query by the authenticated user — this is
  defense in depth, not the only guard)

### 3.5 Seed the syllabus

```bash
npm run db:seed
```

Loads JEE Main (Physics/Chemistry/Mathematics) and RBSE Class 12 (Hindi/English/Physics/
Chemistry/Mathematics) syllabus data from `prisma/seed-data/`. Safe to re-run (upserts by slug).

### 3.6 Gemini API setup

1. Get a key at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).
2. Set `GEMINI_API_KEY` in `.env.local`. `AI_PROVIDER=gemini` and `GEMINI_MODEL=gemini-flash-lite-latest`
   are already set in `.env.example`.

Without a key, every AI feature fails gracefully with a clear "AI isn't configured" toast — the
rest of the app (auth, tracking, timer, revision, analytics, PDF export) works fully without it.

### 3.7 PDF generation

Works out of the box locally — `npm install` already pulled down Puppeteer's bundled Chromium.
No extra setup needed for local dev or a traditional Node host (Railway, Render, a VPS, etc.).

**Serverless (Vercel):** handled automatically — `src/server/pdf/puppeteer.ts` switches to
`puppeteer-core` + `@sparticuz/chromium` when `VERCEL` is set. If the server still can't render,
the export page falls back to printing the same HTML in the browser ("Save as PDF").

### 3.7a Android app (APK)

`public/downloads/study-os.apk` is a Trusted Web Activity wrapping the live site, built with
Google's Bubblewrap. To rebuild (e.g. after changing the icon/name/host):

```bash
npm i --no-save @bubblewrap/core   # or point BUBBLEWRAP_DIR at an install elsewhere
npm run android:apk                # needs a JDK 17+ and the Android SDK
```

The signing key lives in `android-twa/keystore/` (git-ignored) — **back it up**: every future APK
must be signed with the same key, or phones refuse to install it over the old one. The build also
writes `public/.well-known/assetlinks.json`, which lets the app open full-screen (no URL bar).
Bump `TWA_VERSION_CODE` for each new release.

### 3.7b Syllabus sync (2026–27)

`npm run syllabus:sync` (add `-- --dry-run` to preview) aligns chapters/topics/marks with the RBSE
2026–27 and JEE Main priority handbooks. It's idempotent and never hard-deletes anything.

### 3.8 Make yourself an admin (optional)

Admin CMS at `/admin` is gated by `profile.isAdmin`. After signing up once, flip it on in the
Supabase SQL Editor:

```sql
update public.profiles set "isAdmin" = true where email = 'you@example.com';
```

### 3.9 Run it

```bash
npm run dev
```

Visit `http://localhost:3000`, sign up, confirm your email (Supabase sends a confirmation link by
default), log in, and you'll land on the dashboard with the seeded syllabus ready to browse.

---

## 4. Development commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (also runs the TypeScript checker) |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint |
| `npm run db:generate` | Regenerate the Prisma client after a schema change |
| `npm run db:migrate` | Create/apply a migration |
| `npm run db:seed` | Re-run the syllabus seed |
| `npm run db:studio` | Open Prisma Studio (visual DB browser) |

---

## 5. Production deployment

1. Push the repo to GitHub, connect it to your host (Vercel, Railway, Render, …).
2. Set every variable from `.env.example` in the host's environment settings — **never** commit
   `.env` or `.env.local`.
3. Run `npm run db:migrate` (or `prisma migrate deploy` in CI) against the production database,
   then the RLS SQL file once, then `npm run db:seed` once.
4. If deploying to a serverless platform, apply the Puppeteer swap described in 3.7 first.
5. `NEXT_PUBLIC_APP_URL` should match your real deployed URL (used in the Supabase email-
   confirmation redirect).

---

## 6. Architecture overview

```
Exam → Subject → Chapter → Topic → Subtopic          (prisma/schema.prisma)
```

- **`src/lib/`** — framework-agnostic building blocks: Supabase clients (browser/server/
  middleware), the Prisma singleton, the `AIProvider` abstraction (`src/lib/ai/`), and pure
  domain logic with no I/O (`src/lib/domain/`: revision spacing, streak rules, weakness scoring,
  weighted progress — all unit-testable in isolation from the DB).
- **`src/server/queries/`** — read-only Prisma aggregations shared by multiple pages (dashboard,
  analytics, weak-topic detection, revision due-list, planner context).
- **`src/server/actions/`** — Next.js Server Actions (`"use server"`), one file per domain
  (progress, sessions, targets, revisions, notes, questions, ai, settings, admin, auth). Every
  action re-derives the authenticated user server-side via `requireUserAction()` and validates
  input with Zod — never trusts an ID sent from the client without checking ownership.
  `updateTopicProgressAction()` in `src/server/actions/progress.ts` also drives the revision
  engine, so progress tracking and spaced repetition stay in sync automatically.
- **`src/server/pdf/`** — HTML template builders (`render.ts`, `styles.ts`) + DB-driven document
  assembly (`generate.ts`) + the Puppeteer renderer, wired up at `src/app/api/pdf/route.ts`.
- **`src/components/`** — UI. `ui/` is shadcn primitives; everything else is feature-scoped
  (`topic/`, `dashboard/`, `planner/`, `revision/`, `notes/`, `admin/`, `analytics/`, `nav/`).
- **`src/app/(app)/`** — every authenticated route, sharing one layout (`layout.tsx`) that renders
  the sidebar/topbar/bottom-nav and calls `requireUser()` once.
- **Why data-driven, not hardcoded per subject:** every page (dashboard, progress, revision,
  analytics, AI, PDF export) queries the same five-level hierarchy generically. Adding a new exam
  or subject is a data operation (seed script or admin JSON import), never a code change.

### AI provider abstraction

```
AIProvider (interface, src/lib/ai/provider.ts)
 └── GeminiProvider (src/lib/ai/gemini-provider.ts)      ← active, AI_PROVIDER=gemini
     (OpenAIProvider / ClaudeProvider would slot in here later)
```

`getAIProvider()` in `src/lib/ai/index.ts` is the only place that reads `AI_PROVIDER` from the
environment. Every AI server action calls `generateStructured()` with a Zod schema
(`src/lib/ai/schemas.ts`) — the model's JSON is validated before it ever reaches the database or
the client, with one automatic retry on a schema mismatch.

---

## 7. Security notes

- All AI calls happen server-side only (`GEMINI_API_KEY` is never in client bundles).
- Every Server Action re-authenticates via Supabase (`requireUserAction()`) and checks resource
  ownership before mutating (e.g. `deleteNoteAction` verifies `note.userId === profile.id`).
- Row Level Security (`prisma/sql/001_profile_trigger_and_rls.sql`) is a second, database-level
  guarantee independent of application code.
- AI endpoints are rate-limited per user (`src/lib/ai/rate-limit.ts`, 8 requests/60s) and AI notes
  are cached for 24h to avoid redundant spend (`generateNotesAction`'s cache check).
- Zod validates every Server Action input and every AI structured-output response.
