import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config for the baseline scenarios (S1–S6). Assumes the full stack is
 * already running (frontend + backend + Postgres + Redis) and a REAL AI key is
 * configured — the scenarios drive live streaming answers.
 *
 *   BASE_URL   frontend origin (default http://localhost:5173)
 *
 * Run:  npm i -D @playwright/test && npx playwright test
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
