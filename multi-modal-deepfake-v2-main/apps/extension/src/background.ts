declare var chrome: any;

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "scan-veritas",
    title: "Scan with Veritas AI",
    contexts: ["image", "video", "audio"]
  });
  
  // Initialize storage if needed
  chrome.storage.local.set({ pendingScans: [] });
});

chrome.contextMenus.onClicked.addListener((info: any, tab: any) => {
  if (info.menuItemId === "scan-veritas") {
    const targetUrl = info.srcUrl;
    if (targetUrl) {
      // Store it in chrome.storage so sidepanel can pick it up
      chrome.storage.local.get(['pendingScans'], (result: any) => {
        const queue = result.pendingScans || [];
        queue.push(targetUrl);
        chrome.storage.local.set({ pendingScans: queue });
      });
      
      // Open the side panel for the current tab
      if (chrome.sidePanel && tab && tab.id) {
        chrome.sidePanel.open({ windowId: tab.windowId });
      }
    }
  }
});

chrome.action.onClicked.addListener((tab: any) => {
  if (chrome.sidePanel && tab && tab.id) {
    chrome.sidePanel.open({ windowId: tab.windowId });
  }
});
