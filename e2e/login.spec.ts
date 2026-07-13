import { test, expect } from '@playwright/test';

/**
 * One full pass through the real thing: real browser, real cookies, real Vite
 * proxy, real Postgres. Everything below this file is unit-scale and mocks
 * something — this is the only test that proves the pieces fit together.
 */
test('sign up, stay signed in across a reload, then sign out', async ({ page }) => {
  // Unique email per run: this hits the real database, and sign-up is not idempotent.
  const email = `e2e-${Date.now()}@example.com`;
  const password = 'correct-horse-battery';

  await page.goto('/login');

  await page.getByRole('button', { name: /need an account/i }).click();
  await page.getByLabel('Name').fill('E2E Tester');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /sign up/i }).click();

  await expect(page.getByRole('heading', { name: /signed in/i })).toBeVisible();
  // Proves the protected endpoint answered the browser, not just the session hook —
  // this exact string is rendered from the GET /api/me response body.
  await expect(page.getByText(`E2E Tester <${email}>`)).toBeVisible();

  // The session must survive a hard reload — that's the whole point of a cookie.
  await page.reload();
  await expect(page.getByRole('heading', { name: /signed in/i })).toBeVisible();

  await page.getByRole('button', { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/login$/);

  // And the dashboard must not be reachable afterwards.
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
});
