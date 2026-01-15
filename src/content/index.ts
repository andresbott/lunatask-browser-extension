/**
 * Content Script
 * Runs in the context of web pages
 */

import browser from "webextension-polyfill";

interface Settings {
  enabled: boolean;
  theme: string;
}

async function init() {
  console.log("[Lunatask] Content script loaded on:", window.location.href);

  // Get settings directly from storage
  const data = await browser.storage.local.get("settings");
  const settings = data.settings as Settings | undefined;

  if (!settings?.enabled) {
    console.log("[Lunatask] Extension is disabled");
    return;
  }

  // Your content script logic here
  setupMessageListener();
}

function setupMessageListener() {
  // Listen for messages from popup
  browser.runtime.onMessage.addListener((message) => {
    console.log("[Lunatask] Content script received message:", message);

    switch (message.type) {
      case "EXECUTE_ACTION":
        // Handle actions triggered from popup
        return Promise.resolve({ success: true });

      case "GET_PAGE_INFO":
        return Promise.resolve({
          url: window.location.href,
          title: document.title,
        });

      default:
        return Promise.resolve(null);
    }
  });
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
