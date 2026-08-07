import { getServerSession, type Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireOwner, authErrorResponse } from "@/lib/authorize";
import { z } from "zod";

// Editing choices/correctIndex on a question that already has attempts
// attached would silently rewrite what past results pages show as
// "correct" — so those fields (and delete) are blocked once any
// AttemptAnswer exists. prompt/explanation are cosmetic and stay editable.
const schema = z
  .object({
    prompt: z.string().min(1).max(2000).optional(),
    explanation: z.string().min(1).max(2000).optional(),
    choices: z.array(z.string().min(1).max(500)).min(2).max(6).optional(),
    correctIndex: z.number().int().optional(),
  })
  .refine((q) => q.correctIndex === undefined || q.choices === undefined || (q.correctIndex >= 0 && q.correctIndex < q.choices.length), {
    message: "correctIndex out of range for choices",
  });

async function findOwnedQuestion(id: string, session: Session | null) {
  const question = await prisma.question.findUnique({
    where: { id },
    include: { quiz: { select: { userId: true } }, _count: { select: { answers: true } } },
  });
  if (!question) return { error: Response.json({ error: "Not found" }, { status: 404 }) };
  requireOwner(session, question.quiz.userId);
  return { question };
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const found = await findOwnedQuestion(params.id, session);
    if (found.error) return found.error;
    const { question } = found;

    const body = schema.parse(await req.json());
    const changesAnswerShape = body.choices !== undefined || body.correctIndex !== undefined;
    if (changesAnswerShape && question._count.answers > 0) {
      return Response.json({ error: "This question has quiz history attached — only its prompt/explanation can be edited." }, { status: 409 });
    }

    const updated = await prisma.question.update({
      where: { id: params.id },
      data: {
        ...(body.prompt !== undefined ? { prompt: body.prompt } : {}),
        ...(body.explanation !== undefined ? { explanation: body.explanation } : {}),
        ...(body.choices !== undefined ? { choices: JSON.stringify(body.choices) } : {}),
        ...(body.correctIndex !== undefined ? { correctIndex: body.correctIndex } : {}),
      },
    });

    return Response.json({ ...updated, choices: JSON.parse(updated.choices) });
  } catch (err: any) {
    if (err?.issues) return Response.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    return authErrorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const found = await findOwnedQuestion(params.id, session);
    if (found.error) return found.error;
    const { question } = found;

    if (question._count.answers > 0) {
      return Response.json({ error: "This question has quiz history attached and can't be deleted." }, { status: 409 });
    }

    await prisma.question.delete({ where: { id: params.id } });
    return Response.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
