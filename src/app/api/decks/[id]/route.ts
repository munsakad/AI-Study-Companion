import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireOwner, authErrorResponse } from "@/lib/authorize";
import { z } from "zod";

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  topic: z.string().min(1).max(60).optional(),
  tagNames: z.array(z.string().min(1).max(30)).max(10).optional(),
});

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

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const deck = await prisma.deck.findUnique({ where: { id: params.id }, select: { userId: true } });
    if (!deck) return Response.json({ error: "Not found" }, { status: 404 });
    const user = requireOwner(session, deck.userId);

    const body = patchSchema.parse(await req.json());
    const { tagNames, ...rest } = body;

    let tagIds: { id: string }[] | undefined;
    if (tagNames !== undefined) {
      const uniqueNames = [...new Set(tagNames.map((t) => t.trim()).filter(Boolean))];
      const tags = await Promise.all(
        uniqueNames.map((name) => prisma.tag.upsert({ where: { userId_name: { userId: user.id, name } }, update: {}, create: { userId: user.id, name } }))
      );
      tagIds = tags.map((t) => ({ id: t.id }));
    }

    const updated = await prisma.deck.update({
      where: { id: params.id },
      data: { ...rest, ...(tagIds ? { tags: { set: tagIds } } : {}) },
      include: { tags: true },
    });

    return Response.json(updated);
  } catch (err: any) {
    if (err?.issues) return Response.json({ error: "Invalid input" }, { status: 400 });
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
