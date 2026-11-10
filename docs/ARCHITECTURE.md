# How Lamplight fits together

A beginner-friendly tour of the project. If you are new to web development,
read this top to bottom once; after that, use it as a map.

## The big idea: a "static" site

Most websites you use have a server that builds each page when you ask for it,
often talking to a database. Lamplight does **not**. Instead:

1. On your computer (or on Cloudflare's build machine), `npm run build` runs once.
2. It turns all our content (Bible text, notes, traditions, plans...) into plain
   files: HTML pages, a little CSS and JavaScript, small JSON data files and images.
3. Those files are uploaded to a free host that simply hands them out.

Because nothing runs on a server, there is nothing to pay for, nothing to
hack, and nothing to go down except the file host itself.

**Where does personal data go?** Into the visitor's own browser, using
`localStorage` (a small key-value store every browser has). There are no
accounts. Settings can export everything to a file and import it elsewhere.

**No AI at runtime.** Everything a visitor sees was written in advance and
stored as data. The Guide's "understanding" is a set of transparent rules
(see below), not a language model.

## Why each tool was chosen

| Tool                         | What it is                                                                                      | Why we use it                                                                                                                                         |
| ---------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Astro**                    | A website builder that outputs static HTML.                                                     | It sends _zero_ JavaScript by default. Pages are plain HTML, so they load fast on phones. We add JavaScript only where something must be interactive. |
| **Islands** (Astro + Preact) | An "island" is one interactive component on an otherwise static page, e.g. the Simplify slider. | The rest of the page stays plain HTML. Each island loads only its own code.                                                                           |
| **Preact**                   | A tiny (≈10 KB) alternative to React, written the same way.                                     | React-style components are a common skill, but Preact is a fraction of the size, which matters on mobile data.                                        |
| **TypeScript**               | JavaScript with type labels (`chapter: number`).                                                | The editor catches mistakes (wrong field names, missing values) before they reach visitors.                                                           |
| **Tailwind CSS**             | Styling with small classes like `p-4 text-lg` in the HTML.                                      | You see how something looks without hunting through CSS files; unused styles are removed automatically.                                               |
| **Zod**                      | Checks that data matches a described shape.                                                     | All content lives in JSON. Every file is checked during the build, so a typo stops the build with a clear message instead of breaking a page.         |
| **Fontsource**               | Fonts packaged as npm packages.                                                                 | The Literata scripture font is served from our own site: free, private and works offline. Interface text uses the device's built-in font.             |
| **Satori + resvg**           | Turn a simple layout into PNG images.                                                           | Generates the social preview images during the build, with no external service.                                                                       |
| **Vitest**                   | A test runner for logic and data.                                                               | Checks the Bible data, the Guide's matching, plans, the quiz and storage in a couple of seconds.                                                      |
| **Playwright + axe**         | Drives a real browser; axe checks accessibility.                                                | Tests real journeys (slider, Guide, plans, quiz, offline) and scans 20 pages for WCAG 2.1 AA problems in light and dark mode.                         |
| **ESLint + Prettier**        | ESLint spots likely bugs; Prettier formats code.                                                | Keeps the code tidy and consistent automatically.                                                                                                     |
| **Cloudflare Pages**         | Free static hosting on a global network.                                                        | Unlimited bandwidth on the free plan. GitHub Pages also works (a workflow is included).                                                               |

## Folder map

```
.
├── docs/                     ARCHITECTURE.md (this), SOURCES.md, CONTENT.md
├── integrations/             Build add-ons: generates the offline service worker
├── scripts/                  Programs you run by hand (not part of the website)
│   ├── fetch-bible.ts          1. download Bible source files
│   ├── build-bible.ts          2. convert them to JSON
│   ├── validate-content.ts     check all content JSON (runs before every build)
│   ├── check-quotes.ts         checks Bible quotations against the BSB text
│   ├── make-icons.ts           makes the PNG app icons from the logo
│   └── bible/                  helpers: book list, USFM parser, source URLs
├── src/
│   ├── config.ts             Site name, tagline, navigation
│   ├── data/                 ALL CONTENT LIVES HERE (edit without touching code)
│   │   ├── books.json          66 books: name, testament, genre, verse counts
│   │   ├── bible/{kjv,bsb,web}/{book}/{chapter}.json   Bible text
│   │   ├── book-intros/{book}.json       intro card for every book
│   │   ├── simplified/{book}/{chapter}.json  Levels 3-4 (Plain, Summary)
│   │   ├── passage-notes/{book}-{chapter}.json  "How traditions read this"
│   │   ├── traditions/{id}.json          17 tradition profiles
│   │   ├── tree.json                     family tree branches and splits
│   │   ├── quiz.json                     Belief Explorer questions and weights
│   │   ├── questions/{id}.json           Big Questions explainers
│   │   ├── guide/topics.json             Guide topics, keywords and answers
│   │   ├── guide/safety.json             crisis and abuse help resources
│   │   ├── plans/plans.json              reading plan recipes
│   │   ├── plans/chronological.json      historical order of the books
│   │   └── glossary.json                 glossary terms
│   ├── lib/                  Plain TypeScript logic, no UI
│   ├── components/           Building blocks (islands are the .tsx files)
│   ├── layouts/BaseLayout.astro  The frame around every page
│   ├── pages/                The URL structure: each file is a page
│   └── styles/global.css     Colours, fonts, themes, highlights, slider
├── tests/                    Vitest unit and data tests
├── e2e/                      Playwright browser, accessibility, link and offline tests
└── public/                   Files copied as-is (icons, manifest, _headers)
```

**File names in square brackets** like `[chapter].astro` mean "one page per
value". The file exports `getStaticPaths()`, which lists every value (1,189
chapters), and Astro builds a page for each.

### The most important `src/lib/` files

| File                                                            | Does                                                                                    |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `schemas.ts`                                                    | The shape of every content file (Zod). Start here to see what a file must contain.      |
| `storage.ts`                                                    | Safe localStorage with export/import/reset. Every read/write is wrapped in `try/catch`. |
| `settings.ts`, `progress.ts`, `annotations.ts`, `plan-state.ts` | Your settings, chapters read and streaks, highlights and notes, active plan.            |
| `bible.ts`, `content.ts`, `guide-data.ts`, `plans-data.ts`      | Build-time loaders for content (they never ship to the browser).                        |
| `bible-client.ts`, `search-client.ts`                           | Browser-side loading of chapter JSON and search.                                        |
| `guide.ts`                                                      | The Guide's matching engine (see below).                                                |
| `plans.ts`                                                      | Generates reading plans from recipes.                                                   |
| `quiz.ts`                                                       | Scores the Belief Explorer.                                                             |
| `reference.ts`                                                  | Understands "John 3:16", "jn 3 16", "1 cor 13:4-7".                                     |
| `glossary.ts`                                                   | Finds glossary words in text for tap-to-define popovers.                                |

## How a chapter page works

Take `/bible/john/3`:

1. **At build time**, `pages/bible/[book]/[chapter].astro` renders John 3 (BSB)
   to HTML, with any Plain/Summary content and "How traditions read this" notes.
   Search engines and no-JavaScript visitors get readable text immediately.
2. The `ChapterReader` island wakes up in the browser, reads your settings,
   switches to your level and preloads the other translation when the browser
   is idle, so the slider never waits for the network.
3. Tapping a verse opens highlight / note / copy / share. Reaching the end of
   the chapter (after scrolling) marks it read, with an Undo. Swiping
   left/right changes chapter.

We never load the whole Bible at once: each chapter file is 2–15 KB.

## Search

At build time `pages/data/search/[shard].json.ts` builds an **inverted index**
from the BSB: for every word, the list of verses containing it. It is split by
the first two letters of each word, so searching "shepherd" only downloads the
`sh` file (a few KB). References like "Rom 8:28" are recognised separately and
jump straight to the verse.

## The Guide (no AI)

`lib/guide.ts` matches free text to the topics in `data/guide/topics.json`:

1. **Normalise**: lower-case, expand contractions ("can't" → "cannot").
2. **Stem**: trim endings so "fearing" matches "fear".
3. **Score**: each topic has groups of words/phrases with weights. Each group
   counts once. Longer, unfamiliar words forgive one typo ("greiving").
   Negation ("not afraid") counts against groups marked `negatable`. Some
   topics add a bonus when two groups appear together (death + fear).
4. **Decide**: a clear winner is answered (plus a strong second topic as "you
   also mentioned"); close or weak matches get a "which did you mean?"
   question; nothing matched shows the topic list.

**Safety first**: phrases suggesting self-harm or abuse always show help
resources (`data/guide/safety.json`) before anything else.

To improve the Guide, add words to a topic's `signals`, then add an example to
`tests/guide.test.ts` and run `npm test`.

## Reading plans

Plans are **recipes**, not lists. `data/plans/plans.json` says, for example,
"Matthew to John over 30 days"; `lib/plans.ts` spreads the chapters across the
days, balanced by verse count. A day is "done" when all its chapters are
marked read, so plans share progress with the reader.

## Offline support (PWA)

After every build, `integrations/service-worker.mjs` writes `dist/sw.js` with
the exact file names to save. The service worker:

- saves the core pages, styles, scripts and the scripture font on first visit;
- saves pages and chapter JSON as you read them;
- shows `/offline` for pages you haven't opened yet while offline.

The site can be installed to a phone's home screen (`public/manifest.webmanifest`).

## Design and the church-year colour

The look is adapted from Otis: the Geist typeface for the interface (scripture
stays in the Literata serif for comfortable reading), a light grey page with
white cards that use soft layered shadows instead of hard borders, pill-shaped
buttons, a frosted header that holds all the navigation and retracts while you
read (it slides away as you scroll down and returns when you scroll up), and
gentle "blur-in" entrances.

The accent colour follows the **church year**. `src/lib/liturgical.js` works
out the season and the colour of the vestments for any date: green (Ordinary
Time), purple (Advent, Lent), rose (Gaudete and Laetare Sundays), red (Palm
Sunday, Good Friday, Pentecost, martyrs' feasts) and white/gold (Christmas,
Easter, great feasts). A tiny script in the page head runs it on the visitor's
own date and sets `data-vestment` on `<html>`, before anything is drawn.

In `src/styles/global.css` each colour is defined once:

- `--vest`: the vestment colour. Buttons, selections and tints use it at **30%
  opacity** (`--accent-fill`).
- `--accent`: a deeper shade of the same colour for links and text, chosen to
  pass WCAG AA contrast. The tests check all five colours in light and dark mode.

Readers can fix a colour instead in Settings ("Accent colour"). White
vestments use gold here, because white at 30% would be invisible on white.

## Saved data (localStorage)

All keys start with `lamplight:`.

| Key                                   | What                                                      |
| ------------------------------------- | --------------------------------------------------------- |
| `settings`                            | theme, text size, translation, verse numbers, start level |
| `reader:lastLevel`, `reader:lastRead` | slider level, last chapter opened                         |
| `progress:read`, `progress:days`      | chapters read, and on which days (for streaks)            |
| `annotations`                         | highlights and notes, keyed `book:chapter:verse`          |
| `plan:active`                         | the plan you follow and its start date                    |
| `quiz:answers`                        | your Belief Explorer answers                              |

Nothing typed into the Guide is ever stored.

## Quality checks

| Command                          | Checks                                                                                 |
| -------------------------------- | -------------------------------------------------------------------------------------- |
| `npm test`                       | Bible data, parser, Guide matching (incl. the original examples), plans, quiz, storage |
| `npm run validate`               | Every content file: schema, ids, verse ranges, references, quotations                  |
| `npm run lint` / `npm run check` | Likely bugs / TypeScript types                                                         |
| `npm run test:e2e`               | Browser journeys, accessibility (axe), broken links, offline                           |

All of these run on GitHub for every push (`.github/workflows/ci.yml`).
