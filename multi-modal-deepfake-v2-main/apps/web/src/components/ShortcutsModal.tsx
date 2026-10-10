'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SHORTCUTS = [
  {
    category: 'Navigation',
    items: [
      { key: 'Ctrl + U', description: 'Open Single Media Scanner' },
      { key: 'Ctrl + B', description: 'Open Batch Processing Queue' },
      { key: 'Ctrl + K', description: 'View Forensic History Ledger' },
      { key: 'Ctrl + Shift + T', description: 'Threat Intelligence Monitor' },
    ]
  },
  {
    category: 'Actions & Export',
    items: [
      { key: 'Ctrl + S', description: 'Share Forensic Report (Native / Social)' },
      { key: 'Ctrl + P', description: 'Export Court-Ready PDF Dossier' },
      { key: '?', description: 'Toggle Shortcuts Help HUD' },
      { key: 'Esc', description: 'Close Modals and Overlays' },
    ]
  }
];

export function ShortcutsModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === '?' || (e.ctrlKey && e.key === '/')) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg rounded-3xl bg-surface-container border border-outline-variant/40 shadow-2xl p-6 z-10 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-outline-variant/30 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[22px]">keyboard</span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-on-surface">Keyboard Shortcuts</h3>
                    <p className="text-xs text-on-surface-variant">Quick key bindings for rapid forensic operations</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-on-surface/8 transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Shortcuts Groups */}
              <div className="flex flex-col gap-5">
                {SHORTCUTS.map((group) => (
                  <div key={group.category}>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-primary mb-2.5">
                      {group.category}
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      {group.items.map((item) => (
                        <div
                          key={item.key}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-highest/50 border border-outline-variant/20"
                        >
                          <span className="text-xs text-on-surface font-medium">{item.description}</span>
                          <kbd className="px-2 py-1 rounded-lg bg-surface border border-outline-variant/40 text-[11px] font-mono font-semibold text-primary shadow-xs">
                            {item.key}
                          </kbd>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer Tip */}
              <div className="mt-6 pt-4 border-t border-outline-variant/20 flex items-center justify-between text-[11px] text-on-surface-variant">
                <span>Press <kbd className="px-1.5 py-0.5 rounded bg-surface border border-outline-variant text-on-surface font-mono">?</kbd> anywhere to open</span>
                <span>Press <kbd className="px-1.5 py-0.5 rounded bg-surface border border-outline-variant text-on-surface font-mono">Esc</kbd> to close</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
