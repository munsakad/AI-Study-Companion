// Study streak = consecutive calendar days (local time) with at least one
// graded flashcard review or completed quiz attempt. Passive flashcard
// browsing (the flip-card view) doesn't count — it has no server
// round-trip today, so counting it isn't possible without a new ping route.

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Pure function: pass in every activity timestamp, get back the current streak. */
export function computeStreak(activityDates: Date[], now: Date = new Date()): number {
  if (activityDates.length === 0) return 0;

  const activeDays = new Set(activityDates.map(dayKey));
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  // Streak is "live" if today or yesterday has activity — otherwise it's
  // already broken and the count is 0, even if there's a long run further back.
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (!activeDays.has(dayKey(today)) && !activeDays.has(dayKey(yesterday))) return 0;

  let streak = 0;
  const cursor = activeDays.has(dayKey(today)) ? today : yesterday;
  while (activeDays.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
