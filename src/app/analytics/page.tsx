import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import ScoreTrendChart from "@/components/charts/ScoreTrendChart";
import MasteryBarChart from "@/components/charts/MasteryBarChart";
import ActivityBarChart from "@/components/charts/ActivityBarChart";
import { computeStreak } from "@/lib/streak";

const ACTIVITY_DAYS = 30;

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const userId = session.user.id;

  const [decks, allAttempts, reviewDates, attemptDates, deckCount, cardCount, dueCount] = await Promise.all([
    prisma.deck.findMany({
      where: { userId },
      select: { topic: true, quiz: { select: { attempts: { orderBy: { completedAt: "desc" }, take: 1, select: { scorePercent: true } } } } },
    }),
    prisma.attempt.findMany({ where: { userId }, orderBy: { completedAt: "asc" }, select: { completedAt: true, scorePercent: true } }),
    prisma.reviewLog.findMany({ where: { userId }, select: { reviewedAt: true } }),
    prisma.attempt.findMany({ where: { userId }, select: { completedAt: true } }),
    prisma.deck.count({ where: { userId } }),
    prisma.flashcard.count({ where: { deck: { userId } } }),
    prisma.flashcard.count({ where: { deck: { userId }, dueAt: { lte: new Date() } } }),
  ]);

  // Per-topic mastery: average each topic's decks' latest-attempt scores.
  const topicScores = new Map<string, number[]>();
  for (const d of decks) {
    const latest = d.quiz?.attempts[0]?.scorePercent;
    if (latest === undefined) continue;
    if (!topicScores.has(d.topic)) topicScores.set(d.topic, []);
    topicScores.get(d.topic)!.push(latest);
  }
  const masteryBars = [...topicScores.entries()]
    .map(([topic, scores]) => ({ topic, scorePercent: scores.reduce((a, b) => a + b, 0) / scores.length }))
    .sort((a, b) => a.scorePercent - b.scorePercent);

  // Daily study activity for the last ACTIVITY_DAYS days.
  const counts = new Map<string, number>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = ACTIVITY_DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    counts.set(d.toISOString().slice(0, 10), 0);
  }
  for (const { reviewedAt } of reviewDates) {
    const key = reviewedAt.toISOString().slice(0, 10);
    if (counts.has(key)) counts.set(key, counts.get(key)! + 1);
  }
  for (const { completedAt } of attemptDates) {
    const key = completedAt.toISOString().slice(0, 10);
    if (counts.has(key)) counts.set(key, counts.get(key)! + 1);
  }
  const activityDays = [...counts.entries()].map(([date, count]) => ({ date, count }));
  const streak = computeStreak([...reviewDates.map((r) => r.reviewedAt), ...attemptDates.map((a) => a.completedAt)]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">Analytics</h1>
        <Link href="/dashboard" className="btn-outline !py-1.5 !px-3 text-xs">Back to dashboard</Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card !p-3 text-center">
          <p className="text-xs text-gray-500">Decks</p>
          <p className="text-xl font-bold text-ink">{deckCount}</p>
        </div>
        <div className="card !p-3 text-center">
          <p className="text-xs text-gray-500">Flashcards</p>
          <p className="text-xl font-bold text-ink">{cardCount}</p>
        </div>
        <div className="card !p-3 text-center">
          <p className="text-xs text-gray-500">Due now</p>
          <p className="text-xl font-bold text-ink">{dueCount}</p>
        </div>
        <div className="card !p-3 text-center">
          <p className="text-xs text-gray-500">Streak</p>
          <p className="text-xl font-bold text-ink">{streak > 0 ? `🔥 ${streak}d` : "—"}</p>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-ink">Score trend</h2>
        <p className="text-sm text-gray-600">Every quiz attempt, across all decks, in order.</p>
        <div className="card mt-3">
          {allAttempts.length > 0 ? (
            <ScoreTrendChart points={allAttempts.map((a) => ({ date: a.completedAt.toISOString(), scorePercent: a.scorePercent }))} />
          ) : (
            <p className="text-center text-sm text-gray-500">Take a quiz to start seeing your trend.</p>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-ink">Mastery by topic</h2>
        <p className="text-sm text-gray-600">Latest quiz score per topic — the same 70% line the dashboard uses.</p>
        <div className="card mt-3">
          {masteryBars.length > 0 ? (
            <MasteryBarChart bars={masteryBars} />
          ) : (
            <p className="text-center text-sm text-gray-500">No quiz attempts yet.</p>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-ink">Study activity</h2>
        <p className="text-sm text-gray-600">Flashcard reviews + quiz attempts, last {ACTIVITY_DAYS} days.</p>
        <div className="card mt-3">
          <ActivityBarChart days={activityDays} />
        </div>
      </section>
    </div>
  );
}
