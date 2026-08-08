"use client";

import { useState } from "react";

type Card = { id: string; front: string; back: string };

export default function StudyDeck({ cards }: { cards: Card[] }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (cards.length === 0) return <p className="card mt-6 text-center text-gray-500">This deck has no cards.</p>;

  const card = cards[index];

  function next() {
    setFlipped(false);
    setIndex((i) => Math.min(i + 1, cards.length - 1));
  }
  function prev() {
    setFlipped(false);
    setIndex((i) => Math.max(i - 1, 0));
  }

  return (
    <div className="mt-6">
      <p className="text-center text-xs font-bold text-gray-500">{index + 1} / {cards.length}</p>

      <button
        onClick={() => setFlipped((f) => !f)}
        className="card mt-3 flex min-h-[220px] w-full items-center justify-center p-8 text-center transition-transform hover:-translate-y-0.5"
      >
        <p className="text-lg font-semibold text-ink">{flipped ? card.back : card.front}</p>
      </button>
      <p className="mt-2 text-center text-xs text-gray-400">{flipped ? "Answer — click to flip back" : "Click card to reveal answer"}</p>

      <div className="mt-4 flex items-center justify-between">
        <button onClick={prev} disabled={index === 0} className="btn-outline">Previous</button>
        <button onClick={next} disabled={index === cards.length - 1} className="btn-secondary">Next</button>
      </div>
    </div>
  );
}
