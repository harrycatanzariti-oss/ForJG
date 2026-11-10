import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { scoreQuiz } from '../src/lib/quiz.ts';
import { quizSchema } from '../src/lib/schemas.ts';

const questions = quizSchema.parse(JSON.parse(readFileSync('src/data/quiz.json', 'utf8')));
const ids = readdirSync('src/data/traditions').map((f) => f.replace('.json', ''));

/** Answers each question with the option that gives `id` the most points. */
const answersFor = (id: string) =>
  Object.fromEntries(
    questions.map((q) => [q.id, [...q.options].sort((a, b) => (b.weights[id] ?? 0) - (a.weights[id] ?? 0))[0]!.id]),
  );

describe('quiz', () => {
  it('has 15-20 questions that only mention real traditions', () => {
    expect(questions.length).toBeGreaterThanOrEqual(15);
    expect(questions.length).toBeLessThanOrEqual(20);
    for (const q of questions)
      for (const o of q.options) for (const t of Object.keys(o.weights)) expect(ids).toContain(t);
  });

  it('every tradition can be reached', () => {
    for (const id of ids)
      expect(
        questions.some((q) => q.options.some((o) => (o.weights[id] ?? 0) >= 2)),
        id,
      ).toBe(true);
  });

  it.each(ids)('answering like %s puts it first (or tied first)', (id) => {
    const results = scoreQuiz(questions, answersFor(id), ids);
    expect(results[0]!.percent).toBe(results.find((r) => r.id === id)!.percent);
  });

  it('ignores skipped questions', () => {
    const r = scoreQuiz(questions, { authority: 'skip' }, ids);
    expect(r).toEqual([]);
  });
});
