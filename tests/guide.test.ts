import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { detectSafety, editDistance, guide, normalise, prepare, stem } from '../src/lib/guide.ts';

const topics = JSON.parse(readFileSync('src/data/guide/topics.json', 'utf8'));
const safety = JSON.parse(readFileSync('src/data/guide/safety.json', 'utf8'));
const prepared = prepare(topics);
const ask = (q: string) => guide(q, prepared, safety);
const primary = (q: string) => {
  const r = ask(q);
  return r.kind === 'match'
    ? r.primary.id
    : `${r.kind}:${r.kind === 'clarify' ? r.options.map((o) => o.id).join(',') : ''}`;
};

describe('text handling', () => {
  it('expands contractions and strips punctuation', () => {
    expect(normalise("I'm scared, I can't sleep & don't know why!")).toBe('i am scared i cannot sleep do not know why');
  });
  it('stems word endings', () => {
    expect(['fearing', 'feared', 'fears'].map(stem)).toEqual(['fear', 'fear', 'fear']);
    expect(stem('worried')).toBe('worri');
    expect(stem('running')).toBe('run');
  });
  it('measures typos including swapped letters', () => {
    expect(editDistance('greiving', 'grieving')).toBe(1);
    expect(editDistance('lonley', 'lonely')).toBe(1);
  });
});

describe('the examples from the brief', () => {
  it('"I\'m fearing death" → afraid of dying', () => {
    expect(primary("I'm fearing death")).toBe('fear-of-death');
  });
  it('"I can\'t understand death" → understanding death (not fear)', () => {
    expect(primary("I can't understand death")).toBe('understanding-death');
  });
  it('"I\'m mourning and I just feel like I\'ve lost connection to god" → grief, and also far from God', () => {
    const r = ask("I'm mourning and I just feel like I've lost connection to god");
    expect(r.kind).toBe('match');
    if (r.kind !== 'match') return;
    expect(r.primary.id).toBe('grief');
    expect(r.also?.id).toBe('far-from-god');
  });
  it('"I feel like warm" is ambiguous, so it asks (lukewarm? like a worm? warmly thankful?)', () => {
    const r = ask('I feel like warm');
    expect(r.kind).toBe('clarify');
    if (r.kind !== 'clarify') return;
    expect(r.options.map((o) => o.id).sort()).toEqual(['gratitude', 'self-worth', 'spiritual-dryness']);
  });
  it('"I know nothing about god. Whew first" → new to faith', () => {
    expect(primary('I know nothing about god. Whew first')).toBe('new-to-faith');
  });
});

describe('more phrasing', () => {
  it.each([
    ['I feel lukewarm about my faith', 'spiritual-dryness'],
    ['i feel like a worm', 'self-worth'],
    ['so anxous about everything', 'anxiety'],
    ['my dad passed away last week', 'grief'],
    ['greiving my mum', 'grief'],
    ['I feel so lonley', 'loneliness'],
    ['what happens when we die', 'understanding-death'],
    ['how do i pray', 'prayer'],
    ['which church should I go to', 'choosing-church'],
    ['Is God even real?', 'doubt'],
    ['I lost my job and cannot pay rent', 'money'],
    ['I just got diagnosed with cancer', 'illness'],
    ['why does god allow suffering', 'suffering'],
    ['I feel guilty about what I did', 'guilt'],
    ['completely burnt out', 'tired'],
    ['who is jesus', 'who-is-jesus'],
    ['does God love me', 'gods-love'],
    ['so thankful today', 'gratitude'],
  ])('%s → %s', (q, id) => {
    expect(primary(q)).toBe(id);
  });

  it('"not afraid" counts against fear', () => {
    expect(primary("I'm not afraid of death, I just don't understand it")).toBe('understanding-death');
  });

  it('gives up gracefully on unrelated text', () => {
    expect(ask('banana spaceship').kind).toBe('none');
  });
});

describe('safety', () => {
  it('detects crisis language', () => {
    expect(detectSafety('I want to die', safety)).toEqual(['crisis']);
    expect(detectSafety("i don't want to live anymore", safety)).toEqual(['crisis']);
    expect(detectSafety('thinking about suicide', safety)).toEqual(['crisis']);
  });
  it('does not treat fear of dying as crisis', () => {
    expect(detectSafety("I'm scared, I don't want to die", safety)).toEqual([]);
    expect(primary("I'm scared, I don't want to die")).toBe('fear-of-death');
  });
  it('detects abuse', () => {
    expect(detectSafety('my husband hits me', safety)).toEqual(['abuse']);
  });
});

describe('topic data', () => {
  it('has unique ids and valid follow-ups', () => {
    const ids = new Set(topics.map((t: { id: string }) => t.id));
    expect(ids.size).toBe(topics.length);
    for (const t of topics) {
      for (const o of t.followUp?.options ?? []) expect(ids.has(o.topic), `${t.id} → ${o.topic}`).toBe(true);
      for (const r of t.related) expect(ids.has(r), `${t.id} related ${r}`).toBe(true);
    }
  });
});
