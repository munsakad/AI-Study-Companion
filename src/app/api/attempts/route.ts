import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireAuth, authErrorResponse } from "@/lib/authorize";
import { scoreQuiz } from "@/lib/quizScoring";
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

    const result = scoreQuiz(quiz.questions, body.answers);

    const attempt = await prisma.attempt.create({
      data: {
        quizId: quiz.id,
        userId: user.id,
        scorePercent: result.scorePercent,
        answers: { create: result.answers },
      },
    });

    return Response.json({
      attemptId: attempt.id,
      scorePercent: result.scorePercent,
      correctCount: result.correctCount,
      total: result.total,
    });
  } catch (err: any) {
    if (err?.issues) return Response.json({ error: "Invalid input" }, { status: 400 });
    return authErrorResponse(err);
  }
}
