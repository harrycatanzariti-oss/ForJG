/**
 * Belief Explorer: one question at a time, review and change answers,
 * then see the closest traditions. Answers are saved in this browser only.
 */
import { useEffect, useState } from 'preact/hooks';
import { scoreQuiz, type Answers } from '~/lib/quiz';
import type { QuizQuestion } from '~/lib/schemas';
import { read, remove, write } from '~/lib/storage';
import { url } from '~/lib/url';

interface Props {
  questions: QuizQuestion[];
  traditions: { id: string; name: string; shortName: string; otherGroup: boolean; family: string }[];
}

const KEY = 'quiz:answers';
type Stage = 'intro' | 'question' | 'review' | 'results';

export default function Quiz({ questions, traditions }: Props) {
  const [answers, setAnswers] = useState<Answers>({});
  const [stage, setStage] = useState<Stage>('intro');
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const saved = read<Answers>(KEY, {});
    if (saved && typeof saved === 'object' && Object.keys(saved).length) {
      setAnswers(saved);
      setStage(Object.keys(saved).length >= questions.length ? 'results' : 'intro');
    }
  }, []);

  useEffect(() => {
    document.getElementById('quiz-heading')?.focus();
  }, [stage, index]);

  const answer = (qid: string, oid: string) => {
    const next = { ...answers, [qid]: oid };
    setAnswers(next);
    write(KEY, next);
    if (stage === 'question') {
      if (index < questions.length - 1) setIndex(index + 1);
      else setStage('review');
    }
  };

  const restart = () => {
    setAnswers({});
    remove(KEY);
    setIndex(0);
    setStage('question');
  };

  const answered = questions.filter((q) => answers[q.id]).length;
  const byId = new Map(traditions.map((t) => [t.id, t]));

  if (stage === 'intro') {
    return (
      <div class="card p-5">
        <h2 id="quiz-heading" tabIndex={-1} class="text-xl font-semibold">
          How it works
        </h2>
        <ul class="mt-3 list-disc space-y-1 pl-5 text-ink-muted">
          <li>{questions.length} questions on topics where Christian traditions differ.</li>
          <li>Pick the answer closest to what you think, or skip any question.</li>
          <li>You’ll see the traditions whose teaching is closest to your answers, and why.</li>
          <li>This is a starting point for exploring, not a verdict on what you should believe.</li>
        </ul>
        <div class="mt-4 flex flex-wrap gap-2">
          <button type="button" class="btn btn-primary" onClick={() => setStage('question')}>
            {answered ? 'Continue' : 'Start'}
          </button>
          {answered > 0 && (
            <button type="button" class="btn btn-secondary" onClick={restart}>
              Start again
            </button>
          )}
        </div>
      </div>
    );
  }

  if (stage === 'question') {
    const q = questions[index]!;
    return (
      <div>
        <div class="flex items-center justify-between text-sm text-ink-muted">
          <span>
            Question {index + 1} of {questions.length}
          </span>
          <button type="button" class="min-h-11 underline" onClick={() => setStage('review')}>
            Review answers
          </button>
        </div>
        <div class="mt-2 h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
          <div class="h-full bg-accent-fill" style={{ width: `${((index + 1) / questions.length) * 100}%` }} />
        </div>
        <fieldset class="card mt-4 p-5">
          <legend class="sr-only">{q.question}</legend>
          <h2 id="quiz-heading" tabIndex={-1} class="text-2xl font-semibold tracking-tight">
            {q.question}
          </h2>
          {q.help && <p class="mt-1 text-sm text-ink-muted">{q.help}</p>}
          <div class="mt-4 space-y-2">
            {q.options.map((o) => (
              <label
                key={o.id}
                class="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-line p-3 has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-focus"
              >
                <input
                  type="radio"
                  name={q.id}
                  value={o.id}
                  checked={answers[q.id] === o.id}
                  onChange={() => answer(q.id, o.id)}
                  class="size-5 shrink-0 accent-[var(--accent)]"
                />
                <span>{o.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div class="mt-4 flex flex-wrap justify-between gap-2">
          <button type="button" class="btn btn-secondary" disabled={index === 0} onClick={() => setIndex(index - 1)}>
            Back
          </button>
          <button type="button" class="btn btn-secondary" onClick={() => answer(q.id, 'skip')}>
            Not sure, skip
          </button>
        </div>
      </div>
    );
  }

  if (stage === 'review') {
    return (
      <div>
        <h2 id="quiz-heading" tabIndex={-1} class="text-xl font-semibold">
          Review your answers
        </h2>
        <p class="mt-1 text-sm text-ink-muted">Change any answer, then see your results.</p>
        <ol class="mt-4 space-y-3">
          {questions.map((q, i) => {
            const o = q.options.find((x) => x.id === answers[q.id]);
            return (
              <li key={q.id} class="card flex items-start justify-between gap-3 p-4">
                <span>
                  <span class="block text-sm font-semibold">{q.question}</span>
                  <span class="mt-1 block text-ink-muted">
                    {o ? o.label : answers[q.id] === 'skip' ? 'Skipped' : 'Not answered'}
                  </span>
                </span>
                <button
                  type="button"
                  class="btn btn-secondary shrink-0 px-3 text-sm"
                  onClick={() => {
                    setIndex(i);
                    setStage('question');
                  }}
                  aria-label={`Change answer to: ${q.question}`}
                >
                  Change
                </button>
              </li>
            );
          })}
        </ol>
        <button type="button" class="btn btn-primary mt-4" onClick={() => setStage('results')}>
          See my results
        </button>
      </div>
    );
  }

  const results = scoreQuiz(
    questions,
    answers,
    traditions.map((t) => t.id),
  );
  const top = results.slice(0, 3);
  const compareHref = `/traditions/compare?${top.map((r, i) => `${'abc'[i]}=${r.id}`).join('&')}`;
  return (
    <div>
      <h2 id="quiz-heading" tabIndex={-1} class="text-xl font-semibold">
        Your closest traditions
      </h2>
      <p class="mt-1 text-ink-muted">
        Based on {answered - questions.filter((q) => answers[q.id] === 'skip').length} answers. This shows which
        traditions’ official teaching is closest to your answers. It is a starting point for exploring, not a verdict,
        and real churches vary.
      </p>
      {top.length === 0 ? (
        <p class="mt-4">Answer a few questions to see results.</p>
      ) : (
        <ol class="mt-4 space-y-3">
          {top.map((r, i) => {
            const t = byId.get(r.id)!;
            return (
              <li key={r.id} class="card border-l-4 p-5" style={{ borderLeftColor: `var(--f-${t.family})` }}>
                <div class="flex items-baseline justify-between gap-2">
                  <h3 class="text-xl font-semibold tracking-tight">
                    {i + 1}. {t.name}
                  </h3>
                  <span class="text-lg font-semibold text-accent">{r.percent}%</span>
                </div>
                {t.otherGroup && (
                  <p class="mt-1 text-xs text-ink-muted">
                    Listed under “Other groups with Christian roots” (outside historic Trinitarian Christianity).
                  </p>
                )}
                {r.reasons.length > 0 && (
                  <>
                    <p class="mt-2 text-sm font-semibold">Why</p>
                    <ul class="mt-1 list-disc space-y-1 pl-5 text-sm text-ink-muted">
                      {r.reasons.map((x) => (
                        <li key={x.question}>
                          {x.question} You chose: “{x.answer}”
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <a href={url(`/traditions/${r.id}`)} class="btn btn-secondary mt-3 text-sm">
                  Read the {t.shortName} profile
                </a>
              </li>
            );
          })}
        </ol>
      )}
      <details class="mt-4">
        <summary class="min-h-11 cursor-pointer py-2 text-accent">See all traditions</summary>
        <ul class="mt-2 space-y-1 text-sm">
          {results.map((r) => (
            <li key={r.id} class="flex justify-between border-b border-line py-1">
              <a href={url(`/traditions/${r.id}`)}>{byId.get(r.id)!.shortName}</a>
              <span>{r.percent}%</span>
            </li>
          ))}
        </ul>
      </details>
      <div class="mt-6 flex flex-wrap gap-2">
        {top.length >= 2 && (
          <a href={url(compareHref)} class="btn btn-primary">
            Compare your top matches
          </a>
        )}
        <button type="button" class="btn btn-secondary" onClick={() => setStage('review')}>
          Review or change answers
        </button>
        <button type="button" class="btn btn-secondary" onClick={restart}>
          Start again
        </button>
      </div>
    </div>
  );
}
