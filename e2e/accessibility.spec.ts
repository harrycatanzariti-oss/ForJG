import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const PAGES = [
  '/',
  '/bible',
  '/bible/john',
  '/bible/john/3',
  '/bible/matthew/16',
  '/guide',
  '/guide/grief',
  '/plans',
  '/plans/gospels-30',
  '/progress',
  '/search',
  '/settings',
  '/traditions',
  '/traditions/catholic',
  '/traditions/compare?a=catholic&b=baptist',
  '/traditions/tree',
  '/traditions/quiz',
  '/traditions/questions/what-happens-at-communion',
  '/glossary',
  '/about',
];

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} theme`, () => {
    test.use({ colorScheme: scheme });
    for (const path of PAGES) {
      test(`no WCAG 2.1 AA violations on ${path}`, async ({ page }) => {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
        expect(results.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`)).toEqual([]);
      });
    }
  });
}
