'use client';
import React, { useEffect, useState } from 'react';
import { Button } from '@repo/ui';

export function ExtensionPromo() {
  const [hasExtension, setHasExtension] = useState(true); // default true to avoid flash

  useEffect(() => {
    // Check if the extension injected the meta tag
    const checkExtension = () => {
      const meta = document.querySelector('meta[name="veritas-extension-installed"]');
      if (!meta) setHasExtension(false);
      else setHasExtension(true);
    };

    // Small delay to let content script inject
    setTimeout(checkExtension, 1000);
  }, []);

  if (hasExtension) return null;

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-2xl p-6 mb-8 flex flex-col sm:flex-row items-center justify-between gap-6 print:hidden">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-primary text-[28px]">extension</span>
        </div>
        <div>
          <h3 className="text-lg font-bold text-on-surface mb-1">Protect yourself everywhere</h3>
          <p className="text-sm text-on-surface-variant max-w-xl">
            Install the Veritas Chrome Extension to instantly verify videos and images directly on Twitter, YouTube, and news sites with a single click.
          </p>
        </div>
      </div>
      <Button variant="filled" onClick={() => window.alert('To install: Open chrome://extensions, enable Developer Mode, and Load Unpacked from apps/extension/dist')} className="shrink-0 whitespace-nowrap">
        Install Extension
      </Button>
    </div>
  );
}
