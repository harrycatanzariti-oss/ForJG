import { expect, test } from '@playwright/test';

test('the slider switches between the KJV and BSB and remembers the level', async ({ page }) => {
  await page.goto('/bible/john/3');
  await expect(page.locator('#v16')).toContainText('For God so loved the world that He gave');

  await page.getByRole('slider', { name: 'Reading level' }).focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#v16')).toContainText('only begotten Son');
  await expect(page.locator('#level-description')).toContainText('Original');

  await page.reload();
  await expect(page.getByRole('slider', { name: 'Reading level' })).toHaveValue('1');
  await expect(page.locator('#v16')).toContainText('only begotten Son');
});

test('levels without written content say "coming soon" instead of breaking', async ({ page }) => {
  await page.goto('/bible/obadiah/1');
  await page.getByRole('button', { name: /Summary/ }).click();
  await expect(page.getByRole('status')).toContainText('coming soon');
  await expect(page.getByRole('slider', { name: 'Reading level' })).toHaveValue('2');
});

test('settings change the theme and the modern translation', async ({ page }) => {
  await page.goto('/settings');
  await page.getByText('Dark', { exact: true }).click();
  await page.getByText('World English Bible (WEB)').click();
  await expect(page.locator('html')).toHaveClass(/dark/);

  await page.goto('/bible/john/3');
  await expect(page.locator('#v16')).toContainText('For God so loved the world, that he gave his only born Son');
  await expect(page.locator('html')).toHaveClass(/dark/);
});

test('home page offers to continue reading', async ({ page }) => {
  await page.goto('/bible/ruth/2');
  // Wait until the interactive reader has started (Astro removes `ssr` when it hydrates).
  await page.locator('astro-island[component-export="default"]:not([ssr])').first().waitFor({ state: 'attached' });
  await expect.poll(() => page.evaluate(() => localStorage.getItem('lamplight:reader:lastRead'))).toContain('ruth');
  await page.goto('/');
  await expect(page.getByRole('link', { name: /Continue where you left off\s*Ruth 2/ })).toBeVisible();
});
