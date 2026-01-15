/**
 * Options Page Script
 * Handles settings form for ID and Auth Token
 */

import browser from "webextension-polyfill";

interface Credentials {
  userId: string;
  authToken: string;
}

// DOM Elements
const form = document.getElementById("settings-form") as HTMLFormElement;
const userIdInput = document.getElementById("user-id") as HTMLInputElement;
const authTokenInput = document.getElementById("auth-token") as HTMLInputElement;
const toggleTokenBtn = document.getElementById("toggle-token") as HTMLButtonElement;
const statusMessage = document.getElementById("status-message") as HTMLDivElement;

async function init() {
  // Load saved credentials
  const data = await browser.storage.local.get("credentials");
  const credentials = data.credentials as Credentials | undefined;

  if (credentials) {
    userIdInput.value = credentials.userId || "";
    authTokenInput.value = credentials.authToken || "";
  }

  setupEventListeners();
}

function setupEventListeners() {
  // Form submission
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await saveCredentials();
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

async function saveCredentials() {
  const credentials: Credentials = {
    userId: userIdInput.value.trim(),
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

  // Auto-hide after 3 seconds
  setTimeout(() => {
    statusMessage.className = "status-message";
  }, 3000);
}

init();
