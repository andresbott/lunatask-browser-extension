import { defineConfig } from "vite";
import webExtension from "vite-plugin-web-extension";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pkg = JSON.parse(
  readFileSync(path.join(__dirname, "package.json"), "utf-8")
) as { version: string; description?: string; homepage?: string };

const HOMEPAGE_URL =
  pkg.homepage ?? "https://github.com/andresbott/lunatask-browser-extension";

// Keep this stable across releases so Firefox updates work reliably.
// Use a UUID to avoid embedding personal identifiers in the add-on ID.
const FIREFOX_ADDON_ID = "{80c56608-4763-4e54-aff7-02d95c06d0fb}";

export default defineConfig(({ mode }) => ({
  plugins: [
    webExtension({
      // We inject the content script on-demand (instead of declaring it in the manifest),
      // but we still need it included in the bundle output.
      additionalInputs: ["src/content/index.ts"],
      manifest: () => {
        const manifest = {
          manifest_version: 3,
          name: "Lunatask",
          version: pkg.version,
          description: pkg.description ?? "Unofficial Lunatask browser companion for saving links or articles as tasks or notes.",
          homepage_url: HOMEPAGE_URL,
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
            default_popup: "src/popup/index.html",
          },
          options_ui: {
            page: "src/options/index.html",
            open_in_tab: true,
          },
          background:
            mode === "firefox"
              ? { scripts: ["src/background/index.ts"], type: "module" as const }
              : { service_worker: "src/background/index.ts", type: "module" as const },
          permissions: ["storage", "activeTab", "scripting"],
        };

        // Firefox-specific adjustments
        if (mode === "firefox") {
          (manifest as any).browser_specific_settings = {
            gecko: {
              id: FIREFOX_ADDON_ID,
              strict_min_version: "109.0",
              // Required for new AMO submissions
              // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings
              data_collection_permissions: {
                required: ["authenticationInfo", "websiteActivity", "websiteContent"],
                optional: [],
              },
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
