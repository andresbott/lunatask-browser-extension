/**
 * Options Page Script
 * Handles settings form for ID, Auth Token, and save mode
 */

import browser from "webextension-polyfill";
import {
  DEFAULT_SETTINGS,
  type Credentials,
  type ExtensionSettings,
  type SaveMode,
} from "../shared/types";

// DOM Elements
const form = document.getElementById("settings-form") as HTMLFormElement;
const userIdInput = document.getElementById("user-id") as HTMLInputElement;
const authTokenInput = document.getElementById("auth-token") as HTMLInputElement;
const toggleTokenBtn = document.getElementById("toggle-token") as HTMLButtonElement;
const statusMessage = document.getElementById("status-message") as HTMLDivElement;
const saveModeRadios = document.querySelectorAll<HTMLInputElement>(
  'input[name="save-mode"]'
);

async function init() {
  // Load saved credentials and settings
  const data = await browser.storage.local.get(["credentials", "extensionSettings"]);
  const credentials = data.credentials as Credentials | undefined;
  const settings = data.extensionSettings as ExtensionSettings | undefined;

  if (credentials) {
    userIdInput.value = credentials.userId || "";
    authTokenInput.value = credentials.authToken || "";
  }

  // Set save mode radio button
  const saveMode = settings?.saveMode || DEFAULT_SETTINGS.saveMode;
  saveModeRadios.forEach((radio) => {
    radio.checked = radio.value === saveMode;
  });

  setupEventListeners();
}

function setupEventListeners() {
  // Form submission
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await saveSettings();
  });

  // Toggle token visibility
  toggleTokenBtn.addEventListener("click", () => {
    if (authTokenInput.type === "password") {
      authTokenInput.type = "text";
      toggleTokenBtn.textContent = "Hide";
    } else {
      authTokenInput.type = "password";
      toggleTokenBtn.textContent = "Show";
    }
  });
}

async function saveSettings() {
  const credentials: Credentials = {
    userId: userIdInput.value.trim(),
    authToken: authTokenInput.value.trim(),
  };

  const selectedMode = document.querySelector<HTMLInputElement>(
    'input[name="save-mode"]:checked'
  );
  const extensionSettings: ExtensionSettings = {
    saveMode: (selectedMode?.value as SaveMode) || "url",
  };

  try {
    await browser.storage.local.set({ credentials, extensionSettings });
    showStatus("Settings saved successfully!", "success");
  } catch (error) {
    console.error("[Lunatask] Error saving settings:", error);
    showStatus("Failed to save settings", "error");
  }
}

function showStatus(message: string, type: "success" | "error") {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;

  // Auto-hide after 3 seconds
  setTimeout(() => {
    statusMessage.className = "status-message";
  }, 3000);
}

init();
