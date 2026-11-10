# Lamplight

A free, static, interactive website for reading the whole Bible in digestible
form and understanding the major Christian traditions.

- **Simplify slider** on every chapter: Original (KJV) → Modern (BSB or WEB) → Plain → Summary.
- **The Guide**: type how you feel ("I'm grieving and God feels far away") and get pointed to the right passages and next steps. Rule-based, no AI, nothing leaves your device, with crisis resources shown first when needed.
- **Reader tools**: highlights, private notes, copy/share verse links, mark as read, streaks, a progress map of all 1,189 chapters, search by word or reference.
- **Six reading plans** generated from data, with a gentle "adjust my plan" when you fall behind.
- **Christian traditions**: 17 profiles with sources, compare tool, family tree, Belief Explorer quiz, Big Questions, and "How traditions read this" notes on 44 key passages.
- **Works offline** once visited, installable on phones, accessible (WCAG 2.1 AA), fast (Lighthouse 97–100 on mobile).
- **Changes colour with the church year**: the accent is the colour of the vestments worn that day (green, purple, rose, red or white/gold) at 30% opacity, in a clean design adapted from Otis.
- **No accounts, no ads, no tracking.** Progress and settings stay in your browser; export/import them in Settings.
- **Public-domain text only**: KJV, BSB and WEB. See [docs/SOURCES.md](docs/SOURCES.md).
- **Zero running cost**: plain static files on free hosting.

New to the code? Start with [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
Editing or reviewing content? See [docs/CONTENT.md](docs/CONTENT.md).

## Run it on your computer

You need [Node.js](https://nodejs.org/) 22.12 or newer.

```sh
npm install          # install dependencies (once)
npm run dev          # local server at http://localhost:4321 that reloads as you edit
```

Other commands:

```sh
npm test             # data and logic tests (about 3 seconds)
npm run validate     # check every content file
npm run build        # validate content and build the site into dist/ (about 30 seconds)
npm run preview      # serve the built site at http://localhost:4321
npm run test:e2e     # browser, accessibility, link and offline tests (after npm run build)
                     #   first time only: npx playwright install chromium
npm run lint         # find likely bugs
npm run check        # TypeScript type check
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

The build produces about 5,400 files (≈90 MB), well within the free plan's
limits. `public/_headers` sets caching and security headers.

### GitHub Pages (alternative, free)

1. In the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Go to **Actions → Deploy to GitHub Pages → Run workflow**.
3. The site appears at `https://<your-user>.github.io/<repo-name>/`. The workflow sets
   `BASE_PATH` so links work inside that sub-folder. With a custom domain, remove `BASE_PATH`
   from `.github/workflows/deploy-github-pages.yml` and set `SITE_URL` to your domain.

### Before launching publicly

- Change the placeholder name "Lamplight" in `src/config.ts` and `public/manifest.webmanifest` if you like.
- Have the draft content reviewed (see [docs/CONTENT.md](docs/CONTENT.md)), especially the
  helplines in `src/data/guide/safety.json` for your audience's countries.
- Choose a licence for the code (MIT is a common choice).

## What's included

| Area       | Pages                                                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Home       | `/` with the Guide box, continue reading and today's plan                                                                      |
| Guide      | `/guide`, `/guide/{topic}` (37 topics)                                                                                         |
| Bible      | `/bible`, `/bible/{book}`, `/bible/{book}/{chapter}`, `/search`, `/progress`                                                   |
| Plans      | `/plans`, `/plans/{plan}`                                                                                                      |
| Traditions | `/traditions`, `/traditions/{id}`, `/traditions/compare`, `/traditions/tree`, `/traditions/quiz`, `/traditions/questions/{id}` |
| Other      | `/glossary`, `/about`, `/settings`, `/offline`                                                                                 |

Plain and Summary levels currently cover Genesis, Psalms 1–23, Mark, John, Acts
and Romans (154 chapters, marked Draft). Other chapters show "Coming soon".

## Licence

Code: choose a licence before publishing. Bible texts are public domain; see [docs/SOURCES.md](docs/SOURCES.md).
