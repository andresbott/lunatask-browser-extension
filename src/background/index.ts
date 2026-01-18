/**
 * Background Script
 * Handles popup messages - saves current page to Lunatask
 */

import browser from "webextension-polyfill";
import type {
  Config,
  ExtractedContent,
  NoteResponse,
  SaveMode,
  TaskResponse,
} from "../shared/types";

const API_BASE = "https://api.lunatask.app/v1";

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
  note?: string,
  goalId?: string,
  href?: string
): Promise<TaskResponse> {
  const task: Record<string, string> = {
    area_id: areaId,
    name: title,
  };

  if (note) {
    task.note = note;
  }

  if (goalId) {
    task.goal_id = goalId;
  }

  if (href) {
    task.href = href;
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

  const response = await fetch(`${API_BASE}/tasks`, options);

  if (response.status !== 201) {
    const data = await response.json();
    return { status: response.status, data, error: JSON.stringify(data) };
  }

  return { status: 201 };
}

async function saveNoteToLunatask(
  token: string,
  title: string,
  content: string,
  notebookId?: string
): Promise<NoteResponse> {
  const note: Record<string, string> = {
    name: title,
    content: content,
  };

  if (notebookId) {
    note.notebook_id = notebookId;
  }

  const options = {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(note),
  };

  const response = await fetch(`${API_BASE}/notes`, options);

  if (response.status === 200 || response.status === 201) {
    const data = (await response.json()) as { note: { id: string } };
    return { status: response.status, noteId: data.note.id };
  }

  if (response.status === 204) {
    return { status: 204 };
  }

  const data = await response.json();
  return { status: response.status, error: JSON.stringify(data) };
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

function formatNoteContent(content: ExtractedContent): string {
  return `Source: <${content.url}>

---

${content.content}

[editor_v2]::`;  // TODO: remove once Lunatask's API is updated to parse the
                 // new Markdown format
}

async function handleSaveNote(
  linkTask: boolean
): Promise<{ success: boolean; error?: string }> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id || !tab.url || !tab.title) {
    return { success: false, error: "No active tab" };
  }

  const data = await browser.storage.local.get("credentials");
  const credentials = data.credentials as Config | undefined;

  if (!credentials?.authToken) {
    browser.runtime.openOptionsPage();
    return { success: false, error: "Please configure credentials first" };
  }

  if (linkTask && !credentials.areaId) {
    browser.runtime.openOptionsPage();
    return { success: false, error: "Area ID required to create linked task" };
  }

  const extracted = await extractContentFromTab(tab.id);
  const content: ExtractedContent = extracted || {
    title: tab.title,
    url: tab.url,
    content: "",
  };
  const title = content.title || tab.title;
  const noteContent = formatNoteContent(content);

  const noteResult = await saveNoteToLunatask(
    credentials.authToken,
    title,
    noteContent,
    credentials.notebookId
  );

  if (noteResult.status !== 200 && noteResult.status !== 201 && noteResult.status !== 204) {
    return { success: false, error: noteResult.error || "Failed to create note" };
  }

  if (linkTask && noteResult.noteId) {
    const noteHref = `lunatask://notes/${noteResult.noteId}`;

    const taskResult = await saveToLunatask(
      credentials.areaId!,
      credentials.authToken,
      title,
      undefined,
      credentials.goalId,
      noteHref
    );

    if (taskResult.status !== 201) {
      return { success: false, error: taskResult.error || "Note created but task failed" };
    }
  }

  return { success: true };
}

browser.runtime.onMessage.addListener((message) => {
  if (message.type === "SAVE_PAGE") {
    return handleSavePage(message.mode as SaveMode);
  }
  if (message.type === "SAVE_NOTE") {
    return handleSaveNote(message.linkTask as boolean);
  }
  return Promise.resolve();
});
