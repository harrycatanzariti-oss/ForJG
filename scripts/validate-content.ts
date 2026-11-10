/**
 * Checks every content JSON file against its Zod schema before the build.
 *
 *   npm run validate     (also runs automatically as part of npm run build)
 *
 * If a file is broken, the build stops and prints exactly which file and
 * which field is wrong, instead of producing a site with missing content.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { ZodType } from 'zod';
import { booksSchema, chapterSchema, simplifiedSchema, translationInfoSchema } from '../src/lib/schemas.ts';

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

function check(file: string, schema: ZodType, extra?: (data: any) => string | undefined) {
  checked++;
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    errors.push(`${file}: not valid JSON (${(e as Error).message})`);
    return;
  }
  const result = schema.safeParse(data);
  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push(`${file}: ${issue.path.join('.') || '(root)'}: ${issue.message}`);
    }
    return;
  }
  const problem = extra?.(result.data);
  if (problem) errors.push(`${file}: ${problem}`);
}

const books = booksSchema.parse(JSON.parse(readFileSync('src/data/books.json', 'utf8')));
const bookById = new Map(books.map((b) => [b.id, b]));
check('src/data/books.json', booksSchema);
check('src/data/bible/translations.json', translationInfoSchema);

for (const file of walk('src/data/bible')) {
  if (file.endsWith('translations.json')) continue;
  check(file, chapterSchema);
}

for (const file of walk('src/data/simplified')) {
  check(file, simplifiedSchema, (d) => {
    const book = bookById.get(d.book);
    if (!book) return `unknown book "${d.book}"`;
    const expected = `${d.book}/${d.chapter}.json`;
    if (!relative('src/data/simplified', file).endsWith(expected)) return `file should be named ${expected}`;
    const max = book.verses[d.chapter - 1];
    if (!max) return `${book.name} has no chapter ${d.chapter}`;
    for (const p of d.plain) {
      const [a, b = a] = p.verses.split('-').map(Number);
      if (a < 1 || b > max || b < a) return `verse range "${p.verses}" is outside ${book.name} ${d.chapter} (1-${max})`;
    }
    return undefined;
  });
}

if (errors.length) {
  console.error(`\nContent validation failed (${errors.length} problem${errors.length === 1 ? '' : 's'}):\n`);
  for (const e of errors.slice(0, 50)) console.error(`  ✗ ${e}`);
  if (errors.length > 50) console.error(`  …and ${errors.length - 50} more`);
  process.exit(1);
}
console.log(`✓ ${checked} content files are valid.`);
