import { defineConfig } from "@playwright/test";
const port = Number(process.env.STUDIO_TEST_PORT || 3100);
export default defineConfig({
  testDir: "./tests/browser",
  timeout: 120_000,
  expect: { timeout: 10_000 },
  workers: 1,
  use: {
    baseURL: `http://localhost:${port}`,
    viewport: { width: 1440, height: 1050 },
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    // Browser tests mock generation; never use a developer's provider credentials.
    env: { CLOUDFLARE_ACCOUNT_ID: "", CLOUDFLARE_API_TOKEN: "" },
    command: `npm run start -- --port ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  reporter: "list",
});
