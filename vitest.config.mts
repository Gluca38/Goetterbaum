import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Entspricht dem Pfad-Alias "@/*" aus tsconfig.json
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    // Unit-Tests liegen neben dem Code in src/; e2e/ gehört Playwright
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
