/**
 * A small USFM parser tailored to the files published by eBible.org.
 *
 * USFM ("Unified Standard Format Markers") is a plain-text format used by Bible
 * translators. Every piece of structure is a backslash marker, for example:
 *
 *   \c 3                 chapter 3 starts
 *   \s1 Jesus and Nicodemus   a section heading
 *   \p                   a new paragraph
 *   \v 16 For God so loved...  verse 16
 *   \w loved|strong="G25"\w*  a word tagged with a Strong's number
 *   \f + \fr 3:16 \ft ... \f* a footnote
 *
 * We only need clean reading text, so this parser keeps verse text, section
 * headings, Psalm titles and simple paragraph/poetry hints, and throws away
 * footnotes, cross references, word tags and other formatting codes.
 */

export interface Heading {
  beforeVerse: number;
  text: string;
}

export interface Verse {
  v: number;
  text: string;
  /** A new paragraph (or stanza) starts before this verse. */
  para?: true;
  /** The verse is laid out as poetry in the source. */
  poetry?: true;
}

export interface ParsedChapter {
  chapter: number;
  /** Psalm titles like "A Psalm of David." which sit before verse 1. */
  superscription?: string;
  headings: Heading[];
  verses: Verse[];
}

export interface ParsedBook {
  usfm: string;
  chapters: ParsedChapter[];
}

/** Markers whose text we keep as a section heading. */
const HEADING_MARKERS = /^(s|s1|s2|s3|s4|ms|ms1|ms2|qa|sp)$/;
/** Markers (with their text) that we drop entirely. */
const DROP_MARKERS =
  /^(id|ide|h|h1|h2|toc1|toc2|toc3|mt|mt1|mt2|mt3|mt4|mte|mte1|mte2|imt|imt1|imt2|is|is1|is2|ip|ipi|im|imi|ipq|imq|ipr|iq|iq1|iq2|ib|ili|ili1|ili2|iot|io|io1|io2|ior|iex|ie|r|mr|sr|cl|cp|cd|rem|sts|usfm|restore|periph)$/;
/** Paragraph-level markers that mean "start a new paragraph". */
const PARA_MARKERS = /^(p|m|pi|pi1|pi2|pi3|pmo|pm|pmc|pmr|pc|pr|mi|ph|ph1|ph2|ph3|li|li1|li2|li3|b|lit)$/;
/** Paragraph-level markers that mean "this is poetry". */
const POETRY_MARKERS = /^(q|q1|q2|q3|q4|qr|qc|qm|qm1|qm2|qd|li|li1|li2|li3)$/;
/** Paragraph markers that do not start a new paragraph. */
const NO_BREAK_MARKERS = /^(nb)$/;

/**
 * Removes notes and inline formatting so only readable words remain.
 * Exported so it can be unit tested on its own.
 */
export function stripInline(raw: string): string {
  let s = raw;
  // Footnotes (\f ... \f*), endnotes (\fe ... \fe*) and cross references (\x ... \x*).
  s = s.replace(/\\f\s.*?\\f\*/gs, ' ');
  s = s.replace(/\\fe\s.*?\\fe\*/gs, ' ');
  s = s.replace(/\\x\s.*?\\x\*/gs, ' ');
  // Word-level attributes: \w word|strong="H1234"\w*  ->  \w word\w*
  s = s.replace(/\|[^\\|]*?(?=\\\+?[a-z0-9]+\*)/g, '');
  // Opening and closing character markers (\add, \nd, \wj, \+w, \w*, \add* ...).
  s = s.replace(/\\\+?[a-z]+[0-9]?\*/g, '');
  s = s.replace(/\\\+?(w|add|nd|wj|tl|k|bk|qs|qac|it|bd|bdit|em|sc|no|sig|pn|png|addpn|ord|dc|rq|ior|lik|liv|litl)\s/g, '');
  // The KJV marks old paragraph breaks with a pilcrow.
  s = s.replace(/¶/g, ' ');
  return s;
}

/** Collapses whitespace and fixes stray spaces left behind by removed notes. */
export function tidy(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?’”)\]])/g, '$1')
    .replace(/([(\[“‘])\s+/g, '$1')
    .trim();
}

export function parseUsfm(source: string): ParsedBook {
  const cleaned = stripInline(source.replace(/\r\n?/g, '\n'));
  // Split into [marker, text] pairs. Everything between two paragraph-level
  // markers belongs to the first one.
  const tokens: { marker: string; text: string }[] = [];
  const re = /\\([a-z]+[0-9]*)(?:\s+|$)/g;
  let last: { marker: string; start: number } | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cleaned))) {
    if (last) tokens.push({ marker: last.marker, text: cleaned.slice(last.start, m.index) });
    last = { marker: m[1]!, start: re.lastIndex };
  }
  if (last) tokens.push({ marker: last.marker, text: cleaned.slice(last.start) });

  let usfm = '';
  const chapters: ParsedChapter[] = [];
  let chapter: ParsedChapter | null = null;
  let verse: Verse | null = null;
  // Paragraph markers seen since the last piece of real text.
  let pending: string[] = [];

  const appendText = (text: string) => {
    const t = tidy(text);
    if (!t) return;
    if (verse) {
      verse.text = verse.text ? `${verse.text} ${t}` : t;
      pending = [];
    }
    // Text before the first verse of a chapter (rare) is ignored.
  };

  for (const { marker, text } of tokens) {
    if (marker === 'id') {
      usfm = text.trim().split(/\s+/)[0] ?? '';
      continue;
    }
    if (marker === 'c') {
      const n = Number.parseInt(text, 10);
      if (!Number.isFinite(n)) throw new Error(`Bad chapter marker in ${usfm}: "${text}"`);
      chapter = { chapter: n, headings: [], verses: [] };
      chapters.push(chapter);
      verse = null;
      pending = [];
      continue;
    }
    if (!chapter) continue; // Book introduction material before chapter 1.

    if (marker === 'v') {
      const match = /^(\d+)(?:[-–](\d+))?[a-z]?\s*(.*)$/s.exec(text.trim());
      if (!match) throw new Error(`Bad verse marker in ${usfm} ${chapter.chapter}: "${text}"`);
      const v = Number.parseInt(match[1]!, 10);
      verse = { v, text: '' };
      if (pending.some((p) => POETRY_MARKERS.test(p))) verse.poetry = true;
      const breaks = pending.filter((p) => PARA_MARKERS.test(p) && !NO_BREAK_MARKERS.test(p));
      if (verse.poetry) {
        // In poetry every line has a \q marker, so only blank lines (\b) or
        // true paragraph markers count as a new stanza.
        if (breaks.some((p) => p === 'b' || /^(p|m|pi\d?|pmo|pc|mi)$/.test(p))) verse.para = true;
      } else if (breaks.length > 0) {
        verse.para = true;
      }
      chapter.verses.push(verse);
      pending = [];
      appendText(match[3] ?? '');
      continue;
    }
    if (HEADING_MARKERS.test(marker)) {
      const t = tidy(text);
      if (t) {
        const beforeVerse = (chapter.verses.at(-1)?.v ?? 0) + 1;
        chapter.headings.push({ beforeVerse, text: t });
      }
      verse = null; // Text after a heading always starts with a new verse.
      pending.push('p');
      continue;
    }
    if (marker === 'd') {
      const t = tidy(text);
      if (!t) continue;
      if (chapter.verses.length === 0) {
        chapter.superscription = chapter.superscription ? `${chapter.superscription} ${t}` : t;
      } else {
        // e.g. the musical note at the end of Habakkuk 3.
        appendText(t);
      }
      continue;
    }
    if (DROP_MARKERS.test(marker)) continue;
    if (PARA_MARKERS.test(marker) || POETRY_MARKERS.test(marker) || NO_BREAK_MARKERS.test(marker)) {
      pending.push(marker);
      appendText(text);
      continue;
    }
    // Unknown marker: keep its text so we never silently lose scripture.
    appendText(text);
  }

  return { usfm, chapters };
}
