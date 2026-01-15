/**
 * Options Page Script
 * Handles settings form for Area ID and Auth Token
 */

import browser from "webextension-polyfill";
import type { Config } from "../shared/types";

const form = document.getElementById("settings-form") as HTMLFormElement;
const areaIdInput = document.getElementById("area-id") as HTMLInputElement;
const authTokenInput = document.getElementById("auth-token") as HTMLInputElement;
const toggleTokenBtn = document.getElementById("toggle-token") as HTMLButtonElement;
const statusMessage = document.getElementById("status-message") as HTMLDivElement;

async function init() {
  const data = await browser.storage.local.get("credentials");
  const credentials = data.credentials as Config | undefined;

  if (credentials) {
    areaIdInput.value = credentials.areaId || "";
    authTokenInput.value = credentials.authToken || "";
  }

  setupEventListeners();
}

function setupEventListeners() {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await saveCredentials();
  });

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

async function saveCredentials() {
  const credentials: Config = {
    areaId: areaIdInput.value.trim(),
    authToken: authTokenInput.value.trim(),
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
