import { describe, it, expect } from "vitest";
import { scoreQuiz } from "./quizScoring";

const questions = [
  { id: "q1", correctIndex: 0 },
  { id: "q2", correctIndex: 2 },
  { id: "q3", correctIndex: 1 },
];

describe("scoreQuiz", () => {
  it("scores all-correct as 100%", () => {
    const result = scoreQuiz(questions, [
      { questionId: "q1", chosenIndex: 0 },
      { questionId: "q2", chosenIndex: 2 },
      { questionId: "q3", chosenIndex: 1 },
    ]);
    expect(result.scorePercent).toBe(100);
    expect(result.correctCount).toBe(3);
    expect(result.answers.every((a) => a.correct)).toBe(true);
  });

  it("scores all-wrong as 0%", () => {
    const result = scoreQuiz(questions, [
      { questionId: "q1", chosenIndex: 1 },
      { questionId: "q2", chosenIndex: 0 },
      { questionId: "q3", chosenIndex: 0 },
    ]);
    expect(result.scorePercent).toBe(0);
    expect(result.correctCount).toBe(0);
  });

  it("scores a partial result correctly", () => {
    const result = scoreQuiz(questions, [
      { questionId: "q1", chosenIndex: 0 }, // correct
      { questionId: "q2", chosenIndex: 0 }, // wrong
      { questionId: "q3", chosenIndex: 1 }, // correct
    ]);
    expect(result.correctCount).toBe(2);
    expect(result.scorePercent).toBeCloseTo((2 / 3) * 100);
  });

  it("ignores answers referencing a questionId outside this quiz", () => {
    const result = scoreQuiz(questions, [
      { questionId: "q1", chosenIndex: 0 },
      { questionId: "not-in-this-quiz", chosenIndex: 5 },
    ]);
    expect(result.total).toBe(3);
    expect(result.answers).toHaveLength(1);
    expect(result.correctCount).toBe(1);
  });

  it("returns 0% for a quiz with no questions instead of dividing by zero", () => {
    const result = scoreQuiz([], []);
    expect(result.scorePercent).toBe(0);
    expect(result.total).toBe(0);
    expect(Number.isNaN(result.scorePercent)).toBe(false);
  });
});
