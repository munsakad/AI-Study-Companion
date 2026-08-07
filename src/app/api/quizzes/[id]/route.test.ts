import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { createTestUser, sessionFor } from "@/test/helpers";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
import { getServerSession } from "next-auth";
import { GET } from "./route";

async function makeQuiz(userId: string) {
  const deck = await prisma.deck.create({ data: { userId, title: "Deck", topic: "Topic", sourceText: "..." } });
  return prisma.quiz.create({
    data: {
      deckId: deck.id,
      userId,
      title: "Quiz",
      questions: { create: [{ prompt: "Q1", choices: JSON.stringify(["a", "b"]), correctIndex: 0, explanation: "because", position: 0 }] },
    },
  });
}

describe("GET /api/quizzes/[id]", () => {
  beforeEach(() => vi.mocked(getServerSession).mockReset());

  it("strips correctIndex/explanation before the user has attempted it", async () => {
    const user = await createTestUser();
    const quiz = await makeQuiz(user.id);

    vi.mocked(getServerSession).mockResolvedValue(sessionFor(user));
    const res = await GET(new Request("http://localhost"), { params: { id: quiz.id } });
    const body = await res.json();

    expect(body.questions[0].correctIndex).toBeUndefined();
    expect(body.questions[0].explanation).toBeUndefined();
    expect(body.questions[0].choices).toEqual(["a", "b"]);
  });

  it("reveals correctIndex/explanation once a prior attempt exists", async () => {
    const user = await createTestUser();
    const quiz = await makeQuiz(user.id);
    const questions = await prisma.question.findMany({ where: { quizId: quiz.id } });

    await prisma.attempt.create({
      data: {
        quizId: quiz.id,
        userId: user.id,
        scorePercent: 100,
        answers: { create: [{ questionId: questions[0].id, chosenIndex: 0, correct: true }] },
      },
    });

    vi.mocked(getServerSession).mockResolvedValue(sessionFor(user));
    const res = await GET(new Request("http://localhost"), { params: { id: quiz.id } });
    const body = await res.json();

    expect(body.questions[0].correctIndex).toBe(0);
    expect(body.questions[0].explanation).toBe("because");
  });

  it("403s for a quiz owned by someone else", async () => {
    const owner = await createTestUser();
    const other = await createTestUser();
    const quiz = await makeQuiz(owner.id);

    vi.mocked(getServerSession).mockResolvedValue(sessionFor(other));
    const res = await GET(new Request("http://localhost"), { params: { id: quiz.id } });
    expect(res.status).toBe(403);
  });
});
