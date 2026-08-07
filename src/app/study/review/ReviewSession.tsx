"use client";

import { useState } from "react";
import Link from "next/link";

type Card = { id: string; front: string; back: string; deckTitle: string };

const GRADES: { grade: 0 | 1 | 2 | 3; label: string; className: string }[] = [
  { grade: 0, label: "Again", className: "bg-danger text-white hover:opacity-90" },
  { grade: 1, label: "Hard", className: "bg-warn/15 text-warn hover:bg-warn/25" },
  { grade: 2, label: "Good", className: "bg-navy text-gold hover:bg-navy-dark" },
  { grade: 3, label: "Easy", className: "bg-ok/15 text-ok hover:bg-ok/25" },
];

export default function ReviewSession({ initialCards }: { initialCards: Card[] }) {
  const [queue, setQueue] = useState(initialCards);
  const [flipped, setFlipped] = useState(false);
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneCount, setDoneCount] = useState(0);

  if (queue.length === 0) {
    return (
      <div className="card mt-6 text-center">
        <p className="text-lg font-semibold text-navy">
          {doneCount > 0 ? "All caught up! 🎉" : "Nothing due right now."}
        </p>
        <p className="mt-1 text-sm text-gray-500">
          {doneCount > 0 ? `You reviewed ${doneCount} card${doneCount === 1 ? "" : "s"}.` : "New cards you generate are due immediately."}
        </p>
        <Link href="/dashboard" className="btn-secondary mt-4 inline-flex">Back to dashboard</Link>
      </div>
    );
  }

  const card = queue[0];

  async function grade(g: 0 | 1 | 2 | 3) {
    setGrading(true);
    setError(null);
    const res = await fetch(`/api/flashcards/${card.id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grade: g }),
    });
    setGrading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not save that review");
      return;
    }
    setFlipped(false);
    setDoneCount((n) => n + 1);
    setQueue((q) => q.slice(1));
  }

  return (
    <div className="mt-6">
      <p className="text-xs font-bold text-gray-500">{queue.length} card{queue.length === 1 ? "" : "s"} left · {card.deckTitle}</p>

      <button
        onClick={() => setFlipped((f) => !f)}
        className="card mt-3 flex min-h-[220px] w-full items-center justify-center p-8 text-center transition-transform hover:-translate-y-0.5"
      >
        <p className="text-lg font-semibold text-navy">{flipped ? card.back : card.front}</p>
      </button>
      <p className="mt-2 text-center text-xs text-gray-400">{flipped ? "Answer — grade yourself below" : "Click card to reveal answer"}</p>

      {error && <p className="mt-3 text-center text-sm text-danger">{error}</p>}

      {flipped && (
        <div className="mt-4 grid grid-cols-4 gap-2">
          {GRADES.map((g) => (
            <button key={g.grade} onClick={() => grade(g.grade)} disabled={grading} className={`btn !px-2 ${g.className}`}>
              {g.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
