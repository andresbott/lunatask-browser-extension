/**
 * Popup Script
 * Handles save mode selection when user clicks the extension icon
 */

import browser from "webextension-polyfill";
import type { SaveMode } from "../shared/types";

const saveUrlBtn = document.getElementById("save-url") as HTMLButtonElement;
const saveContentBtn = document.getElementById("save-content") as HTMLButtonElement;

const originalLabels = {
  url: saveUrlBtn.textContent,
  content: saveContentBtn.textContent,
};

function setButtonLoading(btn: HTMLButtonElement, other: HTMLButtonElement) {
  btn.innerHTML = '<span class="spinner" aria-hidden="true"></span>';
  btn.classList.add("loading");
  btn.setAttribute("aria-busy", "true");
  other.disabled = true;
}

function setButtonStatus(btn: HTMLButtonElement, message: string, type: "success" | "error") {
  btn.textContent = message;
  btn.classList.remove("loading");
  btn.classList.add(type);
  btn.removeAttribute("aria-busy");
}

async function handleSave(mode: SaveMode) {
  const activeBtn = mode === "url" ? saveUrlBtn : saveContentBtn;
  const otherBtn = mode === "url" ? saveContentBtn : saveUrlBtn;

  setButtonLoading(activeBtn, otherBtn);

  try {
    const response = await browser.runtime.sendMessage({
      type: "SAVE_PAGE",
      mode,
    });

    if (response?.success) {
      setButtonStatus(activeBtn, "Saved!", "success");
      setTimeout(() => window.close(), 800);
    } else {
      setButtonStatus(activeBtn, response?.error || "Failed to save", "error");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    setButtonStatus(activeBtn, message, "error");
  }
}

saveUrlBtn.addEventListener("click", () => handleSave("url"));
saveContentBtn.addEventListener("click", () => handleSave("content"));
