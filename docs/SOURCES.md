# Sources and licences

This site only uses Bible translations that are in the public domain. No
copyrighted translation (NIV, ESV, NLT, NASB, CSB, NKJV, etc.) is included,
not even as a sample.

## Bible translations

All three are downloaded as USFM files from [eBible.org](https://ebible.org/),
a long-running non-profit archive of freely licensed Bible translations. The
exact download date and SHA-256 checksum of each file used are recorded in
[`src/data/bible/translations.json`](../src/data/bible/translations.json).

| Level      | Translation                    | eBible id     | Download URL                                       | Licence                                                                                                                                                     |
| ---------- | ------------------------------ | ------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 Original | King James Version (1769 text) | `eng-kjv2006` | https://ebible.org/Scriptures/eng-kjv2006_usfm.zip | Public domain outside the United Kingdom. In the UK, printing it (or importing printed copies) needs permission under Crown letters patent. See note below. |
| 2 Modern   | Berean Standard Bible (BSB)    | `engbsb`      | https://ebible.org/Scriptures/engbsb_usfm.zip      | Dedicated to the public domain on 30 April 2023 by Bible Hub / the Berean Bible translation committee. See https://berean.bible/terms.htm                   |
| 2 Modern   | World English Bible (WEB)      | `engwebp`     | https://ebible.org/Scriptures/engwebp_usfm.zip     | Public domain. "World English Bible" is a trademark of eBible.org, so we only use the name for the unaltered text (we change formatting, never wording).    |

Details pages: [KJV](https://ebible.org/find/details.php?id=eng-kjv2006),
[BSB](https://ebible.org/find/details.php?id=engbsb),
[WEB](https://ebible.org/find/details.php?id=engwebp).

**KJV in the UK.** eBible.org notes that letters patent issued by King James
mean that _printing_ the KJV in the United Kingdom, or importing printed copies,
needs permission (currently held by Cambridge University Press, Oxford
University Press and Collins). Outside the UK the text is firmly in the public
domain. This site does not print or sell the KJV, but if you are based in the
UK and plan anything in print, read Cambridge University Press's guidance on
the Queen's/King's Printer's Patent first.

### What we change

We change **formatting only**, never wording:

- Footnotes, cross references, Strong's number tags and other formatting codes are removed.
- The KJV's pilcrows (¶) are removed. Its italic "added" words are kept as normal text.
- Section headings (BSB) and Psalm titles (all three) are kept.
- Some verses are not found in the earliest Greek manuscripts. The BSB and WEB
  skip those verse numbers. We record them in each chapter file as `omitted`
  and the reader explains the gap. The full list is in
  [`src/lib/versification.ts`](../src/lib/versification.ts).
- One typo in the eBible BSB file is corrected (Psalm 3's title reads "A Psalms
  of David"; the printed BSB reads "A Psalm of David"). Corrections are listed
  in `ERRATA` in [`scripts/build-bible.ts`](../scripts/build-bible.ts), and the
  build fails if a correction no longer matches, so fixes upstream are noticed.

## Refreshing the text

```sh
npm run bible:fetch   # downloads the zips into .cache/sources (not committed)
npm run bible:build   # writes src/data/bible/ and src/data/books.json
npm test              # checks book/chapter/verse counts
```

Commit the changes in `src/data/` afterwards.

## Fonts

- [Literata](https://fontsource.org/fonts/literata) by TypeTogether for Google,
  SIL Open Font License 1.1. Self-hosted via the `@fontsource-variable/literata`
  package (no requests to Google).
- Interface text uses the device's built-in system font (no download).
