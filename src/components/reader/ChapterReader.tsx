/**
 * The interactive part of a chapter page (an Astro "island").
 *
 * The page is first sent as plain HTML showing the BSB text, so it is fast,
 * readable without JavaScript and visible to search engines. When this
 * component wakes up in the browser it reads your settings, switches to your
 * chosen level, and quietly preloads the other translation so moving the
 * slider never waits for the network.
 */
import { useEffect, useState } from 'preact/hooks';
import { loadChapter, primeChapter } from '~/lib/bible-client';
import { LEVELS } from '~/lib/levels';
import { recordLastRead } from '~/lib/progress';
import type { Chapter, Simplified, TranslationId } from '~/lib/schemas';
import {
  getSettings,
  getStartLevel,
  rememberLevel,
  type Level,
  type ModernTranslation,
  type Settings,
} from '~/lib/settings';
import { CHANGE_EVENT } from '~/lib/storage';
import { omittedNote } from '~/lib/versification';
import LevelSlider from './LevelSlider';
import ScriptureText from './ScriptureText';

interface Props {
  bookId: string;
  bookName: string;
  chapter: number;
  /** BSB text, rendered on the server. */
  initial: Chapter;
  simplified?: Simplified;
}

type Texts = Partial<Record<TranslationId, Chapter>>;

export default function ChapterReader({ bookId, bookName, chapter, initial, simplified }: Props) {
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

  const available: Record<Level, boolean> = { 1: true, 2: true, 3: !!simplified, 4: !!simplified };
  const translationFor = (l: Level, m: ModernTranslation): TranslationId | null =>
    l === 1 ? 'kjv' : l === 2 ? m : null;

  const ensure = async (t: TranslationId) => {
    if (texts[t]) return;
    try {
      const data = await loadChapter(t, bookId, chapter);
      setTexts((prev) => ({ ...prev, [t]: data }));
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

    const onChange = () => {
      const next = getSettings();
      setSettings({ modernTranslation: next.modernTranslation, verseNumbers: next.verseNumbers });
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

  const choose = (next: Level) => {
    if (!available[next]) {
      setNotice(`${LEVELS[next - 1]!.name} is coming soon for ${bookName} ${chapter}.`);
      return;
    }
    setNotice(null);
    setLevel(next);
    rememberLevel(next);
  };

  const translation = translationFor(level, settings.modernTranslation);
  const text = translation ? texts[translation] : undefined;
  const omitted = text?.omitted ?? [];

  return (
    <div>
      <div class="border-b border-line pb-3">
        <LevelSlider level={level} modern={settings.modernTranslation} available={available} onChange={choose} />
        {notice && (
          <p class="mt-1 text-sm text-ink-muted" role="status">
            {notice}
          </p>
        )}
      </div>

      <div class="mt-6" aria-live="polite" aria-busy={translation && !text ? 'true' : 'false'}>
        {translation && text && (
          <>
            <p class="mb-3 text-xs font-semibold tracking-wide text-ink-muted uppercase">{text.translation}</p>
            <ScriptureText chapter={text} showVerseNumbers={settings.verseNumbers} />
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
      </div>
    </div>
  );
}

function DraftNote({ simplified }: { simplified: Simplified }) {
  if (simplified.status !== 'draft') return null;
  return <p class="mb-4 text-xs text-ink-muted italic">Draft, not yet reviewed.</p>;
}

function PlainView({ simplified }: { simplified: Simplified }) {
  return (
    <div>
      <DraftNote simplified={simplified} />
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
