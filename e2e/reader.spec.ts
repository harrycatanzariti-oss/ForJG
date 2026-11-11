import { expect, test, type Page } from '@playwright/test';

/** Waits until the chapter reader is interactive. */
const ready = (page: Page) => expect(page.getByRole('button', { name: /Mark as read|^Read$/ })).toBeEnabled();

test('the slider switches between the KJV and BSB and remembers the level', async ({ page }) => {
  await page.goto('/bible/john/3');
  await ready(page);
  await expect(page.locator('#v16')).toContainText('For God so loved the world that He gave');

  await page.getByRole('slider', { name: 'Reading level' }).focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#v16')).toContainText('only begotten Son');
  await expect(page.locator('#level-description')).toContainText('King James Version');

  await page.reload();
  await ready(page);
  await expect(page.getByRole('slider', { name: 'Reading level' })).toHaveValue('1');
  await expect(page.locator('#v16')).toContainText('only begotten Son');
});

test('chapters without a written retelling still get Plain and Summary, from an outline', async ({ page }) => {
  await page.goto('/bible/obadiah/1');
  await ready(page);
  await page.getByRole('button', { name: /^Summary/ }).click();
  await expect(page.getByRole('heading', { name: 'What happens' })).toBeVisible();
  await expect(page.getByRole('slider', { name: 'Reading level' })).toHaveValue('4');
  await page.getByRole('button', { name: /^Plain/ }).click();
  await expect(page.locator('#level-description')).toContainText('still being written');
});

test('settings change the theme and the modern translation', async ({ page }) => {
  await page.goto('/settings');
  await page.getByText('Dark', { exact: true }).click();
  await page.getByText('World English Bible (WEB)').click();
  await expect(page.locator('html')).toHaveClass(/dark/);

  await page.goto('/bible/john/3');
  await ready(page);
  await expect(page.locator('#v16')).toContainText('For God so loved the world, that he gave his only born Son');
  await expect(page.locator('html')).toHaveClass(/dark/);
});

test('home page offers to continue reading', async ({ page }) => {
  await page.goto('/bible/ruth/2');
  // Wait until the interactive reader has started (Astro removes `ssr` when it hydrates).
  await expect(page.getByRole('button', { name: /Mark as read|^Read$/ })).toBeEnabled();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('lamplight:reader:lastRead'))).toContain('ruth');
  await page.goto('/');
  await expect(page.getByRole('link', { name: /Continue where you left off\s*Ruth 2/ })).toBeVisible();
});
