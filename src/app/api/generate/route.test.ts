import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { createTestUser, sessionFor } from "@/test/helpers";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/gemini", () => ({
  generateStudyMaterial: vi.fn(),
  GenerationError: class GenerationError extends Error {},
}));

import { getServerSession } from "next-auth";
import { generateStudyMaterial, GenerationError } from "@/lib/gemini";
import { POST } from "./route";

const FAKE_GENERATION = {
  title: "Deck title",
  topic: "Topic",
  flashcards: [{ front: "Q", back: "A" }],
  quizTitle: "Quiz",
  questions: [{ prompt: "P", choices: ["a", "b"], correctIndex: 0, explanation: "e" }],
};

function formRequest(text: string) {
  const form = new FormData();
  form.append("text", text);
  return new Request("http://localhost/api/generate", { method: "POST", body: form });
}

describe("POST /api/generate", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockReset();
    vi.mocked(generateStudyMaterial).mockReset();
  });

  it("returns 401 with no session", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await POST(formRequest("some notes here that are long enough"));
    expect(res.status).toBe(401);
  });

  it("creates a deck, quiz, and flashcards on success, and charges quota", async () => {
    const user = await createTestUser();
    vi.mocked(getServerSession).mockResolvedValue(sessionFor(user));
    vi.mocked(generateStudyMaterial).mockResolvedValue(FAKE_GENERATION);

    const res = await POST(formRequest("some notes here that are long enough to pass validation"));
    expect(res.status).toBe(201);
    const body = await res.json();

    const deck = await prisma.deck.findUnique({ where: { id: body.deckId }, include: { flashcards: true, quiz: { include: { questions: true } } } });
    expect(deck?.title).toBe("Deck title");
    expect(deck?.flashcards).toHaveLength(1);
    expect(deck?.quiz?.questions).toHaveLength(1);

    const logCount = await prisma.generationLog.count({ where: { userId: user.id } });
    expect(logCount).toBe(1);
  });

  it("does not charge quota when the Gemini call fails", async () => {
    const user = await createTestUser();
    vi.mocked(getServerSession).mockResolvedValue(sessionFor(user));
    vi.mocked(generateStudyMaterial).mockRejectedValue(new GenerationError("boom"));

    const res = await POST(formRequest("some notes here that are long enough to pass validation"));
    expect(res.status).toBe(502);

    const logCount = await prisma.generationLog.count({ where: { userId: user.id } });
    expect(logCount).toBe(0);
  });

  it("returns 429 once the daily generation limit is hit", async () => {
    const user = await createTestUser();
    vi.mocked(getServerSession).mockResolvedValue(sessionFor(user));
    vi.mocked(generateStudyMaterial).mockResolvedValue(FAKE_GENERATION);

    const limit = Number(process.env.GENERATION_DAILY_LIMIT ?? 10);
    for (let i = 0; i < limit; i++) {
      const res = await POST(formRequest(`notes number ${i} that are long enough to pass validation checks`));
      expect(res.status).toBe(201);
    }

    const blocked = await POST(formRequest("one more generation past the limit, still long enough"));
    expect(blocked.status).toBe(429);
    const body = await blocked.json();
    expect(body.remaining).toBe(0);
  });

  it("rejects text that's too short before ever calling Gemini", async () => {
    const user = await createTestUser();
    vi.mocked(getServerSession).mockResolvedValue(sessionFor(user));

    const res = await POST(formRequest("too short"));
    expect(res.status).toBe(400);
    expect(generateStudyMaterial).not.toHaveBeenCalled();
  });
});
