/** Build-time: generates every reading plan from src/data/plans/. */
import chronoJson from '~/data/plans/chronological.json';
import specsJson from '~/data/plans/plans.json';
import { books } from './bible';
import { buildPlan, describeDay, type Plan } from './plans';
import { chronologicalSchema, planSpecsSchema } from './schemas';

const chrono = chronologicalSchema.parse(chronoJson);
export const plans: Plan[] = planSpecsSchema.parse(specsJson).map((s) => buildPlan(s, books, chrono.segments));
export const chronologicalNote = chrono.note;

/** Compact form sent to the browser: each day is a list of [bookId, chapter]. */
export interface PlanData {
  id: string;
  name: string;
  days: [string, number][][];
  labels: string[];
}

export function planData(plan: Plan): PlanData {
  return {
    id: plan.id,
    name: plan.name,
    days: plan.days.map((d) => d.map((r) => [r.book, r.chapter] as [string, number])),
    labels: plan.days.map((d) => describeDay(d, books)),
  };
}

export function planStats(plan: Plan) {
  const chapters = plan.days.reduce((n, d) => n + d.length, 0);
  const words = plan.days
    .flat()
    .reduce((n, r) => n + books.find((b) => b.id === r.book)!.verses[r.chapter - 1]! * 25, 0);
  return {
    days: plan.days.length,
    chapters,
    // About 25 words per verse, read at 200 words a minute.
    minutesPerDay: Math.max(1, Math.round(words / 200 / plan.days.length)),
  };
}
