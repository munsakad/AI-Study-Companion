import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireOwner, authErrorResponse } from "@/lib/authorize";
import { z } from "zod";

const schema = z.object({ front: z.string().min(1).max(2000), back: z.string().min(1).max(2000) });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const deck = await prisma.deck.findUnique({ where: { id: params.id }, select: { userId: true } });
    if (!deck) return Response.json({ error: "Not found" }, { status: 404 });
    requireOwner(session, deck.userId);

    const body = schema.parse(await req.json());
    const last = await prisma.flashcard.findFirst({ where: { deckId: params.id }, orderBy: { position: "desc" } });

    const card = await prisma.flashcard.create({
      data: { deckId: params.id, front: body.front, back: body.back, position: (last?.position ?? -1) + 1 },
    });

    return Response.json(card, { status: 201 });
  } catch (err: any) {
    if (err?.issues) return Response.json({ error: "Invalid input" }, { status: 400 });
    return authErrorResponse(err);
  }
}
