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

/** Introduction card for a book, shown on the book page and chapter 1. */
export const bookIntroSchema = z.object({
  book: z.string(),
  author: z.string().min(1),
  /** Short, fair note where scholars debate authorship or date. */
  authorNote: z.string().optional(),
  date: z.string().min(1),
  audience: z.string().min(1),
  genre: z.string().min(1),
  overview: z.string().min(40),
  themes: z.array(z.string()).min(1),
  storyPlace: z.string().min(1),
});
export type BookIntro = z.infer<typeof bookIntroSchema>;

/** "How traditions read this" notes on key passages. */
export const passageNotesSchema = z.object({
  book: z.string(),
  chapter: z.number().int().positive(),
  notes: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z0-9-]+$/),
        verses: z.string().regex(/^\d+(-\d+)?$/),
        title: z.string().min(1),
        /** One neutral sentence on why this passage matters. */
        intro: z.string().min(1),
        views: z
          .array(
            z.object({
              label: z.string().min(1),
              summary: z.string().min(1),
              /** Tradition ids (see src/data/traditions). */
              heldBy: z.array(z.string()).min(1),
              source: z.string().min(1),
            }),
          )
          .min(2)
          .max(4),
        /** What the views agree on, if anything. */
        common: z.string().optional(),
      }),
    )
    .min(1),
});
export type PassageNotes = z.infer<typeof passageNotesSchema>;
export type PassageNote = PassageNotes['notes'][number];

/** A source citation. `url` is optional; many confessions are printed works. */
const sourced = z.string().min(3);

export const BELIEF_TOPICS = [
  'authority',
  'salvation',
  'baptism',
  'communion',
  'mary',
  'saints',
  'churchGovernance',
  'clergy',
  'afterlife',
  'spiritualGifts',
  'endTimes',
] as const;
export type BeliefTopic = (typeof BELIEF_TOPICS)[number];

export const BELIEF_TOPIC_LABELS: Record<BeliefTopic, string> = {
  authority: 'Authority: Scripture and tradition',
  salvation: 'Salvation',
  baptism: 'Baptism',
  communion: 'Communion (the Lord’s Supper)',
  mary: 'Mary',
  saints: 'Saints',
  churchGovernance: 'How the church is governed',
  clergy: 'Ministers and clergy',
  afterlife: 'Death and the afterlife',
  spiritualGifts: 'Gifts of the Spirit today',
  endTimes: 'The end times',
};

const beliefSchema = z.object({ summary: z.string().min(10), detail: z.string().min(20), source: sourced });

export const traditionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  shortName: z.string(),
  /** Broad family used for grouping and colour. */
  family: z.enum(['catholic', 'orthodox', 'eastern', 'protestant', 'restorationist', 'other']),
  /** True for "Other groups with Christian roots" (outside historic Trinitarian Christianity). */
  otherGroup: z.boolean().default(false),
  foundedApprox: z.string(),
  keyFigures: z.array(z.string()).min(1),
  originSummary: z.string().min(40),
  globalSizeApprox: z.object({ figure: z.string(), year: z.string(), source: sourced, note: z.string().optional() }),
  whereCommon: z.array(z.string()).min(1),
  diversity: z.string().min(20),
  beliefs: z.object(
    Object.fromEntries(BELIEF_TOPICS.map((t) => [t, beliefSchema])) as Record<BeliefTopic, typeof beliefSchema>,
  ),
  worship: z.object({ style: z.string(), typicalService: z.string(), calendar: z.string(), music: z.string() }),
  firstVisit: z.object({ expect: z.string(), wear: z.string(), etiquette: z.array(z.string()).min(1) }),
  keyTexts: z.array(z.object({ title: z.string(), note: z.string() })).min(1),
  furtherReading: z
    .array(z.object({ title: z.string(), author: z.string().optional(), url: z.url().optional() }))
    .min(1),
});
export type Tradition = z.infer<typeof traditionSchema>;

export const glossarySchema = z.array(
  z.object({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    term: z.string(),
    aliases: z.array(z.string()),
    definition: z.string().min(10),
  }),
);
export type GlossaryEntry = z.infer<typeof glossarySchema>[number];

export const guideTopicSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string(),
  chip: z.string(),
  category: z.enum(['feelings', 'faith', 'life', 'questions']),
  signals: z
    .array(
      z.object({
        terms: z.array(z.string().min(1)).min(1),
        weight: z.number().positive(),
        negatable: z.boolean().optional(),
      }),
    )
    .min(1),
  combos: z.array(z.object({ signals: z.array(z.number().int().nonnegative()), bonus: z.number() })).optional(),
  message: z.string().min(40),
  step: z.string().min(10),
  passages: z.array(z.object({ ref: z.string(), why: z.string() })).min(3),
  links: z.array(z.object({ label: z.string(), href: z.string().startsWith('/') })),
  followUp: z
    .object({ question: z.string(), options: z.array(z.object({ label: z.string(), topic: z.string() })).min(1) })
    .optional(),
  care: z.boolean().optional(),
  related: z.array(z.string()),
});
export const guideTopicsSchema = z.array(guideTopicSchema);
export type GuideTopic = z.infer<typeof guideTopicSchema>;

const resourceSchema = z.object({ region: z.string(), name: z.string(), contact: z.string(), href: z.string() });
export const guideSafetySchema = z.object({
  crisis: z.object({
    title: z.string(),
    message: z.string(),
    phrases: z.array(z.string()),
    negatedPhrases: z.array(z.string()),
    resources: z.array(resourceSchema),
  }),
  abuse: z.object({
    title: z.string(),
    message: z.string(),
    phrases: z.array(z.string()),
    resources: z.array(resourceSchema),
  }),
  careNote: z.string(),
});
export type GuideSafety = z.infer<typeof guideSafetySchema>;

export const planSpecsSchema = z.array(
  z.object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string(),
    short: z.string(),
    description: z.string(),
    stages: z
      .array(z.object({ days: z.number().int().positive(), tracks: z.array(z.array(z.string()).min(1)).min(1) }))
      .min(1),
  }),
);
export const chronologicalSchema = z.object({ note: z.string(), segments: z.array(z.string()).min(1) });
