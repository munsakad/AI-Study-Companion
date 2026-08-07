import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireOwner, authErrorResponse } from "@/lib/authorize";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const deck = await prisma.deck.findUnique({
      where: { id: params.id },
      include: { flashcards: { orderBy: { position: "asc" } }, quiz: true },
    });
    if (!deck) return Response.json({ error: "Not found" }, { status: 404 });
    requireOwner(session, deck.userId);
    return Response.json(deck);
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const deck = await prisma.deck.findUnique({ where: { id: params.id } });
    if (!deck) return Response.json({ error: "Not found" }, { status: 404 });
    requireOwner(session, deck.userId);
    await prisma.deck.delete({ where: { id: params.id } }); // cascades to flashcards + quiz
    return Response.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
