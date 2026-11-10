// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import serviceWorker from './integrations/service-worker.mjs';

// The public URL of the site. Change this to your own domain before deploying.
// It is used for the sitemap and for absolute links in social previews.
const SITE = process.env.SITE_URL ?? 'https://example.org';
// Only needed when the site lives in a sub-folder, e.g. GitHub Pages project
// sites at https://user.github.io/repo-name/ (set BASE_PATH=/repo-name).
const BASE = process.env.BASE_PATH ?? '/';

export default defineConfig({
  site: SITE,
  base: BASE,
  output: 'static',
  trailingSlash: 'ignore',
  integrations: [
    preact(),
    sitemap({ filter: (page) => !page.includes('/offline') }),
    serviceWorker(),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
