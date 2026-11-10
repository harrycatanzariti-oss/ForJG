/**
 * Site-wide settings you may want to change. Everything else is content data
 * in src/data/ or code in src/components/.
 */
export const SITE_NAME = 'Lamplight';
export const SITE_TAGLINE = 'Read the whole Bible, one clear step at a time.';
export const SITE_DESCRIPTION =
  'A free, ad-free website for reading the Bible at your own level and understanding Christian traditions. No account needed.';

/** Main navigation. Pages are added here as each phase is built. */
export const NAV = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/bible', label: 'Bible', icon: 'book' },
  { href: '/settings', label: 'Settings', icon: 'settings' },
] as const;
