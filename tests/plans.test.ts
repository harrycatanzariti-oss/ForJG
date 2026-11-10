import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { catchUpStart, planStatus } from '../src/lib/plan-state.ts';
import { buildPlan, describeDay, expandSegment, type PlanSpec } from '../src/lib/plans.ts';
import { booksSchema } from '../src/lib/schemas.ts';

const books = booksSchema.parse(JSON.parse(readFileSync('src/data/books.json', 'utf8')));
const specs: PlanSpec[] = JSON.parse(readFileSync('src/data/plans/plans.json', 'utf8'));
const chrono: string[] = JSON.parse(readFileSync('src/data/plans/chronological.json', 'utf8')).segments;
const plans = Object.fromEntries(specs.map((s) => [s.id, buildPlan(s, books, chrono)]));
const allChapters = books.flatMap((b) => Array.from({ length: b.chapters }, (_, i) => `${b.id} ${i + 1}`));
const flat = (id: string) => plans[id]!.days.flat().map((r) => `${r.book} ${r.chapter}`);

describe('reading plans', () => {
  it('has the six plans with the right lengths', () => {
    expect(Object.fromEntries(Object.entries(plans).map(([id, p]) => [id, p.days.length]))).toEqual({
      'whole-bible-year': 365,
      'new-testament-90': 90,
      'gospels-30': 30,
      'psalms-proverbs-60': 60,
      'first-steps': 21,
      'chronological-year': 365,
    });
  });

  it('whole-Bible plans cover every chapter exactly once', () => {
    expect(flat('whole-bible-year')).toEqual(allChapters);
    expect([...flat('chronological-year')].sort()).toEqual([...allChapters].sort());
    expect(new Set(flat('chronological-year')).size).toBe(1189);
  });

  it('never leaves an empty day in single-track plans', () => {
    for (const id of ['whole-bible-year', 'new-testament-90', 'gospels-30', 'first-steps', 'chronological-year']) {
      expect(
        plans[id]!.days.every((d) => d.length > 0),
        id,
      ).toBe(true);
    }
  });

  it('balances days by length', () => {
    const verses = (d: { book: string; chapter: number }[]) =>
      d.reduce((n, r) => n + books.find((b) => b.id === r.book)!.verses[r.chapter - 1]!, 0);
    const sizes = plans['whole-bible-year']!.days.map(verses);
    const avg = sizes.reduce((a, b) => a + b, 0) / sizes.length;
    // Most days stay within 60% of the average (Psalm 119 alone is 176 verses).
    expect(sizes.filter((s) => Math.abs(s - avg) / avg < 0.6).length / sizes.length).toBeGreaterThan(0.9);
  });

  it('first steps reads Mark, then Psalms, then Genesis 1-12', () => {
    const p = plans['first-steps']!;
    expect(p.days[0]![0]).toEqual({ book: 'mark', chapter: 1 });
    expect(p.days[8]![0]!.book).toBe('psalms');
    expect(p.days[20]!.at(-1)).toEqual({ book: 'genesis', chapter: 12 });
  });

  it('describes days readably', () => {
    expect(describeDay([{ book: 'psalms', chapter: 23 }], books)).toBe('Psalm 23');
    expect(describeDay(expandSegment('genesis 1-3', books), books)).toBe('Genesis 1–3');
    expect(
      describeDay(
        [
          { book: 'psalms', chapter: 1 },
          { book: 'psalms', chapter: 2 },
          { book: 'proverbs', chapter: 1 },
        ],
        books,
      ),
    ).toBe('Psalms 1–2; Proverbs 1');
  });
});

describe('plan progress', () => {
  const days = [[{ book: 'mark', chapter: 1 }], [{ book: 'mark', chapter: 2 }], [{ book: 'mark', chapter: 3 }]];

  it('works out today and how far behind you are', () => {
    const s = planStatus(days, { id: 'x', start: '2026-01-01' }, { mark: [1] }, '2026-01-03');
    expect(s).toMatchObject({ todayIndex: 2, behind: 1, firstUndone: 1, completedDays: 1, finished: false });
  });

  it('moves the start date so the first unread day is today', () => {
    const s = planStatus(days, { id: 'x', start: '2026-01-01' }, { mark: [1] }, '2026-01-03');
    expect(catchUpStart(s, '2026-01-03')).toBe('2026-01-02');
    const after = planStatus(days, { id: 'x', start: '2026-01-02' }, { mark: [1] }, '2026-01-03');
    expect(after.behind).toBe(0);
    expect(after.todayIndex).toBe(1);
  });

  it('knows when a plan has not started or is finished', () => {
    expect(planStatus(days, { id: 'x', start: '2026-02-01' }, {}, '2026-01-20').notStarted).toBe(true);
    expect(planStatus(days, { id: 'x', start: '2026-01-01' }, { mark: [1, 2, 3] }, '2026-01-02').finished).toBe(true);
  });
});
