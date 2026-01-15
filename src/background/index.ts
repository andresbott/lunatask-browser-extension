/**
 * Background Script
 * Handles extension icon clicks - saves current page to Lunatask
 */

import browser from "webextension-polyfill";

interface Credentials {
  userId: string;
  authToken: string;
}

interface TaskResponse {
  status: number;
  data?: unknown;
  error?: string;
}

async function saveToLunatask(
  areaId: string,
  token: string,
  title: string,
  url: string
): Promise<TaskResponse> {
  const options = {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      task: {
        area_id: areaId,
        name: title,
        note: "<" + url + ">",
      },
    }),
  };

  const response = await fetch("https://api.lunatask.app/v1/tasks", options);

  if (response.status !== 201) {
    const data = await response.json();
    return { status: response.status, data, error: JSON.stringify(data) };
  }

  return { status: 201 };
}

function showToast(
  tabId: number,
  message: string,
  type: "success" | "error" | "warning"
) {
  const colors = {
    success: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    error: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
    warning: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
  };

  const icons = {
    success: "✓",
    error: "✕",
    warning: "⚠",
  };

  browser.scripting.executeScript({
    target: { tabId },
    func: (msg: string, bg: string, icon: string) => {
      // Remove existing toast if any
      const existingToast = document.getElementById("lunatask-toast");
      if (existingToast) existingToast.remove();

      // Create toast element
      const toast = document.createElement("div");
      toast.id = "lunatask-toast";
      toast.innerHTML = `
        <span style="margin-right: 10px; font-size: 16px;">${icon}</span>
        <span>${msg}</span>
      `;

      // Toast styles
      Object.assign(toast.style, {
        position: "fixed",
        top: "24px",
        right: "24px",
        padding: "14px 20px",
        background: bg,
        color: "#fff",
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: "14px",
        fontWeight: "500",
        borderRadius: "10px",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0,0,0,0.2)",
        zIndex: "2147483647",
        display: "flex",
        alignItems: "center",
        opacity: "0",
        transform: "translateY(-20px)",
        transition: "all 0.3s ease",
        maxWidth: "400px",
      });

      document.body.appendChild(toast);

      // Trigger animation
      requestAnimationFrame(() => {
        toast.style.opacity = "1";
        toast.style.transform = "translateY(0)";
      });

      // Remove after 3 seconds
      setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(-20px)";
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    },
    args: [message, colors[type], icons[type]],
  });
}

// Handle extension icon click
browser.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url || !tab.title) return;

  // Load credentials from storage
  const data = await browser.storage.local.get("credentials");
  const credentials = data.credentials as Credentials | undefined;

  if (!credentials?.userId || !credentials?.authToken) {
    showToast(
      tab.id,
      "Please configure your Lunatask credentials in the extension settings",
      "warning"
    );
    // Open options page
    browser.runtime.openOptionsPage();
    return;
  }

  try {
    const result = await saveToLunatask(
      credentials.userId,
      credentials.authToken,
      tab.title,
      tab.url
    );

    if (result.status === 201) {
      showToast(tab.id, "Saved to Lunatask!", "success");
    } else {
      showToast(
        tab.id,
        "Error saving to Lunatask: " + (result.error || "Unknown error"),
        "error"
      );
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    showToast(tab.id, "Error saving to Lunatask: " + errorMessage, "error");
  }
});
