'use client';
import React from 'react';
import Link from 'next/link';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col items-center justify-center gap-6 px-6 text-center">
      {/* Animated icon */}
      <div className="w-24 h-24 rounded-3xl bg-surface-container flex items-center justify-center mb-2 shadow-xl">
        <span className="material-symbols-outlined text-[52px] text-on-surface-variant">wifi_off</span>
      </div>

      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-on-surface mb-2">You&apos;re offline</h1>
        <p className="text-on-surface-variant max-w-sm mx-auto leading-relaxed">
          Veritas AI needs an internet connection to analyze media. Check your connection and try again.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 bg-primary text-on-primary font-bold px-6 py-3 rounded-full shadow-lg hover:opacity-90 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">refresh</span>
          Try Again
        </button>
        <Link
          href="/"
          className="flex items-center gap-2 border border-outline-variant text-on-surface font-medium px-6 py-3 rounded-full hover:bg-surface-container transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">home</span>
          Go Home
        </Link>
      </div>

      <p className="text-xs text-on-surface-variant/60 mt-4 max-w-xs">
        Previously analyzed reports may still be available if they were cached during your last session.
      </p>
    </div>
  );
}
