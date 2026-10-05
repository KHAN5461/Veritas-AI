'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePwa } from '../context/PwaContext';

export function IOSInstallSheet() {
  const { showIOSSheet, setShowIOSSheet } = usePwa();

  if (!showIOSSheet) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 backdrop-blur-sm">
        {/* Backdrop click to dismiss */}
        <div className="absolute inset-0" onClick={() => setShowIOSSheet(false)} />

        {/* Sheet Card */}
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg bg-surface-container-high border-t border-outline-variant/30 rounded-t-3xl p-6 shadow-2xl z-10 text-on-surface"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-outline-variant/20 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <img src="/logo.png" alt="Veritas Logo" className="w-6 h-6 object-contain" />
              </div>
              <div>
                <h3 className="font-bold text-base text-on-surface">Install Veritas AI</h3>
                <p className="text-xs text-on-surface-variant">Install on your iPhone or iPad for native share sheet access</p>
              </div>
            </div>
            <button
              onClick={() => setShowIOSSheet(false)}
              className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* Step 1 */}
          <div className="space-y-4 mb-6 text-xs">
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-surface-container border border-outline-variant/20">
              <div className="w-7 h-7 rounded-full bg-primary-container text-on-primary-container font-bold flex items-center justify-center shrink-0">
                1
              </div>
              <div className="flex-1">
                <p className="font-semibold text-on-surface">
                  Tap the <span className="text-primary font-bold">Share</span> button
                </p>
                <p className="text-on-surface-variant text-[11px] mt-0.5">
                  Located in Safari&apos;s bottom toolbar (the square box with an arrow pointing up <span className="font-bold">⬆</span>).
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-surface-container border border-outline-variant/20">
              <div className="w-7 h-7 rounded-full bg-primary-container text-on-primary-container font-bold flex items-center justify-center shrink-0">
                2
              </div>
              <div className="flex-1">
                <p className="font-semibold text-on-surface">
                  Select <span className="text-primary font-bold">Add to Home Screen</span>
                </p>
                <p className="text-on-surface-variant text-[11px] mt-0.5">
                  Scroll down the share sheet menu and tap the plus icon labeled <span className="font-bold">&quot;Add to Home Screen&quot;</span>.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-surface-container border border-outline-variant/20">
              <div className="w-7 h-7 rounded-full bg-primary-container text-on-primary-container font-bold flex items-center justify-center shrink-0">
                3
              </div>
              <div className="flex-1">
                <p className="font-semibold text-on-surface">
                  Tap <span className="text-primary font-bold">Add</span>
                </p>
                <p className="text-on-surface-variant text-[11px] mt-0.5">
                  Confirm in the top right corner. Veritas AI will appear on your Home Screen as a native app!
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowIOSSheet(false)}
            className="w-full py-3 rounded-2xl bg-primary text-on-primary font-bold text-xs tracking-wide shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all"
          >
            Got it, ready to install
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
