import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireAuth, authErrorResponse } from "@/lib/authorize";

// Flashcards due for review right now (dueAt <= now), optionally scoped to
// one deck. Powers /study/review.
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = requireAuth(session);

    const { searchParams } = new URL(req.url);
    const deckId = searchParams.get("deckId") ?? undefined;

    const cards = await prisma.flashcard.findMany({
      where: {
        deck: { userId: user.id },
        deckId,
        dueAt: { lte: new Date() },
      },
      orderBy: { dueAt: "asc" },
      include: { deck: { select: { id: true, title: true } } },
    });

    return Response.json(
      cards.map((c) => ({
        id: c.id,
        front: c.front,
        back: c.back,
        deckId: c.deck.id,
        deckTitle: c.deck.title,
      }))
    );
  } catch (err) {
    return authErrorResponse(err);
  }
}
