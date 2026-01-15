/**
 * Popup Script
 * Handles save mode selection when user clicks the extension icon
 */

import browser from "webextension-polyfill";
import type { SaveMode } from "../shared/types";

const saveUrlBtn = document.getElementById("save-url") as HTMLButtonElement;
const saveContentBtn = document.getElementById("save-content") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLDivElement;

function showStatus(message: string, type: "success" | "error" | "warning") {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
}

function disableButtons() {
  saveUrlBtn.disabled = true;
  saveContentBtn.disabled = true;
}

async function handleSave(mode: SaveMode) {
  disableButtons();
  
  try {
    const response = await browser.runtime.sendMessage({
      type: "SAVE_PAGE",
      mode,
    });

    if (response?.success) {
      showStatus("Saved!", "success");
      setTimeout(() => window.close(), 800);
    } else {
      showStatus(response?.error || "Failed to save", "error");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    showStatus(message, "error");
  }
}

saveUrlBtn.addEventListener("click", () => handleSave("url"));
saveContentBtn.addEventListener("click", () => handleSave("content"));
