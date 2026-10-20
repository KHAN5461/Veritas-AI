'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SpyglassViewerProps {
  originalSrc: string;
  heatmapSrc: string;
  isFake?: boolean;
  confidence?: number;
  fileName?: string;
}

type LensMode = 'original' | 'heatmap' | 'split' | 'blend';

export function SpyglassViewer({
  originalSrc,
  heatmapSrc,
  isFake = false,
  confidence,
  fileName,
}: SpyglassViewerProps) {
  const [lensMode, setLensMode] = useState<LensMode>('split');
  const [blendAlpha, setBlendAlpha] = useState(0.7);
  const [isZoomed, setIsZoomed] = useState(false);
  const [splitOrientation, setSplitOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const [filterPreset, setFilterPreset] = useState<'turbo' | 'infrared' | 'spectral'>('turbo');
  const [hoverCoords, setHoverCoords] = useState<{ x: number; y: number } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const downloadHeatmap = () => {
    if (!heatmapSrc) return;
    const a = document.createElement('a');
    a.href = heatmapSrc;
    a.download = `veritas_heatmap_${fileName || 'evidence'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const FILTER_CLASSES = {
    turbo: '',
    infrared: 'contrast-125 saturate-150 brightness-95',
    spectral: 'hue-rotate-60 contrast-140 saturate-125'
  };

  const LENS_MODES: { id: LensMode; label: string; icon: string; description: string }[] = [
    { id: 'original', label: 'Original', icon: 'image', description: 'Native uncompressed asset' },
    { id: 'heatmap', label: 'Heatmap', icon: 'local_fire_department', description: 'ViT spatial attention map' },
    { id: 'split', label: 'Side-by-Side', icon: 'splitscreen', description: 'Synchronized dual comparison' },
    { id: 'blend', label: 'Thermal Blend', icon: 'layers', description: 'Neural overlay composite' },
  ];

  return (
    <div className="flex flex-col gap-3.5 w-full select-none" ref={containerRef}>
      {/* 1. Sleek Floating Header Controls Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-surface-container-low p-2 sm:p-2.5 rounded-2xl border border-outline-variant/30 print:hidden">
        
        {/* Left: Extension-Style Pill Tab Switcher */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-mono uppercase tracking-wider text-on-surface-variant font-bold mr-1 hidden sm:inline">
            Evidence Lens:
          </span>

          <div className="inline-flex rounded-full p-1 bg-surface-container border border-outline-variant/30 text-xs font-mono shadow-inner overflow-x-auto max-w-full scrollbar-none no-scrollbar">
            {LENS_MODES.map((mode) => {
              const isActive = lensMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setLensMode(mode.id)}
                  title={mode.description}
                  className={`relative px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1.5 cursor-pointer shrink-0 outline-none ${
                    isActive
                      ? 'text-on-primary font-bold shadow-md'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="lensModeIndicator"
                      className="absolute inset-0 bg-primary rounded-full z-0 shadow-sm"
                      transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                    />
                  )}
                  <span className="material-symbols-outlined text-[15px] relative z-10">
                    {mode.icon}
                  </span>
                  <span className="relative z-10 text-[11px] sm:text-xs">
                    {mode.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Utility Tools: Zoom, Orientation (if split), Opacity (if blend), & Download */}
        <div className="flex items-center gap-2 flex-wrap ml-auto">
          {/* Split Mode Orientation Switcher */}
          {lensMode === 'split' && (
            <button
              type="button"
              onClick={() => setSplitOrientation(prev => prev === 'horizontal' ? 'vertical' : 'horizontal')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-on-surface text-xs font-mono transition-all cursor-pointer"
              title="Toggle horizontal side-by-side or vertical stacked view"
            >
              <span className="material-symbols-outlined text-[16px] text-primary">
                {splitOrientation === 'horizontal' ? 'view_column' : 'table_rows'}
              </span>
              <span className="text-[10.5px] hidden sm:inline">
                {splitOrientation === 'horizontal' ? 'Side-by-Side' : 'Stacked'}
              </span>
            </button>
          )}

          {/* Thermal Blend Opacity Controls */}
          {lensMode === 'blend' && (
            <div className="flex items-center gap-2 bg-surface-container px-2.5 py-1 rounded-xl border border-outline-variant/30 text-xs font-mono">
              <span className="text-on-surface-variant text-[11px]">Alpha:</span>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={blendAlpha}
                onChange={(e) => setBlendAlpha(parseFloat(e.target.value))}
                className="w-16 sm:w-20 h-1.5 accent-primary cursor-pointer rounded-lg bg-surface-container-highest"
                aria-label="Thermal overlay opacity"
              />
              <span className="w-8 text-right font-bold text-primary text-[11px]">
                {Math.round(blendAlpha * 100)}%
              </span>
            </div>
          )}

          {/* Colormap Preset Selector */}
          {(lensMode === 'heatmap' || lensMode === 'blend') && (
            <div className="flex items-center gap-1 bg-surface-container p-0.5 rounded-xl border border-outline-variant/30 text-[10.5px] font-mono">
              {(['turbo', 'infrared', 'spectral'] as const).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setFilterPreset(preset)}
                  className={`px-2 py-0.5 rounded-lg capitalize transition-all cursor-pointer ${
                    filterPreset === preset
                      ? 'bg-primary text-on-primary font-bold shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          )}

          {/* 2x Magnify Inspection Toggle */}
          <button
            type="button"
            onClick={() => setIsZoomed((prev) => !prev)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer border ${
              isZoomed
                ? 'bg-primary/20 text-primary border-primary/40 font-bold'
                : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant border-outline-variant/30'
            }`}
            title="Toggle 2x forensic magnification"
          >
            <span className="material-symbols-outlined text-[16px]">
              {isZoomed ? 'zoom_out' : 'zoom_in'}
            </span>
            <span className="text-[10.5px] hidden sm:inline">
              {isZoomed ? '1x Normal' : '2x Magnify'}
            </span>
          </button>

          {/* Fullscreen Workbench Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-on-surface-variant hover:text-primary text-xs font-mono transition-all cursor-pointer"
            title="Open Fullscreen Forensic Workbench"
          >
            <span className="material-symbols-outlined text-[16px]">fullscreen</span>
            <span className="text-[10.5px] hidden sm:inline">Expand</span>
          </button>

          {/* Download Clean Heatmap Image */}
          {heatmapSrc && (
            <button
              type="button"
              onClick={downloadHeatmap}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-on-surface-variant hover:text-primary text-xs font-mono transition-all cursor-pointer"
              title="Download raw forensic heatmap PNG"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span className="text-[10.5px] hidden md:inline">Export Map</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Main High-Precision Viewport Stage (Clean, Uncluttered, No Draggable Slider Line) */}
      <div 
        className="relative w-full rounded-2xl overflow-hidden bg-surface-container-lowest border border-outline-variant/30 shadow-inner group print:break-inside-avoid"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
          const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
          setHoverCoords({ x, y });
        }}
        onMouseLeave={() => setHoverCoords(null)}
      >
        
        {/* Reticle Watermark Header Overlay */}
        <div className="absolute top-3 left-3 z-20 flex items-center gap-2 pointer-events-none">
          <div className="bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-[10px] font-mono text-cyan-400 flex items-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            {hoverCoords ? (
              <span className="text-cyan-300 font-bold">[+] POINT INSPECT: X:{hoverCoords.x}% Y:{hoverCoords.y}%</span>
            ) : (
              <span>[+] SPATIAL RESIDUAL LENS</span>
            )}
          </div>
          {confidence !== undefined && (
            <div className={`hidden sm:flex bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-lg border text-[10px] font-mono items-center gap-1.5 ${
              isFake ? 'border-red-500/30 text-red-400' : 'border-emerald-500/30 text-emerald-400'
            }`}>
              <span>ATTENTION PEAK: {confidence.toFixed(1)}%</span>
            </div>
          )}
        </div>

        {/* Viewport Content with Zoom Support */}
        <div
          className={`relative w-full min-h-[300px] sm:min-h-[420px] md:min-h-[500px] max-h-[580px] flex items-center justify-center p-2 sm:p-4 overflow-hidden transition-transform duration-300 ${
            isZoomed ? 'scale-125 cursor-grab active:cursor-grabbing origin-center' : ''
          }`}
        >
          <AnimatePresence mode="wait">
            
            {/* Mode 1: Pure Original Asset */}
            {lensMode === 'original' && (
              <motion.div
                key="mode-original"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="relative w-full h-full flex items-center justify-center"
              >
                <img
                  src={originalSrc}
                  alt="Original forensic asset"
                  className="max-h-[520px] w-full object-contain rounded-xl drop-shadow-md"
                />
                <div className="absolute bottom-3 left-3 z-10 bg-black/70 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10 text-white font-mono text-[11px] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>ORIGINAL UNALTERED ASSET</span>
                </div>
              </motion.div>
            )}

            {/* Mode 2: Pure Heatmap Asset */}
            {lensMode === 'heatmap' && (
              <motion.div
                key="mode-heatmap"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="relative w-full h-full flex items-center justify-center"
              >
                {heatmapSrc ? (
                  <img
                    src={heatmapSrc}
                    alt="Neural Grad-CAM attention heatmap"
                    className={`max-h-[520px] w-full object-contain rounded-xl drop-shadow-md transition-all duration-200 ${FILTER_CLASSES[filterPreset]}`}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-on-surface-variant gap-2 py-16">
                    <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">thermostat</span>
                    <p className="text-xs font-mono">Heatmap layer generating or unavailable for this format</p>
                  </div>
                )}
                <div className="absolute bottom-3 left-3 z-10 bg-black/70 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10 text-white font-mono text-[11px] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span>GRAD-CAM THERMAL ANOMALY ({filterPreset.toUpperCase()})</span>
                </div>
              </motion.div>
            )}

            {/* Mode 3: Side-by-Side Dual View (No Obstructive Slider Line) */}
            {lensMode === 'split' && (
              <motion.div
                key="mode-split"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className={`w-full h-full grid gap-3 ${
                  splitOrientation === 'horizontal' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'
                }`}
              >
                {/* Left / Top: Original */}
                <div className="relative rounded-xl overflow-hidden bg-surface-container/40 border border-outline-variant/30 flex items-center justify-center min-h-[220px] sm:min-h-[260px] p-2 group/orig">
                  <img
                    src={originalSrc}
                    alt="Original asset comparison"
                    className="max-h-[460px] w-full object-contain rounded-lg"
                  />
                  <div className="absolute bottom-2.5 left-2.5 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 text-white font-mono text-[10px] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>NATIVE STREAM</span>
                  </div>
                </div>

                {/* Right / Bottom: Heatmap */}
                <div className="relative rounded-xl overflow-hidden bg-surface-container/40 border border-outline-variant/30 flex items-center justify-center min-h-[220px] sm:min-h-[260px] p-2 group/heat">
                  {heatmapSrc ? (
                    <img
                      src={heatmapSrc}
                      alt="Heatmap activation comparison"
                      className={`max-h-[460px] w-full object-contain rounded-lg transition-all duration-200 ${FILTER_CLASSES[filterPreset]}`}
                    />
                  ) : (
                    <div className="text-xs font-mono text-on-surface-variant flex items-center justify-center">
                      Heatmap unavailable
                    </div>
                  )}
                  <div className="absolute bottom-2.5 right-2.5 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-md border border-red-500/40 text-red-300 font-mono text-[10px] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span>GRAD-CAM ATTENTION</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Mode 4: Thermal Blend Overlay */}
            {lensMode === 'blend' && (
              <motion.div
                key="mode-blend"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="relative w-full h-full flex items-center justify-center min-h-[300px] sm:min-h-[420px]"
              >
                {/* Base Image */}
                <img
                  src={originalSrc}
                  alt="Base evidence layer"
                  className="max-h-[520px] w-full object-contain rounded-xl"
                />

                {/* Blended Heatmap Overlay */}
                {heatmapSrc && (
                  <img
                    src={heatmapSrc}
                    alt="Thermal blend composite"
                    className={`absolute inset-0 max-h-[520px] w-full h-full object-contain mix-blend-screen transition-opacity duration-150 pointer-events-none rounded-xl ${FILTER_CLASSES[filterPreset]}`}
                    style={{ opacity: blendAlpha }}
                  />
                )}

                <div className="absolute bottom-3 left-3 z-10 bg-black/70 backdrop-blur-md px-3 py-1 rounded-lg border border-cyan-500/40 text-cyan-300 font-mono text-[11px] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">layers</span>
                  <span>COMPOSITE BLEND ({Math.round(blendAlpha * 100)}% ALPHA)</span>
                </div>
              </motion.div>
            )}

                <div className="absolute bottom-3 left-3 z-10 bg-black/70 backdrop-blur-md px-3 py-1 rounded-lg border border-cyan-500/40 text-cyan-300 font-mono text-[11px] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">layers</span>
                  <span>COMPOSITE BLEND ({Math.round(blendAlpha * 100)}% ALPHA)</span>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Dynamic Watermark / Status Footer in Viewport */}
        <div className="absolute bottom-3 right-3 z-20 pointer-events-none">
          <div className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 text-[9.5px] font-mono text-on-surface-variant flex items-center gap-1.5">
            <span>ViT-L/14 • 16x16 PATCH</span>
          </div>
        </div>
      </div>

      {/* 3. Refined Thermal Colormap Calibration Bar */}
      <div className="bg-surface-container-low p-3 rounded-2xl border border-outline-variant/30 flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px] font-mono text-on-surface-variant">
          <span className="flex items-center gap-1.5 font-bold text-on-surface">
            <span className="material-symbols-outlined text-[14px] text-primary">palette</span>
            Thermal Calibration Scale
          </span>
          <span className="text-[10px] text-on-surface-variant/80">Normalized Gradient Vector (0.0 → 1.0)</span>
        </div>

        {/* Continuous Jet / Turbo Thermal Gradient Strip */}
        <div className="relative h-2.5 w-full rounded-full overflow-hidden shadow-inner bg-surface-container-highest">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-700 via-cyan-400 via-emerald-400 via-amber-400 to-red-600" />
        </div>

        {/* Calibration Ticks */}
        <div className="flex items-center justify-between text-[10px] font-mono text-on-surface-variant px-0.5 pt-0.5">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            <span>0.0 Organic / Natural</span>
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-on-surface-variant/60">
            <span>0.5 Boundary Ambiguity</span>
          </span>
          <span className="flex items-center gap-1 font-bold text-red-400">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
            <span>1.0 High-Risk Synthetic</span>
          </span>
        </div>
      </div>

      {/* 4. Fullscreen Modal Forensic Workbench */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col p-4 sm:p-6"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">fullscreen</span>
                <span className="font-mono text-sm font-bold text-white tracking-wide">
                  FORENSIC MICROSCOPIC WORKBENCH • {fileName || 'INSPECTION'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all cursor-pointer"
                title="Exit Fullscreen (Esc)"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Modal Canvas */}
            <div className="flex-1 w-full h-full flex items-center justify-center p-4 overflow-hidden relative">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full h-full max-h-[85vh]">
                <div className="relative rounded-2xl overflow-hidden bg-black/60 border border-white/10 flex items-center justify-center p-2">
                  <img src={originalSrc} alt="Original asset" className="max-h-full max-w-full object-contain" />
                  <span className="absolute bottom-3 left-3 px-3 py-1 rounded-lg bg-black/80 font-mono text-xs text-emerald-400 border border-emerald-500/30">
                    ORIGINAL NATIVE STREAM
                  </span>
                </div>
                <div className="relative rounded-2xl overflow-hidden bg-black/60 border border-white/10 flex items-center justify-center p-2">
                  {heatmapSrc ? (
                    <img src={heatmapSrc} alt="Heatmap asset" className={`max-h-full max-w-full object-contain ${FILTER_CLASSES[filterPreset]}`} />
                  ) : (
                    <span className="font-mono text-xs text-white/50">Heatmap unavailable</span>
                  )}
                  <span className="absolute bottom-3 right-3 px-3 py-1 rounded-lg bg-black/80 font-mono text-xs text-red-400 border border-red-500/30">
                    GRAD-CAM RESIDUAL MAP ({filterPreset.toUpperCase()})
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
