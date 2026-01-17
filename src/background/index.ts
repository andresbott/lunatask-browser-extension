/**
 * Background Script
 * Handles popup messages - saves current page to Lunatask
 */

import browser from "webextension-polyfill";
import type {
  Config,
  ExtractedContent,
  SaveMode,
  TaskResponse,
} from "../shared/types";

async function extractContentFromTab(
  tabId: number
): Promise<ExtractedContent | null> {
  try {
    const response = await browser.tabs.sendMessage(tabId, {
      type: "EXTRACT_PAGE_CONTENT",
    });
    if (response?.success && response.data) {
      return response.data as ExtractedContent;
    }
    console.error("[Lunatask] Content extraction failed:", response?.error);
    return null;
  } catch (error) {
    console.error(
      "[Lunatask] Failed to communicate with content script:",
      error
    );
    return null;
  }
}

function formatTaskNote(
  content: ExtractedContent,
  saveMode: SaveMode
): string {
  if (saveMode === "url" || !content.content) {
    return `<${content.url}>`;
  }
  return `Source: <${content.url}>

---

${content.content}

[editor_v2]::`;  // TODO: remove once Lunatask's API is updated to parse the
                 // new Markdown format
}

async function saveToLunatask(
  areaId: string,
  token: string,
  title: string,
  note: string,
  goalId?: string
): Promise<TaskResponse> {
  const task: Record<string, string> = {
    area_id: areaId,
    name: title,
    note: note,
  };

  if (goalId) {
    task.goal_id = goalId;
  }

  const options = {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ task }),
  };

  const response = await fetch("https://api.lunatask.app/v1/tasks", options);

  if (response.status !== 201) {
    const data = await response.json();
    return { status: response.status, data, error: JSON.stringify(data) };
  }

  return { status: 201 };
}

async function handleSavePage(
  mode: SaveMode
): Promise<{ success: boolean; error?: string }> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id || !tab.url || !tab.title) {
    return { success: false, error: "No active tab" };
  }

  const data = await browser.storage.local.get("credentials");
  const credentials = data.credentials as Config | undefined;

  if (!credentials?.areaId || !credentials?.authToken) {
    browser.runtime.openOptionsPage();
    return { success: false, error: "Please configure credentials first" };
  }

  let title = tab.title;
  let content: ExtractedContent = {
    title: tab.title,
    url: tab.url,
    content: "",
  };

  if (mode === "content") {
    const extracted = await extractContentFromTab(tab.id);
    if (extracted) {
      content = extracted;
      title = extracted.title || tab.title;
    }
  }

  const note = formatTaskNote(content, mode);

  const result = await saveToLunatask(
    credentials.areaId,
    credentials.authToken,
    title,
    note,
    credentials.goalId
  );

  if (result.status === 201) {
    return { success: true };
  }

  return { success: false, error: result.error || "Unknown error" };
}

browser.runtime.onMessage.addListener((message) => {
  if (message.type === "SAVE_PAGE") {
    return handleSavePage(message.mode as SaveMode);
  }
  return Promise.resolve();
});
