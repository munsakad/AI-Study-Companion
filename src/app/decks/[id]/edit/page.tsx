import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DeckEditor from "./DeckEditor";

export default async function EditDeckPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const deck = await prisma.deck.findUnique({
    where: { id: params.id },
    include: {
      flashcards: { orderBy: { position: "asc" } },
      tags: true,
      quiz: { include: { questions: { orderBy: { position: "asc" }, include: { _count: { select: { answers: true } } } } } },
    },
  });
  if (!deck) notFound();
  if (deck.userId !== session.user.id) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <DeckEditor
        deck={{
          id: deck.id,
          title: deck.title,
          topic: deck.topic,
          tags: deck.tags.map((t) => t.name),
        }}
        flashcards={deck.flashcards.map((c) => ({ id: c.id, front: c.front, back: c.back }))}
        quiz={
          deck.quiz
            ? {
                id: deck.quiz.id,
                questions: deck.quiz.questions.map((q) => ({
                  id: q.id,
                  prompt: q.prompt,
                  choices: JSON.parse(q.choices) as string[],
                  correctIndex: q.correctIndex,
                  explanation: q.explanation,
                  locked: q._count.answers > 0,
                })),
              }
            : null
        }
      />
    </div>
  );
}
