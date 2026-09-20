// background.js
// Multimodal Deepfake Detector — Manifest V3 service worker
//
// Responsibilities:
//   1. Register the right-click context menu on images/videos/audio.
//   2. On click, stash the target media URL + type in chrome.storage.local
//      and open the side panel for the current window.
//   3. Let the toolbar action icon also open the side panel directly.

const MENU_ID = "verify-media-deepfake-detector";
const STORAGE_KEY = "pendingMedia";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: "Verify Media with Deepfake Detector",
    contexts: ["image", "video", "audio"]
  });

  // Let a plain toolbar-icon click open the side panel too.
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {
      // Some Chrome versions may not support this yet — safe to ignore.
    });
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID) return;
  if (!info.srcUrl) return;

  const mediaType = info.mediaType || guessMediaType(info.srcUrl);

  const payload = {
    srcUrl: info.srcUrl,
    mediaType, // "image" | "video" | "audio"
    pageUrl: info.pageUrl || (tab && tab.url) || null,
    timestamp: Date.now()
  };

  // Open the side panel IMMEDIATELY to preserve the user gesture security context.
  if (tab && tab.windowId !== undefined) {
    chrome.sidePanel.open({ windowId: tab.windowId }).catch(err => {
      console.error("Deepfake Detector: failed to open side panel", err);
    });
  }

  // Then save to storage and notify the panel
  chrome.storage.local.set({ [STORAGE_KEY]: payload }).then(() => {
    chrome.runtime.sendMessage({ type: "NEW_MEDIA", payload }).catch(() => {
      // No listener yet (panel not open) — that's fine, storage has it.
    });
  }).catch(err => {
    console.error("Deepfake Detector: storage error", err);
  });
});

function guessMediaType(url) {
  const ext = (url.split("?")[0].split(".").pop() || "").toLowerCase();
  if (["mp4", "webm", "mov", "avi", "mkv"].includes(ext)) return "video";
  if (["mp3", "wav", "ogg", "m4a", "flac"].includes(ext)) return "audio";
  return "image";
}
