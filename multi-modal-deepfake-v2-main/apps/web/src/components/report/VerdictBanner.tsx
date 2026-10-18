/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React from 'react';
import { Skeleton } from '@repo/ui';

interface VerdictBannerProps {
  isLoading: boolean;
  result: any;
  confidenceScore: number;
  isManipulated: boolean;
  fileData: { name: string; type: string; size: number; url?: string };
  fileHash: string;
  timestamp: string;
  isExportingPDF: boolean;
  onExportPDF: () => void;
  onExportJSON: () => void;
  onCopySummary: () => void;
  onNativeShare: () => void;
  onFlagAnomaly: () => void;
  showShareMenu: boolean;
  setShowShareMenu: React.Dispatch<React.SetStateAction<boolean>>;
  getShareText: () => string;
  getShareUrl: () => string;
}

export function VerdictBanner({
  isLoading,
  result,
  confidenceScore,
  isManipulated,
  isExportingPDF,
  onExportPDF,
  onExportJSON,
  onCopySummary,
  onNativeShare,
  onFlagAnomaly,
  showShareMenu,
  setShowShareMenu,
  getShareText,
  getShareUrl,
}: VerdictBannerProps) {
  return (
    <section
      className={`border rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden transition-all backdrop-blur-md ${
        isManipulated
          ? 'bg-gradient-to-br from-error/15 via-surface-container-low to-surface-container-low border-error/35 border-l-6 border-l-error'
          : 'bg-gradient-to-br from-emerald-500/15 via-surface-container-low to-surface-container-low border-emerald-500/35 border-l-6 border-l-emerald-500'
      }`}
    >
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
        {/* Left Side: Summary, Title, Action Bar */}
        <div className="flex flex-col gap-3.5 max-w-2xl">
          {/* Metadata Badges */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <span
              className={`text-[11px] font-mono tracking-wider uppercase px-3 py-1 rounded-full font-bold border shadow-xs ${
                isManipulated
                  ? 'bg-error/20 text-error border-error/40'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
              }`}
            >
              {isManipulated ? '🚨 Critical Forensic Alert' : '🛡️ Integrity Verified'}
            </span>
            <span className="text-xs text-on-surface-variant font-mono bg-surface-container-highest/60 px-2.5 py-0.5 rounded-md border border-outline-variant/30">
              Engine: Veritas Multi-Modal ViT v2.4
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-on-surface tracking-tight leading-tight">
            {isManipulated ? 'Synthetic Manipulation Detected' : 'Media Authenticity Verified'}
          </h1>

          {/* Executive Summary */}
          {isLoading || !result ? (
            <div className="space-y-2 mt-2">
              <Skeleton className="h-5 w-full rounded" />
              <Skeleton className="h-5 w-3/4 rounded" />
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant leading-relaxed font-normal">
              {isManipulated
                ? 'High-confidence indicators of synthetic synthesis, deepfake face-swap, or generative diffusion were detected across multiple forensic modalities.'
                : 'No anomalous synthetic signals were detected. Visual patch continuity, vocoder harmonics, and biometric alignment match organic media.'}
            </p>
          )}

          {/* Quick Action Toolbar */}
          <div className="relative flex items-center gap-2 pt-2 flex-wrap print:hidden w-full sm:w-auto">
            <button
              onClick={onCopySummary}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-surface-container-highest hover:bg-surface-container-high text-on-surface transition-all border border-outline-variant/30 shadow-xs cursor-pointer hover:scale-[1.02] active:scale-[0.98] flex-1 sm:flex-initial"
              title="Copy formatted forensic findings to clipboard"
            >
              <span className="material-symbols-outlined text-[17px]">content_copy</span>
              <span>Copy Summary</span>
            </button>

            <button
              onClick={onExportJSON}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-surface-container-highest hover:bg-surface-container-high text-on-surface transition-all border border-outline-variant/30 shadow-xs cursor-pointer hover:scale-[1.02] active:scale-[0.98] flex-1 sm:flex-initial"
              title="Download complete forensic telemetry data in JSON format"
            >
              <span className="material-symbols-outlined text-[17px]">data_object</span>
              <span>Export JSON</span>
            </button>

            <button
              onClick={onExportPDF}
              disabled={isExportingPDF || !result}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-primary text-on-primary hover:bg-primary/90 transition-all border border-primary/20 shadow-xs disabled:opacity-50 cursor-pointer hover:scale-[1.02] active:scale-[0.98] flex-1 sm:flex-initial"
              title="Download court-ready forensic PDF dossier"
            >
              <span className="material-symbols-outlined text-[17px]">
                {isExportingPDF ? 'hourglass_top' : 'picture_as_pdf'}
              </span>
              <span>{isExportingPDF ? 'Compiling PDF...' : 'Export PDF'}</span>
            </button>

            {/* Share Menu */}
            <div className="relative flex-1 sm:flex-initial">
              <button
                onClick={onNativeShare}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-surface-container-highest hover:bg-surface-container-high text-on-surface transition-all border border-outline-variant/30 shadow-xs cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-[17px]">share</span>
                <span>Share</span>
              </button>

              {showShareMenu && (
                <div className="absolute left-0 top-full mt-2 w-56 bg-surface-container border border-outline-variant/40 rounded-2xl shadow-2xl p-2 z-50 flex flex-col gap-1 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200">
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(getShareText())}&url=${encodeURIComponent(getShareUrl())}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowShareMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-on-surface hover:bg-on-surface/8 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px] text-sky-400">send</span>
                    Share on X (Twitter)
                  </a>
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(getShareText() + ' ' + getShareUrl())}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowShareMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-on-surface hover:bg-on-surface/8 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px] text-emerald-400">chat</span>
                    Share on WhatsApp
                  </a>
                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(getShareUrl())}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowShareMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-on-surface hover:bg-on-surface/8 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px] text-blue-400">share</span>
                    Share on LinkedIn
                  </a>
                  <a
                    href={`https://t.me/share/url?url=${encodeURIComponent(getShareUrl())}&text=${encodeURIComponent(getShareText())}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowShareMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-on-surface hover:bg-on-surface/8 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px] text-cyan-400">near_me</span>
                    Share on Telegram
                  </a>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(getShareUrl());
                      setShowShareMenu(false);
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-on-surface hover:bg-on-surface/8 transition-colors border-t border-outline-variant/20 mt-1 pt-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">link</span>
                    Copy Link
                  </button>
                </div>
              )}
            </div>

            {/* Flag Anomaly Button */}
            <button
              onClick={onFlagAnomaly}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-surface-container-highest hover:bg-error/10 text-on-surface-variant hover:text-error transition-all border border-outline-variant/30 cursor-pointer flex-1 sm:flex-initial sm:ml-auto"
              title="Flag analysis for model review"
            >
              <span className="material-symbols-outlined text-[17px]">flag</span>
              <span>Flag Anomaly</span>
            </button>
          </div>
        </div>

        {/* Right Side: Radial Confidence Gauge & Classification */}
        <div className="flex flex-col items-center justify-center p-6 rounded-3xl bg-surface-container/70 border border-outline-variant/30 shrink-0 w-full lg:w-auto min-w-[240px] shadow-xs">
          {isLoading || !result ? (
            <Skeleton className="w-32 h-32 rounded-full" />
          ) : (
            <>
              {/* Radial Gauge */}
              <div className="relative w-32 h-32 flex items-center justify-center mb-3">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-surface-container-highest/80"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke={isManipulated ? '#ef4444' : '#10b981'}
                    strokeWidth="8"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 - (251.2 * Math.min(confidenceScore, 100)) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span
                    className={`font-mono text-3xl font-black tracking-tight ${
                      isManipulated ? 'text-error' : 'text-emerald-400'
                    }`}
                  >
                    {confidenceScore.toFixed(0)}%
                  </span>
                  <span className="text-[9.5px] uppercase font-bold tracking-wider text-on-surface-variant">
                    Confidence
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              <div
                className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide flex items-center gap-1.5 border shadow-xs ${
                  isManipulated
                    ? 'bg-error/20 text-error border-error/40'
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                }`}
              >
                <span className="material-symbols-outlined text-[17px]">
                  {isManipulated ? 'gpp_bad' : 'verified'}
                </span>
                <span>{isManipulated ? 'MANIPULATED' : 'AUTHENTIC'}</span>
              </div>

              {/* Risk Category Description */}
              <span className="text-[10.5px] text-on-surface-variant font-mono mt-2 text-center">
                {confidenceScore > 70
                  ? isManipulated
                    ? 'High Threat Severity'
                    : 'High Integrity Confidence'
                  : confidenceScore > 30
                  ? 'Moderate Correlation'
                  : 'Low Anomaly Probability'}
              </span>

              {/* Quality Flags */}
              {result.quality_flags && result.quality_flags.length > 0 && (
                <div className="mt-3 flex flex-col gap-1 w-full max-w-[200px]">
                  {result.quality_flags.map((flag: string, idx: number) => (
                    <span
                      key={idx}
                      className="text-[10px] font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/25 px-2.5 py-0.5 rounded-md text-center truncate"
                    >
                      ⚠ {flag}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
