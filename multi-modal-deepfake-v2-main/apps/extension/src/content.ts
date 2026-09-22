const injectVeritasUI = () => {
  try {
    chrome.runtime.getManifest(); // Ensure context is valid
    chrome.storage?.local.get(['overlayMode'], (res) => {
      const mode = res.overlayMode || 'in-video';
      
      if (mode === 'fab') {
        injectFAB();
      } else {
        injectInVideoOverlay();
      }
    });
  } catch (e) {
    // context invalidated
  }
};

const injectFAB = () => {
  if (document.getElementById('veritas-fab')) return;
  
  const fab = document.createElement('div');
  fab.id = 'veritas-fab';
  fab.innerHTML = `
    <button class="veritas-fab-btn" title="Open Veritas AI">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    </button>
  `;
  
  const style = document.createElement('style');
  style.textContent = `
    #veritas-fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
    }
    .veritas-fab-btn {
      width: 56px;
      height: 56px;
      border-radius: 28px;
      background: linear-gradient(135deg, #0284c7, #38bdf8);
      color: white;
      border: none;
      box-shadow: 0 8px 32px rgba(2, 132, 199, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .veritas-fab-btn:hover {
      transform: scale(1.1) translateY(-4px);
      box-shadow: 0 12px 40px rgba(2, 132, 199, 0.5);
    }
  `;
  
  document.head.appendChild(style);
  document.body.appendChild(fab);
  
  fab.querySelector('button')?.addEventListener('click', () => {
    // We can just ask the background script to open the side panel
    chrome.runtime.sendMessage({ action: "open_side_panel" });
  });
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
      background: rgba(11, 17, 32, 0.6); 
      color: #e2e8f0; 
      border: 1px solid rgba(255,255,255,0.1); 
      padding: 6px 12px; 
      border-radius: 9999px; 
      cursor: pointer; 
      font-family: system-ui, -apple-system, sans-serif;
      font-weight: 600;
      font-size: 11px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      box-shadow: 0 4px 24px rgba(0,0,0,0.4);
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      overflow: hidden;
      max-width: 32px;
      white-space: nowrap;
    `;
    
    // The trick: it starts collapsed (max-width 32px, hiding text) and expands on hover
    const textSpan = badge.querySelector('span') as HTMLElement;
    if (textSpan) {
      textSpan.style.opacity = '0';
      textSpan.style.transition = 'opacity 0.2s ease';
      textSpan.style.display = 'inline-block';
    }

    badge.onmouseover = () => {
      badge.style.background = 'rgba(11, 17, 32, 0.85)';
      badge.style.borderColor = 'rgba(56, 189, 248, 0.4)';
      badge.style.color = '#38bdf8';
      badge.style.maxWidth = '150px';
      if (textSpan) textSpan.style.opacity = '1';
    };
    
    badge.onmouseout = () => {
      // Don't collapse if we are showing a result
      if (!badge.hasAttribute('data-fixed')) {
        badge.style.background = 'rgba(11, 17, 32, 0.6)';
        badge.style.borderColor = 'rgba(255,255,255,0.1)';
        badge.style.color = '#e2e8f0';
        badge.style.maxWidth = '32px';
        if (textSpan) textSpan.style.opacity = '0';
      }
    };
    
    badge.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const url = video.src || video.currentSrc;
      if (!url || url.startsWith('blob:')) {
          badge.innerHTML = '⚠️ Blob Stream';
          badge.style.color = '#ef4444';
          badge.style.maxWidth = '150px';
          badge.setAttribute('data-fixed', 'true');
          return;
      }
      
      badge.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spin-anim" style="margin-right: 6px;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Scanning...`;
      badge.style.color = '#fbbf24'; // yellow
      badge.style.borderColor = 'rgba(251, 191, 36, 0.4)';
      badge.style.maxWidth = '150px';
      badge.setAttribute('data-fixed', 'true');
      
      // Inject spin animation if not exists
      if (!document.getElementById('veritas-spin-style')) {
        const style = document.createElement('style');
        style.id = 'veritas-spin-style';
        style.textContent = `@keyframes veritas-spin { 100% { transform: rotate(360deg); } } .spin-anim { animation: veritas-spin 1s linear infinite; }`;
        document.head.appendChild(style);
      }
      
      chrome.runtime.sendMessage({ action: "scan_media", url }, (response) => {
          if (response && response.success) {
              if (response.is_fake) {
                  badge.innerHTML = `🚨 High Risk (${(response.confidence * 100).toFixed(0)}%)`;
                  badge.style.color = '#ef4444'; // red
                  badge.style.borderColor = 'rgba(239, 68, 68, 0.5)';
                  badge.style.background = 'rgba(69, 10, 10, 0.9)';
              } else {
                  badge.innerHTML = `✅ Authentic (${(response.confidence * 100).toFixed(0)}%)`;
                  badge.style.color = '#10b981'; // green
                  badge.style.borderColor = 'rgba(16, 185, 129, 0.5)';
                  badge.style.background = 'rgba(6, 78, 59, 0.9)';
              }
          } else {
              badge.innerHTML = '⚠️ API Error';
              badge.style.color = '#ef4444'; // red
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
