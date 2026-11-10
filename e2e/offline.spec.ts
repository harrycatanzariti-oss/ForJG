import { expect, test } from '@playwright/test';

test('chapters you have opened work offline; others show the offline page', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'service worker test runs in Chromium');
  await page.goto('/bible/john/3');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload(); // now controlled by the service worker
  await page.waitForTimeout(1000);
  await context.setOffline(true);
  await page.goto('/bible/john/3');
  await expect(page.locator('#v16')).toContainText('For God so loved the world');
  await page.goto('/bible/obadiah/1');
  await expect(page.getByRole('heading', { name: 'You’re offline' })).toBeVisible();
  await context.setOffline(false);
});
