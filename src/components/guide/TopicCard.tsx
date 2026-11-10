/**
 * One Guide answer: a short, kind message, a gentle next step, Bible
 * passages (with an excerpt) and where to go next. Rendered on the server
 * for /guide/{topic} pages and inside the interactive Guide.
 */
import type { ResolvedTopic } from '~/lib/guide-data';
import { url } from '~/lib/url';

interface Props {
  topic: ResolvedTopic;
  /** Words from the visitor's message that led here. */
  matched?: string[];
  careNote?: string;
  /** When given, follow-up options continue the conversation instead of linking. */
  onChoose?: (topicId: string) => void;
  headingLevel?: 2 | 3;
}

export default function TopicCard({ topic, matched, careNote, onChoose, headingLevel = 2 }: Props) {
  const H = headingLevel === 2 ? 'h2' : 'h3';
  const Sub = headingLevel === 2 ? 'h3' : 'h4';
  const passage = (p: ResolvedTopic['passages'][number]) => (
    <li key={p.href + p.label}>
      <a href={url(p.href)} class="block rounded-xl bg-surface-2 p-3 text-ink no-underline hover:bg-accent-soft">
        <span class="font-semibold text-accent">{p.label}</span>
        <span class="mt-0.5 block text-sm">{p.why}</span>
        <span class="scripture mt-1 block text-[0.95rem] text-ink-muted">{p.excerpt}</span>
      </a>
    </li>
  );
  return (
    <article class="card p-5" aria-label={topic.title}>
      <H class="text-2xl font-semibold tracking-tight" tabIndex={-1} data-topic-heading>
        {topic.title}
      </H>
      {matched && matched.length > 0 && (
        <p class="mt-1 text-xs text-ink-muted">Because you mentioned: {matched.map((m) => `“${m}”`).join(', ')}</p>
      )}
      <p class="mt-3 text-lg leading-relaxed">{topic.message}</p>

      <div class="mt-4 rounded-xl bg-accent-soft p-4">
        <p class="text-xs font-semibold tracking-wide text-ink-muted uppercase">A gentle next step</p>
        <p class="mt-1">{topic.step}</p>
      </div>

      <Sub class="mt-6 text-sm font-semibold tracking-wide text-ink-muted uppercase">Passages to read</Sub>
      <ul class="mt-2 space-y-2">{topic.passages.slice(0, 3).map(passage)}</ul>
      {topic.passages.length > 3 && (
        <details class="mt-2">
          <summary class="cursor-pointer py-2 text-sm text-accent">
            {topic.passages.length - 3} more {topic.passages.length - 3 === 1 ? 'passage' : 'passages'}
          </summary>
          <ul class="mt-1 space-y-2">{topic.passages.slice(3).map(passage)}</ul>
        </details>
      )}

      {topic.links.length > 0 && (
        <p class="mt-5 text-sm">
          <span class="text-ink-muted">Explore more: </span>
          {topic.links.map((l, i) => (
            <span key={l.href}>
              {i > 0 && <span class="text-ink-muted"> · </span>}
              <a href={url(l.href)}>{l.label}</a>
            </span>
          ))}
        </p>
      )}

      {topic.followUp && (
        <div class="mt-5 border-t border-line pt-4">
          <p class="font-medium">{topic.followUp.question}</p>
          <ul class="mt-1">
            {topic.followUp.options.map((o) => (
              <li key={o.topic}>
                {onChoose ? (
                  <button
                    type="button"
                    class="min-h-10 text-left text-accent underline-offset-4 hover:underline"
                    onClick={() => onChoose(o.topic)}
                  >
                    {o.label} ›
                  </button>
                ) : (
                  <a href={url(`/guide/${o.topic}`)} class="inline-flex min-h-10 items-center">
                    {o.label} ›
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {topic.care && careNote && <p class="mt-5 text-sm text-ink-muted">{careNote}</p>}
    </article>
  );
}
