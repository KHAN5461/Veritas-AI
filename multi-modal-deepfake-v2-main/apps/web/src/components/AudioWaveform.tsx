'use client';

import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';

interface AudioWaveformProps {
  url: string;
  isFake: boolean;
}

export function AudioWaveform({ url, isFake }: AudioWaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    wavesurfer.current = WaveSurfer.create({
      container: containerRef.current,
      waveColor: isFake ? '#f87171' : '#34d399', // Red for fake, Green for authentic
      progressColor: isFake ? '#dc2626' : '#059669',
      cursorColor: '#ffffff',
      barWidth: 3,
      barRadius: 3,
      cursorWidth: 2,
      height: 120,
      normalize: true,
    });

    wavesurfer.current.load(url);

    wavesurfer.current.on('ready', () => {
      setIsReady(true);
    });

    wavesurfer.current.on('play', () => setIsPlaying(true));
    wavesurfer.current.on('pause', () => setIsPlaying(false));
    wavesurfer.current.on('finish', () => setIsPlaying(false));

    return () => {
      if (wavesurfer.current) {
        wavesurfer.current.destroy();
      }
    };
  }, [url, isFake]);

  const togglePlay = () => {
    if (wavesurfer.current) {
      wavesurfer.current.playPause();
    }
  };

  return (
    <div className="w-full bg-surface-container-highest p-4 rounded-xl flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <button 
          onClick={togglePlay}
          disabled={!isReady}
          className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center text-white transition-colors ${!isReady ? 'bg-surface-container-high cursor-not-allowed' : isFake ? 'bg-error hover:bg-error/90' : 'bg-primary hover:bg-primary/90'}`}
        >
          <span className="material-symbols-outlined text-[24px]">
            {!isReady ? 'hourglass_empty' : isPlaying ? 'pause' : 'play_arrow'}
          </span>
        </button>
        <div className="flex-1 w-full relative">
          <div ref={containerRef} className="w-full" />
        </div>
      </div>
      <div className="text-center text-xs text-on-surface-variant font-medium uppercase tracking-wider">
        {isFake ? 'Synthetic Vocal Artifacts Highlighted' : 'Natural Audio Signature Detected'}
      </div>
    </div>
  );
}
