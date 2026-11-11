/**
 * The Guide: type what's on your heart, and it points you to where to go.
 * Runs entirely in your browser with fixed rules (see src/lib/guide.ts);
 * nothing you type is sent anywhere or saved.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { guide, prepare, type GuideResult } from '~/lib/guide';
import type { ResolvedTopic } from '~/lib/guide-data';
import type { GuideSafety } from '~/lib/schemas';
import SafetyCard from './SafetyCard';
import TopicCard from './TopicCard';

interface Props {
  topics: ResolvedTopic[];
  safety: GuideSafety;
  categories: Record<string, string>;
  examples: string[];
}

type Entry =
  | { id: number; from: 'you'; text: string }
  | { id: number; from: 'guide'; result: GuideResult }
  | { id: number; from: 'topic'; topicId: string };

let nextId = 1;

export default function Guide({ topics, safety, categories, examples }: Props) {
  const prepared = useMemo(() => prepare(topics), [topics]);
  const byId = useMemo(() => new Map(topics.map((t) => [t.id, t])), [topics]);
  const [text, setText] = useState('');
  const [entries, setEntries] = useState<Entry[]>([]);
  /** True for a moment while the Guide "types" (purely for feel; matching is instant). */
  const [typing, setTyping] = useState(false);
  const lastRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const submit = (value: string) => {
    const q = value.trim();
    if (!q) return;
    const result = guide(q, prepared, safety);
    setText('');
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    // Safety answers never wait.
    if (reduced || result.safety.length) {
      setEntries((e) => [...e, { id: nextId++, from: 'you', text: q }, { id: nextId++, from: 'guide', result }]);
      return;
    }
    setEntries((e) => [...e, { id: nextId++, from: 'you', text: q }]);
    setTyping(true);
    window.setTimeout(() => {
      setTyping(false);
      setEntries((e) => [...e, { id: nextId++, from: 'guide', result }]);
    }, 650);
  };

  const showTopic = (topicId: string, label?: string) => {
    setEntries((e) => [
      ...e,
      ...(label ? [{ id: nextId++, from: 'you' as const, text: label }] : []),
      { id: nextId++, from: 'topic', topicId },
    ]);
  };

  // Allow arriving with ?q=... (from the home page box) or ?topic=...
  useEffect(() => {
    // Keep anything typed while the page was still loading.
    if (inputRef.current?.value) setText(inputRef.current.value);
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    const t = params.get('topic');
    if (q) submit(q);
    else if (t && byId.has(t)) showTopic(t);
  }, []);

  // Bring each new answer into view and move focus to its heading for screen readers.
  useEffect(() => {
    if (!entries.length) return;
    const el = lastRef.current;
    if (!el) return;
    if (entries[entries.length - 1]!.from === 'you') {
      // Your message is shown first; the answer follows after the typing dots.
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const answers = document.querySelectorAll<HTMLElement>('[data-entry]');
    answers[answers.length - 1]
      ?.querySelector<HTMLElement>('[data-topic-heading], h2, [data-focus]')
      ?.focus({ preventScroll: true });
  }, [entries.length]);

  const chip = (t: ResolvedTopic) => (
    <button
      key={t.id}
      type="button"
      class="press min-h-11 rounded-full border border-line bg-surface px-4 text-sm hover:border-accent hover:bg-accent-soft"
      onClick={() => showTopic(t.id, t.chip)}
    >
      {t.chip}
    </button>
  );

  const renderResult = (entry: Extract<Entry, { from: 'guide' }>) => {
    const { result } = entry;
    const safetyCards = result.safety.map((s) => (
      <SafetyCard key={s} title={safety[s].title} message={safety[s].message} resources={safety[s].resources} />
    ));
    // In a crisis, show help first and only gently offer a few topics.
    if (result.safety.includes('crisis')) {
      return (
        <div class="space-y-4">
          {safetyCards}
          <div class="card p-5">
            <p data-focus tabIndex={-1}>
              When you feel ready, these pages may help too:
            </p>
            <ul class="mt-3 flex flex-wrap gap-2">
              {['depression', 'hope', 'loneliness'].map((id) => (
                <li key={id}>
                  <button type="button" class="btn btn-secondary" onClick={() => showTopic(id, byId.get(id)?.chip)}>
                    {byId.get(id)?.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      );
    }
    if (result.kind === 'match') {
      const primary = byId.get(result.primary.id)!;
      const more = [...(result.also ? [result.also] : []), ...result.others].filter(
        (m) => byId.has(m.id) && !primary.followUp?.options.some((o) => o.topic === m.id),
      );
      return (
        <div class="space-y-4">
          {safetyCards}
          <TopicCard
            topic={primary}
            matched={result.primary.matched}
            careNote={safety.careNote}
            onChoose={(id) => showTopic(id, byId.get(id)?.chip)}
            headingLevel={2}
          />
          {more.length > 0 && (
            <div class="card p-4">
              <p class="text-sm text-ink-muted">You also mentioned:</p>
              <ul class="mt-1">
                {more.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      class="min-h-10 text-left text-accent underline-offset-4 hover:underline"
                      onClick={() => showTopic(m.id, byId.get(m.id)?.chip)}
                    >
                      {byId.get(m.id)!.title} ›
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }
    if (result.kind === 'clarify') {
      return (
        <div class="space-y-4">
          {safetyCards}
          <div class="card p-5">
            <p class="text-lg" data-focus tabIndex={-1}>
              I want to make sure I understand. Which of these is closest to what you mean?
            </p>
            <ul class="mt-3 flex flex-wrap gap-2">
              {result.options.map((o) => {
                const t = byId.get(o.id)!;
                return (
                  <li key={o.id}>
                    <button type="button" class="btn btn-secondary" onClick={() => showTopic(o.id, t.chip)}>
                      {t.title}
                    </button>
                  </li>
                );
              })}
              <li>
                <button
                  type="button"
                  class="btn btn-secondary"
                  onClick={() => {
                    const d = document.getElementById('guide-browse') as HTMLDetailsElement | null;
                    if (d) {
                      d.open = true;
                      d.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                >
                  Something else
                </button>
              </li>
            </ul>
          </div>
        </div>
      );
    }
    return (
      <div class="space-y-4">
        {safetyCards}
        <div class="card p-5">
          <p class="text-lg" data-focus tabIndex={-1}>
            I couldn’t quite match that to a topic. Could you say a little more about how you feel or what you’re
            facing? Or choose one of the topics below.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div>
      <form
        class="card p-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit(text);
        }}
      >
        <label for="guide-input" class="block text-lg font-medium">
          {entries.length ? 'Tell me more, or ask something else' : 'What’s on your heart today?'}
        </label>
        <p id="guide-hint" class="mt-1 text-sm text-ink-muted">
          Write in your own words, as much or as little as you like. Nothing you type leaves this device.
        </p>
        <textarea
          ref={inputRef}
          id="guide-input"
          name="q"
          rows={3}
          aria-describedby="guide-hint"
          class="mt-3 w-full rounded-xl border border-line bg-paper p-3 text-lg text-ink"
          placeholder="e.g. I’m grieving and God feels far away"
          value={text}
          onInput={(e) => setText((e.target as HTMLTextAreaElement).value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit(text);
            }
          }}
        />
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <button type="submit" class="btn btn-primary" disabled={!text.trim()}>
            Find guidance
          </button>
          {entries.length > 0 && (
            <button type="button" class="btn btn-secondary" onClick={() => setEntries([])}>
              Start over
            </button>
          )}
        </div>
        {entries.length === 0 && (
          <div class="mt-4">
            <p class="text-sm text-ink-muted">Or try one of these:</p>
            <ul class="mt-2 flex flex-wrap gap-2">
              {examples.slice(0, 3).map((ex) => (
                <li key={ex}>
                  <button
                    type="button"
                    class="press min-h-11 rounded-full bg-surface-2 px-4 text-left text-sm hover:bg-accent-soft"
                    onClick={() => submit(ex)}
                  >
                    “{ex}”
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </form>

      <div class="mt-6 space-y-4" aria-live="polite">
        {entries.map((entry, i) => {
          const isLast = i === entries.length - 1 || (entry.from === 'you' && i === entries.length - 2);
          if (entry.from === 'you') {
            return (
              <div key={entry.id} class="anchor-target bubble-in flex justify-end" ref={isLast ? lastRef : undefined}>
                <p class="max-w-[85%] rounded-2xl rounded-br-sm bg-accent-fill px-4 py-2 text-accent-ink">
                  <span class="sr-only">You: </span>
                  {entry.text}
                </p>
              </div>
            );
          }
          if (entry.from === 'topic') {
            const t = byId.get(entry.topicId);
            return t ? (
              <div key={entry.id} class="bubble-in" data-entry>
                <TopicCard
                  topic={t}
                  careNote={safety.careNote}
                  onChoose={(id) => showTopic(id, byId.get(id)?.chip)}
                  headingLevel={2}
                />
              </div>
            ) : null;
          }
          return (
            <div key={entry.id} class="bubble-in" data-entry>
              {renderResult(entry)}
            </div>
          );
        })}
        {typing && (
          <p class="bubble-in inline-flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-surface px-4 py-3 text-ink-muted shadow-[var(--shadow-surface)]">
            <span class="sr-only">Finding guidance…</span>
            <span class="typing-dot" aria-hidden="true" />
            <span class="typing-dot" aria-hidden="true" />
            <span class="typing-dot" aria-hidden="true" />
          </p>
        )}
      </div>

      <details id="guide-browse" class="card mt-10 p-4">
        <summary class="disclosure min-h-11 cursor-pointer text-lg font-semibold">Or browse all topics</summary>
        {Object.entries(categories).map(([cat, label]) => (
          <div key={cat} class="mt-4">
            <h3 class="text-sm font-semibold tracking-wide text-ink-muted uppercase">{label}</h3>
            <div class="mt-2 flex flex-wrap gap-2">{topics.filter((t) => t.category === cat).map(chip)}</div>
          </div>
        ))}
      </details>
    </div>
  );
}
