import { defineConfig } from "vitest/config";

// Standalone from electron.vite.config.ts: these are plain node unit tests for the main-process
// helpers (no Electron, no renderer), so they run in a node environment with no vite plugins.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
