import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireOwner, authErrorResponse } from "@/lib/authorize";
import { scheduleNextReview, type Grade } from "@/lib/spacedRepetition";
import { z } from "zod";

const schema = z.object({ grade: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]) });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const body = schema.parse(await req.json());

    const card = await prisma.flashcard.findUnique({
      where: { id: params.id },
      include: { deck: { select: { userId: true } } },
    });
    if (!card) return Response.json({ error: "Not found" }, { status: 404 });
    const user = requireOwner(session, card.deck.userId);

    const now = new Date();
    const next = scheduleNextReview(
      { easeFactor: card.easeFactor, intervalDays: card.intervalDays, repetitions: card.repetitions },
      body.grade as Grade,
      now
    );

    const [updated] = await prisma.$transaction([
      prisma.flashcard.update({
        where: { id: card.id },
        data: {
          easeFactor: next.easeFactor,
          intervalDays: next.intervalDays,
          repetitions: next.repetitions,
          dueAt: next.dueAt,
          lastReviewedAt: now,
        },
      }),
      prisma.reviewLog.create({
        data: {
          flashcardId: card.id,
          userId: user.id,
          grade: body.grade,
          intervalDays: next.intervalDays,
          easeFactor: next.easeFactor,
          reviewedAt: now,
        },
      }),
    ]);

    return Response.json({ dueAt: updated.dueAt, intervalDays: updated.intervalDays, easeFactor: updated.easeFactor });
  } catch (err: any) {
    if (err?.issues) return Response.json({ error: "Invalid input" }, { status: 400 });
    return authErrorResponse(err);
  }
}
