/**
 * Build-time: loads the Guide topics and turns each passage reference into a
 * link plus a short excerpt of the BSB text, so the Guide works instantly.
 */
import safetyJson from '~/data/guide/safety.json';
import topicsJson from '~/data/guide/topics.json';
import { books, getChapter } from './bible';
import { formatReference, parseReference } from './reference';
import { guideSafetySchema, guideTopicsSchema, type GuideTopic } from './schemas';

export interface ResolvedPassage {
  label: string;
  href: string;
  why: string;
  excerpt: string;
}

export type ResolvedTopic = Omit<GuideTopic, 'passages'> & { passages: ResolvedPassage[] };

export const guideSafety = guideSafetySchema.parse(safetyJson);
const rawTopics = guideTopicsSchema.parse(topicsJson);

function resolve(ref: string, why: string): ResolvedPassage {
  const r = parseReference(ref, books);
  if (!r) throw new Error(`Guide: unknown reference "${ref}"`);
  const chapter = getChapter('bsb', r.book, r.chapter);
  const from = r.verse ?? 1;
  const to = r.verseEnd ?? r.verse ?? 2;
  let excerpt = chapter.verses
    .filter((v) => v.v >= from && v.v <= to)
    .map((v) => v.text)
    .join(' ');
  if (excerpt.length > 180) excerpt = `${excerpt.slice(0, 177).replace(/\s+\S*$/, '')}…`;
  const label = r.verse === undefined && ref.toLowerCase().startsWith('ps') ? `Psalm ${r.chapter}` : formatReference(r);
  return { label, href: `/bible/${r.book}/${r.chapter}${r.verse ? `#v${r.verse}` : ''}`, why, excerpt };
}

export const guideTopics: ResolvedTopic[] = rawTopics.map((t) => ({
  ...t,
  passages: t.passages.map((p) => resolve(p.ref, p.why)),
}));

export const CATEGORY_LABELS: Record<GuideTopic['category'], string> = {
  feelings: 'How I feel',
  faith: 'My faith',
  life: 'What I’m going through',
  questions: 'Questions I have',
};
