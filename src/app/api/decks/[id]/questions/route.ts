import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireOwner, authErrorResponse } from "@/lib/authorize";
import { z } from "zod";

const schema = z
  .object({
    prompt: z.string().min(1).max(2000),
    choices: z.array(z.string().min(1).max(500)).min(2).max(6),
    correctIndex: z.number().int(),
    explanation: z.string().min(1).max(2000),
  })
  .refine((q) => q.correctIndex >= 0 && q.correctIndex < q.choices.length, {
    message: "correctIndex out of range for choices",
  });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const deck = await prisma.deck.findUnique({ where: { id: params.id }, select: { userId: true, quiz: { select: { id: true } } } });
    if (!deck) return Response.json({ error: "Not found" }, { status: 404 });
    requireOwner(session, deck.userId);
    if (!deck.quiz) return Response.json({ error: "This deck has no quiz" }, { status: 400 });

    const body = schema.parse(await req.json());
    const last = await prisma.question.findFirst({ where: { quizId: deck.quiz.id }, orderBy: { position: "desc" } });

    const question = await prisma.question.create({
      data: {
        quizId: deck.quiz.id,
        prompt: body.prompt,
        choices: JSON.stringify(body.choices),
        correctIndex: body.correctIndex,
        explanation: body.explanation,
        position: (last?.position ?? -1) + 1,
      },
    });

    return Response.json({ ...question, choices: body.choices }, { status: 201 });
  } catch (err: any) {
    if (err?.issues) return Response.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    return authErrorResponse(err);
  }
}
