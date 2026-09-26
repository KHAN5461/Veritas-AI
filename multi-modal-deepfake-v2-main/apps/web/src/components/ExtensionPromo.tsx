'use client';
import React, { useEffect, useState } from 'react';
import { Button, IconButton } from '@repo/ui';

export function ExtensionPromo() {
  const [hasExtension, setHasExtension] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true); // Default true to prevent hydration mismatch flash

  useEffect(() => {
    // Check if dismissed
    const dismissed = localStorage.getItem('extension-promo-dismissed') === 'true';
    setIsDismissed(dismissed);

    // Check immediately
    const checkExtension = () => {
      if (document.querySelector('meta[name="veritas-extension-installed"]')) {
        setHasExtension(true);
        return true;
      }
      return false;
    };

    if (checkExtension()) return;

    // Fast polling for 500ms in case the extension content script is slightly delayed
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (checkExtension() || attempts > 10) {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, []);

  if (hasExtension || isDismissed) return null;

  return (
    <div className="hidden lg:flex relative animate-in slide-in-from-top-2 fade-in duration-500 bg-primary/10 border border-primary/20 rounded-2xl p-6 mb-8 flex flex-col sm:flex-row items-center justify-between gap-6 print:hidden">
      <div className="absolute top-2 right-2">
        <IconButton
          icon="close"
          onClick={() => {
            localStorage.setItem('extension-promo-dismissed', 'true');
            setIsDismissed(true);
          }}
          className="text-on-surface-variant hover:text-on-surface"
          aria-label="Dismiss promo"
        />
      </div>
      <div className="flex items-start gap-4 pr-6">
        <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-primary text-[28px]">extension</span>
        </div>
        <div className="flex flex-col">
          <h3 className="text-lg font-bold text-on-surface mb-1">Protect yourself everywhere</h3>
          <p className="text-sm text-on-surface-variant max-w-xl mb-3">
            Install the Veritas Chrome Extension to instantly verify videos and images directly on Twitter, YouTube, and news sites with a single click.
          </p>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 bg-surface/50 text-on-surface text-xs font-medium px-2 py-1 rounded-full border border-outline-variant/30">
              <span className="material-symbols-outlined text-[14px]">search</span> 1-click detection
            </span>
            <span className="inline-flex items-center gap-1 bg-surface/50 text-on-surface text-xs font-medium px-2 py-1 rounded-full border border-outline-variant/30">
              <span className="material-symbols-outlined text-[14px]">bolt</span> Real-time
            </span>
            <span className="inline-flex items-center gap-1 bg-surface/50 text-on-surface text-xs font-medium px-2 py-1 rounded-full border border-outline-variant/30">
              <span className="material-symbols-outlined text-[14px]">language</span> Any website
            </span>
          </div>
          <p className="text-xs text-on-surface-variant">Works with Chrome, Edge, and Brave</p>
        </div>
      </div>
      <Button variant="filled" onClick={() => window.alert('To install: Open chrome://extensions, enable Developer Mode, and Load Unpacked from apps/extension/dist')} className="shrink-0 whitespace-nowrap pl-3">
        <span className="material-symbols-outlined mr-2 text-[20px]">extension</span> Install Extension
      </Button>
    </div>
  );
}
