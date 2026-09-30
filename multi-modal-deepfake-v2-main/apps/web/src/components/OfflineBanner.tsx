'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  useEffect(() => {

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-[100] flex justify-center pointer-events-none"
        >
          <div className="bg-amber-500/90 text-on-surface px-4 py-1.5 rounded-b-xl shadow-lg backdrop-blur-md flex items-center gap-2 border-b border-l border-r border-amber-400/30">
            <span className="material-symbols-outlined text-[16px] animate-pulse">wifi_off</span>
            <span className="text-xs font-bold tracking-wide">You are offline. Veritas is running in local heuristic mode.</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
