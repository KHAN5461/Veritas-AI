'use client';
import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type BannerMode = 'pwa' | 'extension' | null;

export function InstallBanner() {
  const [mode, setMode] = useState<BannerMode>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Already dismissed this session?
    if (localStorage.getItem('install-banner-dismissed') === 'true') {
      setDismissed(true);
      return;
    }

    // Is PWA already installed (standalone mode)?
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    // Is the extension already installed?
    const hasExtension = !!document.querySelector('meta[name="veritas-extension-installed"]') ||
      !!(window as any).__VERITAS_EXTENSION__;

    if (isStandalone && hasExtension) {
      // Both installed — nothing to show
      return;
    }

    const ua = window.navigator.userAgent.toLowerCase();
    const isMobile = /iphone|ipad|ipod|android/.test(ua);
    setIsIOS(/iphone|ipad|ipod/.test(ua));

    if (!isStandalone && isMobile) {
      // On mobile browser — offer PWA install
      setMode('pwa');
    } else if (!isStandalone && !isMobile) {
      // Desktop browser — listen for PWA prompt (Chrome) OR offer extension
      const handler = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setMode('pwa'); // Chrome desktop can install PWA too
      };
      window.addEventListener('beforeinstallprompt', handler);

      // If no PWA prompt fires within 1s, and extension not installed → show extension banner
      const timer = setTimeout(() => {
        if (!hasExtension) setMode(prev => prev === null ? 'extension' : prev);
      }, 1000);

      return () => {
        window.removeEventListener('beforeinstallprompt', handler);
        clearTimeout(timer);
      };
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem('install-banner-dismissed', 'true');
    setDismissed(true);
  };

  const handlePwaInstall = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => {
        setDeferredPrompt(null);
        dismiss();
      });
    } else if (isIOS) {
      // iOS: show toast guidance (handled by parent via sonner — use alert as fallback)
      alert('Tap the Share icon (⬆) in Safari, then "Add to Home Screen" to install Veritas AI.');
    }
  };

  const handleExtensionInstall = () => {
    alert('To install: Open chrome://extensions, enable Developer Mode, then click "Load Unpacked" and select apps/extension/dist');
  };

  if (dismissed || mode === null) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="install-banner"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="flex-none w-full print:hidden z-40"
      >
        {mode === 'pwa' ? (
          /* ── PWA Install Banner ── */
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-primary-container text-on-primary-container border-b border-outline/20 shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <img src="/logo.png" alt="Veritas AI" className="w-8 h-8 object-contain shrink-0 drop-shadow" />
              <div className="min-w-0">
                <p className="text-sm font-bold leading-tight truncate">Install Veritas AI</p>
                <p className="text-[11px] opacity-80 truncate">
                  {isIOS ? 'Add to Home Screen for the full experience' : 'Install the app for offline & share support'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handlePwaInstall}
                className="bg-primary text-on-primary text-xs font-bold py-1.5 px-4 rounded-full shadow hover:opacity-90 transition active:scale-95"
              >
                {isIOS ? 'How?' : 'Install'}
              </button>
              <button
                onClick={dismiss}
                aria-label="Dismiss"
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-on-primary-container/10 transition text-on-primary-container/70 hover:text-on-primary-container"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          </div>
        ) : (
          /* ── Extension Install Banner (desktop) ── */
          <div className="flex items-center justify-between gap-3 px-5 py-2.5 bg-surface-container border-b border-outline-variant/30 shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary text-[20px]">extension</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-on-surface leading-tight">
                  Detect deepfakes while you browse
                </p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[11px] text-on-surface-variant">Veritas Chrome Extension</span>
                  <span className="text-[10px] bg-surface-container-high text-on-surface-variant px-1.5 py-0.5 rounded-full font-medium">Chrome · Edge · Brave</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleExtensionInstall}
                className="flex items-center gap-1.5 bg-primary text-on-primary text-xs font-bold py-1.5 px-4 rounded-full shadow hover:opacity-90 transition active:scale-95"
              >
                <span className="material-symbols-outlined text-[15px]">extension</span>
                Install
              </button>
              <button
                onClick={dismiss}
                aria-label="Dismiss"
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-on-surface/8 transition text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
