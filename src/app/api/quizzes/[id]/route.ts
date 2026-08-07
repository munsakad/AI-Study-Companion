import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireOwner, authErrorResponse } from "@/lib/authorize";

// While TAKING the quiz, the client must never receive correctIndex up
// front (trivial to read out of devtools and cheat) — we strip it here.
// Answers only unlock for review once this user has an actual completed
// attempt on record for this quiz — never from a client-supplied flag,
// since that would just let anyone ask for the answers before starting.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const quiz = await prisma.quiz.findUnique({
      where: { id: params.id },
      include: { questions: { orderBy: { position: "asc" } }, deck: true },
    });
    if (!quiz) return Response.json({ error: "Not found" }, { status: 404 });
    const user = requireOwner(session, quiz.userId);

    const priorAttempt = await prisma.attempt.findFirst({ where: { quizId: quiz.id, userId: user.id } });
    const reveal = !!priorAttempt;

    return Response.json({
      id: quiz.id,
      title: quiz.title,
      deckTitle: quiz.deck.title,
      questions: quiz.questions.map((q) => ({
        id: q.id,
        prompt: q.prompt,
        choices: JSON.parse(q.choices),
        position: q.position,
        ...(reveal ? { correctIndex: q.correctIndex, explanation: q.explanation } : {}),
      })),
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
