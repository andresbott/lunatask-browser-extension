import { defineConfig } from "vite";
import webExtension from "vite-plugin-web-extension";

export default defineConfig(({ mode }) => ({
  plugins: [
    webExtension({
      manifest: () => {
        const manifest = {
          manifest_version: 3,
          name: "Lunatask Extension",
          version: "0.1.0",
          description: "Lunatask browser extension",
          icons: {
            "16": "icons/icon-16.png",
            "32": "icons/icon-32.png",
            "48": "icons/icon-48.png",
            "128": "icons/icon-128.png",
          },
          action: {
            default_icon: {
              "16": "icons/icon-16.png",
              "32": "icons/icon-32.png",
              "48": "icons/icon-48.png",
            },
          },
          options_ui: {
            page: "src/options/index.html",
            open_in_tab: true,
          },
          background:
            mode === "firefox"
              ? { scripts: ["src/background/index.ts"], type: "module" as const }
              : { service_worker: "src/background/index.ts", type: "module" as const },
          content_scripts: [
            {
              matches: ["<all_urls>"],
              js: ["src/content/index.ts"],
              run_at: "document_idle",
            },
          ],
          permissions: ["storage", "activeTab", "scripting"],
          host_permissions: ["<all_urls>"],
        };

        // Firefox-specific adjustments
        if (mode === "firefox") {
          (manifest as any).browser_specific_settings = {
            gecko: {
              id: "lunatask-extension@example.com",
              strict_min_version: "109.0",
            },
          };
        }

        return manifest;
      },
      webExtConfig: {
        startUrl: ["https://example.com"],
      },
    }),
  ],
  build: {
    outDir: mode === "firefox" ? "dist-firefox" : "dist",
    emptyOutDir: true,
  },
}));
