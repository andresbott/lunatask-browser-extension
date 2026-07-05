/**
 * Popup Script
 * Handles save action selection when user clicks the extension icon
 */

import browser from "webextension-polyfill";
import {
  SAVE_ACTIONS,
  type SaveActionDefinition,
} from "../shared/actions";
import type { Config } from "../shared/types";

const saveActionsContainer = document.getElementById(
  "save-actions",
) as HTMLDivElement;
const openSettingsBtn = document.getElementById(
  "open-settings",
) as HTMLButtonElement;
const settingsHint = document.getElementById(
  "settings-hint",
) as HTMLParagraphElement;

const statusAnnouncement = document.getElementById(
  "status-announcement",
) as HTMLDivElement;

const popupActions = (SAVE_ACTIONS as readonly SaveActionDefinition[]).filter(
  (action) => action.popupContexts.includes("page"),
);
const actionButtons = new Map<string, HTMLButtonElement>();

async function getCredentialsState() {
  const data = await browser.storage.local.get("credentials");
  const credentials = data.credentials as Config | undefined;
  const hasAreaId = Boolean(credentials?.areaId?.trim());
  const hasAuthToken = Boolean(credentials?.authToken?.trim());
  return {
    hasAreaId,
    hasAuthToken,
    missingCore: !hasAuthToken,
    missingAreaIdForTask: !hasAreaId,
  };
}

function actionNeedsArea(action: SaveActionDefinition): boolean {
  return (
    action.action.target === "task" || action.action.target === "note-with-task"
  );
}

function isActionDisabled(
  action: SaveActionDefinition,
  state: Awaited<ReturnType<typeof getCredentialsState>>,
): boolean {
  return state.missingCore || (actionNeedsArea(action) && state.missingAreaIdForTask);
}

function renderActions() {
  saveActionsContainer.textContent = "";
  actionButtons.clear();

  for (const action of popupActions) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "save-btn";
    button.textContent = action.label;
    button.dataset.actionId = action.id;
    button.addEventListener("click", () => handleSaveAction(action.id));

    actionButtons.set(action.id, button);
    saveActionsContainer.append(button);
  }
}

function getActionButtons(): HTMLButtonElement[] {
  return [...actionButtons.values()];
}

function applyButtonState(
  state: Awaited<ReturnType<typeof getCredentialsState>>,
) {
  for (const action of popupActions) {
    const button = actionButtons.get(action.id);
    if (!button) continue;
    button.disabled = isActionDisabled(action, state);
  }

  const buttons = getActionButtons();
  const allDisabled = buttons.every((button) => button.disabled);
  if (allDisabled) {
    openSettingsBtn.style.display = "block";
    settingsHint.style.display = "block";
    settingsHint.textContent = "Missing: access token";
  } else {
    openSettingsBtn.style.display = "none";
    settingsHint.style.display = "none";
  }
}

async function initPopup() {
  renderActions();
  const state = await getCredentialsState();
  applyButtonState(state);
}

function setButtonLoading(btn: HTMLButtonElement) {
  btn.innerHTML = '<span class="spinner" aria-hidden="true"></span>';
  btn.classList.add("loading");
  btn.setAttribute("aria-busy", "true");
  for (const button of getActionButtons()) {
    if (button !== btn) button.disabled = true;
  }
}

function setButtonStatus(
  btn: HTMLButtonElement,
  message: string,
  type: "success" | "error",
) {
  btn.textContent = message;
  btn.classList.remove("loading");
  btn.classList.add(type);
  btn.removeAttribute("aria-busy");
  // Announce status to screen readers via dedicated live region
  statusAnnouncement.textContent = message;
}

async function resetButtons() {
  for (const action of popupActions) {
    const button = actionButtons.get(action.id);
    if (!button) continue;
    button.textContent = action.label;
    button.classList.remove("loading", "success", "error");
    button.removeAttribute("aria-busy");
  }

  try {
    // Re-evaluate disabled state based on current credentials (no UI flash)
    const state = await getCredentialsState();
    applyButtonState(state);
  } catch (_err) {
    console.error(
      "[Lunatask] Failed to re-evaluate credentials after reset:",
      _err,
    );
  }
}

async function handleSaveAction(actionId: string) {
  const activeBtn = actionButtons.get(actionId);
  if (!activeBtn) return;

  setButtonLoading(activeBtn);

  try {
    const response = await browser.runtime.sendMessage({
      type: "SAVE_ACTION",
      actionId,
    });

    if (response?.success) {
      setButtonStatus(activeBtn, "Saved!", "success");
    } else {
      setButtonStatus(activeBtn, response?.error || "Failed to save", "error");
    }
    setTimeout(resetButtons, 1500);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    setButtonStatus(activeBtn, message, "error");
    setTimeout(resetButtons, 1500);
  }
}

initPopup();
openSettingsBtn.addEventListener("click", async () => {
  await browser.runtime.openOptionsPage();
});
