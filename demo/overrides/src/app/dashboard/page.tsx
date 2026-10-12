"use client";
// Static GitHub Pages build: client-side version of src/app/dashboard/page.tsx.
// Same markup and the same weak-topic rule (latest attempt under 70%).
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import RequireAuth from "@/demo/RequireAuth";
import StreakBadge from "@/components/StreakBadge";
import DeckSearchFilter from "@/components/DeckSearchFilter";

type DeckRow = React.ComponentProps<typeof DeckSearchFilter>["decks"][number];

function Dashboard() {
  const { data: session } = useSession();
  const [data, setData] = useState<{ decks: DeckRow[]; dueCount: number } | null>(null);

  useEffect(() => {
    fetch("/api/_demo/dashboard")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return <p className="mx-auto max-w-4xl px-6 py-12 text-center text-sm text-gray-500">Loading…</p>;
  const { decks, dueCount } = data;
  const weakTopics = decks
    .filter((x) => x.latestScore !== null && x.latestScore < 70)
    .sort((a, b) => (a.latestScore ?? 0) - (b.latestScore ?? 0));

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-ink">Your study dashboard</h1>
          <StreakBadge userId={session?.user?.id ?? ""} />
        </div>
        <div className="flex gap-2">
          <Link href="/analytics" className="btn-outline">Analytics</Link>
          <Link href="/decks/new" className="btn-secondary">Generate new deck</Link>
        </div>
      </div>

      {dueCount > 0 && (
        <Link href="/study/review" className="card mt-4 flex items-center justify-between !py-3 hover:border-navy/30">
          <span className="text-sm font-semibold text-ink">📚 {dueCount} card{dueCount === 1 ? "" : "s"} due for review</span>
          <span className="text-xs font-bold text-navy-light">Start review session →</span>
        </Link>
      )}

      {weakTopics.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-bold text-ink">Recommended review</h2>
          <p className="text-sm text-gray-600">Your most recent score was under 70% on these — worth another pass.</p>
          <div className="mt-3 space-y-2">
            {weakTopics.map((deck) => (
              <div key={deck.id} className="card flex items-center justify-between !p-4">
                <div>
                  <p className="font-bold text-ink">{deck.title}</p>
                  <p className="text-xs text-gray-500">{deck.topic}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="badge bg-warn/15 text-warn">{Math.round(deck.latestScore!)}% last attempt</span>
                  <Link href={`/decks/study?id=${deck.id}`} className="btn-outline !py-1.5 !px-3 text-xs">Review deck</Link>
                  {deck.quizId && <Link href={`/quizzes/take?id=${deck.quizId}`} className="btn-secondary !py-1.5 !px-3 text-xs">Retake quiz</Link>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-lg font-bold text-ink">All decks</h2>
        <div className="mt-3">
          <DeckSearchFilter decks={decks} />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  );
}
