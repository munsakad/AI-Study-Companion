import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import StreakBadge from "@/components/StreakBadge";
import DeckSearchFilter from "@/components/DeckSearchFilter";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [decks, dueCount] = await Promise.all([
    prisma.deck.findMany({
      where: { userId: session.user.id },
      include: {
        flashcards: { select: { id: true } },
        tags: { select: { name: true } },
        quiz: { include: { attempts: { orderBy: { completedAt: "desc" }, take: 5 } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.flashcard.count({ where: { deck: { userId: session.user.id }, dueAt: { lte: new Date() } } }),
  ]);

  // Recommendation logic: for each deck with quiz attempts, take the most
  // recent attempt's score. Below 70% = weak. Sort weakest first so the
  // dashboard leads with what most needs review. Decks never attempted
  // don't count as weak — they're just "not started yet".
  const withScore = decks.map((d) => {
    const latest = d.quiz?.attempts[0];
    return { deck: d, latestScore: latest?.scorePercent ?? null, attemptCount: d.quiz?.attempts.length ?? 0 };
  });
  const weakTopics = withScore
    .filter((x) => x.latestScore !== null && x.latestScore < 70)
    .sort((a, b) => (a.latestScore ?? 0) - (b.latestScore ?? 0));

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-ink">Your study dashboard</h1>
          <StreakBadge userId={session.user.id} />
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
            {weakTopics.map(({ deck, latestScore }) => (
              <div key={deck.id} className="card flex items-center justify-between !p-4">
                <div>
                  <p className="font-bold text-ink">{deck.title}</p>
                  <p className="text-xs text-gray-500">{deck.topic}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="badge bg-warn/15 text-warn">{Math.round(latestScore!)}% last attempt</span>
                  <Link href={`/decks/${deck.id}/study`} className="btn-outline !py-1.5 !px-3 text-xs">Review deck</Link>
                  {deck.quiz && <Link href={`/quizzes/${deck.quiz.id}/take`} className="btn-secondary !py-1.5 !px-3 text-xs">Retake quiz</Link>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-lg font-bold text-ink">All decks</h2>
        <div className="mt-3">
          <DeckSearchFilter
            decks={withScore.map(({ deck, latestScore, attemptCount }) => ({
              id: deck.id,
              title: deck.title,
              topic: deck.topic,
              tags: deck.tags.map((t) => t.name),
              cardCount: deck.flashcards.length,
              attemptCount,
              latestScore,
              quizId: deck.quiz?.id ?? null,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
