import { describe, it, expect } from "vitest";
import { computeStreak } from "./streak";

const NOW = new Date("2026-01-10T12:00:00");

function daysAgo(n: number): Date {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  return d;
}

describe("computeStreak", () => {
  it("returns 0 with no activity", () => {
    expect(computeStreak([], NOW)).toBe(0);
  });

  it("returns 0 if the most recent activity was 2+ days ago", () => {
    expect(computeStreak([daysAgo(2)], NOW)).toBe(0);
  });

  it("counts today alone as a 1-day streak", () => {
    expect(computeStreak([daysAgo(0)], NOW)).toBe(1);
  });

  it("stays alive if yesterday has activity but today doesn't yet", () => {
    expect(computeStreak([daysAgo(1)], NOW)).toBe(1);
  });

  it("counts a consecutive run ending today", () => {
    const dates = [daysAgo(0), daysAgo(1), daysAgo(2), daysAgo(3)];
    expect(computeStreak(dates, NOW)).toBe(4);
  });

  it("stops counting at the first gap", () => {
    const dates = [daysAgo(0), daysAgo(1), daysAgo(3)]; // gap at day 2
    expect(computeStreak(dates, NOW)).toBe(2);
  });

  it("multiple activities on the same day only count once", () => {
    const sameDayMorning = daysAgo(0);
    const sameDayEvening = new Date(sameDayMorning.getTime() + 60 * 60 * 1000);
    expect(computeStreak([sameDayMorning, sameDayEvening], NOW)).toBe(1);
  });
});
