import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireAuth, authErrorResponse } from "@/lib/authorize";
import { z } from "zod";

const schema = z.object({
  quizId: z.string(),
  answers: z.array(z.object({ questionId: z.string(), chosenIndex: z.number().int() })).min(1),
});

// Scoring happens entirely server-side from the stored correctIndex — the
// client sends only what the user picked, never a claimed score.
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = requireAuth(session);
    const body = schema.parse(await req.json());

    const quiz = await prisma.quiz.findUnique({ where: { id: body.quizId }, include: { questions: true } });
    if (!quiz) return Response.json({ error: "Quiz not found" }, { status: 404 });
    if (quiz.userId !== user.id) return Response.json({ error: "Not your quiz" }, { status: 403 });

    const byId = new Map(quiz.questions.map((q) => [q.id, q]));
    let correctCount = 0;
    const answerRows: { questionId: string; chosenIndex: number; correct: boolean }[] = [];

    for (const a of body.answers) {
      const q = byId.get(a.questionId);
      if (!q) continue; // ignore answers referencing questions from a different quiz
      const correct = a.chosenIndex === q.correctIndex;
      if (correct) correctCount++;
      answerRows.push({ questionId: a.questionId, chosenIndex: a.chosenIndex, correct });
    }

    const scorePercent = (correctCount / quiz.questions.length) * 100;

    const attempt = await prisma.attempt.create({
      data: {
        quizId: quiz.id,
        userId: user.id,
        scorePercent,
        answers: { create: answerRows },
      },
    });

    return Response.json({ attemptId: attempt.id, scorePercent, correctCount, total: quiz.questions.length });
  } catch (err: any) {
    if (err?.issues) return Response.json({ error: "Invalid input" }, { status: 400 });
    return authErrorResponse(err);
  }
}
