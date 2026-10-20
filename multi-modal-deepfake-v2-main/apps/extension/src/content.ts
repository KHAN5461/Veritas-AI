// Veritas AI Extension Content Script
// Registers extension presence for Veritas Web App and ensures a clean DOM without obtrusive overlays.

if (!document.querySelector('meta[name="veritas-extension-installed"]')) {
  const meta = document.createElement('meta');
  meta.name = 'veritas-extension-installed';
  meta.content = 'true';
  document.head.appendChild(meta);
}

// Clean up any legacy or cached badges on the page
const cleanupBadges = () => {
  document.querySelectorAll('.veritas-verify-badge, #veritas-fab, #veritas-spin-style').forEach(el => el.remove());
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', cleanupBadges);
} else {
  cleanupBadges();
}
