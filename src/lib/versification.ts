/**
 * Known, expected differences in verse numbering between translations.
 *
 * books.json uses KJV numbering as the reference. The BSB and WEB are
 * translated from older Greek manuscripts than the KJV had, and those
 * manuscripts do not contain a handful of verses. Rather than renumber, both
 * translations skip the verse number. WEB also places the closing praise of
 * Romans ("Now to him who is able...") at the end of chapter 14, as some
 * manuscripts do; the KJV has it at Romans 16:25-27.
 *
 * The tests in tests/bible-data.test.ts fail if the data differs from KJV in
 * any way NOT listed here, so a parsing bug cannot slip through unnoticed.
 */
export interface VersificationDifference {
  translation: 'kjv' | 'bsb' | 'web';
  /** "{bookId} {chapter}" */
  ref: string;
  /** Verse numbers deliberately left out of this translation. */
  omitted?: number[];
  /** Highest verse number if it differs from the KJV. */
  lastVerse?: number;
  note: string;
}

const NOT_IN_EARLIEST =
  'Not found in the earliest Greek manuscripts, so this translation leaves the verse out (many print it in a footnote).';

const omittedIn = (translation: 'bsb' | 'web', ref: string, ...omitted: number[]): VersificationDifference => ({
  translation,
  ref,
  omitted,
  note: NOT_IN_EARLIEST,
});

export const VERSIFICATION_ALLOW_LIST: VersificationDifference[] = [
  omittedIn('bsb', 'matthew 17', 21),
  omittedIn('bsb', 'matthew 18', 11),
  omittedIn('bsb', 'matthew 23', 14),
  omittedIn('bsb', 'mark 7', 16),
  omittedIn('bsb', 'mark 9', 44, 46),
  omittedIn('bsb', 'mark 11', 26),
  omittedIn('bsb', 'mark 15', 28),
  omittedIn('bsb', 'luke 17', 36),
  omittedIn('bsb', 'luke 23', 17),
  omittedIn('bsb', 'john 5', 4),
  omittedIn('bsb', 'acts 8', 37),
  omittedIn('bsb', 'acts 15', 34),
  omittedIn('bsb', 'acts 24', 7),
  omittedIn('bsb', 'acts 28', 29),
  omittedIn('bsb', 'romans 16', 24),
  omittedIn('web', 'luke 17', 36),
  omittedIn('web', 'acts 8', 37),
  omittedIn('web', 'acts 15', 34),
  omittedIn('web', 'acts 24', 7),
  {
    translation: 'web',
    ref: 'romans 14',
    lastVerse: 26,
    note: 'WEB places the closing doxology of Romans here as 14:24-26 (KJV 16:25-27).',
  },
  {
    translation: 'web',
    ref: 'romans 16',
    lastVerse: 25,
    omitted: [25],
    note: 'The doxology the KJV numbers 16:25-27 is at Romans 14:24-26 in the WEB.',
  },
];

/** Looks up a note explaining why a verse is missing, for the reader UI. */
export function omittedNote(translation: string, bookId: string, chapter: number): string | undefined {
  return VERSIFICATION_ALLOW_LIST.find((a) => a.translation === translation && a.ref === `${bookId} ${chapter}`)
    ?.note;
}
