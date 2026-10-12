// In-browser stand-in for the study companion's API routes (src/app/api/*),
// used only by the static GitHub Pages build. Same validation, ownership and
// business rules, with data in this visitor's localStorage instead of SQLite.
// The scoring, spaced-repetition and streak logic is the app's own code from
// src/lib, imported as-is. Gemini generation uses the visitor's own key.
import { z } from "zod";
import { scheduleNextReview } from "@/lib/spacedRepetition";
import { scoreQuiz } from "@/lib/quizScoring";
import { computeStreak } from "@/lib/streak";
import { HttpError, checkPassword, createAuth, createDb, handleNextAuth, hashPassword, installFetch, json, newId } from "./runtime.js";
import { GeminiNotConfigured, generateJson } from "./gemini.js";
import { mountDemoPanel } from "./demoPanel.js";

const REPO_URL = "https://github.com/munsakad/AI-Study-Companion";
const GENERATION_DAILY_LIMIT = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

// ---- seed: prisma/seed.ts plus one hand-written sample deck --------------------------
function sampleDeck(userId) {
  const created = "2026-01-01T00:00:00.000Z";
  const cards = [
    ["What does Ohm's Law state?", "V = I × R: voltage equals current times resistance."],
    ["Unit of electrical resistance?", "The ohm (Ω)."],
    ["Two resistors in series: total resistance?", "R_total = R1 + R2."],
    ["Two resistors in parallel: total resistance?", "1/R_total = 1/R1 + 1/R2."],
    ["What does Kirchhoff's Current Law say?", "Current into a node equals current out of it."],
    ["What does Kirchhoff's Voltage Law say?", "Voltages around any closed loop sum to zero."],
    ["Power dissipated by a resistor?", "P = V × I = I²R = V²/R."],
    ["What does a capacitor store?", "Energy in an electric field (charge on its plates)."],
  ];
  const questions = [
    ["A 9 V battery drives a 450 Ω resistor. What current flows?", ["20 mA", "50 mA", "2 mA", "4.05 A"], 0, "I = V / R = 9 / 450 = 0.02 A."],
    ["Two 100 Ω resistors in parallel give:", ["200 Ω", "50 Ω", "100 Ω", "25 Ω"], 1, "Equal parallel resistors halve: 100 / 2 = 50 Ω."],
    ["Which law says currents into a node sum to the currents out?", ["Ohm's Law", "KVL", "KCL", "Faraday's Law"], 2, "Kirchhoff's Current Law is conservation of charge at a node."],
    ["Power in a 10 Ω resistor carrying 2 A?", ["20 W", "5 W", "40 W", "0.2 W"], 2, "P = I²R = 4 × 10 = 40 W."],
    ["What is the unit of capacitance?", ["Henry", "Farad", "Ohm", "Weber"], 1, "Capacitance is measured in farads (F)."],
  ];
  const deckId = "sample-deck";
  const quizId = "sample-quiz";
  return {
    deck: {
      id: deckId,
      userId,
      title: "Sample deck: Circuit fundamentals",
      topic: "Circuits",
      sourceText: "Hand-written sample so the static demo has something to study without a Gemini key.",
      tagIds: [],
      createdAt: created,
    },
    flashcards: cards.map(([front, back], i) => ({
      id: "sample-card-" + i, deckId, front, back, position: i,
      easeFactor: 2.5, intervalDays: 0, repetitions: 0, dueAt: created, lastReviewedAt: null,
    })),
    quiz: { id: quizId, deckId, userId, title: "Circuit fundamentals quiz", createdAt: created },
    questions: questions.map(([prompt, choices, correctIndex, explanation], i) => ({
      id: "sample-q-" + i, quizId, prompt, choices: JSON.stringify(choices), correctIndex, explanation, position: i,
    })),
  };
}

const seedSample = sampleDeck("seed-sam");
const db = createDb("studycompanion", {
  users: [{ id: "seed-sam", name: "Sam Lee", email: "sam@devweekends.dev", seedPassword: "Student123!" }],
  decks: [seedSample.deck],
  tags: [],
  flashcards: seedSample.flashcards,
  reviewLogs: [],
  generationLogs: [],
  quizzes: [seedSample.quiz],
  questions: seedSample.questions,
  attempts: [],
  attemptAnswers: [],
});
const auth = createAuth("studycompanion");

async function authorize(email, password) {
  const user = db.read().users.find((u) => u.email === email.toLowerCase().trim());
  if (!user || !(await checkPassword(user, password))) return null;
  return { id: user.id, name: user.name, email: user.email };
}

// ---- small query helpers ---------------------------------------------------------------------
const d = () => db.read();
const byDate = (key, dir = 1) => (a, b) => dir * a[key].localeCompare(b[key]);
const deckOf = (id) => d().decks.find((x) => x.id === id);
const quizOfDeck = (deckId) => d().quizzes.find((q) => q.deckId === deckId);
const cardsOf = (deckId) => d().flashcards.filter((c) => c.deckId === deckId).sort((a, b) => a.position - b.position);
const questionsOf = (quizId) => d().questions.filter((q) => q.quizId === quizId).sort((a, b) => a.position - b.position);
const attemptsOf = (quizId, userId) => d().attempts.filter((a) => a.quizId === quizId && (!userId || a.userId === userId));
const answersFor = (questionId) => d().attemptAnswers.filter((a) => a.questionId === questionId);
const tagNames = (deck) => (deck.tagIds || []).map((id) => d().tags.find((t) => t.id === id)?.name).filter(Boolean);

function owned(record, userId, notFound = "Not found") {
  if (!record) throw new HttpError(404, notFound);
  if (record.userId !== userId) throw new HttpError(403, "This isn't yours");
  return record;
}

function cascadeDeleteDeck(data, deckId) {
  const cardIds = new Set(data.flashcards.filter((c) => c.deckId === deckId).map((c) => c.id));
  const quizIds = new Set(data.quizzes.filter((q) => q.deckId === deckId).map((q) => q.id));
  const attemptIds = new Set(data.attempts.filter((a) => quizIds.has(a.quizId)).map((a) => a.id));
  data.decks = data.decks.filter((x) => x.id !== deckId);
  data.flashcards = data.flashcards.filter((c) => !cardIds.has(c.id));
  data.reviewLogs = data.reviewLogs.filter((r) => !cardIds.has(r.flashcardId));
  data.quizzes = data.quizzes.filter((q) => !quizIds.has(q.id));
  data.questions = data.questions.filter((q) => !quizIds.has(q.quizId));
  data.attempts = data.attempts.filter((a) => !attemptIds.has(a.id));
  data.attemptAnswers = data.attemptAnswers.filter((a) => !attemptIds.has(a.attemptId));
}

// ---- src/lib/gemini.ts ---------------------------------------------------------------------------
const flashcardSchema = { type: "OBJECT", properties: { front: { type: "STRING" }, back: { type: "STRING" } }, required: ["front", "back"] };
const questionSchema = {
  type: "OBJECT",
  properties: {
    prompt: { type: "STRING" },
    choices: { type: "ARRAY", items: { type: "STRING" } },
    correctIndex: { type: "INTEGER" },
    explanation: { type: "STRING" },
  },
  required: ["prompt", "choices", "correctIndex", "explanation"],
};
const generationSchema = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    topic: { type: "STRING", description: "A short 1-4 word topic label, e.g. 'Photosynthesis' or 'WWII causes'" },
    flashcards: { type: "ARRAY", items: flashcardSchema },
    quizTitle: { type: "STRING" },
    questions: { type: "ARRAY", items: questionSchema },
  },
  required: ["title", "topic", "flashcards", "quizTitle", "questions"],
};
const ZQuestion = z
  .object({
    prompt: z.string().min(1),
    choices: z.array(z.string().min(1)).min(2).max(6),
    correctIndex: z.number().int(),
    explanation: z.string().min(1),
  })
  .refine((q) => q.correctIndex >= 0 && q.correctIndex < q.choices.length, { message: "correctIndex out of range for choices" });
const ZGeneration = z.object({
  title: z.string().min(1),
  topic: z.string().min(1),
  flashcards: z.array(z.object({ front: z.string().min(1), back: z.string().min(1) })).min(1),
  quizTitle: z.string().min(1),
  questions: z.array(ZQuestion).min(1),
});

const Q3 = '"' + '"' + '"';
async function generateStudyMaterial(sourceText) {
  const prompt =
    "You are creating study material from the notes below.\n" +
    "Produce:\n" +
    "- A short deck title and a short topic label (1-4 words) that captures the subject.\n" +
    "- 8-12 flashcards covering the key facts/concepts (front = question or term, back = answer/definition).\n" +
    "- A quiz title and 5-8 multiple-choice questions (3-5 choices each, exactly one correct answer, plus a one-sentence explanation of the correct answer).\n\n" +
    "Base everything strictly on the notes below — don't invent facts not supported by them.\n\n" +
    "NOTES:\n" + Q3 + "\n" + sourceText.slice(0, 12000) + "\n" + Q3;
  let parsed;
  try {
    parsed = await generateJson("", prompt, generationSchema, 0.4);
  } catch (err) {
    if (err instanceof GeminiNotConfigured) {
      throw new HttpError(502, "Generating a deck needs a Gemini API key in this static demo. Add yours in the demo panel (bottom-right), or try the sample deck.");
    }
    const message = err.message || String(err);
    if (/API key not valid|API_KEY_INVALID|400/.test(message)) throw new HttpError(502, "Your Gemini API key was rejected. Double-check it in the demo panel.");
    if (/429|quota|rate limit/i.test(message)) throw new HttpError(502, "Gemini's rate limit or free-tier quota was hit. Wait a bit and try again.");
    throw new HttpError(502, "The AI generation request failed. Try again in a moment.");
  }
  const validated = ZGeneration.safeParse(parsed);
  if (!validated.success) throw new HttpError(502, "The AI response didn't match the expected format. Try again.");
  return validated.data;
}

// PDF text in the browser (pdf-parse needs Node)
const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";
let pdfjsPromise;
function loadPdfJs() {
  pdfjsPromise =
    pdfjsPromise ||
    new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = PDFJS + "pdf.min.js";
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + "pdf.worker.min.js";
        resolve(window.pdfjsLib);
      };
      script.onerror = () => reject(new HttpError(500, "Could not load the PDF reader"));
      document.head.appendChild(script);
    });
  return pdfjsPromise;
}
async function extractText(form) {
  const pasted = (form.get("text") || "").toString().trim();
  const file = form.get("file");
  if (file && typeof file !== "string" && file.size > 0) {
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      const pdfjs = await loadPdfJs();
      const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
      const pages = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const content = await (await doc.getPage(i)).getTextContent();
        pages.push(content.items.map((it) => it.str + (it.hasEOL ? "\n" : " ")).join(""));
      }
      return pages.join("\n");
    }
    return file.text();
  }
  return pasted;
}

// ---- route handlers ---------------------------------------------------------------------------
const registerInput = z.object({ name: z.string().min(1), email: z.string().email(), password: z.string().min(8) });
const attemptInput = z.object({ quizId: z.string(), answers: z.array(z.object({ questionId: z.string(), chosenIndex: z.number().int() })).min(1) });
const deckPatch = z.object({
  title: z.string().min(1).max(200).optional(),
  topic: z.string().min(1).max(60).optional(),
  tagNames: z.array(z.string().min(1).max(30)).max(10).optional(),
});
const cardInput = z.object({ front: z.string().min(1).max(2000), back: z.string().min(1).max(2000) });
const cardPatch = z.object({ front: z.string().min(1).max(2000).optional(), back: z.string().min(1).max(2000).optional() });
const reviewInput = z.object({ grade: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]) });
const newQuestion = z
  .object({
    prompt: z.string().min(1).max(2000),
    choices: z.array(z.string().min(1).max(500)).min(2).max(6),
    correctIndex: z.number().int(),
    explanation: z.string().min(1).max(2000),
  })
  .refine((q) => q.correctIndex >= 0 && q.correctIndex < q.choices.length, { message: "correctIndex out of range for choices" });
const questionPatch = z
  .object({
    prompt: z.string().min(1).max(2000).optional(),
    explanation: z.string().min(1).max(2000).optional(),
    choices: z.array(z.string().min(1).max(500)).min(2).max(6).optional(),
    correctIndex: z.number().int().optional(),
  })
  .refine((q) => q.correctIndex === undefined || q.choices === undefined || (q.correctIndex >= 0 && q.correctIndex < q.choices.length), {
    message: "correctIndex out of range for choices",
  });

function firstIssue(err) {
  return err && err.issues ? json({ error: err.issues[0]?.message ?? "Invalid input" }, 400) : null;
}

// Data the server components used to query with Prisma, exposed as demo-only
// routes for their client-side replacements (src/app/**/page.tsx overrides).
function dashboardData(user) {
  const now = new Date().toISOString();
  const decks = d().decks.filter((x) => x.userId === user.id).sort(byDate("createdAt", -1));
  const rows = decks.map((deck) => {
    const quiz = quizOfDeck(deck.id);
    const attempts = quiz ? attemptsOf(quiz.id).sort(byDate("completedAt", -1)).slice(0, 5) : [];
    return {
      id: deck.id,
      title: deck.title,
      topic: deck.topic,
      tags: tagNames(deck),
      cardCount: cardsOf(deck.id).length,
      attemptCount: attempts.length,
      latestScore: attempts[0]?.scorePercent ?? null,
      quizId: quiz?.id ?? null,
    };
  });
  const deckIds = new Set(decks.map((x) => x.id));
  const dueCount = d().flashcards.filter((c) => deckIds.has(c.deckId) && c.dueAt <= now).length;
  return { decks: rows, dueCount };
}

function activityDates(userId) {
  return [
    ...d().reviewLogs.filter((r) => r.userId === userId).map((r) => new Date(r.reviewedAt)),
    ...d().attempts.filter((a) => a.userId === userId).map((a) => new Date(a.completedAt)),
  ];
}

function analyticsData(user) {
  const ACTIVITY_DAYS = 30;
  const now = new Date().toISOString();
  const decks = d().decks.filter((x) => x.userId === user.id);
  const deckIds = new Set(decks.map((x) => x.id));
  const cards = d().flashcards.filter((c) => deckIds.has(c.deckId));
  const attempts = d().attempts.filter((a) => a.userId === user.id).sort(byDate("completedAt"));

  const topicScores = new Map();
  for (const deck of decks) {
    const quiz = quizOfDeck(deck.id);
    const latest = quiz ? attemptsOf(quiz.id).sort(byDate("completedAt", -1))[0]?.scorePercent : undefined;
    if (latest === undefined) continue;
    if (!topicScores.has(deck.topic)) topicScores.set(deck.topic, []);
    topicScores.get(deck.topic).push(latest);
  }
  const masteryBars = [...topicScores.entries()]
    .map(([topic, scores]) => ({ topic, scorePercent: scores.reduce((a, b) => a + b, 0) / scores.length }))
    .sort((a, b) => a.scorePercent - b.scorePercent);

  const counts = new Map();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = ACTIVITY_DAYS - 1; i >= 0; i--) {
    const day = new Date(today);
    day.setDate(day.getDate() - i);
    counts.set(day.toISOString().slice(0, 10), 0);
  }
  for (const r of d().reviewLogs.filter((x) => x.userId === user.id)) {
    const key = r.reviewedAt.slice(0, 10);
    if (counts.has(key)) counts.set(key, counts.get(key) + 1);
  }
  for (const a of attempts) {
    const key = a.completedAt.slice(0, 10);
    if (counts.has(key)) counts.set(key, counts.get(key) + 1);
  }

  return {
    deckCount: decks.length,
    cardCount: cards.length,
    dueCount: cards.filter((c) => c.dueAt <= now).length,
    streak: computeStreak(activityDates(user.id)),
    attempts: attempts.map((a) => ({ date: a.completedAt, scorePercent: a.scorePercent })),
    masteryBars,
    activityDays: [...counts.entries()].map(([date, count]) => ({ date, count })),
  };
}

async function handle(path, init, url) {
  const method = (init.method || "GET").toUpperCase();
  const body = () => JSON.parse(init.body || "{}");
  let m;

  if (path.startsWith("/api/auth/")) return handleNextAuth(path.slice("/api/auth/".length), init, auth, authorize);

  if (path === "/api/register" && method === "POST") {
    const input = registerInput.parse(body());
    const email = input.email.toLowerCase().trim();
    if (d().users.some((u) => u.email === email)) return json({ error: "An account with that email already exists" }, 409);
    const id = newId();
    const passwordHash = await hashPassword(input.password);
    const sample = sampleDeck(id); // every new demo account starts with the sample deck
    db.write((data) => {
      data.users.push({ id, name: input.name, email, passwordHash, createdAt: new Date().toISOString() });
      const suffix = "-" + id;
      data.decks.push({ ...sample.deck, id: sample.deck.id + suffix });
      data.quizzes.push({ ...sample.quiz, id: sample.quiz.id + suffix, deckId: sample.deck.id + suffix });
      sample.flashcards.forEach((c) => data.flashcards.push({ ...c, id: c.id + suffix, deckId: sample.deck.id + suffix, dueAt: new Date().toISOString() }));
      sample.questions.forEach((q) => data.questions.push({ ...q, id: q.id + suffix, quizId: sample.quiz.id + suffix }));
    });
    return json({ ok: true }, 201);
  }

  const user = auth.requireUser();

  if (path === "/api/generate" && method === "POST") {
    const since = Date.now() - DAY_MS;
    const recent = d().generationLogs.filter((g) => g.userId === user.id && Date.parse(g.createdAt) >= since).sort(byDate("createdAt"));
    if (recent.length >= GENERATION_DAILY_LIMIT) {
      const resetAt = new Date(Date.parse(recent[0].createdAt) + DAY_MS);
      return json({ error: "You've hit today's limit of " + GENERATION_DAILY_LIMIT + " AI generations. Try again after " + resetAt.toLocaleString() + ".", remaining: 0, resetAt: resetAt.toISOString() }, 429);
    }
    const sourceText = (await extractText(init.body)).trim();
    if (sourceText.length < 40) return json({ error: "Give us a bit more material to work with (at least a few sentences)." }, 400);
    const generated = await generateStudyMaterial(sourceText);
    const now = new Date().toISOString();
    const deckId = newId();
    const quizId = newId();
    db.write((data) => {
      data.decks.push({ id: deckId, userId: user.id, title: generated.title, topic: generated.topic, sourceText: sourceText.slice(0, 5000), tagIds: [], createdAt: now });
      generated.flashcards.forEach((f, i) =>
        data.flashcards.push({ id: newId(), deckId, front: f.front, back: f.back, position: i, easeFactor: 2.5, intervalDays: 0, repetitions: 0, dueAt: now, lastReviewedAt: null })
      );
      data.quizzes.push({ id: quizId, deckId, userId: user.id, title: generated.quizTitle, createdAt: now });
      generated.questions.forEach((q, i) =>
        data.questions.push({ id: newId(), quizId, prompt: q.prompt, choices: JSON.stringify(q.choices), correctIndex: q.correctIndex, explanation: q.explanation, position: i })
      );
      data.generationLogs.push({ id: newId(), userId: user.id, createdAt: now }); // only after a successful save
    });
    return json({ deckId, quizId }, 201);
  }

  if (path === "/api/attempts" && method === "POST") {
    try {
      const input = attemptInput.parse(body());
      const quiz = d().quizzes.find((q) => q.id === input.quizId);
      if (!quiz) return json({ error: "Quiz not found" }, 404);
      if (quiz.userId !== user.id) return json({ error: "Not your quiz" }, 403);
      const result = scoreQuiz(questionsOf(quiz.id), input.answers);
      const attemptId = newId();
      db.write((data) => {
        data.attempts.push({ id: attemptId, quizId: quiz.id, userId: user.id, scorePercent: result.scorePercent, completedAt: new Date().toISOString() });
        result.answers.forEach((a) => data.attemptAnswers.push({ id: newId(), attemptId, ...a }));
      });
      return json({ attemptId, scorePercent: result.scorePercent, correctCount: result.correctCount, total: result.total });
    } catch (err) {
      if (err.issues) return json({ error: "Invalid input" }, 400);
      throw err;
    }
  }

  if ((m = path.match(/^\/api\/decks\/([^/]+)$/))) {
    const deck = owned(deckOf(m[1]), user.id);
    if (method === "GET") return json({ ...deck, tags: tagNames(deck), flashcards: cardsOf(deck.id), quiz: quizOfDeck(deck.id) ?? null });
    if (method === "PATCH") {
      const { tagNames: names, ...rest } = deckPatch.parse(body());
      const updated = db.write((data) => {
        const target = data.decks.find((x) => x.id === deck.id);
        Object.assign(target, rest);
        if (names !== undefined) {
          target.tagIds = [...new Set(names.map((t) => t.trim()).filter(Boolean))].map((name) => {
            let tag = data.tags.find((t) => t.userId === user.id && t.name === name); // upsert on (userId, name)
            if (!tag) data.tags.push((tag = { id: newId(), userId: user.id, name, createdAt: new Date().toISOString() }));
            return tag.id;
          });
        }
        return target;
      });
      return json({ ...updated, tags: tagNames(updated).map((name) => ({ name })) });
    }
    if (method === "DELETE") {
      db.write((data) => cascadeDeleteDeck(data, deck.id));
      return json({ ok: true });
    }
  }

  if ((m = path.match(/^\/api\/decks\/([^/]+)\/flashcards$/)) && method === "POST") {
    const deck = owned(deckOf(m[1]), user.id);
    const input = cardInput.parse(body());
    const last = cardsOf(deck.id).at(-1);
    const card = { id: newId(), deckId: deck.id, ...input, position: (last?.position ?? -1) + 1, easeFactor: 2.5, intervalDays: 0, repetitions: 0, dueAt: new Date().toISOString(), lastReviewedAt: null };
    db.write((data) => data.flashcards.push(card));
    return json(card, 201);
  }

  if ((m = path.match(/^\/api\/decks\/([^/]+)\/questions$/)) && method === "POST") {
    const deck = owned(deckOf(m[1]), user.id);
    const quiz = quizOfDeck(deck.id);
    if (!quiz) return json({ error: "This deck has no quiz" }, 400);
    try {
      const input = newQuestion.parse(body());
      const last = questionsOf(quiz.id).at(-1);
      const question = { id: newId(), quizId: quiz.id, prompt: input.prompt, choices: JSON.stringify(input.choices), correctIndex: input.correctIndex, explanation: input.explanation, position: (last?.position ?? -1) + 1 };
      db.write((data) => data.questions.push(question));
      return json({ ...question, choices: input.choices }, 201);
    } catch (err) {
      return firstIssue(err) || Promise.reject(err);
    }
  }

  if ((m = path.match(/^\/api\/flashcards\/([^/]+)\/review$/)) && method === "POST") {
    const input = reviewInput.parse(body());
    const card = d().flashcards.find((c) => c.id === m[1]);
    if (!card) return json({ error: "Not found" }, 404);
    owned(deckOf(card.deckId), user.id);
    const now = new Date();
    const next = scheduleNextReview({ easeFactor: card.easeFactor, intervalDays: card.intervalDays, repetitions: card.repetitions }, input.grade, now);
    const updated = db.write((data) => {
      const target = data.flashcards.find((c) => c.id === card.id);
      Object.assign(target, {
        easeFactor: next.easeFactor, intervalDays: next.intervalDays, repetitions: next.repetitions,
        dueAt: next.dueAt.toISOString(), lastReviewedAt: now.toISOString(),
      });
      data.reviewLogs.push({ id: newId(), flashcardId: card.id, userId: user.id, grade: input.grade, intervalDays: next.intervalDays, easeFactor: next.easeFactor, reviewedAt: now.toISOString() });
      return target;
    });
    return json({ dueAt: updated.dueAt, intervalDays: updated.intervalDays, easeFactor: updated.easeFactor });
  }

  if ((m = path.match(/^\/api\/flashcards\/([^/]+)$/))) {
    const card = d().flashcards.find((c) => c.id === m[1]);
    if (!card) return json({ error: "Not found" }, 404);
    owned(deckOf(card.deckId), user.id);
    if (method === "PATCH") {
      const input = cardPatch.parse(body());
      return json(db.write((data) => Object.assign(data.flashcards.find((c) => c.id === card.id), input)));
    }
    if (method === "DELETE") {
      db.write((data) => {
        data.flashcards = data.flashcards.filter((c) => c.id !== card.id);
        data.reviewLogs = data.reviewLogs.filter((r) => r.flashcardId !== card.id);
      });
      return json({ ok: true });
    }
  }

  if ((m = path.match(/^\/api\/questions\/([^/]+)$/))) {
    const question = d().questions.find((q) => q.id === m[1]);
    if (!question) return json({ error: "Not found" }, 404);
    owned(d().quizzes.find((q) => q.id === question.quizId), user.id);
    const hasAnswers = answersFor(question.id).length > 0;
    if (method === "PATCH") {
      let input;
      try {
        input = questionPatch.parse(body());
      } catch (err) {
        return firstIssue(err) || Promise.reject(err);
      }
      if ((input.choices !== undefined || input.correctIndex !== undefined) && hasAnswers)
        return json({ error: "This question has quiz history attached — only its prompt/explanation can be edited." }, 409);
      const updated = db.write((data) => {
        const target = data.questions.find((q) => q.id === question.id);
        if (input.prompt !== undefined) target.prompt = input.prompt;
        if (input.explanation !== undefined) target.explanation = input.explanation;
        if (input.choices !== undefined) target.choices = JSON.stringify(input.choices);
        if (input.correctIndex !== undefined) target.correctIndex = input.correctIndex;
        return target;
      });
      return json({ ...updated, choices: JSON.parse(updated.choices) });
    }
    if (method === "DELETE") {
      if (hasAnswers) return json({ error: "This question has quiz history attached and can't be deleted." }, 409);
      db.write((data) => (data.questions = data.questions.filter((q) => q.id !== question.id)));
      return json({ ok: true });
    }
  }

  if ((m = path.match(/^\/api\/quizzes\/([^/]+)$/)) && method === "GET") {
    const quiz = owned(d().quizzes.find((q) => q.id === m[1]), user.id);
    // correctIndex stays hidden until this user has a completed attempt
    const reveal = attemptsOf(quiz.id, user.id).length > 0;
    return json({
      id: quiz.id,
      title: quiz.title,
      deckTitle: deckOf(quiz.deckId)?.title,
      questions: questionsOf(quiz.id).map((q) => ({
        id: q.id, prompt: q.prompt, choices: JSON.parse(q.choices), position: q.position,
        ...(reveal ? { correctIndex: q.correctIndex, explanation: q.explanation } : {}),
      })),
    });
  }

  if (path === "/api/study/due" && method === "GET") {
    const deckId = url.searchParams.get("deckId") || undefined;
    const now = new Date().toISOString();
    const deckIds = new Set(d().decks.filter((x) => x.userId === user.id).map((x) => x.id));
    return json(
      d().flashcards
        .filter((c) => deckIds.has(c.deckId) && (!deckId || c.deckId === deckId) && c.dueAt <= now)
        .sort(byDate("dueAt"))
        .map((c) => ({ id: c.id, front: c.front, back: c.back, deckId: c.deckId, deckTitle: deckOf(c.deckId).title }))
    );
  }

  // ---- demo-only read models for the client page overrides ----
  if (path === "/api/_demo/dashboard") return json(dashboardData(user));
  if (path === "/api/_demo/analytics") return json(analyticsData(user));
  if (path === "/api/_demo/streak") return json({ streak: computeStreak(activityDates(user.id)) });

  if ((m = path.match(/^\/api\/_demo\/deck-editor\/([^/]+)$/))) {
    const deck = owned(deckOf(m[1]), user.id);
    const quiz = quizOfDeck(deck.id);
    return json({
      deck: { id: deck.id, title: deck.title, topic: deck.topic, tags: tagNames(deck) },
      flashcards: cardsOf(deck.id).map((c) => ({ id: c.id, front: c.front, back: c.back })),
      quiz: quiz
        ? {
            id: quiz.id,
            questions: questionsOf(quiz.id).map((q) => ({
              id: q.id, prompt: q.prompt, choices: JSON.parse(q.choices), correctIndex: q.correctIndex,
              explanation: q.explanation, locked: answersFor(q.id).length > 0,
            })),
          }
        : null,
    });
  }

  if ((m = path.match(/^\/api\/_demo\/quiz-history\/([^/]+)$/))) {
    const quiz = owned(d().quizzes.find((q) => q.id === m[1]), user.id);
    return json({
      id: quiz.id,
      title: quiz.title,
      deckTitle: deckOf(quiz.deckId)?.title,
      attempts: attemptsOf(quiz.id).sort(byDate("completedAt")).map((a) => ({ id: a.id, completedAt: a.completedAt, scorePercent: a.scorePercent })),
    });
  }

  if ((m = path.match(/^\/api\/_demo\/attempt\/([^/]+)\/([^/]+)$/))) {
    const attempt = d().attempts.find((a) => a.id === m[2]);
    if (!attempt || attempt.quizId !== m[1]) return json({ error: "Not found" }, 404);
    owned(attempt, user.id);
    const quiz = d().quizzes.find((q) => q.id === attempt.quizId);
    return json({
      scorePercent: attempt.scorePercent,
      quiz: { title: quiz.title, deckId: quiz.deckId },
      answers: d().attemptAnswers
        .filter((a) => a.attemptId === attempt.id)
        .map((a) => {
          const q = d().questions.find((x) => x.id === a.questionId);
          return { id: a.id, chosenIndex: a.chosenIndex, correct: a.correct, question: { prompt: q.prompt, choices: JSON.parse(q.choices), correctIndex: q.correctIndex, explanation: q.explanation } };
        }),
    });
  }

  return json({ error: "Not found" }, 404);
}

let installed = false;
// Called at module load (before next-auth fetches the session); no DOM changes here
export function installDemo() {
  if (installed) return;
  installed = true;
  installFetch(handle);
}

let panelMounted = false;
// Called from an effect, after hydration, so React never sees the extra node
export function mountPanel() {
  if (panelMounted) return;
  panelMounted = true;
  mountDemoPanel({
    repoUrl: REPO_URL,
    note:
      "Static build: the Next.js API routes run in your browser with the app's own scoring, SM-2 and streak code. " +
      "Sign in with <b>sam@devweekends.dev / Student123!</b> or create an account; a sample deck is ready to study.",
    offlineNote: "Flashcards, quizzes, reviews and analytics all work offline; generating new decks from notes needs a key.",
  });
}
