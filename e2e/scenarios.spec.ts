import { expect, test } from '@playwright/test';
import { ask, registerAndLogin, waitForAnswer } from './helpers';

/**
 * Baseline acceptance scenarios S1–S6 (docs/11_TEST_PLAN.md). These drive the
 * real streaming UI, so a live AI key must be configured on the backend.
 * Assertions on model prose are kept lenient; assertions on grounded figures
 * (which come from SQL, not the model) are exact.
 */

test('S1 — grounded answer with SQL tool block', async ({ page }) => {
  await registerAndLogin(page);
  await ask(page, "What was Apple's net income in 2023?");

  // The execute_sql tool block appears and completes.
  await expect(page.getByText(/query complete/i)).toBeVisible({
    timeout: 30_000,
  });
  await waitForAnswer(page);

  // The exact figure comes from the database, not the model.
  await expect(page.getByText(/\$96\.99 billion/i)).toBeVisible();
});

test('S2 — missing data is reported, never fabricated', async ({ page }) => {
  await registerAndLogin(page);
  await ask(page, "What was Apple's revenue in 2021?");
  await waitForAnswer(page);

  // 2021 is outside coverage (2022–2025): the answer must say so.
  await expect(
    page.getByText(/not available|no data|does not|isn't available/i),
  ).toBeVisible();
});

test('S3 — stop generation preserves the partial answer', async ({ page }) => {
  await registerAndLogin(page);
  await ask(page, 'Compare revenue for every technology company in 2024.');

  const stop = page.getByRole('button', { name: /stop generating/i });
  await expect(stop).toBeVisible({ timeout: 30_000 });
  await stop.click();

  // Stop button disappears and a "generation stopped" marker is shown.
  await expect(stop).toBeHidden();
  await expect(page.getByText(/generation was stopped/i)).toBeVisible();
});

test('S5 — history survives a hard refresh with no duplicates', async ({
  page,
}) => {
  await registerAndLogin(page);
  await ask(page, "What was Microsoft's revenue in 2024?");
  await waitForAnswer(page);

  const url = page.url();
  await page.reload();
  await expect(page).toHaveURL(url);

  // The user question renders exactly once after reload.
  await expect(
    page.getByText("What was Microsoft's revenue in 2024?", { exact: false }),
  ).toHaveCount(1);
});

test('S6 — delete confirmation: cancel keeps, confirm removes', async ({
  page,
}) => {
  await registerAndLogin(page);
  await ask(page, "What was Tesla's net income in 2023?");
  await waitForAnswer(page);

  // Reveal the delete control on the active conversation row.
  const item = page.getByTestId('conversation-item').first();
  await item.hover();
  await item.getByRole('button', { name: /delete conversation/i }).click();

  // Cancel — conversation remains.
  await page.getByRole('button', { name: /cancel/i }).click();
  await expect(page.getByTestId('conversation-item')).toHaveCount(1);

  // Confirm — conversation is removed.
  await item.hover();
  await item.getByRole('button', { name: /delete conversation/i }).click();
  await page.getByRole('button', { name: /^delete$/i }).click();
  await expect(page.getByTestId('conversation-item')).toHaveCount(0);
});

/**
 * S4 (usage limit → 429 banner) requires the backend to run with a very low
 * USAGE_BUDGET_USD so the second request trips the guard. Enable by setting
 * RUN_S4=1 and USAGE_BUDGET_USD=0.0000001 on the backend.
 */
test('S4 — usage limit shows a friendly banner', async ({ page }) => {
  test.skip(process.env.RUN_S4 !== '1', 'Requires a near-zero USAGE_BUDGET_USD');
  await registerAndLogin(page);
  await ask(page, "What was Apple's net income in 2023?");
  await waitForAnswer(page);

  await ask(page, "What was Google's net income in 2024?");
  await expect(page.getByText(/resets in/i)).toBeVisible();
  await expect(
    page.getByPlaceholder(/usage limit reached/i),
  ).toBeDisabled();
});
