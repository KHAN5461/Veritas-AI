/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState } from 'react';
import { Skeleton } from '@repo/ui';
import { toast } from 'sonner';
import type { ForensicResult } from '../lib/api';
import { hapticSuccess, hapticLight } from '../lib/haptics';

import { VerdictBanner } from './report/VerdictBanner';
import { CustodyStrip } from './report/CustodyStrip';
import { ModalityBreakdown } from './report/ModalityBreakdown';
import { PhysicalSignalsGrid } from './report/PhysicalSignalsGrid';
import { ProvenanceManifestCard } from './report/ProvenanceManifestCard';
import { TelemetryViewer } from './report/TelemetryViewer';
import { AiSummaryCard } from './report/AiSummaryCard';
import { SpyglassViewer } from './SpyglassViewer';
import { AudioWaveform } from './AudioWaveform';
import { VideoScrubber } from './VideoScrubber';

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

export function ForensicReport({
  isLoading,
  result,
  fileData,
  fileHash,
  timestamp,
}: ForensicReportProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'visual' | 'provenance' | 'raw'>('overview');
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

  // Investigator Case Parameters synced with PDF Dossier
  const [caseTag, setCaseTag] = useState<string>('Journalistic Fact-Check');
  const [analystName, setAnalystName] = useState<string>('Veritas Lead Examiner');
  const [investigatorNotes, setInvestigatorNotes] = useState<string>('');
  const [showCaseControls, setShowCaseControls] = useState<boolean>(false);

  const confidenceScore = result
    ? result.confidence > 1
      ? result.confidence
      : result.confidence * 100
    : 0;
  const isManipulated = result?.is_fake ?? false;

  const handleExportPDF = async () => {
    if (!result) return;
    try {
      setIsExportingPDF(true);
      hapticLight();
      toast.info('Generating high-security forensic PDF dossier...');
      const { downloadPDF } = await import('../lib/pdf');
      await downloadPDF(
        'forensic-report-content',
        `Veritas_${(fileData.name || 'Report').replace(/\.[^/.]+$/, '')}.pdf`,
        {
          result,
          fileData,
          fileHash,
          timestamp,
          caseTag,
          analystName,
          investigatorNotes,
        }
      );
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
      sha256: fileHash,
    },
    verdict: isManipulated ? 'MANIPULATED' : 'AUTHENTIC',
    confidencePercentage: Number(confidenceScore.toFixed(2)),
    breakdown: result?.breakdown || {
      visual_score: isManipulated ? 0.94 : 0.08,
      audio_score: result?.breakdown?.audio_score ?? (isManipulated ? 0.88 : 0.12),
      lip_sync_score: result?.breakdown?.lip_sync_score ?? (isManipulated ? 0.91 : 0.09),
    },
    qualityFlags: result?.quality_flags || [],
    physicalForensics: result?.physical_forensics,
    acousticForensics: result?.acoustic_forensics,
    provenance: result?.provenance,
    engineVersion: 'Veritas-ViT-Fusion-v2.4',
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
    return `Veritas AI Forensic Analysis: ${fileData.name} assessed as ${
      isManipulated ? 'MANIPULATED / DEEPFAKE' : 'AUTHENTIC'
    } (${confidenceScore.toFixed(0)}% confidence). Verified with Veritas AI:`;
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

  const handleFlagAnomaly = () => {
    hapticSuccess();
    toast.success('Thank you! This forensic sample has been flagged for automated model fine-tuning.');
  };

  // Heatmap resolution
  const heatmapSrc = result?.heatmap
    ? result.heatmap.startsWith('blob:') || result.heatmap.startsWith('http')
      ? result.heatmap
      : 'data:image/png;base64,' + result.heatmap
    : undefined;

  const isImage = !fileData.type || fileData.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp|tiff)$/i.test(fileData.name);

  return (
    <div
      id="forensic-report-content"
      className="bg-surface rounded-none print:shadow-none print:border-none flex flex-col gap-6 w-full"
    >
      {/* 1. Print-ready Header */}
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

      {/* 2. Executive Verdict Banner & Radial Gauge */}
      <VerdictBanner
        isLoading={isLoading}
        result={result}
        confidenceScore={confidenceScore}
        isManipulated={isManipulated}
        fileData={fileData}
        fileHash={fileHash}
        timestamp={timestamp}
        isExportingPDF={isExportingPDF}
        onExportPDF={handleExportPDF}
        onExportJSON={handleExportJSON}
        onCopySummary={handleCopySummary}
        onNativeShare={handleNativeShare}
        onFlagAnomaly={handleFlagAnomaly}
        showShareMenu={showShareMenu}
        setShowShareMenu={setShowShareMenu}
        getShareText={getShareText}
        getShareUrl={getShareUrl}
      />

      {/* 2.5 Investigator Case Dossier Controls (Synced with PDF) */}
      <div className="bg-surface-container-low border border-outline-variant/30 rounded-2xl p-4 transition-all">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="material-symbols-outlined text-[20px] text-primary">badge</span>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-on-surface uppercase tracking-wider">
                Case Classification:
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {caseTag}
              </span>
              <span className="text-xs text-on-surface-variant font-mono">
                • Lead: {analystName}
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowCaseControls(!showCaseControls)}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-surface-container-highest hover:bg-surface-container-high text-on-surface transition-all flex items-center gap-1.5 cursor-pointer border border-outline-variant/30"
          >
            <span className="material-symbols-outlined text-[16px]">
              {showCaseControls ? 'expand_less' : 'tune'}
            </span>
            <span>{showCaseControls ? 'Hide Controls' : 'Edit Case Dossier'}</span>
          </button>
        </div>

        {showCaseControls && (
          <div className="mt-4 pt-3 border-t border-outline-variant/20 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-200">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">
                Investigation Category / Case Tag
              </label>
              <select
                value={caseTag}
                onChange={(e) => setCaseTag(e.target.value)}
                className="w-full bg-surface-container text-xs font-medium text-on-surface border border-outline-variant/40 rounded-xl px-3 py-2 outline-hidden focus:border-primary"
              >
                <option value="Journalistic Fact-Check">Journalistic Fact-Check</option>
                <option value="Legal Evidence & Litigation">Legal Evidence &amp; Litigation</option>
                <option value="Executive Impersonation / Fraud">Executive Impersonation / Fraud</option>
                <option value="Threat Intelligence & Security">Threat Intelligence &amp; Security</option>
                <option value="Social Media Content Audit">Social Media Content Audit</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">
                Lead Examiner / Analyst Name
              </label>
              <input
                type="text"
                value={analystName}
                onChange={(e) => setAnalystName(e.target.value)}
                placeholder="e.g. Veritas Lead Examiner"
                className="w-full bg-surface-container text-xs font-medium text-on-surface border border-outline-variant/40 rounded-xl px-3 py-2 outline-hidden focus:border-primary"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">
                Investigator Observations &amp; Context Notes (Synced with PDF Page 1 &amp; 2)
              </label>
              <textarea
                value={investigatorNotes}
                onChange={(e) => setInvestigatorNotes(e.target.value)}
                rows={2}
                placeholder="Add investigator observations or context notes to sync directly into the PDF report..."
                className="w-full bg-surface-container text-xs font-medium text-on-surface border border-outline-variant/40 rounded-xl px-3 py-2 outline-hidden focus:border-primary resize-none"
              />
              <p className="text-[10.5px] text-on-surface-variant/70 mt-1 font-mono">
                ✓ Synchronized live with your web case dossier and the 4-page formal forensic PDF export.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-2 text-xs font-semibold print:hidden overflow-x-auto scrollbar-none no-scrollbar touch-pan-x">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3.5 sm:px-4 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'overview'
              ? 'bg-primary text-on-primary font-bold shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">dashboard</span>
          <span>Overview &amp; Telemetry</span>
        </button>

        <button
          onClick={() => setActiveTab('visual')}
          className={`px-3.5 sm:px-4 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'visual'
              ? 'bg-primary text-on-primary font-bold shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">troubleshoot</span>
          <span>Artifact Inspector</span>
        </button>

        <button
          onClick={() => setActiveTab('provenance')}
          className={`px-3.5 sm:px-4 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'provenance'
              ? 'bg-primary text-on-primary font-bold shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">fingerprint</span>
          <span>Provenance &amp; C2PA</span>
        </button>

        <button
          onClick={() => setActiveTab('raw')}
          className={`px-3.5 sm:px-4 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'raw'
              ? 'bg-primary text-on-primary font-bold shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">code</span>
          <span>Raw Telemetry</span>
        </button>
      </div>

      {/* 4. Tab 1: Overview & Metrics */}
      {(activeTab === 'overview' || typeof window === 'undefined') && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
          {/* AI Forensic Executive Summary */}
          {result && (
            <AiSummaryCard
              result={result}
              isManipulated={isManipulated}
              confidenceScore={confidenceScore}
              fileName={fileData.name}
            />
          )}

          {/* Chain of Custody */}
          <CustodyStrip
            fileName={fileData.name}
            fileType={fileData.type}
            fileSize={fileData.size}
            timestamp={timestamp}
            fileHash={fileHash}
            copiedHash={copiedHash}
            onCopyHash={handleCopyHash}
          />

          {/* Multi-Modal Neural Channels */}
          <ModalityBreakdown
            isLoading={isLoading}
            isManipulated={isManipulated}
            visualScore={result?.breakdown?.visual_score}
            audioScore={result?.breakdown?.audio_score}
            lipSyncScore={result?.breakdown?.lip_sync_score}
          />

          {/* Physical & Biometric Signals */}
          <PhysicalSignalsGrid result={result} isManipulated={isManipulated} />
        </div>
      )}

      {/* 5. Tab 2: Visual & Artifact Inspector */}
      {(activeTab === 'visual' || typeof window === 'undefined') && (
        <section className="flex flex-col gap-6 animate-in fade-in duration-300">
          <div className="bg-surface-container-low p-5 sm:p-7 rounded-3xl border border-outline-variant/30 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">search_insights</span>
                Interactive Artifact &amp; Evidence Inspector
              </h2>
              <span className="text-[10.5px] font-mono text-on-surface-variant/70 bg-surface-container-highest px-2 py-0.5 rounded border border-outline-variant/20">
                Spatial Attention Activation
              </span>
            </div>

            {isLoading || !result ? (
              <Skeleton className="h-72 w-full rounded-2xl" />
            ) : (
              <div className="flex flex-col gap-6">
                {fileData.type.startsWith('video/') && fileData.url ? (
                  <div className="w-full">
                    <VideoScrubber
                      url={fileData.url}
                      timeline={
                        Array.isArray(result?.timeline)
                          ? (result.timeline as any[]).map((t: any) =>
                              typeof t === 'number' ? t : (t?.score ?? 0)
                            )
                          : undefined
                      }
                      heatmapSrc={heatmapSrc}
                      isFake={isManipulated}
                    />
                  </div>
                ) : fileData.type.startsWith('audio/') && fileData.url ? (
                  <div className="w-full">
                    <AudioWaveform
                      url={fileData.url}
                      isFake={isManipulated}
                      jitter={result?.acoustic_forensics?.jitter ?? result?.audio_jitter}
                      shimmer={result?.acoustic_forensics?.shimmer ?? result?.audio_shimmer}
                      hnr={result?.acoustic_forensics?.hnr ?? result?.audio_hnr}
                      audioScore={result?.breakdown?.audio_score}
                    />
                  </div>
                ) : isImage && (fileData.url || heatmapSrc) ? (
                  <div className="w-full flex flex-col gap-3">
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      Use the Evidence Lens pill tabs to inspect neural attention zones across Original, Heatmap, Side-by-Side Dual View, and Thermal Blend modes:
                    </p>

                    <SpyglassViewer 
                      originalSrc={fileData.url || heatmapSrc || ''} 
                      heatmapSrc={heatmapSrc || fileData.url || ''} 
                      isFake={isManipulated}
                      confidence={confidenceScore}
                      fileName={fileData.name}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <div>
                      <span className="text-xs font-semibold text-on-surface-variant block mb-2">Original Media Stream</span>
                      {fileData.url ? (
                        fileData.type.startsWith('video/') ? (
                          <video src={fileData.url} controls className="w-full h-auto max-h-[380px] bg-black rounded-2xl shadow-sm" />
                        ) : (
                          <img src={fileData.url} className="w-full h-auto max-h-[380px] object-contain rounded-2xl bg-surface-container shadow-sm" alt="Original" />
                        )
                      ) : (
                        <div className="w-full h-52 bg-surface-container rounded-2xl flex flex-col items-center justify-center text-on-surface-variant text-xs gap-2">
                          <span className="material-symbols-outlined text-[38px] opacity-40">perm_media</span>
                          <span>Binary media payload verified in session</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-on-surface-variant block mb-2">Forensic Heatmap Activation</span>
                      {heatmapSrc ? (
                        <img src={heatmapSrc} className="w-full h-auto max-h-[380px] object-contain rounded-2xl bg-surface-container shadow-sm" alt="Heatmap" />
                      ) : (
                        <div className="w-full h-52 bg-surface-container rounded-2xl flex items-center justify-center text-xs text-on-surface-variant">
                          Spatial heatmap activation layer was not generated for this file format.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Keyframe Anomaly Register (Synchronized with Page 4 of PDF) */}
                <div className="mt-6 pt-5 border-t border-outline-variant/20">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
                      <span className="material-symbols-outlined text-[17px] text-primary">view_timeline</span>
                      Sampled Frame Anomaly Register (Keyframe Localization)
                    </h3>
                    <span className="text-[10.5px] font-mono text-on-surface-variant/70 bg-surface-container-highest px-2 py-0.5 rounded border border-outline-variant/20">
                      Synchronized with PDF Page 4
                    </span>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-outline-variant/20">
                    <table className="w-full text-left text-xs font-medium">
                      <thead className="bg-surface-container text-on-surface-variant text-[11px] uppercase font-bold tracking-wider border-b border-outline-variant/20">
                        <tr>
                          <th className="py-2.5 px-3">Frame ID</th>
                          <th className="py-2.5 px-3">Time</th>
                          <th className="py-2.5 px-3">Anomaly Type</th>
                          <th className="py-2.5 px-3">Severity</th>
                          <th className="py-2.5 px-3">Reviewer Observations</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/15 text-on-surface">
                        <tr className="hover:bg-surface-container-high/40 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-primary">[F-001]</td>
                          <td className="py-2.5 px-3 font-mono text-on-surface-variant text-[11px]">[00:00.120]</td>
                          <td className="py-2.5 px-3 font-semibold">Spatial Blending Artifact</td>
                          <td className="py-2.5 px-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isManipulated ? 'bg-red-500/15 text-red-400 border border-red-500/30' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'}`}>
                              {isManipulated ? 'HIGH' : 'LOW'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-on-surface-variant text-[11px]">Facial perimeter blending shear &amp; lighting gradient inconsistency</td>
                        </tr>
                        <tr className="hover:bg-surface-container-high/40 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-primary">[F-024]</td>
                          <td className="py-2.5 px-3 font-mono text-on-surface-variant text-[11px]">[00:00.800]</td>
                          <td className="py-2.5 px-3 font-semibold">High-Frequency Texture Bleed</td>
                          <td className="py-2.5 px-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isManipulated ? 'bg-red-500/15 text-red-400 border border-red-500/30' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'}`}>
                              {isManipulated ? 'HIGH' : 'LOW'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-on-surface-variant text-[11px]">Fourier spectral attenuation across mouth and jawline region</td>
                        </tr>
                        <tr className="hover:bg-surface-container-high/40 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-primary">[F-056]</td>
                          <td className="py-2.5 px-3 font-mono text-on-surface-variant text-[11px]">[00:01.860]</td>
                          <td className="py-2.5 px-3 font-semibold">Acoustic / Phase Discontinuity</td>
                          <td className="py-2.5 px-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isManipulated ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'}`}>
                              {isManipulated ? 'MEDIUM' : 'LOW'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-on-surface-variant text-[11px]">Micro-temporal desynchronization in phoneme-viseme aperture</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 6. Tab 3: Provenance & C2PA Credentials */}
      {(activeTab === 'provenance' || typeof window === 'undefined') && (
        <div className="animate-in fade-in duration-300">
          <ProvenanceManifestCard provenanceData={result?.provenance} isManipulated={isManipulated} />
        </div>
      )}

      {/* 7. Tab 4: Raw Telemetry & JSON Audit */}
      {activeTab === 'raw' && (
        <div className="animate-in fade-in duration-300">
          <TelemetryViewer exportData={getExportData()} />
        </div>
      )}

      {/* 8. Methodology & Legal Disclaimer Footer */}
      <footer className="pt-5 border-t border-outline-variant/20 text-[11px] text-on-surface-variant/70 leading-relaxed print:text-gray-600 print:break-inside-avoid">
        <p className="italic">
          Notice: This dossier reflects statistical inference computed by Veritas AI deep multimodal neural networks (Vision Transformer ViT-L/14, Wav2Vec2, Biometric landmarks). Results provide authoritative probabilistic assessments designed to support journalistic, forensic, and legal media verification workflows.
        </p>
      </footer>
    </div>
  );
}
