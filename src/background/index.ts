/**
 * Background Script
 * Handles popup messages - saves current page to Lunatask
 */

import browser from "webextension-polyfill";
import {
  SAVE_ACTIONS,
  SAVE_ACTIONS_BY_ID,
  type SaveActionDefinition,
  type SaveActionId,
} from "../shared/actions";
import type {
  Config,
  ExtractedContent,
  NoteResponse,
  SaveAction,
  SaveMode,
  TaskResponse,
} from "../shared/types";

const API_BASE = "https://api.lunatask.app/v1";

// vite-plugin-web-extension guarantees stable output paths for additionalInputs
// entries: trimExtension(input) + ".js", no hashing. A single hardcoded path is
// fine for one script. If we add more injected scripts, consider switching to the
// plugin's bundleInfoJsonPath option, which emits a build-time JSON map of input
// paths to output paths — designed exactly for dynamic injection via
// browser.scripting.executeScript.
const CONTENT_SCRIPT = "src/content/index.js";

type ContentScriptResponse<T> =
  { success: true; data: T } | { success: false; error: string };

type SaveResult = { success: boolean; error?: string };
type PageInfo = { url: string; title: string };
type SaveTarget = SaveAction["target"];
type SaveContext = {
  tab?: browser.Tabs.Tab;
  pageInfo?: PageInfo;
  linkUrl?: string;
  linkTitle?: string;
};
type CapturedSource = {
  title: string;
  url: string;
  content?: string;
};

type CredentialsResult =
  { success: true; credentials: Config } | { success: false; error: string };

type CaptureResult =
  { success: true; source: CapturedSource } | { success: false; error: string };

type PageContextResult =
  { success: true; context: SaveContext } | { success: false; error: string };

async function sendMessageWithOptionalInjection<T>(
  tabId: number,
  message: unknown,
): Promise<ContentScriptResponse<T>> {
  try {
    return (await browser.tabs.sendMessage(
      tabId,
      message,
    )) as ContentScriptResponse<T>;
  } catch (_err) {
    // Content scripts are injected on-demand to avoid broad host permissions.
    try {
      await browser.scripting.executeScript({
        target: { tabId },
        files: [CONTENT_SCRIPT],
      });
    } catch (error) {
      console.error("[Lunatask] Failed to inject content script:", error);
      return { success: false, error: "Failed to inject content script" };
    }

    try {
      return (await browser.tabs.sendMessage(
        tabId,
        message,
      )) as ContentScriptResponse<T>;
    } catch (error) {
      console.error(
        "[Lunatask] Failed to communicate with content script:",
        error,
      );
      return {
        success: false,
        error: "Failed to communicate with content script",
      };
    }
  }
}

async function extractContentFromTab(
  tabId: number,
): Promise<ExtractedContent | null> {
  const response = await sendMessageWithOptionalInjection<ExtractedContent>(
    tabId,
    { type: "EXTRACT_PAGE_CONTENT" },
  );

  if (response.success) return response.data;
  console.error("[Lunatask] Content extraction failed:", response.error);
  return null;
}

async function getPageInfoFromTab(
  tabId: number,
): Promise<PageInfo | null> {
  const response = await sendMessageWithOptionalInjection<{
    url: string;
    title: string;
  }>(tabId, { type: "GET_PAGE_INFO" });

  if (response.success) return response.data;
  console.error("[Lunatask] Failed to get page info:", response.error);
  return null;
}

/**
 * Get page URL and title, preferring tab properties (no injection)
 * and falling back to content script only when needed.
 */
async function getPageInfo(tab: browser.Tabs.Tab): Promise<PageInfo | null> {
  // Prefer tab properties directly - no content script injection needed
  if (tab.url && tab.title) {
    return { url: tab.url, title: tab.title };
  }

  // Fall back to content script for restricted contexts
  if (tab.id) {
    return getPageInfoFromTab(tab.id);
  }

  return null;
}

async function getActiveTab(): Promise<browser.Tabs.Tab | undefined> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function formatContentBody(source: CapturedSource): string {
  return `Source: <${source.url}>

---

${source.content ?? ""}

[editor_v2]::`; // TODO: remove once Lunatask's API is updated to parse the
  // new Markdown format
}

function formatTaskBody(source: CapturedSource): string {
  if (!source.content) {
    return `<${source.url}>`;
  }

  return formatContentBody(source);
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch (_error) {
    return text;
  }
}

function getStringProperty(data: unknown, key: string): string | undefined {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return undefined;
  }

  const value = (data as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

function getStringArrayProperty(
  data: unknown,
  key: string,
): string[] | undefined {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return undefined;
  }

  const value = (data as Record<string, unknown>)[key];
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : undefined;
}

function humanizeValidationError(error: string): string {
  switch (error) {
    case "area_id cannot be blank":
      return "Choose a valid Lunatask area before creating this task.";
    case "area_id must exist":
      return "The selected Lunatask area no longer exists or is unavailable. Update your settings.";
    default:
      return error
        .replace(/_/g, " ")
        .replace(/\bapi\b/gi, "API")
        .replace(/^./, (char) => char.toUpperCase());
  }
}

function formatLunataskError(
  status: number,
  data: unknown,
  fallback: string,
): string {
  const error = getStringProperty(data, "error");
  const errors = getStringArrayProperty(data, "errors");

  if (status === 401 || error === "Unauthorized") {
    return "Lunatask authorization failed. Please reconnect your account.";
  }

  if (status === 404 || error === "Not found") {
    return "The requested Lunatask item could not be found. It may have been deleted.";
  }

  if (errors?.length) {
    return errors.map(humanizeValidationError).join(" ");
  }

  if (error) {
    return humanizeValidationError(error);
  }

  if (status === 400) {
    return "Lunatask could not understand the request. Please try again or update the extension.";
  }

  if (status >= 500) {
    return "Lunatask is having trouble right now. Please try again later.";
  }

  return fallback;
}

function formatLunataskRequestError(error: unknown): string {
  console.error("[Lunatask] Request failed:", error);
  return "Could not reach Lunatask. Check your connection and try again.";
}

async function saveToLunatask(
  areaId: string,
  token: string,
  title: string,
  note?: string,
  goalId?: string,
  href?: string,
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

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/tasks`, options);
  } catch (error) {
    return { status: 0, error: formatLunataskRequestError(error) };
  }

  if (response.status !== 201) {
    const data = await parseResponseBody(response);
    return {
      status: response.status,
      data,
      error: formatLunataskError(
        response.status,
        data,
        "Failed to create task",
      ),
    };
  }

  return { status: 201 };
}

async function saveNoteToLunatask(
  token: string,
  title: string,
  content: string,
  notebookId?: string,
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

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/notes`, options);
  } catch (error) {
    return { status: 0, error: formatLunataskRequestError(error) };
  }

  if (response.status === 200 || response.status === 201) {
    const data = (await response.json()) as { note: { id: string } };
    return { status: response.status, noteId: data.note.id };
  }

  if (response.status === 204) {
    return { status: 204 };
  }

  const data = await parseResponseBody(response);
  return {
    status: response.status,
    error: formatLunataskError(response.status, data, "Failed to create note"),
  };
}

async function requireCredentials(
  target: SaveTarget,
): Promise<CredentialsResult> {
  const data = await browser.storage.local.get("credentials");
  const credentials = data.credentials as Config | undefined;

  if (!credentials?.authToken) {
    browser.runtime.openOptionsPage();
    return { success: false, error: "Please configure credentials first" };
  }

  if (
    (target === "task" || target === "note-with-task") &&
    !credentials.areaId
  ) {
    browser.runtime.openOptionsPage();
    return {
      success: false,
      error:
        target === "note-with-task"
          ? "Area ID required to create linked task"
          : "Please configure credentials first",
    };
  }

  return { success: true, credentials };
}

function capturePageUrl(context: SaveContext): CaptureResult {
  if (!context.pageInfo?.url || !context.pageInfo.title) {
    return { success: false, error: "Failed to read current page" };
  }

  return {
    success: true,
    source: {
      title: context.pageInfo.title,
      url: context.pageInfo.url,
    },
  };
}

async function capturePageContent(
  context: SaveContext,
): Promise<CaptureResult> {
  if (!context.pageInfo?.url || !context.pageInfo.title) {
    return { success: false, error: "Failed to read current page" };
  }

  if (!context.tab?.id) {
    return { success: false, error: "Cannot extract content from this page" };
  }

  const extracted = await extractContentFromTab(context.tab.id);
  if (extracted) {
    return {
      success: true,
      source: {
        title: extracted.title || context.pageInfo.title,
        url: extracted.url,
        content: extracted.content,
      },
    };
  }

  return {
    success: true,
    source: {
      title: context.pageInfo.title,
      url: context.pageInfo.url,
      content: "",
    },
  };
}

function captureLink(context: SaveContext): CaptureResult {
  if (!context.linkUrl) {
    return { success: false, error: "No link URL found" };
  }

  return {
    success: true,
    source: {
      title: context.linkTitle?.trim() || context.linkUrl,
      url: context.linkUrl,
    },
  };
}

async function captureSource(
  action: SaveAction,
  context: SaveContext,
): Promise<CaptureResult> {
  switch (action.source) {
    case "page-url":
      return capturePageUrl(context);
    case "link":
      return captureLink(context);
    case "page":
      return capturePageContent(context);
    case "selection":
      return { success: false, error: "Selection saving is not available yet" };
  }
}

async function deliverTask(
  source: CapturedSource,
  credentials: Config,
): Promise<SaveResult> {
  const result = await saveToLunatask(
    credentials.areaId,
    credentials.authToken,
    source.title,
    formatTaskBody(source),
    credentials.goalId,
  );

  if (result.status === 201) {
    return { success: true };
  }

  return { success: false, error: result.error || "Unknown error" };
}

async function deliverNote(
  source: CapturedSource,
  credentials: Config,
  createLinkedTask: boolean,
): Promise<SaveResult> {
  const noteResult = await saveNoteToLunatask(
    credentials.authToken,
    source.title,
    formatContentBody(source),
    credentials.notebookId,
  );

  if (
    noteResult.status !== 200 &&
    noteResult.status !== 201 &&
    noteResult.status !== 204
  ) {
    return {
      success: false,
      error: noteResult.error || "Failed to create note",
    };
  }

  if (createLinkedTask && noteResult.noteId) {
    const noteHref = `lunatask://notes/${noteResult.noteId}`;
    const taskNote = `Note: [${source.title}](${noteHref})`;

    const taskResult = await saveToLunatask(
      credentials.areaId!,
      credentials.authToken,
      source.title,
      taskNote,
      credentials.goalId,
      noteHref,
    );

    if (taskResult.status !== 201) {
      return {
        success: false,
        error: taskResult.error || "Note created but task failed",
      };
    }
  }

  return { success: true };
}

async function deliverSave(
  action: SaveAction,
  source: CapturedSource,
  credentials: Config,
): Promise<SaveResult> {
  switch (action.target) {
    case "task":
      return deliverTask(source, credentials);
    case "note":
      return deliverNote(source, credentials, false);
    case "note-with-task":
      return deliverNote(source, credentials, true);
  }
}

async function executeSave(
  action: SaveAction,
  context: SaveContext,
): Promise<SaveResult> {
  const credentials = await requireCredentials(action.target);
  if (!credentials.success) {
    return { success: false, error: credentials.error };
  }

  const captured = await captureSource(action, context);
  if (!captured.success) {
    return { success: false, error: captured.error };
  }

  return deliverSave(action, captured.source, credentials.credentials);
}

async function getPageSaveContext(
  sourceTab?: browser.Tabs.Tab,
): Promise<PageContextResult> {
  const tab = sourceTab ?? (await getActiveTab());

  if (!tab) {
    return { success: false, error: "No active tab" };
  }

  const pageInfo = await getPageInfo(tab);
  if (!pageInfo?.url || !pageInfo.title) {
    return { success: false, error: "Failed to read current page" };
  }

  return { success: true, context: { tab, pageInfo } };
}

async function handleSavePage(
  mode: SaveMode,
  sourceTab?: browser.Tabs.Tab,
): Promise<SaveResult> {
  const context = await getPageSaveContext(sourceTab);
  if (!context.success) return context;

  return executeSave(
    { source: mode === "url" ? "page-url" : "page", target: "task" },
    context.context,
  );
}

async function handleSaveLink(
  url: string,
  title?: string,
): Promise<SaveResult> {
  return executeSave(
    { source: "link", target: "task" },
    { linkUrl: url, linkTitle: title },
  );
}

async function handleSaveNote(
  linkTask: boolean,
  sourceTab?: browser.Tabs.Tab,
): Promise<SaveResult> {
  const tab = sourceTab ?? (await getActiveTab());

  if (!tab?.id) {
    return { success: false, error: "No active tab" };
  }

  const context = await getPageSaveContext(tab);
  if (!context.success) return context;

  return executeSave(
    { source: "page", target: linkTask ? "note-with-task" : "note" },
    context.context,
  );
}

async function handleContextMenuAction(
  definition: SaveActionDefinition,
  info: browser.Menus.OnClickData,
  tab?: browser.Tabs.Tab,
): Promise<SaveResult> {
  if (definition.action.source === "link") {
    return executeSave(definition.action, {
      tab,
      linkUrl: info.linkUrl,
      linkTitle: info.linkText || info.selectionText,
    });
  }

  const context = await getPageSaveContext(tab);
  if (!context.success) return context;

  return executeSave(definition.action, context.context);
}

async function handlePopupAction(
  definition: SaveActionDefinition,
): Promise<SaveResult> {
  if (definition.action.source === "link") {
    return { success: false, error: "Cannot save a link from the popup" };
  }

  const context = await getPageSaveContext();
  if (!context.success) return context;

  return executeSave(definition.action, context.context);
}

async function createContextMenus() {
  await browser.contextMenus.removeAll();

  for (const action of SAVE_ACTIONS) {
    if (!action.contextMenuContexts.length) continue;

    browser.contextMenus.create({
      id: action.id,
      title: action.label,
      contexts: [...action.contextMenuContexts],
    });
  }
}

async function notifyContextMenuResult(
  promise: Promise<SaveResult>,
  successMessage: string,
) {
  let result: SaveResult;
  try {
    result = await promise;
  } catch (error) {
    console.error("[Lunatask] Context menu save failed:", error);
    result = {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to save to Lunatask",
    };
  }

  await browser.notifications.create({
    type: "basic",
    iconUrl: browser.runtime.getURL("icons/icon-48.png"),
    title: result.success ? "Lunatask" : "Lunatask save failed",
    message: result.success
      ? successMessage
      : result.error || "Failed to save to Lunatask",
  });
  return result;
}

browser.runtime.onInstalled.addListener((details) => {
  createContextMenus().catch((error) => {
    console.error("[Lunatask] Failed to create context menus:", error);
  });

  if (details.reason === "install") {
    browser.runtime.openOptionsPage();
  }
});

browser.runtime.onStartup.addListener(() => {
  createContextMenus().catch((error) => {
    console.error("[Lunatask] Failed to create context menus:", error);
  });
});

browser.contextMenus.onClicked.addListener((info, tab) => {
  const menuItemId =
    typeof info.menuItemId === "string" ? info.menuItemId : undefined;
  const action = menuItemId
    ? SAVE_ACTIONS_BY_ID[menuItemId as SaveActionId]
    : undefined;

  if (action) {
    return notifyContextMenuResult(
      handleContextMenuAction(action, info, tab),
      action.successMessage,
    );
  }

  return Promise.resolve();
});

browser.runtime.onMessage.addListener((message) => {
  if (message.type === "SAVE_ACTION") {
    const action = SAVE_ACTIONS_BY_ID[message.actionId as SaveActionId];
    if (!action) {
      return Promise.resolve({
        success: false,
        error: "Unknown save action",
      });
    }

    return handlePopupAction(action);
  }

  if (message.type === "SAVE_PAGE") {
    return handleSavePage(message.mode as SaveMode);
  }
  if (message.type === "SAVE_NOTE") {
    return handleSaveNote(message.linkTask as boolean);
  }
  return Promise.resolve();
});
