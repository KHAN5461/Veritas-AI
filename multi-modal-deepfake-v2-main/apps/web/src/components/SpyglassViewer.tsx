'use client';

import React, { useState, useRef } from 'react';

interface SpyglassViewerProps {
  originalSrc: string;
  heatmapSrc: string;
}

export function SpyglassViewer({ originalSrc, heatmapSrc }: SpyglassViewerProps) {
  const [sliderPos, setSliderPos] = useState(50);
  const [isZoomed, setIsZoomed] = useState(false);
  const [viewMode, setViewMode] = useState<'split' | 'overlay'>('split');
  const [overlayAlpha, setOverlayAlpha] = useState(0.7);
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex flex-col gap-3 w-full" ref={containerRef}>
      {/* Interactive Controls Bar */}
      <div className="flex items-center justify-between text-xs text-on-surface-variant print:hidden flex-wrap gap-2.5">
        {/* Inspection Mode Toggles */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-on-surface text-[11px] sm:text-xs">Inspection:</span>
          
          <button
            type="button"
            onClick={() => { setViewMode('split'); setSliderPos(0); }}
            className={`px-2 sm:px-2.5 py-1 rounded-lg font-mono text-[10.5px] sm:text-[11px] transition-all cursor-pointer ${
              viewMode === 'split' && sliderPos === 0
                ? 'bg-primary text-on-primary font-bold shadow-xs'
                : 'bg-surface-container-highest hover:bg-surface-container-high text-on-surface'
            }`}
          >
            Original
          </button>

          <button
            type="button"
            onClick={() => { setViewMode('split'); setSliderPos(50); }}
            className={`px-2 sm:px-2.5 py-1 rounded-lg font-mono text-[10.5px] sm:text-[11px] transition-all cursor-pointer ${
              viewMode === 'split' && sliderPos === 50
                ? 'bg-primary text-on-primary font-bold shadow-xs'
                : 'bg-surface-container-highest hover:bg-surface-container-high text-on-surface'
            }`}
          >
            Split 50/50
          </button>

          <button
            type="button"
            onClick={() => { setViewMode('split'); setSliderPos(100); }}
            className={`px-2 sm:px-2.5 py-1 rounded-lg font-mono text-[10.5px] sm:text-[11px] transition-all cursor-pointer ${
              viewMode === 'split' && sliderPos === 100
                ? 'bg-primary text-on-primary font-bold shadow-xs'
                : 'bg-surface-container-highest hover:bg-surface-container-high text-on-surface'
            }`}
          >
            Heatmap
          </button>

          <div className="h-4 w-px bg-outline-variant/30 mx-0.5 hidden sm:block" />

          {/* Thermal Blend Overlay Toggle */}
          <button
            type="button"
            onClick={() => setViewMode(prev => prev === 'overlay' ? 'split' : 'overlay')}
            className={`px-2 sm:px-2.5 py-1 rounded-lg font-mono text-[10.5px] sm:text-[11px] transition-all cursor-pointer flex items-center gap-1 border ${
              viewMode === 'overlay'
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 font-bold'
                : 'bg-surface-container-highest hover:bg-surface-container-high text-on-surface border-transparent'
            }`}
          >
            <span className="material-symbols-outlined text-[13px]">layers</span>
            <span>Blend Overlay</span>
          </button>
        </div>

        {/* Right Tools: Opacity (if overlay) + 2x Zoom */}
        <div className="flex items-center gap-2 flex-wrap">
          {viewMode === 'overlay' && (
            <div className="flex items-center gap-1.5 bg-surface-container-highest px-2 py-0.5 rounded-lg border border-outline-variant/30 text-[11px] font-mono">
              <span className="text-on-surface-variant">Alpha:</span>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={overlayAlpha}
                onChange={(e) => setOverlayAlpha(parseFloat(e.target.value))}
                className="w-16 h-1 accent-primary cursor-pointer"
                aria-label="Thermal overlay opacity"
              />
              <span className="w-7 text-right text-on-surface font-bold">{Math.round(overlayAlpha * 100)}%</span>
            </div>
          )}

          {/* Zoom Magnifier Toggle */}
          <button
            type="button"
            onClick={() => setIsZoomed((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg font-medium text-xs transition-all cursor-pointer border ${
              isZoomed
                ? 'bg-primary/20 text-primary border-primary/40'
                : 'bg-surface-container-highest hover:bg-surface-container-high text-on-surface-variant border-outline-variant/30'
            }`}
            title="Toggle 2x forensic magnification"
          >
            <span className="material-symbols-outlined text-[16px]">
              {isZoomed ? 'zoom_out' : 'zoom_in'}
            </span>
            <span>{isZoomed ? 'Reset (1x)' : '2x Magnify'}</span>
          </button>
        </div>
      </div>

      {/* Main Comparison Stage */}
      <div className="relative w-full max-h-[540px] aspect-auto rounded-2xl overflow-hidden bg-surface-container-highest border border-outline-variant/30 group print:break-inside-avoid shadow-inner select-none">
        <div
          className={`relative w-full h-full min-h-[250px] sm:min-h-[380px] md:min-h-[460px] transition-transform duration-300 ${
            isZoomed ? 'scale-150 cursor-grab active:cursor-grabbing origin-center' : ''
          }`}
        >
          {/* Base Layer: Original Image */}
          <img
            src={originalSrc}
            alt="Original forensic asset"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          />

          {/* Top Layer: Heatmap Image */}
          {viewMode === 'split' ? (
            <img
              src={heatmapSrc}
              alt="Neural activation heatmap"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none transition-[clip-path] duration-75"
              style={{ clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)` }}
            />
          ) : (
            <img
              src={heatmapSrc}
              alt="Neural activation heatmap blend"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none mix-blend-screen transition-opacity duration-150"
              style={{ opacity: overlayAlpha }}
            />
          )}

          {/* Invisible Slider Control (Only active in Split Mode) */}
          {viewMode === 'split' && (
            <input
              type="range"
              min="0"
              max="100"
              value={sliderPos}
              onChange={(e) => setSliderPos(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20 touch-pan-y"
              aria-label="Forensic comparison slider"
            />
          )}

          {/* Visual Slider Divider Line and Handle */}
          {viewMode === 'split' && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white/90 pointer-events-none z-10 shadow-[0_0_12px_rgba(0,0,0,0.8)]"
              style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 bg-surface/95 backdrop-blur-md rounded-full shadow-xl border-2 border-primary flex items-center justify-center transition-transform group-hover:scale-110">
                <span className="material-symbols-outlined text-[18px] text-primary">
                  compare_arrows
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Watermark / Corner Tags */}
        <div className="absolute top-3 left-3 bg-black/60 text-white text-[10.5px] font-mono px-2.5 py-1 rounded-md backdrop-blur-md pointer-events-none print:hidden border border-white/10 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span>{viewMode === 'split' ? 'Grad-CAM Attention (Left)' : 'Screen Blend Active'}</span>
        </div>
        <div className="absolute top-3 right-3 bg-black/60 text-white text-[10.5px] font-mono px-2.5 py-1 rounded-md backdrop-blur-md pointer-events-none print:hidden border border-white/10 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Original Stream (Right)</span>
        </div>
      </div>
    </div>
  );
}
