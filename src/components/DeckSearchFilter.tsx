"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type DeckRow = {
  id: string;
  title: string;
  topic: string;
  tags: string[];
  cardCount: number;
  attemptCount: number;
  latestScore: number | null;
  quizId: string | null;
};

export default function DeckSearchFilter({ decks }: { decks: DeckRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return decks;
    return decks.filter(
      (d) => d.title.toLowerCase().includes(q) || d.topic.toLowerCase().includes(q) || d.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [decks, query]);

  return (
    <div>
      <input
        className="input max-w-xs"
        placeholder="Search decks by title, topic, or tag…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {filtered.map((deck) => (
          <div key={deck.id} className="card">
            <p className="text-xs font-bold uppercase tracking-wide text-navy-light">{deck.topic}</p>
            <h3 className="mt-1 font-bold text-navy">{deck.title}</h3>
            <p className="mt-1 text-xs text-gray-500">
              {deck.cardCount} cards · {deck.attemptCount} quiz attempt{deck.attemptCount === 1 ? "" : "s"}
            </p>
            {deck.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {deck.tags.map((t) => (
                  <span key={t} className="badge bg-navy/5 text-navy-light">{t}</span>
                ))}
              </div>
            )}
            {deck.latestScore !== null && (
              <span className={`badge mt-2 ${deck.latestScore >= 70 ? "bg-ok/10 text-ok" : "bg-warn/15 text-warn"}`}>
                {Math.round(deck.latestScore)}% last attempt
              </span>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/decks/${deck.id}/study`} className="btn-outline !py-1.5 !px-3 text-xs">Flashcards</Link>
              {deck.quizId && <Link href={`/quizzes/${deck.quizId}/take`} className="btn-secondary !py-1.5 !px-3 text-xs">Take quiz</Link>}
              {deck.quizId && <Link href={`/quizzes/${deck.quizId}/history`} className="btn-outline !py-1.5 !px-3 text-xs">History</Link>}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full card text-center text-gray-500">
            {decks.length === 0 ? "No decks yet — generate your first one from your notes." : "No decks match your search."}
          </p>
        )}
      </div>
    </div>
  );
}
