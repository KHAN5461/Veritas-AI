'use client';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface PwaContextType {
  isStandalone: boolean;
  isInstallable: boolean;
  isIOS: boolean;
  hasExtension: boolean;
  showIOSSheet: boolean;
  setShowIOSSheet: (show: boolean) => void;
  promptInstall: () => Promise<void>;
}

const PwaContext = createContext<PwaContextType>({
  isStandalone: false,
  isInstallable: false,
  isIOS: false,
  hasExtension: false,
  showIOSSheet: false,
  setShowIOSSheet: () => {},
  promptInstall: async () => {},
});

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [hasExtension, setHasExtension] = useState(false);
  const [showIOSSheet, setShowIOSSheet] = useState(false);

  // 1. Detect Standalone PWA Mode & Platform
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkStandalone = () => {
      const standaloneQuery = window.matchMedia('(display-mode: standalone)').matches;
      const navigatorStandalone = (window.navigator as any).standalone === true;
      const isPwa = standaloneQuery || navigatorStandalone;
      setIsStandalone(isPwa);
    };

    checkStandalone();

    const mql = window.matchMedia('(display-mode: standalone)');
    const onChange = (e: MediaQueryListEvent) => setIsStandalone(e.matches);
    mql.addEventListener('change', onChange);

    const ua = window.navigator.userAgent.toLowerCase();
    const isAppleMobile = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isAppleMobile);

    // Capture Chrome/Android PWA install prompt
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    // Fired when the app is successfully installed
    const onAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
      setShowIOSSheet(false);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      mql.removeEventListener('change', onChange);
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  // 2. Multi-Vector Zero-Latency Extension Detection
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const verifyExtension = () => {
      const metaFound = !!document.querySelector('meta[name="veritas-extension-installed"]');
      const windowFound = !!(window as any).__VERITAS_EXTENSION__;
      if (metaFound || windowFound) {
        setHasExtension(true);
        return true;
      }
      return false;
    };

    if (verifyExtension()) return;

    // Vector A: MutationObserver on document.head to catch instant meta tag injection
    const observer = new MutationObserver(() => {
      if (verifyExtension()) {
        observer.disconnect();
      }
    });

    if (document.head) {
      observer.observe(document.head, { childList: true, subtree: true });
    }

    // Vector B: Bidirectional PostMessage Handshake
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'VERITAS_PONG' || event.data?.type === 'VERITAS_EXTENSION_LOADED') {
        setHasExtension(true);
        observer.disconnect();
      }
    };
    window.addEventListener('message', onMessage);

    // Send ping
    window.postMessage({ type: 'VERITAS_PING' }, '*');

    // Vector C: Fast fallback polling for 1.5 seconds
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (verifyExtension() || attempts > 6) {
        clearInterval(interval);
      }
    }, 250);

    return () => {
      observer.disconnect();
      window.removeEventListener('message', onMessage);
      clearInterval(interval);
    };
  }, []);

  // 3. User Triggered Install Action
  const promptInstall = useCallback(async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsStandalone(true);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSSheet(true);
    }
  }, [deferredPrompt, isIOS]);

  const isInstallable = !isStandalone && (!!deferredPrompt || isIOS);

  return (
    <PwaContext.Provider
      value={{
        isStandalone,
        isInstallable,
        isIOS,
        hasExtension,
        showIOSSheet,
        setShowIOSSheet,
        promptInstall,
      }}
    >
      {children}
    </PwaContext.Provider>
  );
}

export function usePwa() {
  return useContext(PwaContext);
}
