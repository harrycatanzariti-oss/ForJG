/**
 * Checks every content JSON file before the build.
 *
 *   npm run validate     (also runs automatically as part of npm run build)
 *
 * Each file is checked against its Zod schema (src/lib/schemas.ts), and then
 * cross-checked: tradition ids must exist, Bible references must be real,
 * verse ranges must fit the chapter, and Bible quotations in the Guide must
 * match the BSB text. If anything is wrong the build stops and prints exactly
 * which file and field to fix.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import type { ZodType } from 'zod';
import { parseReference } from '../src/lib/reference.ts';
import { expandSegment } from '../src/lib/plans.ts';
import {
  bigQuestionSchema,
  bookIntroSchema,
  booksSchema,
  chapterSchema,
  chronologicalSchema,
  glossarySchema,
  guideSafetySchema,
  guideTopicsSchema,
  passageNotesSchema,
  planSpecsSchema,
  quizSchema,
  simplifiedSchema,
  traditionSchema,
  translationInfoSchema,
  treeSchema,
} from '../src/lib/schemas.ts';
import { checkQuotes, checkQuotesAnywhere } from './check-quotes.ts';

const errors: string[] = [];
let checked = 0;

function walk(dir: string): string[] {
  try {
    return readdirSync(dir).flatMap((name) => {
      const p = join(dir, name);
      return statSync(p).isDirectory() ? walk(p) : p.endsWith('.json') ? [p] : [];
    });
  } catch {
    return [];
  }
}

/** Parses a file with a schema; returns the data or undefined (recording errors). */
function load<T>(file: string, schema: ZodType<T>): T | undefined {
  checked++;
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    errors.push(`${file}: not valid JSON (${(e as Error).message})`);
    return undefined;
  }
  const result = schema.safeParse(data);
  if (!result.success) {
    for (const issue of result.error.issues)
      errors.push(`${file}: ${issue.path.join('.') || '(root)'}: ${issue.message}`);
    return undefined;
  }
  return result.data;
}

const fail = (file: string, msg: string) => errors.push(`${file}: ${msg}`);

// --- Bible ------------------------------------------------------------------
const books = booksSchema.parse(JSON.parse(readFileSync('src/data/books.json', 'utf8')));
const bookById = new Map(books.map((b) => [b.id, b]));
checked++;
load('src/data/bible/translations.json', translationInfoSchema);
for (const file of walk('src/data/bible')) if (!file.endsWith('translations.json')) load(file, chapterSchema);

const checkRef = (file: string, ref: string) => {
  if (!parseReference(ref, books)) fail(file, `unknown Bible reference "${ref}"`);
};
const checkRange = (file: string, bookId: string, chapter: number, range: string) => {
  const book = bookById.get(bookId);
  const max = book?.verses[chapter - 1];
  if (!book || !max) return fail(file, `${bookId} has no chapter ${chapter}`);
  const [a, b = a] = range.split('-').map(Number);
  if (a! < 1 || b! > max || b! < a!) fail(file, `verse range "${range}" is outside ${book.name} ${chapter} (1-${max})`);
};

// --- Simplified levels -------------------------------------------------------
for (const file of walk('src/data/simplified')) {
  const d = load(file, simplifiedSchema);
  if (!d) continue;
  if (!file.endsWith(`${d.book}/${d.chapter}.json`)) fail(file, `file should be named ${d.book}/${d.chapter}.json`);
  for (const p of d.plain) checkRange(file, d.book, d.chapter, p.verses);
  // Ranges must cover the whole chapter, in order, with no gaps or overlaps.
  let last = 0;
  for (const p of d.plain) {
    const [a, b = a] = p.verses.split('-').map(Number);
    if (a !== last + 1) fail(file, `verse range "${p.verses}" should start at verse ${last + 1}`);
    last = b!;
  }
  // Quotations in the Summary level must match the BSB exactly.
  // (Speech in the Plain level is labelled as simplified wording.)
  for (const t of [d.summary.bigIdea, ...d.summary.points, d.summary.reflection]) {
    for (const problem of checkQuotesAnywhere(t)) fail(file, `summary: ${problem}`);
  }
  const max = bookById.get(d.book)?.verses[d.chapter - 1];
  if (max && last !== max) fail(file, `plain retelling stops at verse ${last}, but the chapter has ${max} verses`);
}

// --- Book intros ---------------------------------------------------------------
for (const book of books) {
  const file = `src/data/book-intros/${book.id}.json`;
  try {
    statSync(file);
  } catch {
    fail(file, 'missing introduction');
    continue;
  }
  const d = load(file, bookIntroSchema);
  if (d && d.book !== book.id) fail(file, `"book" should be "${book.id}"`);
}

// --- Traditions --------------------------------------------------------------
const traditionIds = new Set<string>();
for (const file of walk('src/data/traditions')) {
  const d = load(file, traditionSchema);
  if (!d) continue;
  if (basename(file) !== `${d.id}.json`) fail(file, `file should be named ${d.id}.json`);
  traditionIds.add(d.id);
}
const checkTraditions = (file: string, ids: string[]) => {
  for (const id of ids) if (!traditionIds.has(id)) fail(file, `unknown tradition id "${id}"`);
};

const tree = load('src/data/tree.json', treeSchema);
if (tree) {
  const events = new Set(tree.events.map((e) => e.id));
  for (const b of tree.branches) {
    if (!traditionIds.has(b.id)) fail('src/data/tree.json', `branch "${b.id}" is not a tradition`);
    if (!events.has(b.event)) fail('src/data/tree.json', `branch "${b.id}" has unknown event "${b.event}"`);
    if (b.parent && !tree.branches.some((x) => x.id === b.parent))
      fail('src/data/tree.json', `unknown parent "${b.parent}"`);
  }
}

const quiz = load('src/data/quiz.json', quizSchema);
if (quiz)
  for (const q of quiz) for (const o of q.options) checkTraditions('src/data/quiz.json', Object.keys(o.weights));

for (const file of walk('src/data/questions')) {
  const d = load(file, bigQuestionSchema);
  if (!d) continue;
  d.keyPassages.forEach((r) => checkRef(file, r));
  for (const v of d.views) {
    checkTraditions(file, v.heldBy);
    v.passages.forEach((r) => checkRef(file, r));
  }
}

for (const file of walk('src/data/passage-notes')) {
  const d = load(file, passageNotesSchema);
  if (!d) continue;
  if (basename(file) !== `${d.book}-${d.chapter}.json`) fail(file, `file should be named ${d.book}-${d.chapter}.json`);
  for (const n of d.notes) {
    checkRange(file, d.book, d.chapter, n.verses);
    for (const v of n.views) checkTraditions(file, v.heldBy);
  }
}

// --- Glossary, Guide and plans -----------------------------------------------
load('src/data/glossary.json', glossarySchema);
load('src/data/guide/safety.json', guideSafetySchema);
const topics = load('src/data/guide/topics.json', guideTopicsSchema);
if (topics) {
  const ids = new Set(topics.map((t) => t.id));
  for (const t of topics) {
    const where = `src/data/guide/topics.json [${t.id}]`;
    for (const p of t.passages) {
      checkRef(where, p.ref);
      for (const problem of checkQuotes(p.ref, p.why)) fail(where, problem);
    }
    for (const field of [t.message, t.step]) for (const problem of checkQuotesAnywhere(field)) fail(where, problem);
    for (const o of t.followUp?.options ?? [])
      if (!ids.has(o.topic)) fail(where, `follow-up to unknown topic "${o.topic}"`);
    for (const r of t.related) if (!ids.has(r)) fail(where, `related to unknown topic "${r}"`);
  }
}

const chrono = load('src/data/plans/chronological.json', chronologicalSchema);
const plans = load('src/data/plans/plans.json', planSpecsSchema);
if (plans) {
  for (const p of plans) {
    for (const stage of p.stages) {
      for (const track of stage.tracks) {
        for (const seg of track) {
          try {
            expandSegment(seg, books, chrono?.segments ?? []);
          } catch (e) {
            fail(`src/data/plans/plans.json [${p.id}]`, (e as Error).message);
          }
        }
      }
    }
  }
}

if (errors.length) {
  console.error(`\nContent validation failed (${errors.length} problem${errors.length === 1 ? '' : 's'}):\n`);
  for (const e of errors.slice(0, 60)) console.error(`  ✗ ${e}`);
  if (errors.length > 60) console.error(`  …and ${errors.length - 60} more`);
  process.exit(1);
}
console.log(`✓ ${checked} content files are valid.`);
