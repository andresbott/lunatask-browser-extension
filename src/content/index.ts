/**
 * Content Script
 * Runs in the context of web pages
 * Handles page content extraction via Defuddle
 */

import browser from "webextension-polyfill";
import Defuddle from "defuddle";
import TurndownService from "turndown";
import type { ExtractedContent } from "../shared/types";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

turndown.addRule("absoluteImages", {
  filter: "img",
  replacement: function (_content, node) {
    const element = node as HTMLImageElement;
    const src = element.getAttribute("src");
    const alt = element.getAttribute("alt") || "";
    if (!src) return "";

    try {
      const absoluteSrc = new URL(src, window.location.href).href;
      return `![${alt}](${absoluteSrc})`;
    } catch {
      return `![${alt}](${src})`;
    }
  },
});

function extractPageContent(): ExtractedContent {
  const result = new Defuddle(document, {
    url: window.location.href,
  }).parse();

  const markdown = turndown.turndown(result.content || "");

  return {
    title: result.title || document.title,
    content: markdown,
    url: window.location.href,
  };
}

function setupMessageListener() {
  // Listen for messages from background script
  browser.runtime.onMessage.addListener((message) => {
    switch (message.type) {
      case "EXTRACT_PAGE_CONTENT":
        try {
          const extracted = extractPageContent();
          return Promise.resolve({ success: true, data: extracted });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          return Promise.resolve({ success: false, error: errorMessage });
        }

      case "GET_PAGE_INFO":
        return Promise.resolve({
          success: true,
          data: {
            url: window.location.href,
            title: document.title,
          },
        });

      default:
        return Promise.resolve(null);
    }
  });
}

setupMessageListener();
