import { prisma } from "@/lib/prisma";
import { computeStreak } from "@/lib/streak";

export default async function StreakBadge({ userId }: { userId: string }) {
  const [reviews, attempts] = await Promise.all([
    prisma.reviewLog.findMany({ where: { userId }, select: { reviewedAt: true }, orderBy: { reviewedAt: "desc" }, take: 400 }),
    prisma.attempt.findMany({ where: { userId }, select: { completedAt: true }, orderBy: { completedAt: "desc" }, take: 400 }),
  ]);

  const streak = computeStreak([...reviews.map((r) => r.reviewedAt), ...attempts.map((a) => a.completedAt)]);
  if (streak === 0) return null;

  return (
    <span className="badge bg-gold/20 text-navy" title={`${streak}-day study streak`}>
      🔥 {streak} day{streak === 1 ? "" : "s"}
    </span>
  );
}
