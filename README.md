# Lamplight

A free, static, interactive website for reading the whole Bible in digestible
form and understanding the major Christian traditions.

- **Simplify slider** on every chapter: Original (KJV) → Modern (BSB or WEB) → Plain → Summary.
- **No accounts, no ads, no tracking.** Your progress and settings stay in your browser; export/import them in Settings.
- **Public-domain text only**: KJV, BSB and WEB. See [docs/SOURCES.md](docs/SOURCES.md).
- **Zero running cost**: plain static files on free hosting.

New to the code? Start with [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Run it on your computer

You need [Node.js](https://nodejs.org/) 22.12 or newer.

```sh
npm install          # install dependencies (once)
npm run dev          # start a local server at http://localhost:4321 that reloads as you edit
```

Other commands:

```sh
npm test             # data and logic tests
npm run build        # validate content and build the site into dist/
npm run preview      # serve the built site at http://localhost:4321
npm run test:e2e     # browser tests (after npm run build; first time: npx playwright install chromium)
npm run lint         # find likely bugs
npm run format       # tidy formatting
```

The Bible text is already processed and committed in `src/data/bible/`. You
only need `npm run bible:fetch && npm run bible:build` to refresh it from the
sources.

## Deploy

### Cloudflare Pages (recommended, free)

1. Push this repository to GitHub.
2. In the Cloudflare dashboard go to **Workers & Pages → Create → Pages → Connect to Git** and pick the repository.
3. Settings:
   - Framework preset: **Astro**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Environment variable: `SITE_URL` = your full address, e.g. `https://lamplight.example.org`
     (used for the sitemap and link previews). Node version comes from `.node-version`.
4. Save and deploy. Every push to your main branch redeploys automatically; other branches get preview URLs.
5. To use your own domain: **your Pages project → Custom domains → Set up a custom domain**.

`public/_headers` sets caching and security headers on Cloudflare.

### GitHub Pages (alternative, free)

1. In the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Go to **Actions → Deploy to GitHub Pages → Run workflow**.
3. The site appears at `https://<your-user>.github.io/<repo-name>/`. The workflow sets
   `BASE_PATH` so links work inside that sub-folder. With a custom domain, remove `BASE_PATH`
   from `.github/workflows/deploy-github-pages.yml` and set `SITE_URL` to your domain.

## Project status

Built in phases; see the commit history for details.

1. ✅ Foundation: setup, theme, settings, data export/import, Bible data pipeline, reader with Levels 1-2
2. Reader complete: book grid and intros, highlights, notes, progress, search
3. Reading plans
4. Plain and Summary content for the first books
5. Christian traditions: profiles and compare tool
6. Family tree, quiz, big questions
7. Passage notes, glossary, about page
8. Offline support, accessibility and performance pass

## Licence

Code: choose a licence before publishing (MIT is a common choice). Bible texts are public domain; see [docs/SOURCES.md](docs/SOURCES.md).
