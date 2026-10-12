"use client";
// Static GitHub Pages build: replaces src/app/quizzes/[id]/history/page.tsx (?id= instead of /[id]/)
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import RequireAuth from "@/demo/RequireAuth";
import ScoreTrendChart from "@/components/charts/ScoreTrendChart";

type History = { id: string; title: string; deckTitle: string; attempts: { id: string; completedAt: string; scorePercent: number }[] };

function HistoryView() {
  const id = useSearchParams().get("id");
  const [quiz, setQuiz] = useState<History | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!id) return setMissing(true);
    fetch(`/api/_demo/quiz-history/${encodeURIComponent(id)}`).then(async (res) => (res.ok ? setQuiz(await res.json()) : setMissing(true)));
  }, [id]);

  if (missing) return <p className="mx-auto max-w-xl px-6 py-12 text-center text-gray-500">Quiz not found.</p>;
  if (!quiz) return <p className="mx-auto max-w-xl px-6 py-12 text-center text-sm text-gray-500">Loading…</p>;

  const attempts = quiz.attempts;
  const best = attempts.length ? Math.max(...attempts.map((a) => a.scorePercent)) : null;
  const latest = attempts.at(-1);

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-navy-light">{quiz.deckTitle}</p>
          <h1 className="text-2xl font-bold text-ink">{quiz.title} — history</h1>
        </div>
        <Link href={`/quizzes/take?id=${quiz.id}`} className="btn-secondary !py-1.5 !px-3 text-xs">Retake quiz</Link>
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
            <ScoreTrendChart points={attempts.map((a) => ({ date: a.completedAt, scorePercent: a.scorePercent }))} />
          </div>

          <div className="mt-4 space-y-2">
            {[...attempts].reverse().map((a) => (
              <Link
                key={a.id}
                href={`/quizzes/results?id=${quiz.id}&attemptId=${a.id}`}
                className="card flex items-center justify-between !p-4 transition-colors hover:border-navy/30"
              >
                <span className="text-sm text-gray-600">{new Date(a.completedAt).toLocaleString()}</span>
                <span className={`badge ${a.scorePercent >= 70 ? "bg-ok/10 text-ok" : "bg-warn/15 text-warn"}`}>{Math.round(a.scorePercent)}%</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function QuizHistoryPage() {
  return (
    <RequireAuth>
      <Suspense fallback={null}>
        <HistoryView />
      </Suspense>
    </RequireAuth>
  );
}
