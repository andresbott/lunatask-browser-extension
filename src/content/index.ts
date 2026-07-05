/**
 * Content Script
 * Runs in the context of web pages
 * Handles page content extraction via Defuddle
 */

import browser from "webextension-polyfill";
import Defuddle from "defuddle";
import TurndownService from "turndown";
import type { ExtractedContent, PageState } from "../shared/types";

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

function escapeMarkdownLinkDestination(url: string): string {
  return `<${url.replace(/</g, "%3C").replace(/>/g, "%3E")}>`;
}

function escapeMarkdownTitle(title: string): string {
  return title
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/[\r\n]+/g, " ");
}

turndown.addRule("absoluteLinks", {
  filter: "a",
  replacement: function (content, node) {
    const element = node as HTMLAnchorElement;
    const href = element.getAttribute("href");
    const title = element.getAttribute("title");
    if (!href) return content;

    let absoluteHref = href;
    try {
      absoluteHref = new URL(href, window.location.href).href;
    } catch {
      // Keep the original href when URL parsing fails.
    }

    const titlePart = title ? ` "${escapeMarkdownTitle(title)}"` : "";
    const destination = escapeMarkdownLinkDestination(absoluteHref);
    return `[${content}](${destination}${titlePart})`;
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

function getPageState(): PageState {
  const selection = window.getSelection();
  return {
    title: document.title,
    url: window.location.href,
    hasSelection: Boolean(
      selection && !selection.isCollapsed && selection.toString().trim(),
    ),
  };
}

function extractSelectionContent(): ExtractedContent {
  const selection = window.getSelection();
  const container = document.createElement("div");

  if (selection && !selection.isCollapsed) {
    for (let index = 0; index < selection.rangeCount; index += 1) {
      if (index > 0) {
        container.append(document.createTextNode("\n\n"));
      }

      container.append(selection.getRangeAt(index).cloneContents());
    }
  }

  return {
    title: document.title,
    content: turndown.turndown(container.innerHTML),
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

      case "EXTRACT_SELECTION":
        try {
          const extracted = extractSelectionContent();
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

      case "GET_STATE":
        return Promise.resolve({
          success: true,
          data: getPageState(),
        });

      default:
        return Promise.resolve(null);
    }
  });
}

setupMessageListener();
