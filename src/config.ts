/**
 * Site-wide settings you may want to change. Everything else is content data
 * in src/data/ or code in src/components/.
 */
export const SITE_NAME = 'Lamplight';
export const SITE_TAGLINE = 'Read the whole Bible, one clear step at a time.';
export const SITE_DESCRIPTION =
  'A free, ad-free website for reading the Bible at your own level and understanding Christian traditions. No account needed.';

/** Main navigation, shown in the header (a row of pills on phones, so keep it to 5). */
export const NAV = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/bible', label: 'Bible', icon: 'book' },
  { href: '/guide', label: 'Guide', icon: 'guide' },
  { href: '/plans', label: 'Plans', icon: 'calendar' },
  { href: '/traditions', label: 'Traditions', icon: 'people' },
] as const;
