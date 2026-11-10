/**
 * Build-time access to Bible data. Used by .astro pages while the site is
 * being generated; none of this ships to the browser unless a page passes
 * a specific chapter to an island as a prop.
 */
import booksJson from '~/data/books.json';
import translationsJson from '~/data/bible/translations.json';
import {
  booksSchema,
  chapterSchema,
  simplifiedSchema,
  bookIntroSchema,
  type BookIntro,
  translationInfoSchema,
  type Book,
  type Chapter,
  type Simplified,
  type TranslationId,
} from './schemas';

export const books: Book[] = booksSchema.parse(booksJson);
export const translations = translationInfoSchema.parse(translationsJson);

// import.meta.glob is a Vite feature: it finds files matching a pattern at
// build time. `eager: true` loads them all up front (fine at build time).
const chapterFiles = import.meta.glob<unknown>('/src/data/bible/*/*/*.json', { eager: true, import: 'default' });
const simplifiedFiles = import.meta.glob<unknown>('/src/data/simplified/*/*.json', {
  eager: true,
  import: 'default',
});

const introFiles = import.meta.glob<unknown>('/src/data/book-intros/*.json', { eager: true, import: 'default' });

export function getIntro(bookId: string): BookIntro | undefined {
  const raw = introFiles[`/src/data/book-intros/${bookId}.json`];
  return raw ? bookIntroSchema.parse(raw) : undefined;
}

export function getBook(id: string): Book | undefined {
  return books.find((b) => b.id === id);
}

export function getChapter(translation: TranslationId, bookId: string, chapter: number): Chapter {
  const key = `/src/data/bible/${translation}/${bookId}/${chapter}.json`;
  const raw = chapterFiles[key];
  if (!raw) throw new Error(`Missing chapter file ${key}`);
  return chapterSchema.parse(raw);
}

export function getSimplified(bookId: string, chapter: number): Simplified | undefined {
  const raw = simplifiedFiles[`/src/data/simplified/${bookId}/${chapter}.json`];
  return raw ? simplifiedSchema.parse(raw) : undefined;
}

/** Every chapter file, for generating the JSON endpoints. */
export function allChapterFiles(): { translation: string; book: string; chapter: string; data: unknown }[] {
  return Object.entries(chapterFiles).map(([path, data]) => {
    const [translation, book, file] = path.split('/').slice(-3) as [string, string, string];
    return { translation, book, chapter: file.replace(/\.json$/, ''), data };
  });
}

export interface ChapterRef {
  book: Book;
  chapter: number;
}

/** The chapter before/after, crossing book boundaries. */
export function neighbours(bookId: string, chapter: number): { prev?: ChapterRef; next?: ChapterRef } {
  const i = books.findIndex((b) => b.id === bookId);
  const book = books[i]!;
  const prevBook = books[i - 1];
  const nextBook = books[i + 1];
  const prev =
    chapter > 1
      ? { book, chapter: chapter - 1 }
      : prevBook
        ? { book: prevBook, chapter: prevBook.chapters }
        : undefined;
  const next =
    chapter < book.chapters ? { book, chapter: chapter + 1 } : nextBook ? { book: nextBook, chapter: 1 } : undefined;
  return { prev, next };
}

export const GENRE_LABELS: Record<Book['genre'], string> = {
  law: 'Law',
  history: 'History',
  wisdom: 'Wisdom & Poetry',
  prophets: 'Prophets',
  gospels: 'Gospels',
  acts: 'Acts',
  letters: 'Letters',
  apocalyptic: 'Apocalyptic',
};
