/**
 * Popup Script
 * Handles save mode selection when user clicks the extension icon
 */

import browser from "webextension-polyfill";
import type { Config, SaveMode } from "../shared/types";

const saveUrlBtn = document.getElementById("save-url") as HTMLButtonElement;
const saveContentBtn = document.getElementById("save-content") as HTMLButtonElement;
const saveNoteBtn = document.getElementById("save-note") as HTMLButtonElement;
const linkTaskCheckbox = document.getElementById("link-task-checkbox") as HTMLInputElement;
const openSettingsBtn = document.getElementById("open-settings") as HTMLButtonElement;
const settingsHint = document.getElementById("settings-hint") as HTMLParagraphElement;

const statusAnnouncement = document.getElementById("status-announcement") as HTMLDivElement;

const allButtons = [saveUrlBtn, saveContentBtn, saveNoteBtn];

const originalLabels = {
  url: saveUrlBtn.textContent,
  content: saveContentBtn.textContent,
  note: saveNoteBtn.textContent,
};

async function getCredentialsState() {
  const data = await browser.storage.local.get(["credentials", "linkTaskPreference"]);
  const credentials = data.credentials as Config | undefined;
  const hasAreaId = Boolean(credentials?.areaId?.trim());
  const hasAuthToken = Boolean(credentials?.authToken?.trim());
  return {
    hasAreaId,
    hasAuthToken,
    missingCore: !hasAuthToken,
    missingAreaIdForTask: !hasAreaId,
    linkTaskPreference: data.linkTaskPreference as boolean | undefined,
  };
}

function applyButtonState(state: Awaited<ReturnType<typeof getCredentialsState>>) {
  // Disable buttons based on missing credentials
  if (state.missingCore) {
    saveUrlBtn.disabled = true;
    saveContentBtn.disabled = true;
    saveNoteBtn.disabled = true;
    linkTaskCheckbox.checked = false;
    linkTaskCheckbox.disabled = true;
  } else {
    // Enable all buttons first
    saveUrlBtn.disabled = false;
    saveContentBtn.disabled = false;
    saveNoteBtn.disabled = false;
    linkTaskCheckbox.disabled = false;

    // Task creation (url/content modes) requires areaId
    if (state.missingAreaIdForTask) {
      saveUrlBtn.disabled = true;
      saveContentBtn.disabled = true;
      // Also disable link task checkbox since linking requires areaId
      linkTaskCheckbox.checked = false;
      linkTaskCheckbox.disabled = true;
    }

  }
  // Set checkbox preference if we have core credentials and areaId (needed for linking)
  if (!state.missingCore && !state.missingAreaIdForTask) {
    linkTaskCheckbox.disabled = false;
    if (typeof state.linkTaskPreference === "boolean") {
      linkTaskCheckbox.checked = state.linkTaskPreference;
    } else {
      // Default to enabled if no preference set
      linkTaskCheckbox.checked = true;
    }
  }
  // Show settings button and hint only when all buttons are disabled
  const allDisabled = saveUrlBtn.disabled && saveContentBtn.disabled && saveNoteBtn.disabled;
  if (allDisabled) {
    openSettingsBtn.style.display = "block";
    settingsHint.style.display = "block";
    const missing: string[] = [];
    if (!state.hasAreaId) missing.push("area ID");
    if (!state.hasAuthToken) missing.push("auth token");
    settingsHint.textContent = `Missing: ${missing.join(", ")}`;
  } else {
    openSettingsBtn.style.display = "none";
    settingsHint.style.display = "none";
  }
}
async function initPopup() {
  const state = await getCredentialsState();
  applyButtonState(state);
}

function saveCheckboxPreference() {
  browser.storage.local.set({ linkTaskPreference: linkTaskCheckbox.checked });
}

function setButtonLoading(btn: HTMLButtonElement) {
  btn.innerHTML = '<span class="spinner" aria-hidden="true"></span>';
  btn.classList.add("loading");
  btn.setAttribute("aria-busy", "true");
  for (const b of allButtons) {
    if (b !== btn) b.disabled = true;
  }
}

function setButtonStatus(btn: HTMLButtonElement, message: string, type: "success" | "error") {
  btn.textContent = message;
  btn.classList.remove("loading");
  btn.classList.add(type);
  btn.removeAttribute("aria-busy");
  // Announce status to screen readers via dedicated live region
  statusAnnouncement.textContent = message;
}

async function resetButtons() {
  saveUrlBtn.textContent = originalLabels.url;
  saveContentBtn.textContent = originalLabels.content;
  saveNoteBtn.textContent = originalLabels.note;
  for (const btn of allButtons) {
    btn.classList.remove("success", "error");
  }
  // Re-evaluate disabled state based on current credentials (no UI flash)
  const state = await getCredentialsState();
  applyButtonState(state);
}

async function handleSave(mode: SaveMode) {
  const activeBtn = mode === "url" ? saveUrlBtn : saveContentBtn;

  setButtonLoading(activeBtn);

  try {
    const response = await browser.runtime.sendMessage({
      type: "SAVE_PAGE",
      mode,
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

async function handleSaveNote() {
  setButtonLoading(saveNoteBtn);

  try {
    const response = await browser.runtime.sendMessage({
      type: "SAVE_NOTE",
      linkTask: linkTaskCheckbox.checked,
    });

    if (response?.success) {
      setButtonStatus(saveNoteBtn, "Saved!", "success");
    } else {
      setButtonStatus(saveNoteBtn, response?.error || "Failed to save", "error");
    }
    setTimeout(resetButtons, 1500);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    setButtonStatus(saveNoteBtn, message, "error");
    setTimeout(resetButtons, 1500);
  }
}

initPopup();
linkTaskCheckbox.addEventListener("change", saveCheckboxPreference);
saveUrlBtn.addEventListener("click", () => handleSave("url"));
saveContentBtn.addEventListener("click", () => handleSave("content"));
saveNoteBtn.addEventListener("click", handleSaveNote);
openSettingsBtn.addEventListener("click", async () => {
  await browser.runtime.openOptionsPage();
});
