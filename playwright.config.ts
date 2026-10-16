import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Lokal kommen die Supabase-Zugangsdaten aus .env.local (wie bei Next.js).
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const isCI = !!process.env.CI;

// In der CI laufen die Tests gegen die Vercel-Preview des Pull Requests
// (mit Supabase-Staging). Ohne diese Adresse wird lokal getestet.
const previewUrl = process.env.E2E_BASE_URL;

// Vercel schützt Previews vor fremden Besuchern. Mit diesem Geheimnis
// dürfen die Tests trotzdem hinein.
const vercelBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "html",
  // Jeder Testlauf legt eigene Test-Firmen an und räumt sie danach auf.
  globalSetup: "./e2e/testumgebung/setup.ts",
  globalTeardown: "./e2e/testumgebung/teardown.ts",
  use: {
    baseURL: previewUrl ?? "http://localhost:3000",
    trace: "on-first-retry",
    extraHTTPHeaders: vercelBypass
      ? {
          "x-vercel-protection-bypass": vercelBypass,
          "x-vercel-set-bypass-cookie": "true",
        }
      : undefined,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Lokal startet der Entwicklungsserver automatisch.
  webServer: previewUrl
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
      },
});
