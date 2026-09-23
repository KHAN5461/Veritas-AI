// Injected into Next.js Web App to sync identity with the extension
let syncedUid = '';

window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  if (event.data.type === "VERITAS_READY") {
    console.log("[Veritas Extension] Received VERITAS_READY from Web App!");
    if (window.location.search.includes('from_ext=true')) {
      chrome.storage?.local.get(['pending_web_report'], (res) => {
        console.log("[Veritas Extension] Read from storage:", res.pending_web_report ? "Found" : "Not Found");
        if (res.pending_web_report) {
          console.log("[Veritas Extension] Sending VERITAS_LOAD_REPORT payload to Web App");
          window.postMessage({ type: 'VERITAS_LOAD_REPORT', payload: res.pending_web_report }, '*');
        }
      });
    }
  }

  if (event.data.type && event.data.type === "VERITAS_AUTH_STATE") {
    const uid = event.data.uid;
    if (uid !== syncedUid) {
      syncedUid = uid;
      if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ action: "sync_auth", uid });
      }
    }
  }
});

if (chrome && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "save_scan") {
      window.postMessage({ type: 'VERITAS_SAVE_SCAN', payload: msg.payload }, '*');
    }
  });
}

const meta = document.createElement('meta');
meta.name = "veritas-extension-installed";
meta.content = "true";
document.head.appendChild(meta);

// Fallback just in case
if (window.location.search.includes('from_ext=true')) {
  chrome.storage?.local.get(['pending_web_report'], (res) => {
    if (res.pending_web_report) {
      setTimeout(() => {
        window.postMessage({ type: 'VERITAS_LOAD_REPORT', payload: res.pending_web_report }, '*');
      }, 1000); // Increased fallback timeout
    }
  });
}