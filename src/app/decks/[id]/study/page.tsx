import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import StudyDeck from "./StudyDeck";
import Link from "next/link";

export default async function StudyPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const deck = await prisma.deck.findUnique({
    where: { id: params.id },
    include: { flashcards: { orderBy: { position: "asc" } }, quiz: true },
  });
  if (!deck) notFound();
  if (deck.userId !== session.user.id) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-navy-light">{deck.topic}</p>
          <h1 className="text-2xl font-bold text-navy">{deck.title}</h1>
        </div>
        {deck.quiz && <Link href={`/quizzes/${deck.quiz.id}/take`} className="btn-secondary !py-1.5 !px-3 text-xs">Take quiz</Link>}
      </div>

      <StudyDeck cards={deck.flashcards.map((c) => ({ id: c.id, front: c.front, back: c.back }))} />
    </div>
  );
}
