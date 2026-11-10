/**
 * Builds a link that respects the site's base path.
 *
 * On Cloudflare Pages the site lives at the domain root ("/"), but on GitHub
 * Pages it may live under "/repo-name/". Astro exposes that as BASE_URL, so
 * every internal link and fetch goes through this helper.
 */
export function url(path: string): string {
  const base = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '');
  if (/^https?:\/\//.test(path)) return path;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
