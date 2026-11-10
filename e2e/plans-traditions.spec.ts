import { expect, test } from '@playwright/test';

test('start a plan in the past, get a gentle prompt, and adjust', async ({ page }) => {
  await page.goto('/plans/gospels-30');
  const d = new Date();
  d.setDate(d.getDate() - 3);
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  // The form becomes usable once the page is interactive.
  await expect(page.getByRole('button', { name: 'Start this plan' })).toBeEnabled();
  await page.getByLabel('Start date').fill(iso);
  await page.getByRole('button', { name: 'Start this plan' }).click();
  await expect(page.getByText(/You’re 3 days behind/)).toBeVisible();
  await page.getByRole('button', { name: 'Adjust my plan' }).click();
  await expect(page.getByText(/days behind/)).toHaveCount(0);
  await expect(page.getByText('Today: day 1 of 30')).toBeVisible();
  await page.goto('/');
  await expect(page.getByText('Gospels in 30 days')).toBeVisible();
});

test('compare reads and writes a shareable URL', async ({ page }) => {
  await page.goto('/traditions/compare?a=lutheran&b=quaker');
  await expect(page.getByLabel('First')).toHaveValue('lutheran');
  await expect(page.getByLabel('Second')).toHaveValue('quaker');
  await page.getByLabel('Third (optional)').selectOption('methodist');
  await expect(page).toHaveURL(/c=methodist/);
});

test('the quiz gives three results that link to profiles', async ({ page }) => {
  await page.goto('/traditions/quiz');
  await page.getByRole('button', { name: 'Start' }).click();
  for (let i = 0; i < 18; i++) await page.locator('fieldset label').first().click();
  await page.getByRole('button', { name: 'See my results' }).click();
  await expect(page.getByRole('heading', { name: 'Your closest traditions' })).toBeVisible();
  await expect(page.locator('ol > li h3')).toHaveCount(3);
  await expect(page.getByText(/starting point for exploring, not a verdict/)).toBeVisible();
});

test('family tree dots explain each split', async ({ page }) => {
  await page.goto('/traditions/tree');
  await page
    .getByRole('button', { name: /Great Schism/ })
    .first()
    .focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'The Great Schism (East and West)' }).first()).toBeVisible();
});
