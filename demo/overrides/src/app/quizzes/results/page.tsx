"use client";
// Static GitHub Pages build: replaces src/app/quizzes/[id]/results/[attemptId]/page.tsx
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import RequireAuth from "@/demo/RequireAuth";

type Result = {
  scorePercent: number;
  quiz: { title: string; deckId: string };
  answers: { id: string; chosenIndex: number; correct: boolean; question: { prompt: string; choices: string[]; correctIndex: number; explanation: string } }[];
};

function Results() {
  const params = useSearchParams();
  const id = params.get("id");
  const attemptId = params.get("attemptId");
  const [attempt, setAttempt] = useState<Result | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!id || !attemptId) return setMissing(true);
    fetch(`/api/_demo/attempt/${encodeURIComponent(id)}/${encodeURIComponent(attemptId)}`).then(async (res) =>
      res.ok ? setAttempt(await res.json()) : setMissing(true)
    );
  }, [id, attemptId]);

  if (missing) return <p className="mx-auto max-w-xl px-6 py-12 text-center text-gray-500">Attempt not found.</p>;
  if (!attempt) return <p className="mx-auto max-w-xl px-6 py-12 text-center text-sm text-gray-500">Loading…</p>;

  const correctCount = attempt.answers.filter((a) => a.correct).length;

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <div className="card text-center">
        <p className="text-sm font-bold uppercase tracking-wide text-navy-light">{attempt.quiz.title}</p>
        <p className={`mt-2 text-4xl font-bold ${attempt.scorePercent >= 70 ? "text-ok" : "text-warn"}`}>{Math.round(attempt.scorePercent)}%</p>
        <p className="mt-1 text-sm text-gray-600">{correctCount} of {attempt.answers.length} correct</p>
        {attempt.scorePercent < 70 && <p className="mt-2 text-sm text-warn">This one&apos;s flagged for review on your dashboard.</p>}
      </div>

      <div className="mt-6 space-y-3">
        {attempt.answers.map((a) => (
          <div key={a.id} className="card">
            <p className="font-semibold text-ink">{a.question.prompt}</p>
            <p className={`mt-2 text-sm ${a.correct ? "text-ok" : "text-danger"}`}>
              Your answer: {a.question.choices[a.chosenIndex]} {a.correct ? "✓" : "✗"}
            </p>
            {!a.correct && <p className="text-sm text-ok">Correct answer: {a.question.choices[a.question.correctIndex]}</p>}
            <p className="mt-2 text-xs text-gray-500">{a.question.explanation}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-center gap-3">
        <Link href="/dashboard" className="btn-outline">Back to dashboard</Link>
        <Link href={`/decks/study?id=${attempt.quiz.deckId}`} className="btn-secondary">Review flashcards</Link>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <RequireAuth>
      <Suspense fallback={null}>
        <Results />
      </Suspense>
    </RequireAuth>
  );
}
