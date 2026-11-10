# How Lamplight fits together

A beginner-friendly tour of the project. If you are new to web development,
read this top to bottom once; after that, use it as a map.

## The big idea: a "static" site

Most websites you use have a server that builds each page when you ask for it,
often talking to a database. Lamplight does **not**. Instead:

1. On your computer (or on Cloudflare's build machine), `npm run build` runs once.
2. It turns all our content (Bible text, notes, settings pages...) into plain
   files: HTML pages, a little CSS and JavaScript, and small JSON data files.
3. Those files are uploaded to a free host that simply hands them out.

Because nothing runs on a server, there is nothing to pay for, nothing to
hack, and nothing to go down except the file host itself.

**Where does personal data go?** Into the visitor's own browser, using
`localStorage` (a small key-value store every browser has). There are no
accounts. The Settings page can export everything to a file and import it on
another device.

## Why each tool was chosen

| Tool                         | What it is                                                                                      | Why we use it                                                                                                                                                                                           |
| ---------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Astro**                    | A website builder that outputs static HTML.                                                     | It sends _zero_ JavaScript by default. Pages are plain HTML, so they load fast on phones. We only add JavaScript where something must be interactive.                                                   |
| **Islands** (Astro + Preact) | An "island" is one interactive component on an otherwise static page, e.g. the Simplify slider. | The rest of the page stays plain HTML. Each island loads only its own code.                                                                                                                             |
| **Preact**                   | A tiny (≈10 KB) alternative to React with the same way of writing components.                   | React-style components are the most common skill in web development, but Preact is a fraction of the size, which matters on mobile data.                                                                |
| **TypeScript**               | JavaScript with type labels (`chapter: number`).                                                | Your editor catches mistakes as you type (wrong field names, missing values) before they reach visitors.                                                                                                |
| **Tailwind CSS**             | Styling by putting small classes like `p-4 text-lg` directly in the HTML.                       | You can see how something looks without hunting through CSS files, and unused styles are removed automatically so the CSS stays small.                                                                  |
| **Zod**                      | A library that checks data matches a described shape.                                           | All content lives in JSON files. Zod checks every one during the build, so a typo in a content file stops the build with a clear message instead of breaking a page.                                    |
| **Fontsource**               | Fonts packaged as npm packages.                                                                 | The Literata font for scripture is served from our own site: free, private (no request to Google), and works offline. Interface text uses each device's built-in font, which costs nothing to download. |
| **Vitest**                   | A test runner for logic and data.                                                               | Checks that the Bible data is complete (66 books, 1,189 chapters, matching verse numbers) and that storage/settings code behaves, in under a second.                                                    |
| **Playwright**               | Drives a real browser automatically.                                                            | Tests real user journeys (move the slider, change a setting) on a phone-sized and a desktop screen.                                                                                                     |
| **ESLint + Prettier**        | ESLint spots likely bugs; Prettier formats code consistently.                                   | Keeps the code tidy and consistent without having to think about it.                                                                                                                                    |
| **Cloudflare Pages**         | Free static hosting with a global network.                                                      | Unlimited bandwidth on the free plan and fast everywhere. GitHub Pages also works (a workflow is included).                                                                                             |

## Folder map

```
.
├── docs/                     You are here. ARCHITECTURE.md and SOURCES.md
├── scripts/                  Programs you run by hand (not part of the website)
│   ├── fetch-bible.ts          1. download Bible source files
│   ├── build-bible.ts          2. convert them to JSON
│   ├── validate-content.ts     check all content JSON (runs before every build)
│   └── bible/                  helpers: book list, USFM parser, source URLs
├── src/
│   ├── config.ts             Site name, tagline, navigation links
│   ├── data/                 ALL CONTENT LIVES HERE (edit without touching code)
│   │   ├── books.json          66 books: name, testament, genre, verse counts
│   │   ├── bible/{kjv,bsb,web}/{book}/{chapter}.json   Bible text
│   │   └── simplified/{book}/{chapter}.json            Levels 3-4 (Phase 4)
│   ├── lib/                  Plain TypeScript logic, no UI
│   │   ├── schemas.ts          the shape of every content file (Zod)
│   │   ├── storage.ts          safe localStorage + export/import/reset
│   │   ├── settings.ts         reader settings and their defaults
│   │   ├── progress.ts         what you have read
│   │   ├── bible.ts            build-time data access for pages
│   │   ├── bible-client.ts     loads chapter JSON in the browser
│   │   ├── levels.ts           names and descriptions of the 4 levels
│   │   ├── versification.ts    known verse-numbering differences
│   │   └── url.ts              builds links that work in a sub-folder too
│   ├── components/           Building blocks of pages
│   │   ├── reader/             ChapterReader (island), LevelSlider, ScriptureText
│   │   ├── ui/                 Icon, ThemeToggle
│   │   └── *.tsx               other islands (SettingsForm, ContinueReading)
│   ├── layouts/BaseLayout.astro  The frame around every page
│   ├── pages/                The URL structure: each file is a page
│   │   ├── index.astro         /
│   │   ├── settings.astro      /settings
│   │   ├── bible/index.astro   /bible
│   │   ├── bible/[book]/index.astro      /bible/john
│   │   ├── bible/[book]/[chapter].astro  /bible/john/3
│   │   └── data/bible/[translation]/[book]/[chapter].json.ts  the JSON files
│   └── styles/global.css     Colours, fonts, light/dark themes, slider styling
├── tests/                    Vitest unit and data tests
├── e2e/                      Playwright browser tests
└── public/                   Files copied as-is (favicon, _headers)
```

**File names in square brackets** like `[chapter].astro` are Astro's way of
saying "one page per value". The file exports `getStaticPaths()`, which lists
every value (1,189 chapters), and Astro builds a page for each.

## How a chapter page works

Take `/bible/john/3`:

1. **At build time**, `src/pages/bible/[book]/[chapter].astro` reads John 3
   from `src/data/bible/bsb/john/3.json` and renders it to HTML. Anyone (and
   any search engine) gets readable text immediately, even without JavaScript.
2. The page includes the `ChapterReader` island with `client:load`. In the
   browser it "hydrates": Preact attaches to the existing HTML and makes it
   interactive.
3. The island reads your settings from localStorage, switches to your level
   (e.g. KJV), and, when the browser is idle, preloads the other translation
   from `/data/bible/kjv/john/3.json`. That is why the slider feels instant.
4. Moving the slider just swaps which text is shown. It also remembers the
   level for next time.

We never load the whole Bible at once: each chapter file is 2-15 KB.

## How the Bible data is made

```
eBible.org USFM zips ──fetch-bible.ts──▶ .cache/sources/ (git-ignored)
                     ──build-bible.ts──▶ src/data/bible/**.json + books.json (committed)
```

USFM is a plain-text format translators use, full of codes like
`\v 16 For God \w so|strong="G3779"\w* loved…`. Our parser
(`scripts/bible/usfm.ts`) keeps the words, section headings, Psalm titles and
paragraph/poetry hints, and removes footnotes and tags. The processed JSON is
committed so the site builds offline and nobody needs to re-download.

**Verse numbering.** `books.json` uses the KJV's numbering as the reference.
Modern translations skip a few verses that are not in the oldest manuscripts;
those are listed in `src/lib/versification.ts`. The tests fail if any other
difference appears, which protects against parser bugs.

**Adding the Deuterocanon later.** Catholic and Orthodox Bibles include extra
books. The data is ready for them: books have a `canon` field
(`protestant` or `deuterocanon`), and the pipeline handles any book listed in
`scripts/bible/canon.ts`. You would add the books there, use eBible's editions
that include them, and update the tests' expected totals.

## Saved data (localStorage)

All keys start with `lamplight:` so we can find our own data.

| Key                | What                                          |
| ------------------ | --------------------------------------------- |
| `settings`         | theme, text size, translation, verse numbers… |
| `reader:lastLevel` | last slider level used                        |
| `reader:lastRead`  | last chapter opened (for "Continue")          |

Every read and write goes through `src/lib/storage.ts`, which wraps them in
`try/catch`: if the browser blocks storage (some private modes do), the site
still works, it just forgets things.

**Avoiding a flash of the wrong theme.** A tiny script in the `<head>` of
`BaseLayout.astro` reads the theme and text size before the page is drawn.

## Checks

| Command            | What it checks                                     |
| ------------------ | -------------------------------------------------- |
| `npm test`         | Bible data completeness, parser, storage, settings |
| `npm run validate` | Every content JSON file matches its schema         |
| `npm run lint`     | Likely bugs                                        |
| `npm run check`    | TypeScript types in all files including `.astro`   |
| `npm run test:e2e` | Real browser tests (run `npm run build` first)     |

All of these run automatically on GitHub for every push (`.github/workflows/ci.yml`).
