import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ReviewSession from "./ReviewSession";

export default async function ReviewPage({ searchParams }: { searchParams: { deckId?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const cards = await prisma.flashcard.findMany({
    where: {
      deck: { userId: session.user.id },
      deckId: searchParams.deckId,
      dueAt: { lte: new Date() },
    },
    orderBy: { dueAt: "asc" },
    include: { deck: { select: { title: true } } },
  });

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <h1 className="text-2xl font-bold text-navy">Review session</h1>
      <p className="mt-1 text-sm text-gray-600">
        {searchParams.deckId ? `Cards due from ${cards[0]?.deck.title ?? "this deck"}.` : "Cards due across all your decks."}
      </p>

      <ReviewSession
        initialCards={cards.map((c) => ({ id: c.id, front: c.front, back: c.back, deckTitle: c.deck.title }))}
      />
    </div>
  );
}
