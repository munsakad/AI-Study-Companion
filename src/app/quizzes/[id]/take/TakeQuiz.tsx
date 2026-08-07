"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Question = { id: string; prompt: string; choices: string[] };

export default function TakeQuiz({ quizId, questions }: { quizId: string; questions: Question[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const q = questions[index];
  const isLast = index === questions.length - 1;
  const allAnswered = questions.every((qq) => answers[qq.id] !== undefined);

  function choose(choiceIndex: number) {
    setAnswers((a) => ({ ...a, [q.id]: choiceIndex }));
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quizId,
        answers: Object.entries(answers).map(([questionId, chosenIndex]) => ({ questionId, chosenIndex })),
      }),
    });
    const body = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Could not submit quiz");
      return;
    }
    router.push(`/quizzes/${quizId}/results/${body.attemptId}`);
  }

  return (
    <div className="mt-6">
      <p className="text-xs font-bold text-gray-500">Question {index + 1} / {questions.length}</p>
      <div className="card mt-3">
        <p className="font-semibold text-navy">{q.prompt}</p>
        <div className="mt-4 space-y-2">
          {q.choices.map((choice, i) => (
            <button
              key={i}
              onClick={() => choose(i)}
              className={`w-full rounded-lg border-2 px-4 py-2.5 text-left text-sm transition-colors ${
                answers[q.id] === i ? "border-navy bg-navy/5 font-semibold text-navy" : "border-gray-200 hover:border-navy/40"
              }`}
            >
              {choice}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-4 flex items-center justify-between">
        <button onClick={() => setIndex((i) => Math.max(i - 1, 0))} disabled={index === 0} className="btn-outline">Previous</button>
        {isLast ? (
          <button onClick={submit} disabled={!allAnswered || submitting} className="btn-secondary">
            {submitting ? "Submitting…" : "Submit quiz"}
          </button>
        ) : (
          <button onClick={() => setIndex((i) => Math.min(i + 1, questions.length - 1))} disabled={answers[q.id] === undefined} className="btn-secondary">
            Next
          </button>
        )}
      </div>
    </div>
  );
}
