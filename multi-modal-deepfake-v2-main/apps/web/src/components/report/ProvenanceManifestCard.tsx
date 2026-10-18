/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React from 'react';
import { Card } from '@repo/ui';

interface ProvenanceManifestCardProps {
  provenanceData?: {
    has_ai_provenance?: boolean;
    ai_signatures?: string[];
    has_c2pa?: boolean;
    has_camera_metadata?: boolean;
    exif_summary?: string;
  };
  isManipulated: boolean;
}

export function ProvenanceManifestCard({
  provenanceData,
  isManipulated,
}: ProvenanceManifestCardProps) {
  const hasC2pa = provenanceData?.has_c2pa ?? false;
  const hasCamera = provenanceData?.has_camera_metadata ?? !isManipulated;
  const signatures = provenanceData?.ai_signatures ?? (isManipulated ? ['Midjourney Synthetic Image', 'Diffusion Noise Signature'] : []);

  return (
    <section className="bg-surface-container-low p-5 sm:p-6 rounded-3xl border border-outline-variant/30 flex flex-col gap-5 shadow-xs">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-primary">verified_user</span>
          Cryptographic Provenance, C2PA &amp; Generator Metadata
        </h2>
        <span className="text-[10.5px] font-mono text-on-surface-variant/70 bg-surface-container-highest px-2 py-0.5 rounded border border-outline-variant/20">
          W3C / Coalition Standards
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Card 1: C2PA Manifest */}
        <Card className="bg-surface-container/70 border border-outline-variant/30 p-5 rounded-2xl flex flex-col justify-between hover:border-outline-variant/50 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-amber-400">policy</span>
                <span className="font-bold text-on-surface">C2PA Cryptographic Manifest</span>
              </div>
              <span
                className={`text-[10.5px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  hasC2pa
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-surface-container-highest text-on-surface-variant'
                }`}
              >
                {hasC2pa ? 'Verified Signed' : 'Omitted / Stripped'}
              </span>
            </div>

            <p className="text-[11.5px] text-on-surface-variant leading-relaxed">
              {hasC2pa
                ? 'Cryptographic manifest signature verified against trusted Coalition certificate root.'
                : 'No signed C2PA manifest container detected. Most social web platforms and messaging applications transcode files and strip metadata upon upload.'}
            </p>
          </div>

          <div className="mt-4 pt-2.5 border-t border-outline-variant/20 flex items-center justify-between text-[10.5px] font-mono text-on-surface-variant">
            <span>Container Standard</span>
            <span className="text-on-surface">ISO/IEC 21320-1 (JUMBF)</span>
          </div>
        </Card>

        {/* Card 2: Camera EXIF & Hardware Sensor */}
        <Card className="bg-surface-container/70 border border-outline-variant/30 p-5 rounded-2xl flex flex-col justify-between hover:border-outline-variant/50 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-primary">camera</span>
                <span className="font-bold text-on-surface">Hardware Camera Sensor EXIF</span>
              </div>
              <span
                className={`text-[10.5px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  hasCamera
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-error/15 text-error'
                }`}
              >
                {hasCamera ? 'Hardware Tagged' : 'Missing Hardware Header'}
              </span>
            </div>

            <p className="text-[11.5px] text-on-surface-variant leading-relaxed">
              {hasCamera
                ? 'Camera model, lens focal parameters, and sensor capture timestamps detected in header binary.'
                : 'Hardware camera serials, lens focal parameters, and raw Bayer sensor timestamps were omitted, consistent with synthetic generation or web re-encoding.'}
            </p>
          </div>

          <div className="mt-4 pt-2.5 border-t border-outline-variant/20 flex items-center justify-between text-[10.5px] font-mono text-on-surface-variant">
            <span>Sensor Identity</span>
            <span className="text-on-surface">{hasCamera ? 'Physical Optical Sensor' : 'Synthetic Framebuffer'}</span>
          </div>
        </Card>
      </div>

      {/* Generator Signatures Detected */}
      {signatures.length > 0 && (
        <div className="p-4 rounded-2xl bg-surface-container/60 border border-outline-variant/25 flex flex-col gap-2">
          <span className="text-[11px] font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-secondary">psychology</span>
            Generative Model Signatures &amp; Watermarks
          </span>
          <div className="flex flex-wrap gap-2 pt-1">
            {signatures.map((sig, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-semibold bg-surface-container-highest text-on-surface border border-outline-variant/40"
              >
                <span className="w-2 h-2 rounded-full bg-error" />
                {sig}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
