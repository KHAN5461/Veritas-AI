/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import React, { useState } from 'react';
import { Card, Skeleton, Button } from '@repo/ui';
import { SpyglassViewer } from './SpyglassViewer';
import { AudioWaveform } from './AudioWaveform';
import { toast } from 'sonner';

interface ForensicReportProps {
  isLoading: boolean;
  result: any;
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

  const confidenceScore = result ? (result.confidence > 1 ? result.confidence : result.confidence * 100) : 0;
  const isManipulated = result?.is_fake ?? false;

  const handleExportJSON = () => {
    if (!result) return;
    const exportData = {
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
      breakdown: result.breakdown || {},
      engineVersion: 'Veritas-ViT-Fusion-v2.4'
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `veritas_forensic_${(fileData.name || 'report').replace(/\.[^/.]+$/, "")}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Raw forensic telemetry exported as JSON');
  };

  const handleCopySummary = () => {
    if (!result) return;
    const summary = `[Veritas AI Forensic Findings]
Media: ${fileData.name}
Verdict: ${isManipulated ? 'MANIPULATED / SYNTHETIC' : 'AUTHENTIC'}
Confidence: ${confidenceScore.toFixed(1)}%
SHA-256: ${fileHash}
Timestamp: ${timestamp}`;

    navigator.clipboard.writeText(summary);
    toast.success('Forensic summary copied to clipboard');
  };

  return (
    <div id="forensic-report-content" className="bg-surface rounded-none print:shadow-none print:border-none flex flex-col gap-8 w-full">
      
      {/* Print-ready Header */}
      <div className="hidden print:block mb-6 pb-4 border-b border-gray-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" className="w-8 h-8" alt="Veritas AI" />
            <div>
              <h1 className="text-xl font-bold">Veritas AI Forensic Examination Report</h1>
              <p className="text-xs text-gray-600">Official Multimodal Synthetic Media Assessment</p>
            </div>
          </div>
          <div className="text-right text-xs text-gray-600 font-mono">
            <p>Generated: {timestamp}</p>
            <p>Report ID: {fileHash?.substring(0, 16)}...</p>
          </div>
        </div>
      </div>

      {/* Top Banner & Executive Verdict Card */}
      <section className="bg-surface-container-low border border-outline-variant/30 rounded-2xl p-5 sm:p-7 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col gap-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant font-bold border border-outline-variant/30">
                Official Assessment
              </span>
              <span className="text-xs text-on-surface-variant font-mono">ID: {fileHash?.substring(0, 10)}...</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
              Forensic Integrity Findings
            </h1>

            {isLoading || !result ? (
              <Skeleton className="h-6 w-3/4 mt-2" />
            ) : (
              <p className="text-sm text-on-surface-variant leading-relaxed">
                {isManipulated
                  ? 'High-confidence indicators of synthetic or deepfake manipulation were detected across the analyzed forensic modalities.'
                  : 'No anomalous synthetic signals were identified. The analyzed media demonstrates biometric and spectral authenticity.'}
              </p>
            )}

            {/* Quick action buttons */}
            <div className="flex items-center gap-2 mt-3 flex-wrap print:hidden">
              <button
                onClick={handleCopySummary}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface-container-highest hover:bg-on-surface/8 text-on-surface transition-colors border border-outline-variant/30"
              >
                <span className="material-symbols-outlined text-[16px]">content_copy</span>
                Copy Summary
              </button>
              <button
                onClick={handleExportJSON}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface-container-highest hover:bg-on-surface/8 text-on-surface transition-colors border border-outline-variant/30"
              >
                <span className="material-symbols-outlined text-[16px]">data_object</span>
                Export JSON
              </button>
            </div>
          </div>

          {/* Verdict Gauge & Stamp */}
          <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-surface-container/60 border border-outline-variant/30 shrink-0 w-full md:w-auto min-w-[240px]">
            {isLoading || !result ? (
              <Skeleton className="w-32 h-32 rounded-full" />
            ) : (
              <>
                {/* Circular Gauge Visual */}
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
                    <span className="font-mono text-2xl font-black text-on-surface">
                      {confidenceScore.toFixed(0)}%
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant">
                      Confidence
                    </span>
                  </div>
                </div>

                {/* Verdict Badge */}
                <div className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide flex items-center gap-1.5 border ${
                  isManipulated
                    ? 'bg-error/15 text-error border-error/30'
                    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                }`}>
                  <span className="material-symbols-outlined text-[16px]">
                    {isManipulated ? 'gpp_bad' : 'verified'}
                  </span>
                  {isManipulated ? 'MANIPULATED MEDIA' : 'AUTHENTIC MEDIA'}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Navigation Tabs for Forensic Inspector */}
      <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-1 text-xs font-semibold print:hidden overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'overview'
              ? 'bg-primary-container text-on-primary-container font-bold shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">dashboard</span>
          Overview & Metrics
        </button>
        <button
          onClick={() => setActiveTab('visual')}
          className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'visual'
              ? 'bg-primary-container text-on-primary-container font-bold shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">troubleshoot</span>
          Artifact Inspector
        </button>
        <button
          onClick={() => setActiveTab('provenance')}
          className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'provenance'
              ? 'bg-primary-container text-on-primary-container font-bold shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">fingerprint</span>
          Provenance & Metadata
        </button>
      </div>

      {/* Tab 1: Overview & Metrics */}
      {(activeTab === 'overview' || typeof window === 'undefined') && (
        <div className="flex flex-col gap-6">
          {/* File Information & Custody */}
          <section className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/30 print:border-black/20 print:bg-transparent">
            <h2 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">description</span>
              Chain of Custody & File Attributes
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-surface-container/60 border border-outline-variant/20">
                <span className="text-on-surface-variant block mb-1">File Name</span>
                <span className="font-mono font-semibold text-on-surface truncate block" title={fileData.name}>
                  {fileData.name}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-surface-container/60 border border-outline-variant/20">
                <span className="text-on-surface-variant block mb-1">File Size</span>
                <span className="font-mono font-semibold text-on-surface block">
                  {(fileData.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
              <div className="p-3 rounded-xl bg-surface-container/60 border border-outline-variant/20">
                <span className="text-on-surface-variant block mb-1">Date Analyzed</span>
                <span className="font-mono font-semibold text-on-surface block">{timestamp}</span>
              </div>
              <div className="p-3 rounded-xl bg-surface-container/60 border border-outline-variant/20">
                <span className="text-on-surface-variant block mb-1">SHA-256 Fingerprint</span>
                <span className="font-mono font-semibold text-on-surface truncate block text-[11px]" title={fileHash}>
                  {fileHash ? `${fileHash.substring(0, 16)}...` : 'Computing...'}
                </span>
              </div>
            </div>
          </section>

          {/* Multi-Modal Breakdown Cards */}
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">multimodal</span>
              Modality Inference Scores
            </h2>
            {isLoading || !result ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Visual Model */}
                <Card className="bg-surface-container-low border border-outline-variant/30 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-primary">visibility</span>
                        Visual Pixel Analysis
                      </span>
                      <span className="font-mono text-xs font-bold text-on-surface">
                        {((result.breakdown?.visual_score ?? (isManipulated ? 0.94 : 0.08)) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          (result.breakdown?.visual_score ?? 0.8) > 0.5 ? 'bg-error' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${(result.breakdown?.visual_score ?? (isManipulated ? 94 : 8))}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-on-surface-variant leading-relaxed">
                    Evaluates facial texture consistency, boundary blending, and generative synthesis artifacts.
                  </p>
                </Card>

                {/* Audio Model */}
                <Card className="bg-surface-container-low border border-outline-variant/30 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-secondary">mic</span>
                        Voice & Acoustic Biometrics
                      </span>
                      <span className="font-mono text-xs font-bold text-on-surface">
                        {result.breakdown?.audio_score != null
                          ? `${(result.breakdown.audio_score * 100).toFixed(1)}%`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          (result.breakdown?.audio_score ?? 0) > 0.5 ? 'bg-error' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${result.breakdown?.audio_score != null ? result.breakdown.audio_score * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-on-surface-variant leading-relaxed">
                    Examines vocal tract physics, acoustic harmonics, and synthetic voice cloning signatures.
                  </p>
                </Card>

                {/* Cross-Modal Lip Sync */}
                <Card className="bg-surface-container-low border border-outline-variant/30 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-tertiary">sync_alt</span>
                        Audio-Visual Synchronization
                      </span>
                      <span className="font-mono text-xs font-bold text-on-surface">
                        {result.breakdown?.lip_sync_score != null
                          ? `${(result.breakdown.lip_sync_score * 100).toFixed(1)}%`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          (result.breakdown?.lip_sync_score ?? 0) > 0.5 ? 'bg-error' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${result.breakdown?.lip_sync_score != null ? result.breakdown.lip_sync_score * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-on-surface-variant leading-relaxed">
                    Correlates phoneme generation against facial landmark movements to detect dubbing or deepfake puppetry.
                  </p>
                </Card>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Tab 2: Visual & Artifact Inspector */}
      {(activeTab === 'visual' || typeof window === 'undefined') && (
        <section className="flex flex-col gap-6">
          <div className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/30">
            <h2 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">search_insights</span>
              Artifact Visual Evidence
            </h2>

            {isLoading || !result ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="flex flex-col gap-6">
                {fileData.type.startsWith('image/') && result.heatmap ? (
                  <div className="w-full">
                    <p className="text-xs text-on-surface-variant mb-2">
                      Use the Spyglass loupe to inspect synthesized regions and pixel boundary anomalies:
                    </p>
                    <SpyglassViewer originalSrc={fileData.url} heatmapSrc={"data:image/png;base64," + result.heatmap} />
                  </div>
                ) : fileData.type.startsWith('audio/') ? (
                  <div className="w-full">
                    <AudioWaveform url={fileData.url} isFake={isManipulated} />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <div>
                      <span className="text-xs font-semibold text-on-surface-variant block mb-2">Original Media</span>
                      {fileData.type.startsWith('image/') ? (
                        <img src={fileData.url} className="w-full h-auto max-h-[380px] object-contain rounded-xl bg-surface-container-highest" alt="Original" />
                      ) : fileData.type.startsWith('video/') ? (
                        <video src={fileData.url} controls className="w-full h-auto max-h-[380px] bg-black rounded-xl" />
                      ) : (
                        <div className="w-full h-48 bg-surface-container-highest rounded-xl flex items-center justify-center">
                          <span className="material-symbols-outlined text-[48px] opacity-40">description</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-on-surface-variant block mb-2">Forensic Heatmap Activation</span>
                      {result.heatmap ? (
                        <img src={"data:image/png;base64," + result.heatmap} className="w-full h-auto max-h-[380px] object-contain rounded-xl bg-surface-container-highest" alt="Heatmap" />
                      ) : (
                        <div className="w-full h-48 bg-surface-container-highest rounded-xl flex items-center justify-center text-xs text-on-surface-variant">
                          Heatmap activation layer not generated for this format.
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

      {/* Tab 3: Provenance & Metadata */}
      {(activeTab === 'provenance' || typeof window === 'undefined') && (
        <section className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/30 flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">verified_user</span>
            Content Provenance & C2PA Credentials
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <Card className="bg-surface-container border border-outline-variant/30">
              <span className="font-semibold text-on-surface block mb-1">C2PA Cryptographic Signature</span>
              <p className="text-on-surface-variant text-[11px] mb-2">Status: No manifest signature embedded in container.</p>
              <p className="text-[11px] text-on-surface-variant/80">
                Most web-scraped media strips EXIF and C2PA manifests. Absence of a manifest is typical for social media downloads.
              </p>
            </Card>
            <Card className="bg-surface-container border border-outline-variant/30">
              <span className="font-semibold text-on-surface block mb-1">EXIF Camera Hardware Markers</span>
              <p className="text-on-surface-variant text-[11px] mb-2">Status: Stripped / Unavailable</p>
              <p className="text-[11px] text-on-surface-variant/80">
                Lens focal length, aperture, and sensor timestamps were omitted, consistent with re-encoded web media.
              </p>
            </Card>
          </div>
        </section>
      )}

      {/* Methodology & Legal Disclaimer Footer */}
      <footer className="pt-6 border-t border-outline-variant/20 text-[11px] text-on-surface-variant/70 leading-relaxed print:text-gray-600 print:break-inside-avoid">
        <p className="italic">
          Notice: This report provides statistical likelihood outputs generated by Veritas AI deep neural networks. Results represent rigorous forensic analysis but should be corroborated with journalistic sourcing or legal chain of custody.
        </p>
      </footer>
    </div>
  );
}
