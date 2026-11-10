import { expect, test } from '@playwright/test';

/** Waits until the chapter reader (not just any island) is interactive. */
const hydrated = (page: import('@playwright/test').Page) =>
  expect(page.getByRole('button', { name: /Mark as read|^Read$/ })).toBeEnabled();

test('highlight and note a verse; they survive a reload', async ({ page }) => {
  await page.goto('/bible/john/1');
  await hydrated(page);
  await page.getByRole('button', { name: /^Verse 14:/ }).click();
  await page.getByRole('button', { name: 'Green highlight' }).click();
  await page.getByRole('button', { name: 'Add note' }).click();
  await page.getByLabel(/Private note/).fill('Grace and truth');
  await page.getByRole('button', { name: 'Save note' }).click();
  await page.getByRole('button', { name: 'Close' }).click();
  await page.reload();
  await expect(page.locator('#v14')).toHaveClass(/hl-green/);
  await expect(page.getByRole('button', { name: 'Your note on verse 14' })).toBeVisible();
});

test('reaching the end marks a chapter read, with undo; it shows on the progress map', async ({ page }) => {
  await page.goto('/bible/ruth/1');
  await hydrated(page);
  // Scrolling to the end of the chapter marks it as read automatically.
  await page.mouse.wheel(0, 20000);
  await expect(page.getByRole('status').filter({ hasText: 'marked as read' })).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('button', { name: 'Mark as read' })).toBeVisible();
  await page.getByRole('button', { name: 'Mark as read' }).click();
  await expect(page.getByRole('button', { name: 'Read', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/progress');
  await expect(page.locator('dl')).toContainText('1 of 1,189');
  await expect(page.getByRole('img', { name: 'Ruth: 1 of 4 chapters read' })).toBeVisible();
});

test('the traditions notes panel opens from a passage', async ({ page }) => {
  await page.goto('/bible/matthew/16');
  await hydrated(page);
  await page
    .getByRole('button', { name: /How traditions read this/ })
    .first()
    .click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('On this rock I will build My church');
  await expect(dialog.getByRole('link', { name: 'Catholic' })).toBeVisible();
});

test('Plain and Summary levels work where content exists', async ({ page }) => {
  await page.goto('/bible/mark/1');
  await hydrated(page);
  await page.getByRole('button', { name: 'Summary' }).click();
  await expect(page.getByRole('heading', { name: 'The big idea' })).toBeVisible();
  await expect(page.getByText('Draft, not yet reviewed')).toBeVisible();
  await page.getByRole('button', { name: 'Plain', exact: false }).first().click();
  await expect(page.getByText('Verses 1–8')).toBeVisible();
});

test('search finds references and phrases', async ({ page }) => {
  await page.goto('/search');
  await page.locator('astro-island[component-url*="SearchPage"]:not([ssr])').waitFor({ state: 'attached' });
  await page.getByLabel(/Search for a reference/).fill('Rom 8:28');
  await expect(page.getByRole('link', { name: /Go to\s*Romans 8:28/ })).toBeVisible();
  await page.getByLabel(/Search for a reference/).fill('"good shepherd"');
  await expect(page.getByRole('link', { name: /John 10:11/ })).toBeVisible();
});

test('export and re-import data', async ({ page }) => {
  await page.goto('/bible/ruth/2');
  await hydrated(page);
  await page.goto('/settings');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export my data' }).click(),
  ]);
  const path = await download.path();
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Delete all my data' }).click();
  await expect(page.getByRole('status')).toContainText('deleted');
  await page.getByLabel('Import my data').setInputFiles(path!);
  await expect(page.getByRole('status')).toContainText('Restored');
  await page.goto('/');
  await expect(page.getByRole('link', { name: /Continue where you left off\s*Ruth 2/ })).toBeVisible();
});
