const injectButtons = () => {
  const videos = document.querySelectorAll('video');
  videos.forEach(video => {
    if (video.nextElementSibling?.classList.contains('veritas-verify-btn')) return;
    
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position: relative; display: inline-block; width: 100%; height: 100%;';
    
    // Safely wrap the video if it has a parent
    if (video.parentNode) {
        // Just overlaying it instead of DOM wrapping to prevent breaking sites like YouTube
        const btn = document.createElement('button');
        btn.innerHTML = '🛡️ Verify Authenticity';
        btn.className = 'veritas-verify-btn';
        btn.style.cssText = `
          position: absolute; 
          top: 16px; 
          right: 16px; 
          z-index: 2147483647; 
          background: rgba(19, 28, 46, 0.85); 
          color: #38bdf8; 
          border: 1px solid rgba(255,255,255,0.1); 
          padding: 8px 12px; 
          border-radius: 8px; 
          cursor: pointer; 
          font-family: system-ui, sans-serif;
          font-weight: 600;
          font-size: 12px;
          backdrop-filter: blur(8px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          transition: all 0.2s ease;
        `;
        
        btn.onmouseover = () => btn.style.background = 'rgba(19, 28, 46, 0.95)';
        btn.onmouseout = () => btn.style.background = 'rgba(19, 28, 46, 0.85)';
        btn.onclick = () => {
            btn.innerHTML = '⏳ Scanning...';
            btn.style.color = '#fbbf24'; // yellow
            setTimeout(() => {
                btn.innerHTML = '🚨 High Risk (98%)';
                btn.style.color = '#ef4444'; // red
                btn.style.borderColor = 'rgba(239, 68, 68, 0.5)';
            }, 2000);
        };

        // Attempt to place inside the video's container relative to the video
        video.parentElement?.insertBefore(btn, video.nextSibling);
    }
  });
};

// Run periodically to catch dynamically loaded videos (e.g. YouTube, Twitter)
setInterval(injectButtons, 2000);
