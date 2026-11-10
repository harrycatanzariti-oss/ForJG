import { expect, test } from '@playwright/test';

const ask = async (page: import('@playwright/test').Page, text: string) => {
  await page.getByLabel(/What’s on your heart today|Tell me more/).fill(text);
  await page.getByRole('button', { name: 'Find guidance' }).click();
};

test('the examples from the brief go to the right place', async ({ page }) => {
  await page.goto('/guide');
  await ask(page, "I'm fearing death");
  await expect(page.getByRole('heading', { name: 'Afraid of dying' })).toBeVisible();

  await ask(page, "I can't understand death");
  await expect(page.getByRole('heading', { name: 'Trying to understand death' })).toBeVisible();

  await ask(page, "I'm mourning and I just feel like I've lost connection to god");
  await expect(page.getByRole('heading', { name: 'Grieving someone' })).toBeVisible();
  await page.getByRole('button', { name: 'Show that too' }).click();
  await expect(page.getByRole('heading', { name: 'God feels far away' })).toBeVisible();

  await ask(page, 'I know nothing about god. Whew first');
  await expect(page.getByRole('heading', { name: 'New to God and the Bible' })).toBeVisible();
});

test('ambiguous messages get a clarifying question', async ({ page }) => {
  await page.goto('/guide');
  await ask(page, 'I feel like warm');
  await expect(page.getByText('Which of these is closest')).toBeVisible();
  await page.getByRole('button', { name: 'Faith feels cold or lukewarm' }).click();
  await expect(page.getByRole('heading', { name: 'Faith feels cold or lukewarm' })).toBeVisible();
});

test('crisis language shows help first', async ({ page }) => {
  await page.goto('/guide');
  await ask(page, 'I want to die');
  await expect(page.getByRole('alert', { name: /You matter/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'findahelpline.com' })).toBeVisible();
});

test('the home page box goes straight to an answer, and passages link into the reader', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Where are you today?').fill('I feel so lonely');
  await page.getByRole('button', { name: 'Guide me' }).click();
  await expect(page.getByRole('heading', { name: 'Lonely' })).toBeVisible();
  await page.getByRole('link', { name: /Psalm 25:16/ }).click();
  await expect(page).toHaveURL(/\/bible\/psalms\/25#v16/);
});
