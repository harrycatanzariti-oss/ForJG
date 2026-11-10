/**
 * Checks that every Bible quotation inside content files (in “double quotes”)
 * really appears in the BSB text of the passage it is attached to, and that
 * every reference exists. Run: node scripts/check-quotes.ts
 * Used by tests/content.test.ts, so a misquote fails the tests.
 */
import { readFileSync } from 'node:fs';
import { parseReference } from '../src/lib/reference.ts';
import { booksSchema } from '../src/lib/schemas.ts';

const books = booksSchema.parse(JSON.parse(readFileSync('src/data/books.json', 'utf8')));

export const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’‘']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export function passageText(ref: string): string | null {
  const r = parseReference(ref, books);
  if (!r) return null;
  const data = JSON.parse(readFileSync(`src/data/bible/bsb/${r.book}/${r.chapter}.json`, 'utf8'));
  const from = r.verse ?? 1;
  const to = r.verseEnd ?? r.verse ?? 999;
  return [
    data.superscription ?? '',
    ...data.verses.filter((v: { v: number }) => v.v >= from && v.v <= to).map((v: { text: string }) => v.text),
  ].join(' ');
}

/** Returns problems for one (reference, text-with-quotes) pair. */
export function checkQuotes(ref: string, text: string): string[] {
  const body = passageText(ref);
  if (body === null) return [`Unknown reference "${ref}"`];
  const problems: string[] = [];
  const n = norm(body);
  for (const m of text.matchAll(/"([^"]+)"/g)) {
    // A quote may skip words with "..."; check each part.
    for (const part of m[1]!.split(/\.\.\.|…/)) {
      const p = norm(part);
      if (p.length > 3 && !n.includes(p)) problems.push(`${ref}: "${part.trim()}" not found in BSB`);
    }
  }
  return problems;
}

let wholeBible: string | null = null;

/** Checks quotes that are not tied to one passage against the entire BSB. */
export function checkQuotesAnywhere(text: string, minWords = 4): string[] {
  if (wholeBible === null) {
    const parts: string[] = [];
    for (const b of books) {
      for (let c = 1; c <= b.chapters; c++) {
        const data = JSON.parse(readFileSync(`src/data/bible/bsb/${b.id}/${c}.json`, 'utf8'));
        parts.push(data.superscription ?? '', ...data.verses.map((v: { text: string }) => v.text));
      }
    }
    wholeBible = norm(parts.join(' '));
  }
  const problems: string[] = [];
  for (const m of text.matchAll(/"([^"]+)"/g)) {
    for (const part of m[1]!.split(/\.\.\.|…/)) {
      const p = norm(part);
      // Short phrases like "lukewarm" are labels, not quotations.
      if (p.split(' ').length >= minWords && !wholeBible.includes(p))
        problems.push(`"${part.trim()}" not found in the BSB`);
    }
  }
  return problems;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const topics = JSON.parse(readFileSync('src/data/guide/topics.json', 'utf8'));
  const problems = topics.flatMap((t: { id: string; passages: { ref: string; why: string }[] }) =>
    t.passages.flatMap((p) => checkQuotes(p.ref, p.why).map((x) => `[${t.id}] ${x}`)),
  );
  for (const t of topics) {
    for (const field of ['message', 'step']) {
      for (const x of checkQuotesAnywhere(t[field])) problems.push(`[${t.id}.${field}] ${x}`);
    }
  }
  console.log(problems.join('\n') || 'All quotes match.');
}
