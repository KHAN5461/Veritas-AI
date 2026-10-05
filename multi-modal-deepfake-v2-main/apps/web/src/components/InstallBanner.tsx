'use client';
import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePwa } from '../context/PwaContext';

export function InstallBanner() {
  const { hasExtension } = usePwa();
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Already dismissed this session?
    if (localStorage.getItem('extension-banner-dismissed') === 'true') {
      return;
    }

    const ua = window.navigator.userAgent.toLowerCase();
    const isMobile = /iphone|ipad|ipod|android/.test(ua);

    // Only show extension recommendation banner on desktop when extension is not detected
    if (!isMobile && !hasExtension) {
      const timer = setTimeout(() => {
        setShow(true);
      }, 1200);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [hasExtension]);

  const dismiss = () => {
    localStorage.setItem('extension-banner-dismissed', 'true');
    setShow(false);
  };

  const handleExtensionInstall = () => {
    alert('To install: Open chrome://extensions, enable Developer Mode, then click "Load Unpacked" and select apps/extension/dist');
  };

  if (!show || hasExtension) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="extension-banner"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="flex-none w-full print:hidden z-40 hidden md:block"
      >
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
                <span className="text-[10px] bg-surface-container-high text-on-surface-variant px-1.5 py-0.5 rounded-full font-medium">
                  Chrome · Edge · Brave
                </span>
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
      </motion.div>
    </AnimatePresence>
  );
}
