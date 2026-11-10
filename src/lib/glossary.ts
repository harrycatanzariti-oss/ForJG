/**
 * Finds glossary terms inside a piece of text so they can become tappable
 * definitions. Each term is only marked the first time it appears on a page.
 */
import glossaryJson from '~/data/glossary.json';
import { glossarySchema, type GlossaryEntry } from './schemas';

export const glossary: GlossaryEntry[] = glossarySchema
  .parse(glossaryJson)
  .sort((a, b) => a.term.localeCompare(b.term));

export interface GlossPart {
  text: string;
  term: string;
  slug: string;
  definition: string;
  popId: string;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Longer phrases first so "apostolic succession" wins over "apostolic".
const patterns = glossary
  .flatMap((g) => [g.term, ...g.aliases].map((form) => ({ form, entry: g })))
  .sort((a, b) => b.form.length - a.form.length);
const regex = new RegExp(`\\b(${patterns.map((p) => escape(p.form)).join('|')})\\b`, 'gi');

let counter = 0;

export function glossaryLinker(text: string, seen: Set<string>): (string | GlossPart)[] {
  const out: (string | GlossPart)[] = [];
  let last = 0;
  for (const m of text.matchAll(regex)) {
    const found = patterns.find((p) => p.form.toLowerCase() === m[0].toLowerCase());
    if (!found || seen.has(found.entry.slug)) continue;
    seen.add(found.entry.slug);
    out.push(text.slice(last, m.index));
    out.push({
      text: m[0],
      term: found.entry.term,
      slug: found.entry.slug,
      definition: found.entry.definition,
      popId: `gloss-${found.entry.slug}-${++counter}`,
    });
    last = m.index! + m[0].length;
  }
  out.push(text.slice(last));
  return out.filter((p) => p !== '');
}
