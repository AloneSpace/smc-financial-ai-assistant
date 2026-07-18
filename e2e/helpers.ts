import { expect, type Page } from '@playwright/test';

/** Registers a fresh user and lands on the chat page. */
export async function registerAndLogin(page: Page): Promise<string> {
  const email = `e2e_${Date.now()}_${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.goto('/register');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill('securepassword123');
  await page.getByRole('button', { name: /create account|register|sign up/i }).click();
  await expect(page).toHaveURL(/\/chat/);
  return email;
}

/** Types a question into the composer and sends it. */
export async function ask(page: Page, question: string): Promise<void> {
  const input = page.getByPlaceholder(/ask about a company/i);
  await input.click();
  await input.fill(question);
  await input.press('Enter');
}

/** Waits for the assistant answer bubble to finish streaming (Send returns). */
export async function waitForAnswer(page: Page): Promise<void> {
  // The Stop button (shown only while streaming) disappears when done.
  await expect(
    page.getByRole('button', { name: /stop generating/i }),
  ).toBeHidden({ timeout: 45_000 });
}
