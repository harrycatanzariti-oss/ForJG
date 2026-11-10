/**
 * Astro integration: after `astro build`, writes dist/sw.js.
 *
 * A service worker is a small script the browser runs in the background.
 * Ours makes the site work offline:
 *  - On install it saves ("precaches") the core pages and the CSS/JS/font
 *    files they need. The exact hashed file names are only known after the
 *    build, which is why this runs as a build step.
 *  - Pages and chapters you open are saved as you go, so they work offline later.
 *  - When you are offline and open something not saved, you get /offline.
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CORE_PAGES = [
  '',
  'bible',
  'guide',
  'plans',
  'traditions',
  'settings',
  'search',
  'progress',
  'glossary',
  'about',
  'offline',
];

export default function serviceWorker() {
  let base = '/';
  return {
    name: 'lamplight-service-worker',
    hooks: {
      'astro:config:done': ({ config }) => {
        base = config.base.endsWith('/') ? config.base : `${config.base}/`;
      },
      'astro:build:done': ({ dir }) => {
        const out = fileURLToPath(dir);
        const assets = readdirSync(`${out}_astro`)
          // Only Latin font files: other alphabets are fetched on demand if ever needed.
          .filter((f) => !f.endsWith('.woff2') || /-latin-(wght|standard)-normal/.test(f))
          .map((f) => `${base}_astro/${f}`);
        const pages = CORE_PAGES.map((p) => `${base}${p}`);
        const precache = [
          ...pages,
          ...assets,
          `${base}manifest.webmanifest`,
          `${base}favicon.svg`,
          `${base}icons/icon-192.png`,
        ];
        const version = createHash('sha256')
          .update(precache.join('\n') + Date.now())
          .digest('hex')
          .slice(0, 12);
        const template = readFileSync(new URL('./sw-template.js', import.meta.url), 'utf8');
        const sw = template
          .replace('__VERSION__', version)
          .replace('__BASE__', JSON.stringify(base))
          .replace('__PRECACHE__', JSON.stringify(precache));
        writeFileSync(`${out}sw.js`, sw);
      },
    },
  };
}
