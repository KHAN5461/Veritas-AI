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

chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
  if (message.action === "scan_media" && message.url) {
    (async () => {
      try {
        const res = await fetch(message.url);
        const blob = await res.blob();
        const ext = message.url.split('.').pop()?.split('?')[0] || 'mp4';
        const name = message.url.split('/').pop()?.split('?')[0] || `media.${ext}`;
        const formData = new FormData();
        formData.append('file', blob, name);
        
        const apiRes = await fetch('https://upside-shower-handling.ngrok-free.dev/detect', {
          method: 'POST',
          body: formData
        });
        
        if (!apiRes.ok) throw new Error('API Error');
        const data = await apiRes.json();
        
        sendResponse({
          success: true,
          is_fake: data.is_fake,
          confidence: data.confidence,
          data
        });
      } catch (err) {
        sendResponse({ success: false, error: String(err) });
      }
    })();
    return true; // Keep message channel open for async response
  }
  
  if (message.action === "sync_auth") {
    chrome.storage.local.set({ uid: message.uid });
  }

  if (message.action === "forward_save_scan") {
    chrome.tabs.query({ url: "*://localhost/*" }, (tabs: any) => {
      tabs.forEach((tab: any) => {
        chrome.tabs.sendMessage(tab.id, { action: "save_scan", payload: message.payload });
      });
    });
  }

  if (message.action === "open_side_panel") {
    chrome.sidePanel.open({ windowId: sender?.tab?.windowId });
  }
});
