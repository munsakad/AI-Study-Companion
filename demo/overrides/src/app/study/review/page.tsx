"use client";
// Static GitHub Pages build: client-side version of src/app/study/review/page.tsx (uses GET /api/study/due)
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import RequireAuth from "@/demo/RequireAuth";
import ReviewSession from "./ReviewSession";

type Card = { id: string; front: string; back: string; deckTitle: string };

function Review() {
  const deckId = useSearchParams().get("deckId");
  const [cards, setCards] = useState<Card[] | null>(null);

  useEffect(() => {
    fetch("/api/study/due" + (deckId ? "?deckId=" + encodeURIComponent(deckId) : ""))
      .then((r) => r.json())
      .then(setCards);
  }, [deckId]);

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <h1 className="text-2xl font-bold text-ink">Review session</h1>
      <p className="mt-1 text-sm text-gray-600">
        {deckId ? `Cards due from ${cards?.[0]?.deckTitle ?? "this deck"}.` : "Cards due across all your decks."}
      </p>
      {cards === null ? (
        <p className="mt-6 text-center text-sm text-gray-500">Loading…</p>
      ) : (
        <ReviewSession initialCards={cards.map((c) => ({ id: c.id, front: c.front, back: c.back, deckTitle: c.deckTitle }))} />
      )}
    </div>
  );
}

export default function ReviewPage() {
  return (
    <RequireAuth>
      <Suspense fallback={null}>
        <Review />
      </Suspense>
    </RequireAuth>
  );
}
