declare var chrome: any;

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "scan-veritas-media",
      title: "Verify Media with Veritas AI",
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
    // Store it in chrome.storage so sidepanel can pick it up
    chrome.storage.local.get(['pendingScans'], (result: any) => {
      const queue = result.pendingScans || [];
      queue.push(targetUrl);
      chrome.storage.local.set({ pendingScans: queue }, () => {
        chrome.action.setBadgeText({ text: queue.length > 0 ? String(queue.length) : "" });
        chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });
      });
    });
    
    // Open the side panel for the current tab
    if (chrome.sidePanel && tab && tab.id) {
      chrome.sidePanel.open({ windowId: tab.windowId });
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
        formData.append('file_hash', ''); // Extension doesn't easily compute SHA-256 synchronously
        
        const apiRes = await fetch('https://upside-shower-handling.ngrok-free.dev/jobs', {
          method: 'POST',
          body: formData
        });
        
        if (!apiRes.ok) throw new Error('API Error');
        const jobData = await apiRes.json();
        const jobId = jobData.job_id;

        let attempts = 0;
        let finalData = null;
        while (attempts < 60) {
          await new Promise(r => setTimeout(r, 2000));
          attempts++;
          const pollRes = await fetch(`https://upside-shower-handling.ngrok-free.dev/jobs/${jobId}`);
          if (pollRes.ok) {
            const pollData = await pollRes.json();
            if (pollData.status === 'completed') {
              finalData = pollData.result;
              break;
            } else if (pollData.status === 'failed') {
              throw new Error('Analysis failed');
            }
          }
        }
        
        if (!finalData) throw new Error('Timeout');
        
        sendResponse({
          success: true,
          is_fake: finalData.is_fake,
          confidence: finalData.confidence,
          data: finalData
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
        chrome.tabs.sendMessage(tab.id, { action: "save_scan", payload: message.payload }).catch(() => {});
      });
    });
  }

  if (message.action === "open_side_panel") {
    chrome.sidePanel.open({ windowId: sender?.tab?.windowId });
  }
});
