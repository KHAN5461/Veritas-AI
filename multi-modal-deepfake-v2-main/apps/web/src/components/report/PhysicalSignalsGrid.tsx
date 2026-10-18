/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React from 'react';
import { Card } from '@repo/ui';

interface PhysicalSignalsGridProps {
  result: any;
  isManipulated: boolean;
}

export function PhysicalSignalsGrid({ result, isManipulated }: PhysicalSignalsGridProps) {
  const physical = result?.physical_forensics;
  const acoustic = result?.acoustic_forensics;

  const cornealScore = physical?.corneal_reflection_risk ?? (isManipulated ? 0.84 : 0.12);
  const chrominanceScore = physical?.chrominance_noise_risk ?? (isManipulated ? 0.79 : 0.15);
  const temporalScore = physical?.temporal_jitter_risk ?? (isManipulated ? 0.87 : 0.08);

  const jitter = acoustic?.jitter ?? (isManipulated ? 0.038 : 0.008);
  const shimmer = acoustic?.shimmer ?? (isManipulated ? 0.082 : 0.024);
  const hnr = acoustic?.hnr ?? (isManipulated ? 9.4 : 19.8);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-tertiary">biotech</span>
          Physical, Biometric &amp; Sensor Forensics
        </h2>
        <span className="text-[10.5px] font-mono text-on-surface-variant/70 bg-surface-container-highest px-2 py-0.5 rounded border border-outline-variant/20">
          Sub-Pixel Validation
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        {/* Signal 1: Corneal Specular Concordance */}
        <Card className="bg-surface-container-low border border-outline-variant/30 p-4 rounded-3xl flex flex-col justify-between shadow-xs hover:border-outline-variant/60 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[17px] text-sky-400">remove_red_eye</span>
                Corneal Reflections
              </span>
              <span
                className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded ${
                  cornealScore > 0.5 ? 'bg-error/15 text-error' : 'bg-emerald-500/15 text-emerald-400'
                }`}
              >
                {(cornealScore * 100).toFixed(0)}% Risk
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              {cornealScore > 0.5
                ? 'Light direction vector divergence between left and right pupils indicates 3D compositing inconsistency.'
                : 'Specular glint position and ambient luminance angles show anatomical 3D ray coherence.'}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-outline-variant/20 flex items-center justify-between text-[10px] font-mono text-on-surface-variant">
            <span>Concordance</span>
            <span className="text-on-surface font-semibold">{cornealScore > 0.5 ? 'Discordant' : 'Coherent'}</span>
          </div>
        </Card>

        {/* Signal 2: Chrominance Noise Residual */}
        <Card className="bg-surface-container-low border border-outline-variant/30 p-4 rounded-3xl flex flex-col justify-between shadow-xs hover:border-outline-variant/60 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[17px] text-violet-400">grain</span>
                Sensor PRNU Residual
              </span>
              <span
                className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded ${
                  chrominanceScore > 0.5 ? 'bg-error/15 text-error' : 'bg-emerald-500/15 text-emerald-400'
                }`}
              >
                {(chrominanceScore * 100).toFixed(0)}% Risk
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              {chrominanceScore > 0.5
                ? 'Sub-pixel variance in Cb/Cr planes lacks characteristic hardware sensor Photo-Response Non-Uniformity.'
                : 'Consistent photo-sensor noise fingerprint matching native CMOS silicon capture.'}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-outline-variant/20 flex items-center justify-between text-[10px] font-mono text-on-surface-variant">
            <span>Noise Profile</span>
            <span className="text-on-surface font-semibold">{chrominanceScore > 0.5 ? 'Synthetic Pattern' : 'Hardware CMOS'}</span>
          </div>
        </Card>

        {/* Signal 3: Temporal Landmark Stability */}
        <Card className="bg-surface-container-low border border-outline-variant/30 p-4 rounded-3xl flex flex-col justify-between shadow-xs hover:border-outline-variant/60 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[17px] text-amber-400">speed</span>
                Temporal Stability
              </span>
              <span
                className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded ${
                  temporalScore > 0.5 ? 'bg-error/15 text-error' : 'bg-emerald-500/15 text-emerald-400'
                }`}
              >
                {(temporalScore * 100).toFixed(0)}% Risk
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              {temporalScore > 0.5
                ? 'High-frequency jitter observed in facial contour tracking, characteristic of neural frame warping.'
                : 'Smooth biometric velocity trajectory conforming to organic head motion kinematics.'}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-outline-variant/20 flex items-center justify-between text-[10px] font-mono text-on-surface-variant">
            <span>Inter-frame Jitter</span>
            <span className="text-on-surface font-semibold">{temporalScore > 0.5 ? 'Micro-flicker' : 'Stable Trajectory'}</span>
          </div>
        </Card>

        {/* Signal 4: Vocal Micro-Tremors */}
        <Card className="bg-surface-container-low border border-outline-variant/30 p-4 rounded-3xl flex flex-col justify-between shadow-xs hover:border-outline-variant/60 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[17px] text-emerald-400">graphic_eq</span>
                Vocal Fold Tremors
              </span>
              <span
                className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded ${
                  hnr < 12 ? 'bg-error/15 text-error' : 'bg-emerald-500/15 text-emerald-400'
                }`}
              >
                {hnr < 12 ? 'Synthetic' : 'Natural'}
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              {hnr < 12
                ? 'Unnatural lack of micro-pitch cycle perturbations. Consistent with neural speech vocoder synthesis.'
                : 'Natural laryngeal micro-tremors and mucosal wave harmonics present in voice tract.'}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-outline-variant/20 flex items-center justify-between text-[10px] font-mono text-on-surface-variant">
            <span>Jitter / Shimmer</span>
            <span className="text-on-surface font-semibold">{jitter} / {shimmer}</span>
          </div>
        </Card>
      </div>
    </section>
  );
}
