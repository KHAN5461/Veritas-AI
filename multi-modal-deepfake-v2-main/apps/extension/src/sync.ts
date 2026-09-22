// Injected into Next.js Web App to sync identity with the extension
let syncedUid = '';

// We listen for messages from the web app's window
window.addEventListener("message", (event) => {
  // We only accept messages from ourselves
  if (event.source !== window) return;

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

// Also set a meta tag so the web app knows the extension is installed
const meta = document.createElement('meta');
meta.name = "veritas-extension-installed";
meta.content = "true";
document.head.appendChild(meta);

if (window.location.search.includes('from_ext=true')) {
  chrome.storage?.local.get(['pending_web_report'], (res) => {
    if (res.pending_web_report) {
      setTimeout(() => {
        window.postMessage({ type: 'VERITAS_LOAD_REPORT', payload: res.pending_web_report }, '*');
      }, 500);
    }
  });
}