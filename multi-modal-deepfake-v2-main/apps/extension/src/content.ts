if (!document.querySelector('meta[name="veritas-extension-installed"]')) {
  const meta = document.createElement('meta');
  meta.name = 'veritas-extension-installed';
  meta.content = 'true';
  document.head.appendChild(meta);
}

const injectVeritasUI = () => {
  try {
    chrome.runtime.getManifest(); // Ensure context is valid
    chrome.storage?.local.get(['overlayMode'], () => {
      injectMediaOverlay();
    });
  } catch {
    // context invalidated
  }
};

const injectMediaOverlay = () => {
  const existingFab = document.getElementById('veritas-fab');
  if (existingFab) existingFab.remove();

  // Find videos and large images
  const mediaElements = Array.from(document.querySelectorAll<HTMLVideoElement | HTMLImageElement>('video, img'));

  mediaElements.forEach(el => {
    // Skip small thumbnails, icons, tracking pixels, or already badged media
    if (el instanceof HTMLImageElement) {
      if (el.naturalWidth < 160 || el.naturalHeight < 160) return;
      if (!el.src || (!el.src.startsWith('http') && !el.src.startsWith('data:'))) return;
    }
    if (el.nextElementSibling?.classList.contains('veritas-verify-badge')) return;
    if (el.parentElement?.querySelector(':scope > .veritas-verify-badge')) return;
    if (!el.parentNode) return;

    // Ensure parent has position context
    const parent = el.parentElement;
    if (parent) {
      const parentPos = window.getComputedStyle(parent).position;
      if (parentPos === 'static') {
        parent.style.position = 'relative';
      }
    }

    // Create sleek cyber pill badge
    const badge = document.createElement('button');
    badge.className = 'veritas-verify-badge';

    const svgIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;

    badge.innerHTML = `${svgIcon} <span>Verify Media</span>`;

    badge.style.cssText = `
      position: absolute; 
      top: 10px; 
      right: 10px; 
      z-index: 2147483647; 
      background: rgba(10, 14, 23, 0.85); 
      color: #e2e8f0; 
      border: 1px solid rgba(255,255,255,0.18); 
      padding: 5px 12px; 
      border-radius: 9999px; 
      cursor: pointer; 
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-weight: 600;
      font-size: 11.5px;
      letter-spacing: 0.3px;
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.5);
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      overflow: hidden;
      max-width: 32px;
      white-space: nowrap;
    `;

    const textSpan = badge.querySelector('span') as HTMLElement;
    if (textSpan) {
      textSpan.style.opacity = '0';
      textSpan.style.transition = 'opacity 0.2s ease';
      textSpan.style.display = 'inline-block';
    }

    badge.onmouseover = () => {
      if (!badge.hasAttribute('data-fixed')) {
        badge.style.background = 'rgba(10, 14, 23, 0.95)';
        badge.style.borderColor = 'rgba(56, 189, 248, 0.5)';
        badge.style.color = '#38bdf8';
        badge.style.maxWidth = '155px';
        badge.style.boxShadow = '0 6px 18px rgba(0,0,0,0.6)';
        if (textSpan) textSpan.style.opacity = '1';
      }
    };

    badge.onmouseout = () => {
      if (!badge.hasAttribute('data-fixed')) {
        badge.style.background = 'rgba(10, 14, 23, 0.85)';
        badge.style.borderColor = 'rgba(255,255,255,0.18)';
        badge.style.color = '#e2e8f0';
        badge.style.maxWidth = '32px';
        badge.style.boxShadow = '0 4px 16px rgba(0,0,0,0.5)';
        if (textSpan) textSpan.style.opacity = '0';
      }
    };

    badge.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();

      const isComplete = badge.getAttribute('data-fixed') === 'true' && badge.getAttribute('data-scanning') !== 'true';
      if (isComplete) {
        // Open the side panel to view full findings
        chrome.runtime.sendMessage({ action: "open_side_panel" });
        return;
      }

      const mediaUrl = el instanceof HTMLVideoElement ? (el.src || el.currentSrc) : el.src;
      if (!mediaUrl) return;

      badge.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spin-anim" style="margin-right: 6px;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Scanning...`;
      badge.style.color = '#38bdf8';
      badge.style.borderColor = 'rgba(56, 189, 248, 0.5)';
      badge.style.maxWidth = '155px';
      badge.setAttribute('data-fixed', 'true');
      badge.setAttribute('data-scanning', 'true');

      if (!document.getElementById('veritas-spin-style')) {
        const style = document.createElement('style');
        style.id = 'veritas-spin-style';
        style.textContent = `@keyframes veritas-spin { 100% { transform: rotate(360deg); } } .spin-anim { animation: veritas-spin 1s linear infinite; }`;
        document.head.appendChild(style);
      }

      chrome.runtime.sendMessage({ action: "scan_media", url: mediaUrl }, (response) => {
        badge.setAttribute('data-scanning', 'false');
        if (response && response.success) {
          if (response.is_fake) {
            badge.innerHTML = `🚨 High Risk (${(response.confidence * 100).toFixed(0)}%) <span style="font-size:10px; opacity:0.8; margin-left:4px;">▶ View</span>`;
            badge.style.color = '#ef4444';
            badge.style.borderColor = 'rgba(239, 68, 68, 0.6)';
            badge.style.background = 'rgba(69, 10, 10, 0.95)';
            badge.style.maxWidth = '210px';
          } else {
            badge.innerHTML = `🛡️ Authentic (${(response.confidence * 100).toFixed(0)}%) <span style="font-size:10px; opacity:0.8; margin-left:4px;">▶ View</span>`;
            badge.style.color = '#10b981';
            badge.style.borderColor = 'rgba(16, 185, 129, 0.6)';
            badge.style.background = 'rgba(6, 78, 59, 0.95)';
            badge.style.maxWidth = '210px';
          }
          // Notify side panel with scan
          chrome.storage?.local.get(['pendingScans'], (res: any) => {
            const list = res?.pendingScans || [];
            list.push(mediaUrl);
            chrome.storage.local.set({ pendingScans: list });
          });
        } else {
          badge.innerHTML = '⚠️ Inspection Limit';
          badge.style.color = '#f59e0b';
        }
      });
    };

    el.parentElement?.insertBefore(badge, el.nextSibling);
  });
};

// Check storage and inject accordingly
if (chrome.runtime?.id) {
  chrome.storage?.onChanged.addListener((changes) => {
    if (changes.overlayMode) {
      document.querySelectorAll('.veritas-verify-badge').forEach(el => el.remove());
      try {
        chrome.runtime.getManifest();
        injectVeritasUI();
      } catch {}
    }
  });

  const injectInterval = setInterval(() => {
    try {
      chrome.runtime.getManifest();
      injectVeritasUI();
    } catch {
      clearInterval(injectInterval);
    }
  }, 2500);
}
