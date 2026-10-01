import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "electron-vite";

// Builds run on the OS they target, so the renderer only bundles that OS's UI folder.
const uiPlatform = process.platform === "win32" ? "win" : "mac";

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        // koffi is a native module: it has to stay a real require() at runtime.
        external: ["koffi"],
      },
    },
  },
  preload: {},
  renderer: {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@platform": resolve(__dirname, `src/renderer/src/platform/${uiPlatform}`),
      },
    },
    build: {
      rollupOptions: {
        // Main window and the always-on-screen recording pill.
        input: {
          index: resolve(__dirname, "src/renderer/index.html"),
          pill: resolve(__dirname, "src/renderer/pill.html"),
        },
      },
    },
  },
});
