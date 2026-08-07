import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function ResultsPage({ params }: { params: { id: string; attemptId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const attempt = await prisma.attempt.findUnique({
    where: { id: params.attemptId },
    include: {
      quiz: { include: { deck: true } },
      answers: { include: { question: true } },
    },
  });
  if (!attempt || attempt.quizId !== params.id) notFound();
  if (attempt.userId !== session.user.id) redirect("/dashboard");

  const correctCount = attempt.answers.filter((a) => a.correct).length;

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <div className="card text-center">
        <p className="text-sm font-bold uppercase tracking-wide text-navy-light">{attempt.quiz.title}</p>
        <p className={`mt-2 text-4xl font-bold ${attempt.scorePercent >= 70 ? "text-ok" : "text-warn"}`}>{Math.round(attempt.scorePercent)}%</p>
        <p className="mt-1 text-sm text-gray-600">{correctCount} of {attempt.answers.length} correct</p>
        {attempt.scorePercent < 70 && <p className="mt-2 text-sm text-warn">This one's flagged for review on your dashboard.</p>}
      </div>

      <div className="mt-6 space-y-3">
        {attempt.answers.map((a) => {
          const choices = JSON.parse(a.question.choices) as string[];
          return (
            <div key={a.id} className="card">
              <p className="font-semibold text-navy">{a.question.prompt}</p>
              <p className={`mt-2 text-sm ${a.correct ? "text-ok" : "text-danger"}`}>
                Your answer: {choices[a.chosenIndex]} {a.correct ? "✓" : "✗"}
              </p>
              {!a.correct && <p className="text-sm text-ok">Correct answer: {choices[a.question.correctIndex]}</p>}
              <p className="mt-2 text-xs text-gray-500">{a.question.explanation}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex justify-center gap-3">
        <Link href="/dashboard" className="btn-outline">Back to dashboard</Link>
        <Link href={`/decks/${attempt.quiz.deck.id}/study`} className="btn-secondary">Review flashcards</Link>
      </div>
    </div>
  );
}
