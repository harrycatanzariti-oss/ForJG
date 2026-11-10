/**
 * The Guide's matching engine. It reads what someone types ("I'm fearing
 * death", "I'm mourning and feel far from God") and works out which topics
 * fit, WITHOUT any AI. It is a transparent, rule-based scorer:
 *
 *  1. Normalise: lower-case, expand contractions ("can't" → "cannot"),
 *     strip punctuation.
 *  2. Stem: trim common endings so "fearing", "feared" and "fears" all
 *     become "fear".
 *  3. Score: every topic lists signal groups (words/phrases with a weight).
 *     A group scores once, using its best match. Phrases must match in order.
 *     Typos are forgiven for longer words ("greiving" → "grieving").
 *     Negation ("not afraid") counts against groups marked negatable.
 *     Some topics add a bonus when two groups appear together
 *     (e.g. "death" + "fear" → afraid of dying).
 *  4. Decide: a clear winner → answer it (plus a strong runner-up as
 *     "you also mentioned"). Several weak or close matches → ask which one
 *     was meant. Nothing → offer the topic list.
 *
 * Safety comes first: phrases suggesting self-harm or abuse always show
 * help resources before anything else.
 */

export interface Signal {
  terms: string[];
  weight: number;
  negatable?: boolean;
}

export interface MatchableTopic {
  id: string;
  signals: Signal[];
  combos?: { signals: number[]; bonus: number }[];
}

export interface SafetyRules {
  crisis: { phrases: string[]; negatedPhrases: string[] };
  abuse: { phrases: string[] };
}

export interface Scored {
  id: string;
  score: number;
  /** The words in the input that matched, for "Because you said..." */
  matched: string[];
}

export type GuideResult =
  | { kind: 'match'; primary: Scored; also?: Scored; safety: Safety[] }
  | { kind: 'clarify'; options: Scored[]; safety: Safety[] }
  | { kind: 'none'; safety: Safety[] };

export type Safety = 'crisis' | 'abuse';

const CONTRACTIONS: [RegExp, string][] = [
  [/\bcan'?t\b/g, 'cannot'],
  [/\bwon'?t\b/g, 'will not'],
  [/\bain'?t\b/g, 'am not'],
  [/\bi'?m\b/g, 'i am'],
  [/\bive\b/g, 'i have'],
  [/\bidk\b/g, 'i do not know'],
  [/\bdont\b/g, 'do not'],
  [/\bdoesnt\b/g, 'does not'],
  [/\bdidnt\b/g, 'did not'],
  [/\bisnt\b/g, 'is not'],
  [/\bwanna\b/g, 'want to'],
  [/\bgonna\b/g, 'going to'],
  [/n't\b/g, ' not'],
  [/'ve\b/g, ' have'],
  [/'re\b/g, ' are'],
  [/'ll\b/g, ' will'],
  [/'d\b/g, ' would'],
  [/'s\b/g, ''],
];

export function normalise(text: string): string {
  let s = text.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[’‘`]/g, "'");
  for (const [re, rep] of CONTRACTIONS) s = s.replace(re, rep);
  return s
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/'/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** A deliberately simple stemmer: good enough to match "fearing" with "fear". */
export function stem(word: string): string {
  let w = word;
  if (w.length <= 3) return w;
  if (w.endsWith('ies') && w.length > 4) return `${w.slice(0, -3)}y`;
  for (const suffix of ['ing', 'ed']) {
    if (w.endsWith(suffix) && w.length - suffix.length >= 3) {
      w = w.slice(0, -suffix.length);
      // running → run, stopped → stop
      if (/([b-df-hj-np-tv-z])\1$/.test(w) && !/(ll|ss|ff)$/.test(w)) w = w.slice(0, -1);
      return w;
    }
  }
  if (w.endsWith('ly') && w.length > 5) return w.slice(0, -2);
  if (w.endsWith('es') && /(sses|shes|ches|xes)$/.test(w)) return w.slice(0, -2);
  if (w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us') && !w.endsWith('is')) return w.slice(0, -1);
  return w;
}

const tokens = (text: string) => normalise(text).split(' ').filter(Boolean);

/** Optimal-string-alignment distance: insertions, deletions, substitutions and swaps cost 1. */
export function editDistance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0]![j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i]![j] = Math.min(d[i]![j]!, d[i - 2]![j - 2]! + 1);
      }
    }
  }
  return d[a.length]![b.length]!;
}

/** Everyday words that should never be "typo-corrected" into a keyword. */
const COMMON = new Set(
  'about after again also always another any anything around because been before being better between both bring brother called came cannot come could daily dear does doing done down each early even ever every everyone everything family feel feeling feels find first friend from gave getting give going good great happen hard have having hear heard help here home house however just keep kind know knowing later learn leave left life like little live long look looking made make many maybe mean might more morning most much myself need never next night nothing now often once only other over people place please really right said same seem should since some something sometimes still such sure take tell than thank that them then there these they thing things think this those though thought through time today told together tomorrow tried trying under until very want wanted week well were what when where which while whole will wish with without word words work world would year years yesterday young your yours near hear dear year here wear bear fair pair care core more sore dark park mark word ward warm worn form from'.split(
    ' ',
  ),
);

const NEGATORS = new Set(['not', 'no', 'never', 'without', 'nor']);

interface PreparedTerm {
  raw: string[];
  stems: string[];
}

interface PreparedSignal extends Signal {
  prepared: PreparedTerm[];
}

interface PreparedTopic {
  id: string;
  signals: PreparedSignal[];
  combos: { signals: number[]; bonus: number }[];
}

const prepareTerm = (term: string): PreparedTerm => {
  const raw = tokens(term);
  return { raw, stems: raw.map(stem) };
};

export function prepare(topics: MatchableTopic[]): PreparedTopic[] {
  return topics.map((t) => ({
    id: t.id,
    combos: t.combos ?? [],
    signals: t.signals.map((s) => ({ ...s, prepared: s.terms.map(prepareTerm) })),
  }));
}

function vocabulary(prepared: PreparedTopic[]): Set<string> {
  const v = new Set<string>();
  for (const t of prepared) for (const s of t.signals) for (const p of s.prepared) for (const w of p.raw) v.add(w);
  return v;
}

interface Hit {
  weight: number;
  index: number;
  words: string[];
}

/** Finds the best match for one signal group in the input. */
function matchSignal(signal: PreparedSignal, raw: string[], stems: string[], vocab: Set<string>): Hit | null {
  let best: Hit | null = null;
  for (const term of signal.prepared) {
    const n = term.stems.length;
    for (let i = 0; i + n <= stems.length; i++) {
      let factor = 1;
      let ok = true;
      for (let k = 0; k < n; k++) {
        if (stems[i + k] === term.stems[k]) continue;
        // Forgive typos in longer, unfamiliar words only.
        const word = raw[i + k]!;
        const target = term.raw[k]!;
        const allowed = word.length >= 8 ? 2 : word.length >= 5 ? 1 : 0;
        if (allowed > 0 && !COMMON.has(word) && !vocab.has(word) && editDistance(word, target, allowed) <= allowed) {
          factor = Math.min(factor, 0.7);
          continue;
        }
        ok = false;
        break;
      }
      if (!ok) continue;
      // Longer phrases are more specific, so slightly favour them.
      const weight = signal.weight * factor * (n > 1 ? 1.1 : 1);
      if (!best || weight > best.weight) best = { weight, index: i, words: raw.slice(i, i + n) };
    }
  }
  return best;
}

function isNegated(raw: string[], index: number): boolean {
  for (let k = Math.max(0, index - 3); k < index; k++) if (NEGATORS.has(raw[k]!)) return true;
  return false;
}

export function scoreTopics(input: string, prepared: PreparedTopic[], vocab = vocabulary(prepared)): Scored[] {
  const raw = tokens(input);
  const stems = raw.map(stem);
  const out: Scored[] = [];
  for (const topic of prepared) {
    let score = 0;
    const matched: string[] = [];
    const positive = new Set<number>();
    topic.signals.forEach((signal, i) => {
      const hit = matchSignal(signal, raw, stems, vocab);
      if (!hit) return;
      if (signal.negatable && isNegated(raw, hit.index)) {
        score -= hit.weight * 0.5;
        return;
      }
      score += hit.weight;
      positive.add(i);
      matched.push(hit.words.join(' '));
    });
    for (const combo of topic.combos) {
      if (combo.signals.every((i) => positive.has(i))) score += combo.bonus;
    }
    if (score > 0) out.push({ id: topic.id, score: Math.round(score * 100) / 100, matched: [...new Set(matched)] });
  }
  return out.sort((a, b) => b.score - a.score);
}

export function detectSafety(input: string, rules: SafetyRules): Safety[] {
  const text = ` ${normalise(input)} `;
  const has = (p: string) => text.includes(` ${normalise(p)} `);
  const found: Safety[] = [];
  const negated = rules.crisis.negatedPhrases.some(has);
  const crisisHits = rules.crisis.phrases.filter(has);
  // "I don't want to die" is fear, not crisis, unless something else signals danger.
  const realCrisis = crisisHits.filter((p) => !(negated && normalise(p) === 'want to die'));
  if (realCrisis.length) found.push('crisis');
  if (rules.abuse.phrases.some(has)) found.push('abuse');
  return found;
}

/** Thresholds, exported so tests document them. */
export const STRONG = 3;
export const WEAK = 1.5;

export function guide(input: string, prepared: PreparedTopic[], rules: SafetyRules, vocab?: Set<string>): GuideResult {
  const safety = detectSafety(input, rules);
  const scored = scoreTopics(input, prepared, vocab);
  const top = scored[0];
  if (!top) return { kind: 'none', safety };

  if (top.score >= STRONG) {
    const close = scored.filter((s) => s !== top && s.score >= top.score * 0.85);
    // Two or more equally strong but unrelated readings → ask, unless both are clearly strong.
    const also = scored.find((s) => s !== top && s.score >= Math.max(STRONG, top.score * 0.5));
    if (close.length >= 2 && top.score < STRONG * 1.5) {
      return { kind: 'clarify', options: [top, ...close].slice(0, 3), safety };
    }
    return { kind: 'match', primary: top, also, safety };
  }
  if (top.score >= WEAK) {
    const close = scored.filter((s) => s !== top && s.score >= top.score * 0.75);
    if (close.length === 0) return { kind: 'match', primary: top, safety };
    return { kind: 'clarify', options: [top, ...close].slice(0, 3), safety };
  }
  return { kind: 'clarify', options: scored.slice(0, 3), safety };
}
