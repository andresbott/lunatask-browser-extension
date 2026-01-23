/**
 * Options Page Script
 * Handles settings form for Area ID and Auth Token
 */

import browser from "webextension-polyfill";
import type { Config } from "../shared/types";

const form = document.getElementById("settings-form") as HTMLFormElement;
const areaIdInput = document.getElementById("area-id") as HTMLInputElement;
const authTokenInput = document.getElementById("access-token") as HTMLInputElement;
const goalIdInput = document.getElementById("goal-id") as HTMLInputElement;
const notebookIdInput = document.getElementById("notebook-id") as HTMLInputElement;
const toggleTokenBtn = document.getElementById("toggle-token") as HTMLButtonElement;
const statusMessage = document.getElementById("status-message") as HTMLDivElement;

function updateFieldStates() {
  const hasToken = authTokenInput.value.trim().length > 0;
  const hasAreaId = areaIdInput.value.trim().length > 0;

  areaIdInput.disabled = !hasToken;
  goalIdInput.disabled = !hasToken || !hasAreaId;
  notebookIdInput.disabled = !hasToken;
}

async function init() {
  const data = await browser.storage.local.get("credentials");
  const credentials = data.credentials as Config | undefined;

  if (credentials) {
    areaIdInput.value = credentials.areaId || "";
    authTokenInput.value = credentials.authToken || "";
    goalIdInput.value = credentials.goalId || "";
    notebookIdInput.value = credentials.notebookId || "";
  }

  updateFieldStates();
  setupEventListeners();
}

function setupEventListeners() {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await saveCredentials();
  });

  toggleTokenBtn.addEventListener("click", () => {
    const isHidden = authTokenInput.type === "password";
    authTokenInput.type = isHidden ? "text" : "password";
    toggleTokenBtn.textContent = isHidden ? "Hide" : "Show";
    toggleTokenBtn.setAttribute("aria-pressed", String(isHidden));
    toggleTokenBtn.setAttribute(
      "aria-label",
      isHidden ? "Hide auth token" : "Show auth token"
    );
  });

  authTokenInput.addEventListener("input", updateFieldStates);
  areaIdInput.addEventListener("input", updateFieldStates);
}

async function saveCredentials() {
  const credentials: Config = {
    areaId: areaIdInput.value.trim(),
    authToken: authTokenInput.value.trim(),
    goalId: goalIdInput.value.trim() || undefined,
    notebookId: notebookIdInput.value.trim() || undefined,
  };

  try {
    await browser.storage.local.set({ credentials });
    showStatus("Settings saved successfully!", "success");
  } catch (error) {
    console.error("[Lunatask] Error saving credentials:", error);
    showStatus("Failed to save settings", "error");
  }
}

function showStatus(message: string, type: "success" | "error") {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;

  setTimeout(() => {
    statusMessage.className = "status-message";
  }, 3000);
}

init();
