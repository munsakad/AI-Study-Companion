import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const decks = await prisma.deck.findMany({
    where: { userId: session.user.id },
    include: { flashcards: { select: { id: true } }, quiz: { include: { attempts: { orderBy: { completedAt: "desc" }, take: 5 } } } },
    orderBy: { createdAt: "desc" },
  });

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy">Your study dashboard</h1>
        <Link href="/decks/new" className="btn-secondary">Generate new deck</Link>
      </div>

      {weakTopics.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-bold text-navy">Recommended review</h2>
          <p className="text-sm text-gray-600">Your most recent score was under 70% on these — worth another pass.</p>
          <div className="mt-3 space-y-2">
            {weakTopics.map(({ deck, latestScore }) => (
              <div key={deck.id} className="card flex items-center justify-between !p-4">
                <div>
                  <p className="font-bold text-navy">{deck.title}</p>
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
        <h2 className="text-lg font-bold text-navy">All decks</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {withScore.map(({ deck, latestScore, attemptCount }) => (
            <div key={deck.id} className="card">
              <p className="text-xs font-bold uppercase tracking-wide text-navy-light">{deck.topic}</p>
              <h3 className="mt-1 font-bold text-navy">{deck.title}</h3>
              <p className="mt-1 text-xs text-gray-500">{deck.flashcards.length} cards · {attemptCount} quiz attempt{attemptCount === 1 ? "" : "s"}</p>
              {latestScore !== null && (
                <span className={`badge mt-2 ${latestScore >= 70 ? "bg-ok/10 text-ok" : "bg-warn/15 text-warn"}`}>
                  {Math.round(latestScore)}% last attempt
                </span>
              )}
              <div className="mt-3 flex gap-2">
                <Link href={`/decks/${deck.id}/study`} className="btn-outline !py-1.5 !px-3 text-xs">Flashcards</Link>
                {deck.quiz && <Link href={`/quizzes/${deck.quiz.id}/take`} className="btn-secondary !py-1.5 !px-3 text-xs">Take quiz</Link>}
              </div>
            </div>
          ))}
          {withScore.length === 0 && (
            <p className="col-span-full card text-center text-gray-500">No decks yet — generate your first one from your notes.</p>
          )}
        </div>
      </div>
    </div>
  );
}
