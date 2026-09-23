const injectVeritasUI = () => {
  try {
    chrome.runtime.getManifest(); // Ensure context is valid
    chrome.storage?.local.get(['overlayMode'], (res) => {
      // FAB is removed, always use in-video overlay
      injectInVideoOverlay();
    });
  } catch (e) {
    // context invalidated
  }
};

const injectInVideoOverlay = () => {
  // Remove FAB if it exists
  const existingFab = document.getElementById('veritas-fab');
  if (existingFab) existingFab.remove();

  const videos = document.querySelectorAll('video');
  videos.forEach(video => {
    if (video.nextElementSibling?.classList.contains('veritas-verify-badge')) return;
    if (!video.parentNode) return;
    
    // Create a sleek, pill-shaped badge
    const badge = document.createElement('button');
    badge.className = 'veritas-verify-badge';
    
    const svgIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
    
    badge.innerHTML = `${svgIcon} <span>Verify Media</span>`;
    
    badge.style.cssText = `
      position: absolute; 
      top: 12px; 
      right: 12px; 
      z-index: 2147483647; 
      background: rgba(15, 20, 25, 0.7); 
      color: #e1e3e5; 
      border: 1px solid rgba(255,255,255,0.15); 
      padding: 6px 14px; 
      border-radius: 9999px; 
      cursor: pointer; 
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-weight: 600;
      font-size: 12px;
      letter-spacing: 0.3px;
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
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
        badge.style.background = 'rgba(15, 20, 25, 0.9)';
        badge.style.borderColor = 'rgba(125, 211, 252, 0.5)';
        badge.style.color = '#7dd3fc';
        badge.style.maxWidth = '160px';
        badge.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)';
        if (textSpan) textSpan.style.opacity = '1';
      }
    };
    
    badge.onmouseout = () => {
      if (!badge.hasAttribute('data-fixed')) {
        badge.style.background = 'rgba(15, 20, 25, 0.7)';
        badge.style.borderColor = 'rgba(255,255,255,0.15)';
        badge.style.color = '#e1e3e5';
        badge.style.maxWidth = '32px';
        badge.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        if (textSpan) textSpan.style.opacity = '0';
      }
    };
    
    badge.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const isComplete = badge.getAttribute('data-fixed') === 'true' && badge.getAttribute('data-scanning') !== 'true';
      if (isComplete) {
        // Already scanned. Open the side panel to view results.
        chrome.runtime.sendMessage({ action: "open_side_panel" });
        return;
      }
      
      const url = video.src || video.currentSrc;
      if (!url || url.startsWith('blob:')) {
          badge.innerHTML = '⚠️ Blob Stream';
          badge.style.color = '#ef4444';
          badge.style.maxWidth = '160px';
          badge.setAttribute('data-fixed', 'true');
          return;
      }
      
      badge.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spin-anim" style="margin-right: 6px;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Scanning...`;
      badge.style.color = '#fbbf24'; 
      badge.style.borderColor = 'rgba(251, 191, 36, 0.5)';
      badge.style.maxWidth = '160px';
      badge.setAttribute('data-fixed', 'true');
      badge.setAttribute('data-scanning', 'true');
      
      if (!document.getElementById('veritas-spin-style')) {
        const style = document.createElement('style');
        style.id = 'veritas-spin-style';
        style.textContent = `@keyframes veritas-spin { 100% { transform: rotate(360deg); } } .spin-anim { animation: veritas-spin 1s linear infinite; }`;
        document.head.appendChild(style);
      }
      
      chrome.runtime.sendMessage({ action: "scan_media", url }, (response) => {
          badge.setAttribute('data-scanning', 'false');
          if (response && response.success) {
              if (response.is_fake) {
                  badge.innerHTML = `⚠️ High Risk (${(response.confidence * 100).toFixed(0)}%) <span style="font-size:10px; opacity:0.7; margin-left:4px;">▶ View</span>`;
                  badge.style.color = '#ef4444'; 
                  badge.style.borderColor = 'rgba(239, 68, 68, 0.6)';
                  badge.style.background = 'rgba(69, 10, 10, 0.95)';
                  badge.style.maxWidth = '200px';
              } else {
                  badge.innerHTML = `🛡 Authentic (${(response.confidence * 100).toFixed(0)}%) <span style="font-size:10px; opacity:0.7; margin-left:4px;">▶ View</span>`;
                  badge.style.color = '#10b981'; 
                  badge.style.borderColor = 'rgba(16, 185, 129, 0.6)';
                  badge.style.background = 'rgba(6, 78, 59, 0.95)';
                  badge.style.maxWidth = '200px';
              }
              // Automatically open the side panel
              chrome.runtime.sendMessage({ action: "open_side_panel" });
          } else {
              badge.innerHTML = '⚠️ API Error';
              badge.style.color = '#ef4444';
          }
      });
    };

    video.parentElement?.insertBefore(badge, video.nextSibling);
  });
};

// Check storage and inject accordingly
if (chrome.runtime?.id) {
  chrome.storage?.onChanged.addListener((changes) => {
    if (changes.overlayMode) {
      // Remove existing badges to force refresh
      document.querySelectorAll('.veritas-verify-badge').forEach(el => el.remove());
      try {
        chrome.runtime.getManifest();
        injectVeritasUI();
      } catch (e) {}
    }
  });

  const injectInterval = setInterval(() => {
    try {
      chrome.runtime.getManifest(); // Throws "Extension context invalidated" if reloaded
      injectVeritasUI();
    } catch (e) {
      clearInterval(injectInterval);
    }
  }, 2000);
}
