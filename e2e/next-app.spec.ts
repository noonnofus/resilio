import { expect, test } from '@playwright/test';

test('hydrates the public error form without console failures', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Resilio Next.js integration example' })).toBeVisible();

  await page.getByLabel('Name').fill('x');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('입력 내용을 확인해 주세요.')).toBeVisible();
  expect(consoleErrors.filter((message) => message.includes('hydration'))).toEqual([]);
});

test('preserves Next.js notFound and redirect control flow', async ({ page }) => {
  const missingResponse = await page.goto('/missing');
  expect(missingResponse?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: '페이지를 찾을 수 없습니다.' })).toBeVisible();

  await page.goto('/redirect-test');
  await expect(page).toHaveURL('/');
});

test('uses the framework fallback without exposing unexpected error details', async ({ page }) => {
  await page.goto('/unexpected');
  await expect(page.getByRole('heading', { name: '요청을 처리하지 못했습니다.' })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('SENSITIVE_DATABASE_CONNECTION_STRING');
});
