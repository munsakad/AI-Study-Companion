import { getServerSession, type Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireOwner, authErrorResponse } from "@/lib/authorize";
import { z } from "zod";

const schema = z.object({ front: z.string().min(1).max(2000).optional(), back: z.string().min(1).max(2000).optional() });

async function findOwnedCard(id: string, session: Session | null) {
  const card = await prisma.flashcard.findUnique({ where: { id }, include: { deck: { select: { userId: true } } } });
  if (!card) return { error: Response.json({ error: "Not found" }, { status: 404 }) };
  requireOwner(session, card.deck.userId);
  return { card };
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const found = await findOwnedCard(params.id, session);
    if (found.error) return found.error;

    const body = schema.parse(await req.json());
    const updated = await prisma.flashcard.update({ where: { id: params.id }, data: body });
    return Response.json(updated);
  } catch (err: any) {
    if (err?.issues) return Response.json({ error: "Invalid input" }, { status: 400 });
    return authErrorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const found = await findOwnedCard(params.id, session);
    if (found.error) return found.error;

    await prisma.flashcard.delete({ where: { id: params.id } }); // cascades ReviewLog rows
    return Response.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
