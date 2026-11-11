/**
 * The interactive part of a chapter page (an Astro "island").
 *
 * The page is first sent as plain HTML showing the BSB text, so it is fast,
 * readable without JavaScript and visible to search engines. When this
 * component wakes up in the browser it reads your settings, switches to your
 * chosen level, and quietly preloads the other translation so moving the
 * slider never waits for the network.
 *
 * It also handles: tapping verses (highlight / note / copy / share),
 * "How traditions read this" notes, marking the chapter as read when you
 * reach the end, and swiping left/right to change chapter on phones.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { chapterAnnotations, setAnnotation, type Annotation, type HighlightColour } from '~/lib/annotations';
import { loadChapter, primeChapter } from '~/lib/bible-client';
import { LEVELS } from '~/lib/levels';
import type { Outline } from '~/lib/outline';
import { isRead, markRead, markUnread, recordLastRead } from '~/lib/progress';
import type { Chapter, PassageNotes, Simplified, TranslationId } from '~/lib/schemas';
import {
  getSettings,
  getStartLevel,
  rememberLevel,
  type Level,
  type ModernTranslation,
  type Settings,
} from '~/lib/settings';
import { CHANGE_EVENT } from '~/lib/storage';
import { url } from '~/lib/url';
import { omittedNote } from '~/lib/versification';
import LevelSlider from './LevelSlider';
import ScriptureText from './ScriptureText';
import TraditionsPanel from './TraditionsPanel';
import VerseActions from './VerseActions';

interface Props {
  bookId: string;
  bookName: string;
  chapter: number;
  /** BSB text, rendered on the server. */
  initial: Chapter;
  simplified?: Simplified;
  /** Used for Plain and Summary when no hand-written version exists yet. */
  outline?: Outline;
  passageNotes?: PassageNotes;
  traditionNames?: Record<string, string>;
  prevHref?: string;
  nextHref?: string;
  prevLabel?: string;
  nextLabel?: string;
}

type Texts = Partial<Record<TranslationId, Chapter>>;

const WORDS_PER_MINUTE = 200;
const countWords = (s: string) => s.split(/\s+/).filter(Boolean).length;

export default function ChapterReader({
  bookId,
  bookName,
  chapter,
  initial,
  simplified,
  outline,
  passageNotes,
  traditionNames = {},
  prevHref,
  nextHref,
  prevLabel,
  nextLabel,
}: Props) {
  // Start with exactly what the server rendered (Level 2, BSB, verse numbers
  // on). Settings are applied in useEffect, after the page is interactive.
  const [level, setLevel] = useState<Level>(2);
  const [settings, setSettings] = useState<Pick<Settings, 'modernTranslation' | 'verseNumbers'>>({
    modernTranslation: 'bsb',
    verseNumbers: true,
  });
  const [texts, setTexts] = useState<Texts>({ bsb: initial });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  /** Counts level changes the reader makes, so only those fade in (not the first load). */
  const [switches, setSwitches] = useState(0);
  const [annotations, setAnnotations] = useState<Record<number, Annotation>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [openNote, setOpenNote] = useState<string | null>(null);
  const [read, setRead] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const endRef = useRef<HTMLElement>(null);
  const toastTimer = useRef<number>();

  const refName = bookId === 'psalms' ? 'Psalm' : bookName;
  const available: Record<Level, boolean> = {
    1: true,
    2: true,
    3: !!(simplified || outline),
    4: !!(simplified || outline),
  };
  const translationFor = (l: Level, m: ModernTranslation): TranslationId | null =>
    l === 1 ? 'kjv' : l === 2 ? m : null;
  const modernText = texts[settings.modernTranslation] ?? initial;

  /** From the outline: go to Modern and scroll to a verse. */
  const jumpTo = (v: number) => {
    choose(2);
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        document.getElementById(`v${v}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      ),
    );
  };

  const ensure = async (t: TranslationId) => {
    try {
      const data = await loadChapter(t, bookId, chapter);
      setTexts((prev) => (prev[t] ? prev : { ...prev, [t]: data }));
      setError(null);
    } catch {
      setError('This translation could not be loaded. Check your connection and try again.');
    }
  };

  // On first load: apply settings and remember where the reader is.
  useEffect(() => {
    primeChapter('bsb', initial);
    const s = getSettings();
    setSettings({ modernTranslation: s.modernTranslation, verseNumbers: s.verseNumbers });
    let start = getStartLevel();
    if (!available[start]) start = 2;
    setLevel(start);
    recordLastRead(bookId, chapter);
    setAnnotations(chapterAnnotations(bookId, chapter));
    setRead(isRead(bookId, chapter));
    setHydrated(true);

    const onChange = () => {
      const next = getSettings();
      setSettings({ modernTranslation: next.modernTranslation, verseNumbers: next.verseNumbers });
      setAnnotations(chapterAnnotations(bookId, chapter));
    };
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
  }, []);

  // Load the text needed for the current level, then preload the others.
  useEffect(() => {
    const needed = translationFor(level, settings.modernTranslation);
    if (needed) void ensure(needed);
    // Wait until the browser is idle so preloading never slows the page down.
    const idle = (cb: () => void) =>
      typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback(cb) : setTimeout(cb, 300);
    idle(() => {
      void ensure('kjv');
      void ensure(settings.modernTranslation);
    });
  }, [level, settings.modernTranslation]);

  const showToast = (message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 7000);
  };

  // Mark as read automatically when the end of the chapter scrolls into view,
  // but only once the reader has actually scrolled (or spent 30s on the page),
  // so short chapters are not marked the instant they open.
  useEffect(() => {
    // A summary is not the chapter itself, so it never marks the chapter read on its own.
    if (!hydrated || read || level === 4 || !endRef.current || typeof IntersectionObserver === 'undefined') return;
    let engaged = false;
    const engage = () => (engaged = true);
    window.addEventListener('scroll', engage, { passive: true, once: true });
    const timer = window.setTimeout(engage, 30_000);
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && engaged) {
          markRead(bookId, chapter);
          setRead(true);
          showToast(`${refName} ${chapter} marked as read.`);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    observer.observe(endRef.current);
    // Re-check after the reader scrolls, in case the end was already visible.
    const recheck = () => {
      observer.unobserve(endRef.current!);
      observer.observe(endRef.current!);
    };
    window.addEventListener('scroll', recheck, { passive: true });
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
      window.removeEventListener('scroll', engage);
      window.removeEventListener('scroll', recheck);
    };
  }, [hydrated, read, level]);

  // Swipe left/right on phones to move between chapters.
  useEffect(() => {
    let start: { x: number; y: number; t: number } | null = null;
    const onStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (e.touches.length !== 1 || target.closest('input, textarea, [role="dialog"], svg[data-no-swipe]')) {
        start = null;
        return;
      }
      start = { x: e.touches[0]!.clientX, y: e.touches[0]!.clientY, t: Date.now() };
    };
    const onEnd = (e: TouchEvent) => {
      if (!start) return;
      const dx = e.changedTouches[0]!.clientX - start.x;
      const dy = e.changedTouches[0]!.clientY - start.y;
      const quick = Date.now() - start.t < 800;
      start = null;
      if (!quick || Math.abs(dx) < 90 || Math.abs(dy) > 60) return;
      if (window.getSelection()?.toString()) return;
      const href = dx < 0 ? nextHref : prevHref;
      if (href) window.location.href = href;
    };
    const area = document.getElementById('reader-swipe-area');
    area?.addEventListener('touchstart', onStart, { passive: true });
    area?.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      area?.removeEventListener('touchstart', onStart);
      area?.removeEventListener('touchend', onEnd);
    };
  }, [prevHref, nextHref]);

  const choose = (next: Level) => {
    if (!available[next]) {
      setNotice(`${LEVELS[next - 1]!.name} is coming soon for ${refName} ${chapter}.`);
      return;
    }
    setNotice(null);
    if (next !== level) setSwitches((n) => n + 1);
    setLevel(next);
    rememberLevel(next);
  };

  const toggleRead = () => {
    if (read) {
      markUnread(bookId, chapter);
      setRead(false);
      showToast(`${refName} ${chapter} marked as not read.`);
    } else {
      markRead(bookId, chapter);
      setRead(true);
      showToast(`${refName} ${chapter} marked as read.`);
    }
  };

  const description =
    level === 3 && !simplified
      ? 'Easy reading: the chapter in short sections with the verse numbers tucked away. A plain-English retelling is still being written.'
      : level === 4 && !simplified
        ? 'At a glance: where this chapter fits, what happens in it, and a question to think about.'
        : LEVELS[level - 1]!.describe(settings.modernTranslation);
  const translation = translationFor(level, settings.modernTranslation);
  const text = translation ? texts[translation] : undefined;
  const omitted = text?.omitted ?? [];

  const words =
    level === 3 && simplified
      ? simplified.plain.reduce((n, p) => n + countWords(p.text), 0)
      : level === 4 && simplified
        ? countWords(
            [simplified.summary.bigIdea, ...simplified.summary.points, simplified.summary.reflection].join(' '),
          )
        : level === 3 && outline
          ? modernText.verses.reduce((n, v) => n + countWords(v.text), 0)
          : level === 4 && outline
            ? 60
            : (text?.verses.reduce((n, v) => n + countWords(v.text), 0) ?? 0);
  const minutes = Math.max(1, Math.round(words / WORDS_PER_MINUTE));

  const noteMarkers = (passageNotes?.notes ?? []).map((n) => ({
    id: n.id,
    firstVerse: Number(n.verses.split('-')[0]),
    title: n.title,
  }));
  const activeNote = passageNotes?.notes.find((n) => n.id === openNote);
  const selectedVerse = selected !== null ? text?.verses.find((v) => v.v === selected) : undefined;

  return (
    <div>
      {/* The slider stays pinned at the top while you read (under the header
          when it shows, at the very top when it slides away). */}
      <div class="below-header sticky z-20 -mx-4 border-b border-black/5 bg-paper px-4 pt-1 pb-1.5 dark:border-white/5">
        <LevelSlider level={level} modern={settings.modernTranslation} available={available} onChange={choose} />
      </div>
      <p id="level-description" class="mt-3 text-sm text-ink-muted" aria-live="polite">
        <span key={notice ?? level} class="otis-fade block">
          {notice ?? description}
        </span>
      </p>

      <div id="reader-swipe-area" class="mt-4" aria-live="polite" aria-busy={translation && !text ? 'true' : 'false'}>
        <div key={switches} class={switches ? 'otis-fade' : undefined}>
          <p class="mb-3 flex items-center justify-between text-xs font-semibold tracking-wide text-ink-muted uppercase">
            <span>{text ? text.translation : LEVELS[level - 1]!.name}</span>
            <span class="font-normal normal-case">About {minutes} min read</span>
          </p>
          {translation && text && (
            <>
              <ScriptureText
                chapter={text}
                showVerseNumbers={settings.verseNumbers}
                annotations={annotations}
                noteMarkers={noteMarkers}
                selectedVerse={selected}
                // Always render verse buttons (so nothing shifts when the page becomes interactive).
                onVerse={(v) => hydrated && (setOpenNote(null), setSelected(v))}
                onNoteMarker={(id) => (setSelected(null), setOpenNote(id))}
              />
              {omitted.length > 0 && (
                <p class="mt-6 border-t border-line pt-3 text-sm text-ink-muted">
                  {omitted.length === 1 ? 'Verse' : 'Verses'} {omitted.join(', ')}:{' '}
                  {omittedNote(translation, bookId, chapter) ?? 'Not included in this translation.'}
                </p>
              )}
            </>
          )}
          {translation && !text && !error && <p class="text-ink-muted">Loading…</p>}
          {error && (
            <div class="card p-4" role="alert">
              <p>{error}</p>
              <button
                type="button"
                class="btn btn-secondary mt-3"
                onClick={() => translation && void ensure(translation)}
              >
                Try again
              </button>
            </div>
          )}
          {level === 3 && simplified && <PlainView simplified={simplified} />}
          {level === 4 && simplified && <SummaryView simplified={simplified} />}
          {level === 3 && !simplified && outline && <OutlinePlainView outline={outline} chapter={modernText} />}
          {level === 4 && !simplified && outline && <OutlineSummaryView outline={outline} onJump={jumpTo} />}
        </div>
      </div>

      {/* One tidy row at the end: previous chapter, mark as read, next chapter. */}
      <nav
        aria-label="Chapters"
        ref={endRef}
        class="mt-10 grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-t border-line pt-5"
      >
        {prevHref ? (
          <a href={prevHref} rel="prev" class="justify-self-start text-sm text-ink-muted no-underline hover:text-ink">
            <span aria-hidden="true">‹ </span>
            <span class="sr-only">Previous: </span>
            {prevLabel}
          </a>
        ) : (
          <span />
        )}
        <button
          type="button"
          class={`btn min-h-10 px-4 text-sm ${read ? 'btn-secondary' : 'btn-primary'}`}
          aria-pressed={read}
          onClick={toggleRead}
          disabled={!hydrated}
        >
          {read ? (
            <>
              <svg
                class="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.4"
                aria-hidden="true"
              >
                <path d="m5 12 5 5L20 7" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              Read
            </>
          ) : (
            'Mark as read'
          )}
        </button>
        {nextHref ? (
          <a
            href={nextHref}
            rel="next"
            class="justify-self-end text-sm font-medium text-ink no-underline hover:text-accent"
          >
            <span class="sr-only">Next: </span>
            {nextLabel}
            <span aria-hidden="true"> ›</span>
          </a>
        ) : (
          <span />
        )}
      </nav>

      {toast && (
        <div
          class="fixed inset-x-4 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md items-center justify-between gap-3 toast-in rounded-2xl bg-ink px-4 py-3 text-paper shadow-xl sm:bottom-6"
          role="status"
        >
          <span>{toast}</span>
          <button type="button" class="min-h-11 px-2 font-semibold underline" onClick={toggleRead}>
            Undo
          </button>
        </div>
      )}

      {selected !== null && selectedVerse && text && (
        <VerseActions
          reference={`${refName} ${chapter}:${selected}`}
          verseText={selectedVerse.text}
          translation={text.translation}
          shareUrl={new URL(url(`/bible/${bookId}/${chapter}#v${selected}`), window.location.origin).href}
          annotation={annotations[selected]}
          onHighlight={(colour: HighlightColour | null) => {
            setAnnotation(bookId, chapter, selected, { colour });
            setAnnotations(chapterAnnotations(bookId, chapter));
          }}
          onSaveNote={(note) => {
            setAnnotation(bookId, chapter, selected, { note });
            setAnnotations(chapterAnnotations(bookId, chapter));
          }}
          onClose={() => setSelected(null)}
        />
      )}
      {activeNote && (
        <TraditionsPanel
          note={activeNote}
          reference={`${refName} ${chapter}:${activeNote.verses.replace('-', '–')}`}
          traditionNames={traditionNames}
          onClose={() => setOpenNote(null)}
        />
      )}
    </div>
  );
}

function DraftNote({ simplified }: { simplified: Simplified }) {
  if (simplified.status !== 'draft') return null;
  return (
    <p class="mb-4 text-xs text-ink-muted italic">
      Draft, not yet reviewed. This retelling is a reading aid, not a translation.
    </p>
  );
}

function PlainView({ simplified }: { simplified: Simplified }) {
  return (
    <div>
      <DraftNote simplified={simplified} />
      <p class="mb-4 text-xs text-ink-muted">
        Words in quotation marks here are simplified retellings of what was said. For exact wording, switch to Original
        or Modern.
      </p>
      <div class="scripture space-y-5">
        {simplified.plain.map((p) => (
          <div key={p.verses}>
            <p class="mb-1 font-sans text-xs font-semibold text-ink-muted">Verses {p.verses.replace('-', '–')}</p>
            <p>{p.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryView({ simplified }: { simplified: Simplified }) {
  const { bigIdea, points, reflection } = simplified.summary;
  return (
    <div>
      <DraftNote simplified={simplified} />
      <div class="card space-y-5 p-5">
        <div>
          <h3 class="text-xs font-semibold tracking-wide text-ink-muted uppercase">The big idea</h3>
          <p class="scripture mt-1 font-medium">{bigIdea}</p>
        </div>
        <div>
          <h3 class="text-xs font-semibold tracking-wide text-ink-muted uppercase">Key points</h3>
          <ul class="mt-2 list-disc space-y-2 pl-5">
            {points.map((pt) => (
              <li key={pt}>{pt}</li>
            ))}
          </ul>
        </div>
        <div class="rounded-xl bg-accent-soft p-4">
          <h3 class="text-xs font-semibold tracking-wide text-ink-muted uppercase">To think about</h3>
          <p class="mt-1">{reflection}</p>
        </div>
      </div>
    </div>
  );
}

function OutlinePlainView({ outline, chapter }: { outline: Outline; chapter: Chapter }) {
  return (
    <div>
      <div class="scripture space-y-7">
        {outline.sections.map((s) => (
          <section key={s.from}>
            <h3 class="font-sans text-base font-semibold tracking-tight text-ink">{s.heading}</h3>
            <p class="mt-0.5 font-sans text-xs text-ink-muted">
              Verses {s.from}
              {s.to > s.from ? `–${s.to}` : ''}
            </p>
            <p class="mt-2">
              {chapter.verses
                .filter((v) => v.v >= s.from && v.v <= s.to)
                .map((v) => v.text)
                .join(' ')}
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}

function OutlineSummaryView({ outline, onJump }: { outline: Outline; onJump: (verse: number) => void }) {
  return (
    <div class="card space-y-5 p-5">
      {outline.bookIdea && (
        <div>
          <h3 class="text-xs font-semibold tracking-wide text-ink-muted uppercase">Where this fits</h3>
          <p class="mt-1">{outline.bookIdea}</p>
        </div>
      )}
      <div>
        <h3 class="text-xs font-semibold tracking-wide text-ink-muted uppercase">What happens</h3>
        <ol class="mt-2 space-y-1">
          {outline.sections.map((s, i) => (
            <li key={s.from}>
              <button
                type="button"
                class="press flex w-full items-baseline gap-3 rounded-xl px-2 py-2 text-left hover:bg-surface-2"
                onClick={() => onJump(s.from)}
              >
                <span class="w-5 shrink-0 text-sm text-ink-muted tabular-nums">{i + 1}</span>
                <span class="flex-1 font-medium">{s.heading}</span>
                <span class="shrink-0 text-xs text-ink-muted tabular-nums">
                  v{s.from}
                  {s.to > s.from ? `–${s.to}` : ''}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>
      <div class="rounded-xl bg-accent-soft p-4">
        <h3 class="text-xs font-semibold tracking-wide text-ink-muted uppercase">To think about</h3>
        <p class="mt-1">{outline.reflection}</p>
      </div>
    </div>
  );
}
