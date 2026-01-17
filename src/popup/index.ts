/**
 * Popup Script
 * Handles save mode selection when user clicks the extension icon
 */

import browser from "webextension-polyfill";
import type { SaveMode } from "../shared/types";

const saveUrlBtn = document.getElementById("save-url") as HTMLButtonElement;
const saveContentBtn = document.getElementById("save-content") as HTMLButtonElement;
const saveNoteBtn = document.getElementById("save-note") as HTMLButtonElement;
const linkTaskCheckbox = document.getElementById("link-task-checkbox") as HTMLInputElement;

const allButtons = [saveUrlBtn, saveContentBtn, saveNoteBtn];

const originalLabels = {
  url: saveUrlBtn.textContent,
  content: saveContentBtn.textContent,
  note: saveNoteBtn.textContent,
};

async function loadCheckboxPreference() {
  const data = await browser.storage.local.get("linkTaskPreference");
  if (typeof data.linkTaskPreference === "boolean") {
    linkTaskCheckbox.checked = data.linkTaskPreference;
  }
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
}

function resetButtons() {
  saveUrlBtn.textContent = originalLabels.url;
  saveContentBtn.textContent = originalLabels.content;
  saveNoteBtn.textContent = originalLabels.note;
  for (const btn of allButtons) {
    btn.classList.remove("success", "error");
    btn.disabled = false;
  }
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

loadCheckboxPreference();
linkTaskCheckbox.addEventListener("change", saveCheckboxPreference);
saveUrlBtn.addEventListener("click", () => handleSave("url"));
saveContentBtn.addEventListener("click", () => handleSave("content"));
saveNoteBtn.addEventListener("click", handleSaveNote);
