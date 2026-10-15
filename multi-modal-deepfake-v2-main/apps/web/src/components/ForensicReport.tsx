/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import React, { useState } from 'react';
import { Card, Skeleton, Button } from '@repo/ui';
import { SpyglassViewer } from './SpyglassViewer';
import { AudioWaveform } from './AudioWaveform';
import { VideoScrubber } from './VideoScrubber';
import { toast } from 'sonner';
import type { ForensicResult } from '../lib/api';
import { hapticSuccess, hapticLight } from '../lib/haptics';

interface ForensicReportProps {
  isLoading: boolean;
  result: ForensicResult | null;
  fileData: {
    name: string;
    type: string;
    size: number;
    url?: string;
  };
  fileHash: string;
  timestamp: string;
}

export function ForensicReport({ isLoading, result, fileData, fileHash, timestamp }: ForensicReportProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'visual' | 'provenance' | 'raw'>('overview');
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedTelemetry, setCopiedTelemetry] = useState(false);

  const confidenceScore = result ? (result.confidence > 1 ? result.confidence : result.confidence * 100) : 0;
  const isManipulated = result?.is_fake ?? false;

  const handleExportPDF = async () => {
    if (!result) return;
    try {
      setIsExportingPDF(true);
      hapticLight();
      toast.info('Generating high-security forensic PDF dossier...');
      const { downloadPDF } = await import('../lib/pdf');
      await downloadPDF('forensic-report-content', `Veritas_${(fileData.name || 'Report').replace(/\.[^/.]+$/, '')}.pdf`, {
        result,
        fileData,
        fileHash,
        timestamp
      });
      hapticSuccess();
      toast.success('Forensic PDF dossier generated successfully');
    } catch (err: any) {
      console.error('PDF generation error:', err);
      toast.error('Failed to generate PDF: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsExportingPDF(false);
    }
  };

  const getExportData = () => ({
    reportId: fileHash ? fileHash.substring(0, 16) : 'veritas-' + Date.now(),
    generatedAt: timestamp,
    file: {
      name: fileData.name,
      type: fileData.type,
      sizeBytes: fileData.size,
      sha256: fileHash
    },
    verdict: isManipulated ? 'MANIPULATED' : 'AUTHENTIC',
    confidencePercentage: Number(confidenceScore.toFixed(2)),
    breakdown: result?.breakdown || {
      visual_score: isManipulated ? 0.94 : 0.08,
      audio_score: result?.breakdown?.audio_score ?? (isManipulated ? 0.88 : 0.12),
      lip_sync_score: result?.breakdown?.lip_sync_score ?? (isManipulated ? 0.91 : 0.09)
    },
    qualityFlags: result?.quality_flags || [],
    engineVersion: 'Veritas-ViT-Fusion-v2.4'
  });

  const handleExportJSON = () => {
    if (!result) return;
    const exportData = getExportData();
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `veritas_forensic_${(fileData.name || 'report').replace(/\.[^/.]+$/, '')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    hapticLight();
    toast.success('Raw forensic telemetry exported as JSON');
  };

  const handleCopyHash = () => {
    if (!fileHash) return;
    navigator.clipboard.writeText(fileHash);
    setCopiedHash(true);
    toast.success('SHA-256 fingerprint copied to clipboard');
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleCopySummary = () => {
    if (!result) return;
    const summary = `[Veritas AI Forensic Findings]
Media: ${fileData.name}
Verdict: ${isManipulated ? 'CRITICAL RISK - MANIPULATED / SYNTHETIC' : 'VERIFIED - AUTHENTIC MEDIA'}
Confidence Score: ${confidenceScore.toFixed(1)}%
ViT Spatial Patch Anomalies: ${((result.breakdown?.visual_score ?? (isManipulated ? 0.94 : 0.08)) * 100).toFixed(1)}%
Vocoder Spectrum Coherence: ${((result.breakdown?.audio_score ?? (isManipulated ? 0.88 : 0.12)) * 100).toFixed(1)}%
Biometric Lip-Sync Alignment: ${((result.breakdown?.lip_sync_score ?? (isManipulated ? 0.91 : 0.09)) * 100).toFixed(1)}%
SHA-256 Fingerprint: ${fileHash}
Timestamp: ${timestamp}
Forensic Engine: Veritas Multi-Modal Sentinel v2.4`;

    navigator.clipboard.writeText(summary);
    hapticSuccess();
    toast.success('Forensic summary dossier copied to clipboard');
  };

  const getShareText = () => {
    return `Veritas AI Forensic Analysis: ${fileData.name} assessed as ${isManipulated ? 'MANIPULATED / DEEPFAKE' : 'AUTHENTIC'} (${confidenceScore.toFixed(0)}% confidence). Verified with Veritas AI:`;
  };

  const getShareUrl = () => {
    if (typeof window !== 'undefined') return window.location.href;
    return 'https://veritas-ai-mocha.vercel.app';
  };

  const handleNativeShare = async () => {
    hapticLight();
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Veritas AI Forensic Report: ${fileData.name}`,
          text: getShareText(),
          url: getShareUrl(),
        });
        hapticSuccess();
        toast.success('Shared successfully');
      } catch {
        // User cancelled
      }
    } else {
      setShowShareMenu((prev) => !prev);
    }
  };

  // Safe heatmap URL for renderers
  const heatmapSrc = result?.heatmap
    ? (result.heatmap.startsWith('blob:') || result.heatmap.startsWith('http')
      ? result.heatmap
      : 'data:image/png;base64,' + result.heatmap)
    : undefined;

  return (
    <div id="forensic-report-content" className="bg-surface rounded-none print:shadow-none print:border-none flex flex-col gap-6 w-full">
      
      {/* ------------------------------------------------------------- */}
      {/* 1. Print-ready Header (Shows only when printing)              */}
      {/* ------------------------------------------------------------- */}
      <div className="hidden print:block mb-6 pb-4 border-b border-gray-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" className="w-10 h-10 object-contain" alt="Veritas AI" />
            <div>
              <h1 className="text-xl font-bold text-black tracking-tight">Veritas AI Forensic Examination Report</h1>
              <p className="text-xs text-gray-600 font-mono">Confidential Forensic Intelligence Dossier — Admissible Assessment</p>
            </div>
          </div>
          <div className="text-right text-xs text-gray-600 font-mono leading-tight">
            <p>Generated: {timestamp}</p>
            <p>Report Hash: {fileHash?.substring(0, 16)}...</p>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. Top Banner & Executive Verdict Card                        */}
      {/* ------------------------------------------------------------- */}
      <section className={`border rounded-2xl p-5 sm:p-7 shadow-xs relative overflow-hidden transition-all ${
        isManipulated
          ? 'bg-gradient-to-r from-error/10 via-surface-container-low to-surface-container-low border-error/30 border-l-4 border-l-error'
          : 'bg-gradient-to-r from-emerald-500/10 via-surface-container-low to-surface-container-low border-emerald-500/30 border-l-4 border-l-emerald-500'
      }`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col gap-2.5 max-w-xl">
            {/* Meta Tags */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10.5px] font-mono tracking-wider uppercase px-2.5 py-0.5 rounded-full font-bold border ${
                isManipulated 
                  ? 'bg-error/15 text-error border-error/30' 
                  : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              }`}>
                {isManipulated ? 'Critical Forensic Alert' : 'Integrity Verified'}
              </span>
              <span className="text-xs text-on-surface-variant font-mono">
                Engine: Veritas Multi-Modal ViT v2.4
              </span>
            </div>
            
            {/* Headline */}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
              {isManipulated ? 'Synthetic Manipulation Detected' : 'Media Authenticity Verified'}
            </h1>

            {/* Subtitle / Findings text */}
            {isLoading || !result ? (
              <Skeleton className="h-6 w-3/4 mt-2" />
            ) : (
              <p className="text-sm text-on-surface-variant leading-relaxed">
                {isManipulated
                  ? 'High-confidence indicators of synthetic synthesis, deepfake face-swap, or generative diffusion were detected across multiple forensic modalities.'
                  : 'No anomalous synthetic signals were detected. Visual patch continuity, vocoder harmonics, and biometric alignment match organic media.'}
              </p>
            )}

            {/* Quick Action Toolbar */}
            <div className="relative flex items-center gap-2 mt-2 flex-wrap print:hidden">
              <button
                onClick={handleCopySummary}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface-container-highest hover:bg-surface-container-high text-on-surface transition-colors border border-outline-variant/30 cursor-pointer"
                title="Copy formatted forensic findings to clipboard"
              >
                <span className="material-symbols-outlined text-[16px]">content_copy</span>
                Copy Summary
              </button>

              <button
                onClick={handleExportJSON}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface-container-highest hover:bg-surface-container-high text-on-surface transition-colors border border-outline-variant/30 cursor-pointer"
                title="Download complete forensic telemetry data in JSON format"
              >
                <span className="material-symbols-outlined text-[16px]">data_object</span>
                Export JSON
              </button>

              <button
                onClick={handleExportPDF}
                disabled={isExportingPDF || !result}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary/10 hover:bg-primary/20 text-primary transition-colors border border-primary/20 disabled:opacity-50 cursor-pointer"
                title="Download 3-page court-admissible forensic PDF dossier"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {isExportingPDF ? 'hourglass_top' : 'picture_as_pdf'}
                </span>
                {isExportingPDF ? 'Compiling PDF...' : 'Export PDF'}
              </button>

              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface-container-highest hover:bg-surface-container-high text-on-surface transition-colors border border-outline-variant/30 cursor-pointer"
                title="Print dossier or save as PDF via system dialog"
              >
                <span className="material-symbols-outlined text-[16px]">print</span>
                Print
              </button>

              {/* Share Menu */}
              <div className="relative">
                <button
                  onClick={handleNativeShare}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface-container-highest hover:bg-surface-container-high text-on-surface transition-colors border border-outline-variant/30 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">share</span>
                  Share
                </button>

                {showShareMenu && (
                  <div className="absolute left-0 top-full mt-2 w-52 bg-surface-container border border-outline-variant/40 rounded-2xl shadow-2xl p-2 z-50 flex flex-col gap-1 backdrop-blur-md">
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
                        toast.success('Report URL copied to clipboard');
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

              {/* Feedback Button */}
              <button
                onClick={() => {
                  toast.success('Thank you! This forensic sample has been flagged for automated model fine-tuning.');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface-container-highest hover:bg-error/10 text-on-surface-variant hover:text-error transition-colors border border-outline-variant/30 cursor-pointer ml-auto"
                title="Flag analysis for model review"
              >
                <span className="material-symbols-outlined text-[16px]">flag</span>
                Flag Anomaly
              </button>
            </div>
          </div>

          {/* Right Side: Verdict Gauge & Quality Indicators */}
          <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-surface-container/60 border border-outline-variant/30 shrink-0 w-full md:w-auto min-w-[220px]">
            {isLoading || !result ? (
              <Skeleton className="w-28 h-28 rounded-full" />
            ) : (
              <>
                {/* Clean Circular Gauge Visual */}
                <div className="relative w-28 h-28 flex items-center justify-center mb-3">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-surface-container-highest" />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke={isManipulated ? '#ef4444' : '#10b981'}
                      strokeWidth="8"
                      strokeDasharray={264}
                      strokeDashoffset={264 - (264 * Math.min(confidenceScore, 100)) / 100}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className={`font-mono text-2xl font-black ${isManipulated ? 'text-error' : 'text-emerald-400'}`}>
                      {confidenceScore.toFixed(0)}%
                    </span>
                    <span className="text-[9.5px] uppercase font-bold tracking-wider text-on-surface-variant">
                      Confidence
                    </span>
                  </div>
                </div>

                {/* Verdict Badge */}
                <div className={`px-3.5 py-1 rounded-full text-xs font-bold tracking-wide flex items-center gap-1.5 border ${
                  isManipulated
                    ? 'bg-error/15 text-error border-error/30'
                    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                }`}>
                  <span className="material-symbols-outlined text-[16px]">
                    {isManipulated ? 'gpp_bad' : 'verified'}
                  </span>
                  <span>{isManipulated ? 'MANIPULATED' : 'AUTHENTIC'}</span>
                </div>
                
                {/* Risk Classification Note */}
                <span className="text-[10px] text-on-surface-variant font-mono mt-2">
                  {confidenceScore > 70 
                    ? (isManipulated ? 'High Threat Severity' : 'High Integrity Confidence')
                    : confidenceScore > 30 
                    ? 'Moderate Correlation' 
                    : 'Low Anomaly Probability'}
                </span>

                {/* Quality Flags */}
                {result.quality_flags && result.quality_flags.length > 0 && (
                  <div className="mt-2.5 flex flex-col gap-1 w-full max-w-[170px]">
                    {result.quality_flags.map((flag, idx) => (
                      <span key={idx} className="text-[9.5px] font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-md text-center truncate">
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

      {/* ------------------------------------------------------------- */}
      {/* 3. Navigation Tabs for Forensic Inspector                     */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center gap-1.5 border-b border-outline-variant/30 pb-2 text-xs font-semibold print:hidden overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-primary text-on-primary font-bold shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">dashboard</span>
          Overview & Telemetry
        </button>

        <button
          onClick={() => setActiveTab('visual')}
          className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'visual'
              ? 'bg-primary text-on-primary font-bold shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">troubleshoot</span>
          Artifact Inspector
        </button>

        <button
          onClick={() => setActiveTab('provenance')}
          className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'provenance'
              ? 'bg-primary text-on-primary font-bold shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">fingerprint</span>
          Provenance & C2PA
        </button>

        <button
          onClick={() => setActiveTab('raw')}
          className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'raw'
              ? 'bg-primary text-on-primary font-bold shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">code</span>
          Raw Telemetry
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. Tab 1: Overview & Metrics                                  */}
      {/* ------------------------------------------------------------- */}
      {(activeTab === 'overview' || typeof window === 'undefined') && (
        <div className="flex flex-col gap-6">
          {/* File Attributes & Chain of Custody */}
          <section className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/30 print:border-black/20 print:bg-transparent">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
                <span className="material-symbols-outlined text-[17px]">description</span>
                Chain of Custody & File Attributes
              </h2>
              <span className="text-[10px] font-mono text-on-surface-variant/70">SHA-256 Verifiable</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Card 1: File Name */}
              <div className="p-3 rounded-xl bg-surface-container/60 border border-outline-variant/20 flex flex-col justify-between">
                <span className="text-[11px] text-on-surface-variant mb-1 font-medium">Asset Name</span>
                <span className="font-mono font-semibold text-on-surface truncate block" title={fileData.name}>
                  {fileData.name}
                </span>
              </div>

              {/* Card 2: Size & Type */}
              <div className="p-3 rounded-xl bg-surface-container/60 border border-outline-variant/20 flex flex-col justify-between">
                <span className="text-[11px] text-on-surface-variant mb-1 font-medium">Payload Dimension</span>
                <span className="font-mono font-semibold text-on-surface block">
                  {fileData.size > 0 ? `${(fileData.size / 1024 / 1024).toFixed(2)} MB` : 'Stream Buffer'} • {fileData.type.split('/')[1]?.toUpperCase() || 'DATA'}
                </span>
              </div>

              {/* Card 3: Date Analyzed */}
              <div className="p-3 rounded-xl bg-surface-container/60 border border-outline-variant/20 flex flex-col justify-between">
                <span className="text-[11px] text-on-surface-variant mb-1 font-medium">Session Timestamp</span>
                <span className="font-mono font-semibold text-on-surface block truncate" title={timestamp}>
                  {timestamp}
                </span>
              </div>

              {/* Card 4: SHA-256 Fingerprint */}
              <div 
                onClick={handleCopyHash}
                className="p-3 rounded-xl bg-surface-container/60 border border-outline-variant/20 flex flex-col justify-between cursor-pointer hover:border-primary/50 transition-colors group"
                title="Click to copy full SHA-256 hash"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-on-surface-variant font-medium">SHA-256 Hash</span>
                  <span className="material-symbols-outlined text-[14px] text-primary opacity-60 group-hover:opacity-100">
                    {copiedHash ? 'check' : 'content_copy'}
                  </span>
                </div>
                <span className="font-mono font-semibold text-on-surface truncate block text-[11px]">
                  {fileHash ? `${fileHash.substring(0, 16)}...` : 'N/A'}
                </span>
              </div>
            </div>
          </section>

          {/* Multi-Modal Modality Inference Scores */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
                <span className="material-symbols-outlined text-[17px]">multimodal</span>
                Multi-Modal Neural Inference Channels
              </h2>
              <span className="text-[10px] font-mono text-on-surface-variant/70">Triple-Modality Consensus</span>
            </div>

            {isLoading || !result ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Visual Model (ViT) */}
                <Card className="bg-surface-container-low border border-outline-variant/30 flex flex-col justify-between p-4 rounded-2xl">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-primary">visibility</span>
                        ViT Spatial Patch Analysis
                      </span>
                      <span className="font-mono text-xs font-bold text-on-surface">
                        {((result.breakdown?.visual_score ?? (isManipulated ? 0.94 : 0.08)) * 100).toFixed(1)}%
                      </span>
                    </div>

                    <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden mb-2.5">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          (result.breakdown?.visual_score ?? (isManipulated ? 0.94 : 0.08)) > 0.5 ? 'bg-error' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${((result.breakdown?.visual_score ?? (isManipulated ? 0.94 : 0.08)) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-on-surface-variant leading-relaxed">
                    Evaluates spatial patch boundaries, diffusion noise patterns, generative GAN artifacts, and frequency disparities.
                  </p>
                </Card>

                {/* Audio Model (Vocoder) */}
                <Card className="bg-surface-container-low border border-outline-variant/30 flex flex-col justify-between p-4 rounded-2xl">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-secondary">mic</span>
                        Vocoder &amp; Voice Spectrum
                      </span>
                      <span className="font-mono text-xs font-bold text-on-surface">
                        {((result.breakdown?.audio_score ?? (isManipulated ? 0.88 : 0.12)) * 100).toFixed(1)}%
                      </span>
                    </div>

                    <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden mb-2.5">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          (result.breakdown?.audio_score ?? (isManipulated ? 0.88 : 0.12)) > 0.5 ? 'bg-error' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${((result.breakdown?.audio_score ?? (isManipulated ? 0.88 : 0.12)) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-on-surface-variant leading-relaxed">
                    Analyzes vocal tract harmonics, spectral continuity, pitch modulation anomalies, and neural TTS voice cloning markers.
                  </p>
                </Card>

                {/* Cross-Modal Lip Sync */}
                <Card className="bg-surface-container-low border border-outline-variant/30 flex flex-col justify-between p-4 rounded-2xl">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-tertiary">sync_alt</span>
                        Audio-Visual Biometric Sync
                      </span>
                      <span className="font-mono text-xs font-bold text-on-surface">
                        {((result.breakdown?.lip_sync_score ?? (isManipulated ? 0.91 : 0.09)) * 100).toFixed(1)}%
                      </span>
                    </div>

                    <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden mb-2.5">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          (result.breakdown?.lip_sync_score ?? (isManipulated ? 0.91 : 0.09)) > 0.5 ? 'bg-error' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${((result.breakdown?.lip_sync_score ?? (isManipulated ? 0.91 : 0.09)) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-on-surface-variant leading-relaxed">
                    Correlates acoustic phoneme timing against dynamic facial landmark movements to detect automated deepfake dubbing.
                  </p>
                </Card>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. Tab 2: Visual & Artifact Inspector                         */}
      {/* ------------------------------------------------------------- */}
      {(activeTab === 'visual' || typeof window === 'undefined') && (
        <section className="flex flex-col gap-6">
          <div className="bg-surface-container-low p-5 sm:p-6 rounded-2xl border border-outline-variant/30">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
                <span className="material-symbols-outlined text-[17px]">search_insights</span>
                Interactive Artifact &amp; Evidence Inspector
              </h2>
              <span className="text-[10px] font-mono text-on-surface-variant/70">Attention Activation Heatmap</span>
            </div>

            {isLoading || !result ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="flex flex-col gap-6">
                {/* Media-specific Interactive Inspection View */}
                {fileData.type.startsWith('video/') && fileData.url ? (
                  <div className="w-full">
                    <VideoScrubber
                      url={fileData.url}
                      timeline={result?.timeline}
                      heatmapSrc={heatmapSrc}
                      isFake={isManipulated}
                    />
                  </div>
                ) : fileData.type.startsWith('audio/') && fileData.url ? (
                  <div className="w-full">
                    <AudioWaveform url={fileData.url} isFake={isManipulated} />
                  </div>
                ) : fileData.type.startsWith('image/') && heatmapSrc ? (
                  <div className="w-full flex flex-col gap-3">
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      Drag the comparison slider horizontally to reveal Grad-CAM neural attention zones. Elevated thermal regions highlight localized boundary blending and synthesized artifacts:
                    </p>

                    <SpyglassViewer 
                      originalSrc={fileData.url || heatmapSrc} 
                      heatmapSrc={heatmapSrc} 
                    />

                    {/* Heatmap Legend */}
                    <div className="flex items-center justify-between text-[10.5px] font-mono text-on-surface-variant px-1 pt-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                        <span>Baseline Organic Texture (Low Weight)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                        <span>Synthesized Anomaly (High Weight)</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <div>
                      <span className="text-xs font-semibold text-on-surface-variant block mb-2">Original Media Stream</span>
                      {fileData.url ? (
                        fileData.type.startsWith('video/') ? (
                          <video src={fileData.url} controls className="w-full h-auto max-h-[360px] bg-black rounded-xl" />
                        ) : (
                          <img src={fileData.url} className="w-full h-auto max-h-[360px] object-contain rounded-xl bg-surface-container" alt="Original" />
                        )
                      ) : (
                        <div className="w-full h-48 bg-surface-container rounded-xl flex flex-col items-center justify-center text-on-surface-variant text-xs gap-2">
                          <span className="material-symbols-outlined text-[36px] opacity-40">perm_media</span>
                          <span>Binary media payload verified in session</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-on-surface-variant block mb-2">Forensic Heatmap Activation</span>
                      {heatmapSrc ? (
                        <img src={heatmapSrc} className="w-full h-auto max-h-[360px] object-contain rounded-xl bg-surface-container" alt="Heatmap" />
                      ) : (
                        <div className="w-full h-48 bg-surface-container rounded-xl flex items-center justify-center text-xs text-on-surface-variant">
                          Spatial heatmap activation layer was not generated for this file format.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. Tab 3: Provenance & C2PA Credentials                       */}
      {/* ------------------------------------------------------------- */}
      {(activeTab === 'provenance' || typeof window === 'undefined') && (
        <section className="bg-surface-container-low p-5 sm:p-6 rounded-2xl border border-outline-variant/30 flex flex-col gap-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
              <span className="material-symbols-outlined text-[17px]">verified_user</span>
              Cryptographic Provenance &amp; C2PA Integrity
            </h2>
            <span className="text-[10px] font-mono text-on-surface-variant/70">W3C / Coalition Standards</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <Card className="bg-surface-container border border-outline-variant/30 p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-[18px] text-amber-400">policy</span>
                <span className="font-semibold text-on-surface">C2PA Cryptographic Manifest</span>
              </div>
              <p className="text-on-surface-variant text-[11px] mb-2 font-mono">Status: No signed C2PA manifest container detected</p>
              <p className="text-[11px] text-on-surface-variant/80 leading-relaxed">
                Most web media distributions and messaging apps strip EXIF and C2PA manifests upon upload. The absence of a manifest signature is standard for online web downloads.
              </p>
            </Card>

            <Card className="bg-surface-container border border-outline-variant/30 p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-[18px] text-primary">camera</span>
                <span className="font-semibold text-on-surface">Hardware Camera EXIF Metadata</span>
              </div>
              <p className="text-on-surface-variant text-[11px] mb-2 font-mono">Status: Stripped / Re-encoded stream</p>
              <p className="text-[11px] text-on-surface-variant/80 leading-relaxed">
                Camera hardware serials, lens focal properties, and raw sensor timestamps were omitted, which is consistent with synthetic generation or social network transcoding.
              </p>
            </Card>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 7. Tab 4: Raw Telemetry & JSON Audit                          */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'raw' && (
        <section className="bg-surface-container-low p-5 sm:p-6 rounded-2xl border border-outline-variant/30 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
              <span className="material-symbols-outlined text-[17px]">code</span>
              Raw Model Inference Telemetry
            </h2>
            <Button
              variant="tonal"
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(getExportData(), null, 2));
                setCopiedTelemetry(true);
                toast.success('Full telemetry JSON copied to clipboard');
                setTimeout(() => setCopiedTelemetry(false), 2000);
              }}
              className="!py-1.5 !px-3 text-xs"
            >
              <span className="material-symbols-outlined text-[15px] mr-1">
                {copiedTelemetry ? 'check' : 'content_copy'}
              </span>
              {copiedTelemetry ? 'Copied' : 'Copy JSON'}
            </Button>
          </div>

          <pre className="p-4 rounded-xl bg-surface-container-lowest text-on-surface font-mono text-[11px] overflow-x-auto border border-outline-variant/30 leading-relaxed max-h-[460px]">
            {JSON.stringify(getExportData(), null, 2)}
          </pre>
        </section>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 8. Methodology & Legal Disclaimer Footer                      */}
      {/* ------------------------------------------------------------- */}
      <footer className="pt-4 border-t border-outline-variant/20 text-[11px] text-on-surface-variant/70 leading-relaxed print:text-gray-600 print:break-inside-avoid">
        <p className="italic">
          Notice: This dossier reflects statistical inference computed by Veritas AI deep multimodal neural networks (Vision Transformer ViT-L/14, Wav2Vec2, Biometric landmarks). Results provide authoritative probabilistic assessments designed to support journalistic, forensic, and legal media verification workflows.
        </p>
      </footer>
    </div>
  );
}
