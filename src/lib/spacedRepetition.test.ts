import { describe, it, expect } from "vitest";
import { scheduleNextReview, initialSRState, type SRState } from "./spacedRepetition";

const NOW = new Date("2026-01-01T00:00:00Z");

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}

describe("scheduleNextReview", () => {
  it("Again always resets repetitions and schedules for tomorrow", () => {
    const state: SRState = { easeFactor: 2.5, intervalDays: 30, repetitions: 5 };
    const result = scheduleNextReview(state, 0, NOW);
    expect(result.repetitions).toBe(0);
    expect(result.intervalDays).toBe(1);
    expect(daysBetween(NOW, result.dueAt)).toBe(1);
    expect(result.easeFactor).toBeCloseTo(2.3);
  });

  it("Good on a brand-new card schedules 1 day, then 6 days, then ease-scaled", () => {
    let state = initialSRState();
    let result = scheduleNextReview(state, 2, NOW);
    expect(result.repetitions).toBe(1);
    expect(result.intervalDays).toBe(1);

    state = result;
    result = scheduleNextReview(state, 2, NOW);
    expect(result.repetitions).toBe(2);
    expect(result.intervalDays).toBe(6);

    state = result;
    result = scheduleNextReview(state, 2, NOW);
    expect(result.repetitions).toBe(3);
    expect(result.intervalDays).toBe(Math.round(6 * state.easeFactor));
    // Good doesn't change ease factor.
    expect(result.easeFactor).toBe(state.easeFactor);
  });

  it("Hard grows the interval more slowly than Good and lowers ease", () => {
    const state: SRState = { easeFactor: 2.5, intervalDays: 10, repetitions: 3 };
    const result = scheduleNextReview(state, 1, NOW);
    expect(result.intervalDays).toBe(Math.round(10 * 1.2));
    expect(result.easeFactor).toBeCloseTo(2.35);
  });

  it("Easy grows the interval fastest and raises ease", () => {
    const state: SRState = { easeFactor: 2.5, intervalDays: 10, repetitions: 3 };
    const result = scheduleNextReview(state, 3, NOW);
    expect(result.intervalDays).toBe(Math.round(10 * 2.5 * 1.3));
    expect(result.easeFactor).toBeCloseTo(2.65);
  });

  it("clamps ease factor to [1.3, 3.0]", () => {
    let state: SRState = { easeFactor: 1.35, intervalDays: 1, repetitions: 1 };
    let result = scheduleNextReview(state, 0, NOW); // -0.2 would go below 1.3
    expect(result.easeFactor).toBeGreaterThanOrEqual(1.3);
    expect(result.easeFactor).toBeCloseTo(1.3);

    state = { easeFactor: 2.95, intervalDays: 10, repetitions: 5 };
    result = scheduleNextReview(state, 3, NOW); // +0.15 would exceed 3.0
    expect(result.easeFactor).toBeLessThanOrEqual(3.0);
    expect(result.easeFactor).toBeCloseTo(3.0);
  });

  it("never schedules an interval below 1 day", () => {
    const state: SRState = { easeFactor: 1.3, intervalDays: 0, repetitions: 0 };
    const result = scheduleNextReview(state, 2, NOW);
    expect(result.intervalDays).toBeGreaterThanOrEqual(1);
  });
});
