# Editing and reviewing content

All content is JSON in `src/data/`. You can edit it without touching any code.
After editing, run:

```sh
npm run validate   # checks every file and tells you exactly what's wrong
npm test           # data, Guide and plan tests
```

## What needs human review

Everything below was drafted during development and should be checked by
people with the right knowledge before the site is promoted widely.

| Content                                                                                                                                       | Where                                           | What to check                                                                                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plain & Summary levels (182 chapters: Genesis, Psalms 1–23, Matthew, Mark, John, Acts, Romans; every other chapter gets an automatic outline) | `src/data/simplified/`                          | Faithful to the text, no added theology, neutral where traditions differ, reading age ~12. When a chapter is checked, change `"status": "draft"` to `"reviewed"`.     |
| Tradition profiles (17)                                                                                                                       | `src/data/traditions/`                          | Ideally reviewed by a member or scholar of each tradition: does it describe them as they would describe themselves? Are citations accurate? Are size figures current? |
| Passage notes (44)                                                                                                                            | `src/data/passage-notes/`                       | Each view is fairly stated and correctly attributed.                                                                                                                  |
| Big Questions (7), quiz weights, family tree                                                                                                  | `src/data/questions/`, `quiz.json`, `tree.json` | Fair, accurate, unranked.                                                                                                                                             |
| Book introductions (66)                                                                                                                       | `src/data/book-intros/`                         | Authorship/dating notes are fair to both traditional and critical views.                                                                                              |
| Guide topics (37) and help resources                                                                                                          | `src/data/guide/`                               | Tone is kind and non-preachy; helpline numbers are current for your audience. **Check `safety.json` regularly.**                                                      |

## Rules for the Plain and Summary levels

- Stay faithful to the text. Do not add theology the passage doesn't contain.
- Where traditions disagree on meaning, keep the retelling neutral; put
  interpretations in a passage note instead.
- Short sentences, everyday words, reading age about 12.
- Never invent quotes or facts. **Quotations in the Summary must match the BSB
  exactly** (the build checks this). Speech in the Plain level is shown with a
  note that it is simplified wording.
- `plain` paragraphs must cover every verse of the chapter, in order, with no
  gaps (the build checks this too).

Example file (`src/data/simplified/mark/1.json`):

```json
{
  "book": "mark",
  "chapter": 1,
  "status": "draft",
  "plain": [{ "verses": "1-8", "text": "This is the beginning of the good news..." }],
  "summary": {
    "bigIdea": "One sentence.",
    "points": ["Two to four key points."],
    "reflection": "One question to think about."
  }
}
```

## Suggested next books

Luke, Exodus, Psalms 24–150, Proverbs, Ephesians, Philippians,
James, 1 John, then the rest of the New Testament.

## Adding a Guide topic

1. Add an entry to `src/data/guide/topics.json` (copy an existing one).
2. Give it `signals`: groups of words or phrases with weights (3 = strong
   evidence, 1 = weak). Mark a group `"negatable": true` if "not ..." should
   count against it.
3. Passages use references like `"Psalm 23"` or `"John 11:25-26"`. Any text in
   "double quotes" in the `why`, `message` or `step` must match the BSB.
4. Add a test sentence to `tests/guide.test.ts` and run `npm test`.

## Adding a tradition note to a passage

Create `src/data/passage-notes/{book}-{chapter}.json` (see existing files).
Each note needs 2–4 views; each view lists the tradition ids that hold it and a
source. The icon appears automatically in the reader.
