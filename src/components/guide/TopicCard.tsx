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
  return (
    <article class="card p-5" aria-label={topic.title}>
      <H class="font-serif text-2xl font-semibold" tabIndex={-1} data-topic-heading>
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
      <ul class="mt-2 space-y-2">
        {topic.passages.map((p) => (
          <li key={p.href + p.label}>
            <a
              href={url(p.href)}
              class="block rounded-xl border border-line bg-paper p-3 text-ink no-underline hover:border-accent"
            >
              <span class="font-semibold text-accent">{p.label}</span>
              <span class="mt-0.5 block text-sm">{p.why}</span>
              <span class="scripture mt-1 block text-[0.95rem] text-ink-muted">{p.excerpt}</span>
            </a>
          </li>
        ))}
      </ul>

      {topic.links.length > 0 && (
        <>
          <Sub class="mt-6 text-sm font-semibold tracking-wide text-ink-muted uppercase">Explore more</Sub>
          <ul class="mt-2 flex flex-wrap gap-2">
            {topic.links.map((l) => (
              <li key={l.href}>
                <a href={url(l.href)} class="btn btn-secondary text-sm">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </>
      )}

      {topic.followUp && (
        <div class="mt-6 border-t border-line pt-4">
          <p class="font-medium">{topic.followUp.question}</p>
          <ul class="mt-2 flex flex-wrap gap-2">
            {topic.followUp.options.map((o) => (
              <li key={o.topic}>
                {onChoose ? (
                  <button type="button" class="btn btn-secondary text-sm" onClick={() => onChoose(o.topic)}>
                    {o.label}
                  </button>
                ) : (
                  <a href={url(`/guide/${o.topic}`)} class="btn btn-secondary text-sm">
                    {o.label}
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
