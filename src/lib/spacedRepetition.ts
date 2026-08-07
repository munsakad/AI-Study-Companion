// Simplified SM-2 spaced repetition. Pure and deterministic (takes `now`
// as a parameter) so it's trivially unit-testable without mocking time.
//
// Grades, matching the buttons shown during a review session:
//   0 = Again  — got it wrong, restart the interval from scratch
//   1 = Hard   — got it right but it was a struggle
//   2 = Good   — got it right at the expected difficulty
//   3 = Easy   — got it right with room to spare

export type Grade = 0 | 1 | 2 | 3;

export interface SRState {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
}

export interface SRResult extends SRState {
  dueAt: Date;
}

const MIN_EASE = 1.3;
const MAX_EASE = 3.0;

function clampEase(ease: number): number {
  return Math.min(MAX_EASE, Math.max(MIN_EASE, ease));
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Fresh scheduling state for a newly created flashcard — immediately due. */
export function initialSRState(): SRState {
  return { easeFactor: 2.5, intervalDays: 0, repetitions: 0 };
}

export function scheduleNextReview(state: SRState, grade: Grade, now: Date = new Date()): SRResult {
  const prevInterval = state.intervalDays;
  let { easeFactor, repetitions } = state;
  let intervalDays: number;

  switch (grade) {
    case 0: // Again
      repetitions = 0;
      intervalDays = 1;
      easeFactor = clampEase(easeFactor - 0.2);
      break;
    case 1: // Hard
      repetitions += 1;
      intervalDays = repetitions === 1 ? 1 : Math.round(prevInterval * 1.2);
      easeFactor = clampEase(easeFactor - 0.15);
      break;
    case 2: // Good
      repetitions += 1;
      intervalDays = repetitions === 1 ? 1 : repetitions === 2 ? 6 : Math.round(prevInterval * easeFactor);
      break;
    case 3: // Easy
      repetitions += 1;
      intervalDays = repetitions === 1 ? 4 : Math.round(prevInterval * easeFactor * 1.3);
      easeFactor = clampEase(easeFactor + 0.15);
      break;
  }

  intervalDays = Math.max(1, intervalDays);
  return { easeFactor, intervalDays, repetitions, dueAt: addDays(now, intervalDays) };
}
