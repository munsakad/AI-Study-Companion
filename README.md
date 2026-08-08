# Devweekends

AI study platform — paste notes or upload a document, Gemini generates a
flashcard deck and multiple-choice quiz, spaced repetition schedules your
flashcard reviews, and analytics + a weak-topics dashboard show where to
focus next. Next.js (App Router), Prisma (SQLite in dev, Postgres in
prod), NextAuth, Google Gemini.

## Features

- **Generate**: paste notes or upload a PDF/txt → Gemini produces a titled
  flashcard deck and a multiple-choice quiz, validated against a strict
  schema before anything is saved. Capped per user (`GENERATION_DAILY_LIMIT`,
  default 10/day) — it's the one route that costs real API usage per call.
- **Study**: flip through flashcards, or run a **spaced repetition review
  session** (`/study/review`) that grades cards Again/Hard/Good/Easy
  (simplified SM-2) and schedules the next review date per card.
- **Quiz**: take a multiple-choice quiz — the client never receives correct
  answers until after submission, and scoring happens entirely server-side
  from the stored answer key, never from a client-supplied score. Retake
  anytime; **quiz history** shows every past attempt and a score trend.
- **Edit**: rename a deck, tag it, and add/edit/delete individual
  flashcards and quiz questions (`/decks/:id/edit`). Questions that already
  have quiz history attached lock their choices/correct-answer to keep past
  results accurate. **Export** a deck as Markdown for offline use.
- **Analytics** (`/analytics`): score trend across all quizzes,
  mastery-by-topic, and daily study activity, plus a study streak.
- **Dashboard**: search/filter decks by title, topic, or tag; "Recommended
  review" surfaces any deck whose most recent quiz attempt scored under 70%.
- **Dark mode**: system-aware by default, with a manual toggle (no flash
  on load).

## Run it locally

Requires Node.js 18+. Local dev uses SQLite — no database to install.

```bash
cd devweekends
npm install
npm run db:push
npm run db:seed
npm run dev
```

Open http://localhost:3000. Sign in with the seeded account
(`sam@devweekends.dev` / `Student123!`) or register your own.

### Gemini setup (required to generate decks)

1. Get a free API key at https://aistudio.google.com/apikey.
2. Put it in `.env` as `GEMINI_API_KEY`.
3. Restart `npm run dev`.

If generation fails, check the server console — `src/lib/gemini.ts`
distinguishes a missing/placeholder key, an invalid key, a rate limit, and a
network failure into separate messages instead of one generic error, so the
actual cause is visible instead of "the request failed."

No sample decks are seeded, since generation needs a real key — create your
first one from **New deck** once the key is set.

## Architecture

- **Auth**: NextAuth credentials provider, bcrypt-hashed passwords, JWT
  sessions. `src/lib/authorize.ts` centralizes ownership checks
  (`requireAuth`/`requireOwner`) — every deck/quiz/attempt/flashcard route
  uses it, never a bespoke check.
- **Generation**: `/decks/new` → `/api/generate` extracts text (pasted or
  PDF via `pdf-parse`), sends it to Gemini with a constrained JSON
  `responseSchema`, then validates the response with zod
  (`src/lib/gemini.ts`) before saving anything.
- **Spaced repetition**: `src/lib/spacedRepetition.ts` is a pure,
  unit-tested scheduling function; `POST /api/flashcards/:id/review`
  applies it and logs a `ReviewLog` row (also feeds the streak calculation).
- **Scoring**: `src/lib/quizScoring.ts` is a pure, unit-tested function;
  `/api/attempts` fetches the answer key server-side and scores from it —
  the client only ever sends which choice it picked.
- **Rate limiting**: `src/lib/rateLimit.ts` enforces a rolling 24h cap on
  `/api/generate` per user, backed by a `GenerationLog` row per successful
  generation (failed calls don't consume quota).
- **Data model**: see `prisma/schema.prisma` — `User`, `Deck` (↔ `Tag`
  many-to-many) → `Flashcard[]` (+ spaced-repetition state, `ReviewLog[]`)
  + `Quiz` → `Question[]`, `Attempt` → `AttemptAnswer[]`, `GenerationLog`.

## Testing

```bash
npm test        # single run, against a disposable local SQLite test DB
npm run test:watch
```

42 tests: unit tests for the pure logic (`spacedRepetition`, `quizScoring`,
`streak`, `rateLimit`), and integration tests that call the actual route
handlers (`getServerSession` mocked, everything else real) covering auth,
ownership, scoring correctness, and the generation rate limit.

Local `npm test` runs against SQLite for zero-setup iteration. **CI**
(`.github/workflows/ci.yml`) runs the identical suite against a real
`postgres:16` service container — that job is the authoritative check that
nothing has quietly diverged between the two engines.

## Deploying

Local dev stays on SQLite; production uses Postgres. Rather than
maintaining two Prisma schema files, `scripts/swap-datasource.js` rewrites
`prisma/schema.prisma`'s datasource provider in place — run before
`prisma generate`/`db push` in CI and production builds, never in local dev.

### Vercel + a hosted Postgres (recommended)

1. Create a free Postgres database (e.g. [Neon](https://neon.tech) or
   [Supabase](https://supabase.com)) and copy its connection string.
2. Import the repo into Vercel.
3. Set environment variables: `DATABASE_URL` (from step 1), `NEXTAUTH_SECRET`
   (a fresh random string — `openssl rand -base64 32`), `NEXTAUTH_URL` (your
   deployed URL), `GEMINI_API_KEY`, `GENERATION_DAILY_LIMIT` (optional).
4. Set the **Build Command** to:
   `node scripts/swap-datasource.js postgresql && prisma generate && prisma db push --accept-data-loss && next build`
5. Deploy. On future schema changes, review `db push`'s diff output before
   deploying — `--accept-data-loss` is fine for this project's stage but
   will silently drop a column if you ever remove one with real data in it.

### Self-hosted with Docker

```bash
cp .env.example .env   # fill in NEXTAUTH_SECRET and GEMINI_API_KEY
docker compose up -d db
docker compose run --rm app npx prisma db push   # first run only
docker compose up -d app
```

Bundles the app and a Postgres container together (`docker-compose.yml`,
`Dockerfile`). This path is secondary to Vercel — the Dockerfile's runtime
stage keeps the Prisma CLI around specifically so the one-time `db push`
step above works.

## Known limitations

- `next` 14.2.15 bundles a `postcss` version with known advisories; fixing
  requires a Next 15/16 upgrade, which is a larger, separate migration.
- `db push` (not `prisma migrate`) is used throughout — right call for a
  single-maintainer project with no staged release process, but means
  schema changes aren't tracked as reviewable migration files.
