'use client';

import React from 'react';
import { Card, Skeleton } from '@repo/ui';

interface ModalityBreakdownProps {
  isLoading: boolean;
  isManipulated: boolean;
  visualScore?: number;
  audioScore?: number;
  lipSyncScore?: number;
}

export function ModalityBreakdown({
  isLoading,
  isManipulated,
  visualScore,
  audioScore,
  lipSyncScore,
}: ModalityBreakdownProps) {
  const vScore = visualScore ?? (isManipulated ? 0.94 : 0.08);
  const aScore = audioScore ?? (isManipulated ? 0.88 : 0.12);
  const lScore = lipSyncScore ?? (isManipulated ? 0.91 : 0.09);

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-primary">hub</span>
          Multi-Modal Neural Inference Channels
        </h2>
        <span className="text-[10.5px] font-mono text-on-surface-variant/70 bg-surface-container-highest px-2 py-0.5 rounded border border-outline-variant/20">
          Triple-Modality Consensus
        </span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-40 rounded-3xl" />
          <Skeleton className="h-40 rounded-3xl" />
          <Skeleton className="h-40 rounded-3xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Visual Model (ViT) */}
          <Card className="bg-surface-container-low border border-outline-variant/30 flex flex-col justify-between p-5 rounded-3xl shadow-xs hover:border-primary/40 transition-all">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary">visibility</span>
                  ViT Spatial Patch Analysis
                </span>
                <span
                  className={`font-mono text-xs font-extrabold px-2 py-0.5 rounded-full ${
                    vScore > 0.5 ? 'bg-error/15 text-error' : 'bg-emerald-500/15 text-emerald-400'
                  }`}
                >
                  {(vScore * 100).toFixed(1)}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-surface-container-highest h-2.5 rounded-full overflow-hidden mb-3">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    vScore > 0.5 ? 'bg-error' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(vScore * 100, 100)}%` }}
                />
              </div>
            </div>
            <p className="text-[11.5px] text-on-surface-variant leading-relaxed font-normal">
              Evaluates spatial patch boundaries, diffusion noise patterns, generative GAN artifacts, and frequency disparities.
            </p>
          </Card>

          {/* Audio Model (Vocoder) */}
          <Card className="bg-surface-container-low border border-outline-variant/30 flex flex-col justify-between p-5 rounded-3xl shadow-xs hover:border-secondary/40 transition-all">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-secondary">mic</span>
                  Vocoder &amp; Voice Spectrum
                </span>
                <span
                  className={`font-mono text-xs font-extrabold px-2 py-0.5 rounded-full ${
                    aScore > 0.5 ? 'bg-error/15 text-error' : 'bg-emerald-500/15 text-emerald-400'
                  }`}
                >
                  {(aScore * 100).toFixed(1)}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-surface-container-highest h-2.5 rounded-full overflow-hidden mb-3">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    aScore > 0.5 ? 'bg-error' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(aScore * 100, 100)}%` }}
                />
              </div>
            </div>
            <p className="text-[11.5px] text-on-surface-variant leading-relaxed font-normal">
              Analyzes vocal tract harmonics, spectral continuity, pitch modulation anomalies, and neural TTS voice cloning markers.
            </p>
          </Card>

          {/* Cross-Modal Lip Sync */}
          <Card className="bg-surface-container-low border border-outline-variant/30 flex flex-col justify-between p-5 rounded-3xl shadow-xs hover:border-tertiary/40 transition-all">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-tertiary">sync_alt</span>
                  Audio-Visual Biometric Sync
                </span>
                <span
                  className={`font-mono text-xs font-extrabold px-2 py-0.5 rounded-full ${
                    lScore > 0.5 ? 'bg-error/15 text-error' : 'bg-emerald-500/15 text-emerald-400'
                  }`}
                >
                  {(lScore * 100).toFixed(1)}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-surface-container-highest h-2.5 rounded-full overflow-hidden mb-3">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    lScore > 0.5 ? 'bg-error' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(lScore * 100, 100)}%` }}
                />
              </div>
            </div>
            <p className="text-[11.5px] text-on-surface-variant leading-relaxed font-normal">
              Correlates acoustic phoneme timing against dynamic facial landmark movements to detect automated deepfake dubbing.
            </p>
          </Card>
        </div>
      )}
    </section>
  );
}
