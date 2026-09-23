'use client';

import React, { useState } from 'react';

export function SpyglassViewer({ originalSrc, heatmapSrc }: { originalSrc: string, heatmapSrc: string }) {
  const [sliderPos, setSliderPos] = useState(50);

  return (
    <div className="relative w-full max-h-[500px] aspect-auto rounded-xl overflow-hidden bg-surface-container-highest group print:break-inside-avoid">
      <div className="relative w-full h-full min-h-[300px] md:min-h-[450px]">
        {/* Original Image (bottom layer) */}
        <img 
          src={originalSrc} 
          alt="Original"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none" 
        />
        
        {/* Heatmap Image (top layer, clipped) */}
        <img 
          src={heatmapSrc} 
          alt="Heatmap"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none" 
          style={{ clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)` }}
        />
        
        {/* Invisible Slider Control */}
        <input 
          type="range" 
          min="0" max="100" 
          value={sliderPos} 
          onChange={e => setSliderPos(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-10 touch-pan-y"
        />
        
        {/* Visual Slider Line */}
        <div 
          className="absolute top-0 bottom-0 w-1 bg-primary pointer-events-none z-0 shadow-[0_0_10px_rgba(0,0,0,0.5)] transition-opacity duration-300 opacity-70 group-hover:opacity-100"
          style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-surface rounded-full shadow-lg border-2 border-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px] text-primary">drag_indicator</span>
          </div>
        </div>
      </div>
      
      {/* Helpful labels */}
      <div className="absolute bottom-4 left-4 bg-black/60 text-white text-xs px-2 py-1 rounded font-medium backdrop-blur-sm pointer-events-none print:hidden">
        Manipulation Heatmap
      </div>
      <div className="absolute bottom-4 right-4 bg-black/60 text-white text-xs px-2 py-1 rounded font-medium backdrop-blur-sm pointer-events-none print:hidden">
        Original Image
      </div>
    </div>
  );
}
