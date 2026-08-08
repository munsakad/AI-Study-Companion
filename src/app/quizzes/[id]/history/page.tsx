import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import ScoreTrendChart from "@/components/charts/ScoreTrendChart";

export default async function QuizHistoryPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const quiz = await prisma.quiz.findUnique({
    where: { id: params.id },
    include: { deck: true, attempts: { orderBy: { completedAt: "asc" } } },
  });
  if (!quiz) notFound();
  if (quiz.userId !== session.user.id) redirect("/dashboard");

  const attempts = quiz.attempts;
  const best = attempts.length ? Math.max(...attempts.map((a) => a.scorePercent)) : null;
  const latest = attempts.at(-1);

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-navy-light">{quiz.deck.title}</p>
          <h1 className="text-2xl font-bold text-ink">{quiz.title} — history</h1>
        </div>
        <Link href={`/quizzes/${quiz.id}/take`} className="btn-secondary !py-1.5 !px-3 text-xs">Retake quiz</Link>
      </div>

      {attempts.length === 0 ? (
        <p className="card mt-6 text-center text-gray-500">No attempts yet — take the quiz to start tracking your score.</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            <div className="card !p-3">
              <p className="text-xs text-gray-500">Attempts</p>
              <p className="text-xl font-bold text-ink">{attempts.length}</p>
            </div>
            <div className="card !p-3">
              <p className="text-xs text-gray-500">Best score</p>
              <p className="text-xl font-bold text-ink">{Math.round(best!)}%</p>
            </div>
            <div className="card !p-3">
              <p className="text-xs text-gray-500">Latest score</p>
              <p className="text-xl font-bold text-ink">{Math.round(latest!.scorePercent)}%</p>
            </div>
          </div>

          <div className="card mt-4">
            <ScoreTrendChart points={attempts.map((a) => ({ date: a.completedAt.toISOString(), scorePercent: a.scorePercent }))} />
          </div>

          <div className="mt-4 space-y-2">
            {[...attempts].reverse().map((a) => (
              <Link
                key={a.id}
                href={`/quizzes/${quiz.id}/results/${a.id}`}
                className="card flex items-center justify-between !p-4 transition-colors hover:border-navy/30"
              >
                <span className="text-sm text-gray-600">{a.completedAt.toLocaleString()}</span>
                <span className={`badge ${a.scorePercent >= 70 ? "bg-ok/10 text-ok" : "bg-warn/15 text-warn"}`}>{Math.round(a.scorePercent)}%</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
