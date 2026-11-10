/**
 * Where each translation comes from. All three are public domain.
 * Keep this in sync with docs/SOURCES.md.
 */
export interface TranslationSource {
  /** Lower-case id used in folder names and URLs. */
  id: 'kjv' | 'bsb' | 'web';
  /** Short display label. */
  label: string;
  name: string;
  /** eBible.org translation id. */
  ebibleId: string;
  url: string;
  licence: string;
}

export const SOURCES: TranslationSource[] = [
  {
    id: 'kjv',
    label: 'KJV',
    name: 'King James Version',
    ebibleId: 'eng-kjv2006',
    url: 'https://ebible.org/Scriptures/eng-kjv2006_usfm.zip',
    licence:
      'Public domain (outside the United Kingdom, where it is under Crown patent). Text from eBible.org.',
  },
  {
    id: 'bsb',
    label: 'BSB',
    name: 'Berean Standard Bible',
    ebibleId: 'engbsb',
    url: 'https://ebible.org/Scriptures/engbsb_usfm.zip',
    licence: 'Dedicated to the public domain by Bible Hub and the Berean Bible translation committee (2023).',
  },
  {
    id: 'web',
    label: 'WEB',
    name: 'World English Bible',
    ebibleId: 'engwebp',
    url: 'https://ebible.org/Scriptures/engwebp_usfm.zip',
    licence: 'Public domain. "World English Bible" is a trademark of eBible.org.',
  },
];

/** Where downloaded archives are kept. This folder is git-ignored. */
export const CACHE_DIR = '.cache/sources';
