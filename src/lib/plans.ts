/**
 * Reading plans are generated from a short description, not typed out by
 * hand. A plan has stages; each stage has a number of days and one or more
 * "tracks" (lists of passages). Each track is spread over the stage's days,
 * balanced by verse count, and the tracks are combined day by day.
 *
 * Passage notation: "mark" (whole book), "genesis 1-12", "psalms 23",
 * "matthew..revelation" (a run of books), "@chronological" (the list in
 * src/data/plans/chronological.json).
 */

export interface PlanBook {
  id: string;
  name: string;
  chapters: number;
  verses: number[];
}

export interface PlanSpec {
  id: string;
  name: string;
  short: string;
  description: string;
  stages: { days: number; tracks: string[][] }[];
}

export interface Reading {
  book: string;
  chapter: number;
}

export interface Plan extends Omit<PlanSpec, 'stages'> {
  days: Reading[][];
}

export function expandSegment(segment: string, books: PlanBook[], chronological: string[] = []): Reading[] {
  if (segment === '@chronological') return chronological.flatMap((s) => expandSegment(s, books));
  const range = /^([a-z0-9-]+)\.\.([a-z0-9-]+)$/.exec(segment);
  if (range) {
    const a = books.findIndex((b) => b.id === range[1]);
    const z = books.findIndex((b) => b.id === range[2]);
    if (a < 0 || z < a) throw new Error(`Bad book range "${segment}"`);
    return books.slice(a, z + 1).flatMap((b) => expandSegment(b.id, books));
  }
  const m = /^([a-z0-9-]+)(?:\s+(\d+)(?:-(\d+))?)?$/.exec(segment);
  const book = m && books.find((b) => b.id === m[1]);
  if (!m || !book) throw new Error(`Unknown plan segment "${segment}"`);
  const from = m[2] ? Number(m[2]) : 1;
  const to = m[3] ? Number(m[3]) : m[2] ? from : book.chapters;
  if (from < 1 || to > book.chapters || to < from) throw new Error(`Bad chapters in "${segment}"`);
  return Array.from({ length: to - from + 1 }, (_, i) => ({ book: book.id, chapter: from + i }));
}

/**
 * Splits readings over `days`, keeping each day's total verse count close to
 * the average. Every day gets at least one chapter when there are enough.
 */
export function splitBalanced(readings: Reading[], days: number, books: PlanBook[]): Reading[][] {
  const size = (r: Reading) => books.find((b) => b.id === r.book)!.verses[r.chapter - 1]!;
  const out: Reading[][] = Array.from({ length: days }, () => []);
  if (readings.length === 0) return out;
  if (readings.length <= days) {
    // Fewer chapters than days: spread them out evenly.
    readings.forEach((r, i) => out[Math.floor((i * days) / readings.length)]!.push(r));
    return out;
  }
  const total = readings.reduce((n, r) => n + size(r), 0);
  let i = 0;
  let cum = 0;
  for (let d = 0; d < days; d++) {
    const target = (total * (d + 1)) / days;
    const mustLeave = days - d - 1;
    // Always take at least one chapter.
    do {
      cum += size(readings[i]!);
      out[d]!.push(readings[i++]!);
    } while (i < readings.length - mustLeave && (d === days - 1 || cum + size(readings[i]!) / 2 <= target));
  }
  return out;
}

export function buildPlan(spec: PlanSpec, books: PlanBook[], chronological: string[] = []): Plan {
  const days: Reading[][] = [];
  for (const stage of spec.stages) {
    const tracks = stage.tracks.map((track) =>
      splitBalanced(
        track.flatMap((s) => expandSegment(s, books, chronological)),
        stage.days,
        books,
      ),
    );
    for (let d = 0; d < stage.days; d++) days.push(tracks.flatMap((t) => t[d]!));
  }
  const { stages: _stages, ...rest } = spec;
  return { ...rest, days };
}

/** "Genesis 1–3", "Psalms 23; Proverbs 4", "Psalm 119". */
export function describeDay(day: Reading[], books: PlanBook[]): string {
  const parts: string[] = [];
  let i = 0;
  while (i < day.length) {
    const start = day[i]!;
    let j = i;
    while (j + 1 < day.length && day[j + 1]!.book === start.book && day[j + 1]!.chapter === day[j]!.chapter + 1) j++;
    const name = books.find((b) => b.id === start.book)!.name;
    const single = j === i;
    const label = start.book === 'psalms' && single ? 'Psalm' : name;
    parts.push(single ? `${label} ${start.chapter}` : `${label} ${start.chapter}–${day[j]!.chapter}`);
    i = j + 1;
  }
  return parts.join('; ') || 'Rest day';
}
