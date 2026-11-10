/**
 * Zod schemas describe the exact shape every content file must have.
 *
 * They are used in three places:
 *   1. scripts/validate-content.ts checks every JSON file before each build,
 *      so a typo in a content file fails the build with a clear message.
 *   2. Unit tests.
 *   3. TypeScript types for the site code (via z.infer), so the editor
 *      autocompletes field names.
 */
import { z } from 'zod';

export const TRANSLATION_IDS = ['kjv', 'bsb', 'web'] as const;
export const translationIdSchema = z.enum(TRANSLATION_IDS);
export type TranslationId = z.infer<typeof translationIdSchema>;

export const GENRES = ['law', 'history', 'wisdom', 'prophets', 'gospels', 'acts', 'letters', 'apocalyptic'] as const;

export const bookSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  order: z.number().int().positive(),
  name: z.string().min(1),
  abbr: z.string().min(1),
  aliases: z.array(z.string()),
  usfm: z.string().length(3),
  testament: z.enum(['old', 'new']),
  /** "deuterocanon" is reserved for books that may be added later. */
  canon: z.enum(['protestant', 'deuterocanon']),
  genre: z.enum(GENRES),
  chapters: z.number().int().positive(),
  /** Number of verses in each chapter (index 0 = chapter 1). */
  verses: z.array(z.number().int().positive()),
});
export type Book = z.infer<typeof bookSchema>;
export const booksSchema = z.array(bookSchema);

export const verseSchema = z.object({
  v: z.number().int().positive(),
  text: z.string().min(1),
  para: z.literal(true).optional(),
  poetry: z.literal(true).optional(),
});
export type Verse = z.infer<typeof verseSchema>;

export const chapterSchema = z.object({
  translation: z.enum(['KJV', 'BSB', 'WEB']),
  book: z.string(),
  bookName: z.string(),
  chapter: z.number().int().positive(),
  superscription: z.string().optional(),
  headings: z.array(z.object({ beforeVerse: z.number().int().positive(), text: z.string().min(1) })),
  verses: z.array(verseSchema).min(1),
  /** Verse numbers this translation leaves out (see docs/SOURCES.md). */
  omitted: z.array(z.number().int().positive()).optional(),
});
export type Chapter = z.infer<typeof chapterSchema>;

export const translationInfoSchema = z.array(
  z.object({
    id: translationIdSchema,
    label: z.string(),
    name: z.string(),
    licence: z.string(),
    sourceUrl: z.url(),
    sha256: z.string().nullable(),
    downloaded: z.string().nullable(),
  }),
);
export type TranslationInfo = z.infer<typeof translationInfoSchema>[number];

/** Level 3 (Plain) and Level 4 (Summary) content written by hand. */
export const simplifiedSchema = z.object({
  book: z.string(),
  chapter: z.number().int().positive(),
  status: z.enum(['draft', 'reviewed']),
  plain: z
    .array(
      z.object({
        verses: z.string().regex(/^\d+(-\d+)?$/, 'Use a verse or range like "1-8"'),
        text: z.string().min(1),
      }),
    )
    .min(1),
  summary: z.object({
    bigIdea: z.string().min(1),
    points: z.array(z.string().min(1)).min(2).max(4),
    reflection: z.string().min(1),
  }),
});
export type Simplified = z.infer<typeof simplifiedSchema>;
