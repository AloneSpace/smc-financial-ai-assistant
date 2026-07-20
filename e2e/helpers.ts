import { expect, type Page } from '@playwright/test';

/** Registers a fresh user and lands on the chat page. */
export async function registerAndLogin(page: Page): Promise<string> {
  const email = `e2e_${Date.now()}_${Math.floor(Math.random() * 1e6)}@example.com`;
  const password = 'securepassword123';
  await page.goto('/register');
  // Exact labels: the form also renders "Confirm Password" and "Show password"
  // controls, so a /password/i regex matches four elements.
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: /create account|register|sign up/i }).click();
  await expect(page).toHaveURL(/\/chat/);
  return email;
}

/** Types a question into the composer and sends it. */
export async function ask(page: Page, question: string): Promise<void> {
  const input = page.getByPlaceholder(/ask about a company/i);
  // The composer is disabled while the page is still loading; pressing Enter
  // then silently drops the message, so wait until it can actually accept one.
  await expect(input).toBeEnabled();
  await input.click();
  await input.fill(question);
  await expect(input).toHaveValue(question);
  await input.press('Enter');
  // The composer only clears when submit() actually fired — this confirms the
  // message was sent rather than swallowed by a race.
  await expect(input).toHaveValue('');
}

/** Waits for the assistant answer bubble to finish streaming (Send returns). */
export async function waitForAnswer(page: Page): Promise<void> {
  const stop = page.getByRole('button', { name: /stop generating/i });
  // Wait for streaming to start, otherwise "hidden" passes trivially before the
  // first token arrives. A very fast answer may finish first — that is fine.
  await stop.waitFor({ state: 'visible', timeout: 20_000 }).catch(() => {});
  // The Stop button (shown only while streaming) disappears when done.
  await expect(stop).toBeHidden({ timeout: 60_000 });
}
