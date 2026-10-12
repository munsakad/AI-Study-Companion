"use client";
// Static GitHub Pages build: replaces src/app/quizzes/[id]/take/page.tsx.
// Uses GET /api/quizzes/:id, which never includes correctIndex before an attempt.
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import RequireAuth from "@/demo/RequireAuth";
import TakeQuiz from "./TakeQuiz";

type Quiz = { id: string; title: string; questions: { id: string; prompt: string; choices: string[] }[] };

function Take() {
  const id = useSearchParams().get("id");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!id) return setMissing(true);
    fetch(`/api/quizzes/${encodeURIComponent(id)}`).then(async (res) => (res.ok ? setQuiz(await res.json()) : setMissing(true)));
  }, [id]);

  if (missing) return <p className="mx-auto max-w-xl px-6 py-12 text-center text-gray-500">Quiz not found.</p>;
  if (!quiz) return <p className="mx-auto max-w-xl px-6 py-12 text-center text-sm text-gray-500">Loading…</p>;

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <h1 className="text-2xl font-bold text-ink">{quiz.title}</h1>
      <TakeQuiz key={quiz.id} quizId={quiz.id} questions={quiz.questions.map((q) => ({ id: q.id, prompt: q.prompt, choices: q.choices }))} />
    </div>
  );
}

export default function TakeQuizPage() {
  return (
    <RequireAuth>
      <Suspense fallback={null}>
        <Take />
      </Suspense>
    </RequireAuth>
  );
}
