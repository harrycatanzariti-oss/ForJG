/**
 * Scoring for the Belief Explorer quiz. Each answer gives points (0-3) to
 * the traditions that hold that view. A tradition's match is the points it
 * got divided by the most it could have got from the questions answered,
 * so traditions are not favoured just for appearing in more answers.
 */
import type { QuizQuestion } from './schemas';

export type Answers = Record<string, string>; // question id → option id, or 'skip'

export interface QuizResult {
  id: string;
  percent: number;
  /** Questions where this tradition matched your answer most strongly. */
  reasons: { question: string; answer: string }[];
}

export function scoreQuiz(questions: QuizQuestion[], answers: Answers, traditionIds: string[]): QuizResult[] {
  const got: Record<string, number> = {};
  const max: Record<string, number> = {};
  const reasons: Record<string, { question: string; answer: string; w: number }[]> = {};
  for (const q of questions) {
    const chosen = q.options.find((o) => o.id === answers[q.id]);
    if (!chosen) continue; // skipped or unanswered
    for (const t of traditionIds) {
      const best = Math.max(0, ...q.options.map((o) => o.weights[t] ?? 0));
      const w = chosen.weights[t] ?? 0;
      max[t] = (max[t] ?? 0) + best;
      got[t] = (got[t] ?? 0) + w;
      if (w >= 2) (reasons[t] ??= []).push({ question: q.question, answer: chosen.label, w });
    }
  }
  return traditionIds
    .filter((t) => (max[t] ?? 0) > 0)
    .map((t) => ({
      id: t,
      percent: Math.round(((got[t] ?? 0) / max[t]!) * 100),
      reasons: (reasons[t] ?? [])
        .sort((a, b) => b.w - a.w)
        .slice(0, 3)
        .map(({ question, answer }) => ({ question, answer })),
    }))
    .sort((a, b) => b.percent - a.percent || a.id.localeCompare(b.id));
}
