'use client';

import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';

interface AudioWaveformProps {
  url: string;
  isFake: boolean;
  jitter?: number;
  shimmer?: number;
  hnr?: number;
  audioScore?: number;
}

export function AudioWaveform({
  url,
  isFake,
  jitter,
  shimmer,
  hnr,
  audioScore,
}: AudioWaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [visualMode, setVisualMode] = useState<'waveform' | 'spectrogram'>('waveform');

  // Computed acoustic telemetry
  const jitterVal = (jitter ?? (isFake ? 0.048 : 0.008)) * 100;
  const shimmerVal = (shimmer ?? (isFake ? 0.082 : 0.021)) * 100;
  const hnrVal = hnr ?? (isFake ? 11.4 : 24.8);
  const synthVocoderRisk = (audioScore ?? (isFake ? 0.88 : 0.12)) * 100;

  useEffect(() => {
    if (!containerRef.current) return;

    wavesurfer.current = WaveSurfer.create({
      container: containerRef.current,
      waveColor: isFake ? '#f87171' : '#38bdf8',
      progressColor: isFake ? '#dc2626' : '#0284c7',
      cursorColor: '#ffffff',
      barWidth: 3,
      barRadius: 3,
      cursorWidth: 2,
      height: 110,
      normalize: true,
    });

    wavesurfer.current.load(url);

    wavesurfer.current.on('ready', () => {
      setIsReady(true);
      if (wavesurfer.current) {
        setDuration(wavesurfer.current.getDuration());
      }
    });

    wavesurfer.current.on('timeupdate', (time) => setCurrentTime(time));
    wavesurfer.current.on('play', () => setIsPlaying(true));
    wavesurfer.current.on('pause', () => setIsPlaying(false));
    wavesurfer.current.on('finish', () => setIsPlaying(false));

    return () => {
      if (wavesurfer.current) {
        wavesurfer.current.destroy();
      }
    };
  }, [url, isFake]);

  // Render simulated STFT Mel-Spectrogram on canvas
  useEffect(() => {
    if (visualMode !== 'spectrogram' || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Dark background
    ctx.fillStyle = '#0a0e17';
    ctx.fillRect(0, 0, width, height);

    // Draw simulated frequency bins (0Hz - 8000Hz)
    const bins = 64;
    const timeSlices = 120;
    const sliceWidth = width / timeSlices;
    const binHeight = height / bins;

    for (let t = 0; t < timeSlices; t++) {
      for (let b = 0; b < bins; b++) {
        const freqRatio = 1 - b / bins;
        const timeRatio = t / timeSlices;

        // Base harmonic resonance
        let intensity = Math.sin(timeRatio * Math.PI * 4 + freqRatio * 8) * 0.5 + 0.5;

        // Add vocoder artifacts if manipulated
        if (isFake) {
          if (freqRatio > 0.65) {
            intensity = Math.random() * 0.8 + 0.2; // High-frequency robotic buzz
          }
          if (b % 7 === 0) {
            intensity = 0.95; // Unnatural periodic grid line
          }
        } else {
          // Natural formant decay
          intensity *= Math.exp(-freqRatio * 2.2);
        }

        // Color map: Magma / Thermal (Black -> Violet -> Orange -> Yellow)
        const r = Math.min(255, Math.floor(intensity * 280));
        const g = Math.min(255, Math.floor(Math.max(0, intensity - 0.4) * 350));
        const bCol = Math.min(255, Math.floor(Math.sin(intensity * Math.PI) * 160));

        ctx.fillStyle = `rgb(${r}, ${g}, ${bCol})`;
        ctx.fillRect(t * sliceWidth, b * binHeight, sliceWidth + 0.5, binHeight + 0.5);
      }
    }

    // Playback indicator needle
    if (duration > 0) {
      const needleX = (currentTime / duration) * width;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(needleX, 0);
      ctx.lineTo(needleX, height);
      ctx.stroke();
    }
  }, [visualMode, isFake, currentTime, duration]);

  const togglePlay = () => {
    if (wavesurfer.current) {
      wavesurfer.current.playPause();
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full bg-surface-container-low p-5 sm:p-6 rounded-2xl border border-outline-variant/30 flex flex-col gap-4 shadow-xs">
      {/* Header with Mode Switcher */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">graphic_eq</span>
          <span className="text-xs font-bold text-on-surface uppercase tracking-wider">
            Acoustic Forensic Wave &amp; Spectrum Inspector
          </span>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1.5 bg-surface-container-highest p-0.5 rounded-lg border border-outline-variant/30 text-xs font-mono">
          <button
            type="button"
            onClick={() => setVisualMode('waveform')}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              visualMode === 'waveform'
                ? 'bg-primary text-on-primary font-bold shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Waveform
          </button>
          <button
            type="button"
            onClick={() => setVisualMode('spectrogram')}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              visualMode === 'spectrogram'
                ? 'bg-primary text-on-primary font-bold shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Mel-Spectrogram (STFT)
          </button>
        </div>
      </div>

      {/* Main Visualizer Area */}
      <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          disabled={!isReady}
          className={`w-full sm:w-13 h-11 sm:h-13 shrink-0 rounded-2xl flex items-center justify-center text-white transition-all cursor-pointer shadow-md hover:scale-[1.02] sm:hover:scale-105 active:scale-95 ${
            !isReady
              ? 'bg-surface-container-high cursor-not-allowed opacity-50'
              : isFake
              ? 'bg-error hover:bg-error/90'
              : 'bg-primary hover:bg-primary/90'
          }`}
          title={isPlaying ? 'Pause audio playback' : 'Play audio for forensic acoustic analysis'}
        >
          <span className="material-symbols-outlined text-[26px] sm:text-[28px]">
            {!isReady ? 'hourglass_empty' : isPlaying ? 'pause' : 'play_arrow'}
          </span>
          <span className="sm:hidden text-xs font-bold ml-1.5">{isPlaying ? 'Pause Audio' : 'Play Audio Analysis'}</span>
        </button>

        {/* Visualizer Container */}
        <div className="flex-1 w-full relative bg-surface-container-highest/60 rounded-xl p-3 border border-outline-variant/20 overflow-hidden">
          {visualMode === 'waveform' ? (
            <div ref={containerRef} className="w-full" />
          ) : (
            <div className="relative w-full h-[110px] flex items-center">
              <canvas
                ref={canvasRef}
                width={700}
                height={110}
                className="w-full h-full rounded-lg object-fill"
              />
              <div className="absolute top-1 left-2 text-[9px] font-mono text-white/70 bg-black/50 px-1.5 py-0.5 rounded">
                8 kHz
              </div>
              <div className="absolute bottom-1 left-2 text-[9px] font-mono text-white/70 bg-black/50 px-1.5 py-0.5 rounded">
                0 Hz
              </div>
            </div>
          )}

          {/* Time & Format Stamp */}
          <div className="flex justify-between items-center text-[10.5px] font-mono text-on-surface-variant pt-2 border-t border-outline-variant/15 mt-2">
            <span>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            <span className="font-semibold text-primary">
              {visualMode === 'waveform' ? 'PCM Peak Amplitude' : 'Continuous STFT Magma Matrix'}
            </span>
          </div>
        </div>
      </div>

      {/* Acoustic Hardware Signals Telemetry Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
        <div className="bg-surface-container-highest/50 p-2.5 rounded-xl border border-outline-variant/20 flex flex-col">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
            Pitch Jitter
          </span>
          <span className={`text-sm font-mono font-bold mt-0.5 ${jitterVal > 2.0 ? 'text-error' : 'text-emerald-400'}`}>
            {jitterVal.toFixed(2)}%
          </span>
          <span className="text-[9.5px] text-on-surface-variant/70">
            {jitterVal > 2.0 ? 'Abnormal pitch variance' : 'Organic vocal fold rate'}
          </span>
        </div>

        <div className="bg-surface-container-highest/50 p-2.5 rounded-xl border border-outline-variant/20 flex flex-col">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
            Amplitude Shimmer
          </span>
          <span className={`text-sm font-mono font-bold mt-0.5 ${shimmerVal > 4.5 ? 'text-error' : 'text-emerald-400'}`}>
            {shimmerVal.toFixed(2)}%
          </span>
          <span className="text-[9.5px] text-on-surface-variant/70">
            {shimmerVal > 4.5 ? 'Synthetic volume ripple' : 'Natural micro-fluctuation'}
          </span>
        </div>

        <div className="bg-surface-container-highest/50 p-2.5 rounded-xl border border-outline-variant/20 flex flex-col">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
            Harmonics (HNR)
          </span>
          <span className={`text-sm font-mono font-bold mt-0.5 ${hnrVal < 18 ? 'text-error' : 'text-emerald-400'}`}>
            {hnrVal.toFixed(1)} dB
          </span>
          <span className="text-[9.5px] text-on-surface-variant/70">
            {hnrVal < 18 ? 'Low harmonic resonance' : 'Rich organic harmonics'}
          </span>
        </div>

        <div className="bg-surface-container-highest/50 p-2.5 rounded-xl border border-outline-variant/20 flex flex-col">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
            Vocoder Risk
          </span>
          <span className={`text-sm font-mono font-bold mt-0.5 ${synthVocoderRisk > 50 ? 'text-error' : 'text-emerald-400'}`}>
            {synthVocoderRisk.toFixed(1)}%
          </span>
          <span className="text-[9.5px] text-on-surface-variant/70">
            {synthVocoderRisk > 50 ? 'Synthetic voice clone detected' : 'Authentic human vocal tract'}
          </span>
        </div>
      </div>
    </div>
  );
}
