import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { createTestUser, sessionFor, jsonRequest } from "@/test/helpers";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
import { getServerSession } from "next-auth";
import { POST } from "./route";

async function makeQuiz(userId: string) {
  const deck = await prisma.deck.create({
    data: { userId, title: "Deck", topic: "Topic", sourceText: "..." },
  });
  return prisma.quiz.create({
    data: {
      deckId: deck.id,
      userId,
      title: "Quiz",
      questions: {
        create: [
          { prompt: "Q1", choices: JSON.stringify(["a", "b"]), correctIndex: 0, explanation: "e", position: 0 },
          { prompt: "Q2", choices: JSON.stringify(["a", "b"]), correctIndex: 1, explanation: "e", position: 1 },
        ],
      },
    },
    include: { questions: true },
  });
}

describe("POST /api/attempts", () => {
  beforeEach(() => vi.mocked(getServerSession).mockReset());

  it("returns 401 with no session", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await POST(jsonRequest("http://localhost/api/attempts", "POST", { quizId: "x", answers: [] }));
    expect(res.status).toBe(401);
  });

  it("returns 403 when the quiz belongs to someone else", async () => {
    const owner = await createTestUser();
    const other = await createTestUser();
    const quiz = await makeQuiz(owner.id);

    vi.mocked(getServerSession).mockResolvedValue(sessionFor(other));
    const res = await POST(
      jsonRequest("http://localhost/api/attempts", "POST", {
        quizId: quiz.id,
        answers: [{ questionId: quiz.questions[0].id, chosenIndex: 0 }],
      })
    );
    expect(res.status).toBe(403);
  });

  it("scores correctly and persists the attempt server-side", async () => {
    const user = await createTestUser();
    const quiz = await makeQuiz(user.id);

    vi.mocked(getServerSession).mockResolvedValue(sessionFor(user));
    const res = await POST(
      jsonRequest("http://localhost/api/attempts", "POST", {
        quizId: quiz.id,
        answers: [
          { questionId: quiz.questions[0].id, chosenIndex: 0 }, // correct
          { questionId: quiz.questions[1].id, chosenIndex: 0 }, // wrong (correct is 1)
        ],
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.correctCount).toBe(1);
    expect(body.scorePercent).toBe(50);

    const stored = await prisma.attempt.findUnique({ where: { id: body.attemptId }, include: { answers: true } });
    expect(stored?.scorePercent).toBe(50);
    expect(stored?.answers).toHaveLength(2);
  });

  it("never trusts a client-supplied score — only chosenIndex is accepted", async () => {
    const user = await createTestUser();
    const quiz = await makeQuiz(user.id);

    vi.mocked(getServerSession).mockResolvedValue(sessionFor(user));
    const res = await POST(
      jsonRequest("http://localhost/api/attempts", "POST", {
        quizId: quiz.id,
        scorePercent: 100, // deliberately trying to smuggle a fake score — the route must ignore this
        answers: [{ questionId: quiz.questions[0].id, chosenIndex: 1 }], // actually wrong
      })
    );
    const body = await res.json();
    expect(body.scorePercent).toBe(0);
  });
});
