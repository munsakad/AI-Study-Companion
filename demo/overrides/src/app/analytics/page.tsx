"use client";
// Static GitHub Pages build: client-side version of src/app/analytics/page.tsx.
// The numbers are computed by the demo API with the same rules.
import { useEffect, useState } from "react";
import Link from "next/link";
import RequireAuth from "@/demo/RequireAuth";
import ScoreTrendChart from "@/components/charts/ScoreTrendChart";
import MasteryBarChart from "@/components/charts/MasteryBarChart";
import ActivityBarChart from "@/components/charts/ActivityBarChart";

const ACTIVITY_DAYS = 30;

type Analytics = {
  deckCount: number;
  cardCount: number;
  dueCount: number;
  streak: number;
  attempts: { date: string; scorePercent: number }[];
  masteryBars: { topic: string; scorePercent: number }[];
  activityDays: { date: string; count: number }[];
};

function AnalyticsView() {
  const [a, setA] = useState<Analytics | null>(null);

  useEffect(() => {
    fetch("/api/_demo/analytics")
      .then((r) => r.json())
      .then(setA);
  }, []);

  if (!a) return <p className="mx-auto max-w-3xl px-6 py-12 text-center text-sm text-gray-500">Loading…</p>;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">Analytics</h1>
        <Link href="/dashboard" className="btn-outline !py-1.5 !px-3 text-xs">Back to dashboard</Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card !p-3 text-center">
          <p className="text-xs text-gray-500">Decks</p>
          <p className="text-xl font-bold text-ink">{a.deckCount}</p>
        </div>
        <div className="card !p-3 text-center">
          <p className="text-xs text-gray-500">Flashcards</p>
          <p className="text-xl font-bold text-ink">{a.cardCount}</p>
        </div>
        <div className="card !p-3 text-center">
          <p className="text-xs text-gray-500">Due now</p>
          <p className="text-xl font-bold text-ink">{a.dueCount}</p>
        </div>
        <div className="card !p-3 text-center">
          <p className="text-xs text-gray-500">Streak</p>
          <p className="text-xl font-bold text-ink">{a.streak > 0 ? `🔥 ${a.streak}d` : "—"}</p>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-ink">Score trend</h2>
        <p className="text-sm text-gray-600">Every quiz attempt, across all decks, in order.</p>
        <div className="card mt-3">
          {a.attempts.length > 0 ? (
            <ScoreTrendChart points={a.attempts} />
          ) : (
            <p className="text-center text-sm text-gray-500">Take a quiz to start seeing your trend.</p>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-ink">Mastery by topic</h2>
        <p className="text-sm text-gray-600">Latest quiz score per topic — the same 70% line the dashboard uses.</p>
        <div className="card mt-3">
          {a.masteryBars.length > 0 ? (
            <MasteryBarChart bars={a.masteryBars} />
          ) : (
            <p className="text-center text-sm text-gray-500">No quiz attempts yet.</p>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-ink">Study activity</h2>
        <p className="text-sm text-gray-600">Flashcard reviews + quiz attempts, last {ACTIVITY_DAYS} days.</p>
        <div className="card mt-3">
          <ActivityBarChart days={a.activityDays} />
        </div>
      </section>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <RequireAuth>
      <AnalyticsView />
    </RequireAuth>
  );
}
