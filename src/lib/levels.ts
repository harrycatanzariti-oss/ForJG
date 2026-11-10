/** The four levels of the Simplify slider. */
import type { Level, ModernTranslation } from './settings';

export interface LevelInfo {
  level: Level;
  name: string;
  /** One-line explanation shown under the slider. */
  describe: (modern: ModernTranslation) => string;
}

export const LEVELS: LevelInfo[] = [
  {
    level: 1,
    name: 'Original',
    describe: () => 'King James Version: the classic English Bible of 1611 (in its standard 1769 spelling).',
  },
  {
    level: 2,
    name: 'Modern',
    describe: (m) =>
      m === 'web'
        ? 'World English Bible: a modern, word-for-word public-domain translation.'
        : 'Berean Standard Bible: an accurate translation in clear modern English.',
  },
  {
    level: 3,
    name: 'Plain',
    describe: () => 'A plain-English retelling in short paragraphs. Not a translation; read alongside the Bible.',
  },
  {
    level: 4,
    name: 'Summary',
    describe: () => 'The big idea, a few key points and a question to think about.',
  },
];
