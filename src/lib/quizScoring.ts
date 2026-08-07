// Extracted from src/app/api/attempts/route.ts so the scoring rules are a
// pure, unit-testable function — the route just fetches + persists.

export interface ScoreableQuestion {
  id: string;
  correctIndex: number;
}

export interface SubmittedAnswer {
  questionId: string;
  chosenIndex: number;
}

export interface ScoredAnswer {
  questionId: string;
  chosenIndex: number;
  correct: boolean;
}

export interface QuizScore {
  scorePercent: number;
  correctCount: number;
  total: number;
  answers: ScoredAnswer[];
}

/** Answers referencing a questionId outside this quiz are silently ignored. */
export function scoreQuiz(questions: ScoreableQuestion[], submitted: SubmittedAnswer[]): QuizScore {
  const byId = new Map(questions.map((q) => [q.id, q]));
  let correctCount = 0;
  const answers: ScoredAnswer[] = [];

  for (const a of submitted) {
    const q = byId.get(a.questionId);
    if (!q) continue;
    const correct = a.chosenIndex === q.correctIndex;
    if (correct) correctCount++;
    answers.push({ questionId: a.questionId, chosenIndex: a.chosenIndex, correct });
  }

  const scorePercent = questions.length === 0 ? 0 : (correctCount / questions.length) * 100;
  return { scorePercent, correctCount, total: questions.length, answers };
}
