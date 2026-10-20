declare var chrome: any;

chrome.runtime.onInstalled.addListener(() => {
  // Set extension icon click to open side panel automatically
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  }

  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "scan-veritas-media",
      title: "Inspect Media with Veritas AI",
      contexts: ["image", "video", "audio"]
    });

    chrome.contextMenus.create({
      id: "scan-veritas-link",
      title: "Verify Link with Veritas AI",
      contexts: ["link"]
    });

    chrome.contextMenus.create({
      id: "scan-veritas-page",
      title: "Analyze Page with Veritas AI",
      contexts: ["page"]
    });
  });
  
  // Initialize storage if needed
  chrome.storage.local.set({ pendingScans: [] });
});

chrome.contextMenus.onClicked.addListener((info: any, tab: any) => {
  let targetUrl = '';
  if (info.menuItemId === "scan-veritas-media" || info.menuItemId === "scan-veritas") {
    targetUrl = info.srcUrl;
  } else if (info.menuItemId === "scan-veritas-link") {
    targetUrl = info.linkUrl;
  } else if (info.menuItemId === "scan-veritas-page") {
    targetUrl = info.pageUrl;
  }

  if (targetUrl) {
    // Store in chrome.storage so sidepanel can pick it up
    chrome.storage.local.get(['pendingScans'], (result: any) => {
      const queue = result.pendingScans || [];
      queue.push(targetUrl);
      chrome.storage.local.set({ pendingScans: queue }, () => {
        chrome.action.setBadgeText({ text: queue.length > 0 ? String(queue.length) : "" });
        chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });
      });
    });
    
    // Reliably open the side panel in Manifest V3
    if (chrome.sidePanel) {
      if (tab?.id) {
        chrome.sidePanel.open({ tabId: tab.id }).catch(() => {
          if (tab?.windowId) {
            chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => {});
          }
        });
      } else if (tab?.windowId) {
        chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => {});
      }
    }
  }
});

chrome.action.onClicked.addListener((tab: any) => {
  if (chrome.sidePanel && tab && tab.id) {
    chrome.sidePanel.open({ windowId: tab.windowId });
  }
});

const DEFAULT_API_URL = 'https://upside-shower-handling.ngrok-free.dev';

chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
  if (message.action === "fetch_media_data" && message.url) {
    (async () => {
      try {
        const res = await fetch(message.url);
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          sendResponse({ success: true, dataUrl: reader.result, mimeType: blob.type });
        };
        reader.onerror = () => {
          sendResponse({ success: false, error: "FileReader failed" });
        };
        reader.readAsDataURL(blob);
      } catch (e: any) {
        sendResponse({ success: false, error: e?.message || "Fetch failed" });
      }
    })();
    return true;
  }

  if (message.action === "scan_media" && message.url) {
    (async () => {
      let finalData: any = null;
      try {
        const stored = await chrome.storage?.local.get(['veritas_api_url']);
        const baseUrl = (stored?.veritas_api_url || DEFAULT_API_URL).replace(/\/$/, '');

        const res = await fetch(message.url);
        const blob = await res.blob();
        const ext = message.url.split('.').pop()?.split('?')[0] || 'jpg';
        const name = message.url.split('/').pop()?.split('?')[0] || `media.${ext}`;
        const formData = new FormData();
        formData.append('file', blob, name);
        formData.append('file_hash', '');

        // Try primary /detect with 30s timeout
        const detectController = new AbortController();
        const timeoutId = setTimeout(() => detectController.abort(), 30000);

        try {
          const apiRes = await fetch(`${baseUrl}/detect`, {
            method: 'POST',
            body: formData,
            headers: { 'ngrok-skip-browser-warning': 'true' },
            signal: detectController.signal,
          });
          clearTimeout(timeoutId);
          if (apiRes.ok) {
            finalData = await apiRes.json();
          }
        } catch (fetchErr) {
          console.warn('Background detect error on baseUrl:', baseUrl, fetchErr);
          // Auto-fallback to DEFAULT_API_URL if different
          if (baseUrl !== DEFAULT_API_URL) {
            try {
              const fbRes = await fetch(`${DEFAULT_API_URL}/detect`, {
                method: 'POST',
                body: formData,
                headers: { 'ngrok-skip-browser-warning': 'true' },
              });
              if (fbRes.ok) {
                finalData = await fbRes.json();
              }
            } catch (fbErr) {
              console.warn('Background fallback detect error:', fbErr);
            }
          }
        }
      } catch (e) {
        console.warn('Background scan fetch error:', e);
      }

      if (finalData) {
        sendResponse({
          success: true,
          is_fake: finalData.is_fake,
          confidence: finalData.confidence,
          data: finalData
        });
      } else {
        sendResponse({
          success: false,
          error: "Backend service unreachable"
        });
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
        chrome.tabs.sendMessage(tab.id, { action: "save_scan", payload: message.payload }).catch(() => {});
      });
    });
  }

  if (message.action === "open_side_panel") {
    chrome.sidePanel.open({ windowId: sender?.tab?.windowId });
  }
});
