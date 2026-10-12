"use client";
// Static GitHub Pages build: replaces src/app/decks/[id]/study/page.tsx (?id= instead of /[id]/)
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import RequireAuth from "@/demo/RequireAuth";
import StudyDeck from "./StudyDeck";

type Deck = { id: string; title: string; topic: string; flashcards: { id: string; front: string; back: string }[]; quiz: { id: string } | null };

function Study() {
  const id = useSearchParams().get("id");
  const [deck, setDeck] = useState<Deck | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!id) return setMissing(true);
    fetch(`/api/decks/${encodeURIComponent(id)}`).then(async (res) => (res.ok ? setDeck(await res.json()) : setMissing(true)));
  }, [id]);

  if (missing) return <p className="mx-auto max-w-xl px-6 py-12 text-center text-gray-500">Deck not found.</p>;
  if (!deck) return <p className="mx-auto max-w-xl px-6 py-12 text-center text-sm text-gray-500">Loading…</p>;

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-navy-light">{deck.topic}</p>
          <h1 className="text-2xl font-bold text-ink">{deck.title}</h1>
        </div>
        <div className="flex gap-2">
          <Link href={`/study/review?deckId=${deck.id}`} className="btn-outline !py-1.5 !px-3 text-xs">Review due cards</Link>
          <Link href={`/decks/edit?id=${deck.id}`} className="btn-outline !py-1.5 !px-3 text-xs">Edit deck</Link>
          {deck.quiz && <Link href={`/quizzes/take?id=${deck.quiz.id}`} className="btn-secondary !py-1.5 !px-3 text-xs">Take quiz</Link>}
        </div>
      </div>

      <StudyDeck key={deck.id} cards={deck.flashcards.map((c) => ({ id: c.id, front: c.front, back: c.back }))} />
    </div>
  );
}

export default function StudyPage() {
  return (
    <RequireAuth>
      <Suspense fallback={null}>
        <Study />
      </Suspense>
    </RequireAuth>
  );
}
