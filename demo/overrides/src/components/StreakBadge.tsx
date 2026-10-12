"use client";
// Static GitHub Pages build: client-side version of the StreakBadge server
// component (the streak is still computed by src/lib/streak.ts).
import { useEffect, useState } from "react";

export default function StreakBadge({ userId }: { userId?: string }) {
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    fetch("/api/_demo/streak")
      .then((r) => r.json())
      .then((b) => setStreak(b.streak ?? 0))
      .catch(() => {});
  }, [userId]);

  if (streak === 0) return null;
  return (
    <span className="badge bg-gold/20 text-navy" title={`${streak}-day study streak`}>
      🔥 {streak} day{streak === 1 ? "" : "s"}
    </span>
  );
}
