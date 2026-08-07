# Devweekends

AI study platform — paste notes or upload a document, Gemini generates a
flashcard deck and multiple-choice quiz, and your dashboard flags weak
topics based on quiz performance. Next.js (App Router), Prisma + SQLite,
NextAuth, Google Gemini.

## Run it locally

Requires Node.js 18+.

```bash
cd devweekends
npm install
npm run db:push
npm run db:seed
npm run dev
```

Open http://localhost:3000. Sign in with the seeded account
(`sam@devweekends.dev` / `Student123!`) or register your own.

## Gemini setup (required to generate decks)

1. Get a free API key at https://aistudio.google.com/apikey.
2. Put it in `.env` as `GEMINI_API_KEY`.
3. Restart `npm run dev`.

No sample decks are seeded, since generation needs a real key — create your
first one from **New deck** once the key is set.

## How it works

- **Generate**: `/decks/new` → paste text or upload a PDF/txt → `/api/generate`
  extracts the text, sends it to Gemini with a constrained JSON schema
  (`responseSchema`), then validates the response with zod before saving
  anything (`src/lib/gemini.ts`). If Gemini's output doesn't match the
  expected shape, generation fails cleanly instead of saving garbage.
- **Study**: flip through flashcards (`/decks/:id/study`).
- **Quiz**: take a multiple-choice quiz (`/quizzes/:id/take`) — the client
  never receives correct answers until after submission; scoring happens
  entirely server-side in `/api/attempts` from the stored answer key, never
  from a client-supplied score.
- **Recommendations**: the dashboard flags any deck whose most recent quiz
  attempt scored under 70% and surfaces it under "Recommended review" first.

## Data model

See `prisma/schema.prisma`: `User`, `Deck` → `Flashcard[]` + `Quiz` →
`Question[]`, `Attempt` → `AttemptAnswer[]`.

## Going to production

- Swap Prisma's `sqlite` provider for `postgresql`.
- Set a fresh `NEXTAUTH_SECRET`.
- Consider rate-limiting `/api/generate` — it's the one route that costs
  real money per call (Gemini API usage) and currently has no per-user cap.
