'use client';

import React, { useRef, useState, useEffect, useMemo } from 'react';

interface VideoScrubberProps {
  url: string;
  timeline?: number[];
  heatmapSrc?: string | null;
  isFake?: boolean;
}

export function VideoScrubber({ url, timeline = [], heatmapSrc, isFake = false }: VideoScrubberProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [overlayHeatmap, setOverlayHeatmap] = useState(false);
  const [heatmapOpacity, setHeatmapOpacity] = useState(0.65);

  const durationSafe = duration > 0 ? duration : 1;
  const progressRatio = Math.min(1, Math.max(0, currentTime / durationSafe));

  // Determine current frame index and score based on timeline
  const frameCount = timeline.length > 0 ? timeline.length : 1;
  const currentFrameIdx = Math.min(
    frameCount - 1,
    Math.max(0, Math.floor(progressRatio * frameCount))
  );
  const currentFrameScore = timeline[currentFrameIdx] ?? (isFake ? 0.85 : 0.08);

  // Find index of highest risk anomaly frame
  const highestRiskFrameIdx = useMemo(() => {
    if (!timeline || timeline.length === 0) return -1;
    let maxIdx = 0;
    let maxVal = timeline[0];
    for (let i = 1; i < timeline.length; i++) {
      if (timeline[i] > maxVal) {
        maxVal = timeline[i];
        maxIdx = i;
      }
    }
    return maxIdx;
  }, [timeline]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (newTime: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const stepFrame = (frames: number) => {
    if (!videoRef.current) return;
    const frameDuration = duration > 0 && frameCount > 0 ? duration / frameCount : 1 / 30;
    const target = Math.max(0, Math.min(duration, videoRef.current.currentTime + frames * frameDuration));
    handleSeek(target);
  };

  const jumpToHighestRisk = () => {
    if (highestRiskFrameIdx >= 0 && duration > 0 && frameCount > 0) {
      const targetTime = (highestRiskFrameIdx / frameCount) * duration;
      handleSeek(targetTime);
      if (videoRef.current && isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full flex flex-col gap-4 bg-surface-container-low p-4 sm:p-5 rounded-2xl border border-outline-variant/30">
      {/* Header Info Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]">movie</span>
          <span className="text-xs font-bold text-on-surface uppercase tracking-wider">
            Temporal Video Forensic Scrubber
          </span>
          <span className="text-[10px] font-mono text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full border border-outline-variant/20">
            {frameCount} Analyzed Frames
          </span>
        </div>

        {/* Current Frame Status Badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold border transition-colors ${
            currentFrameScore > 0.65
              ? 'bg-error/15 text-error border-error/30'
              : currentFrameScore < 0.35
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
          }">
            <span className={`w-2 h-2 rounded-full ${
              currentFrameScore > 0.65 ? 'bg-error animate-pulse' : currentFrameScore < 0.35 ? 'bg-emerald-500' : 'bg-amber-500'
            }`} />
            <span>Frame #{currentFrameIdx + 1}: {(currentFrameScore * 100).toFixed(1)}% Risk</span>
          </div>

          {highestRiskFrameIdx >= 0 && (
            <button
              onClick={jumpToHighestRisk}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-error/10 hover:bg-error/20 text-error border border-error/30 transition-colors cursor-pointer"
              title="Jump to frame with highest synthetic anomaly probability"
            >
              <span className="material-symbols-outlined text-[14px]">warning</span>
              Jump to Peak Anomaly
            </button>
          )}
        </div>
      </div>

      {/* Video Viewport with Heatmap Overlay Option */}
      <div className="relative w-full aspect-video max-h-[420px] bg-black rounded-xl overflow-hidden flex items-center justify-center border border-outline-variant/20">
        <video
          ref={videoRef}
          src={url}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
          className="w-full h-full object-contain"
          playsInline
        />

        {/* Spatial Heatmap Overlay */}
        {overlayHeatmap && heatmapSrc && (
          <img
            src={heatmapSrc}
            alt="Forensic Attention Heatmap Overlay"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none mix-blend-screen transition-opacity duration-200"
            style={{ opacity: heatmapOpacity }}
          />
        )}

        {/* Controls Overlay Button on Center */}
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors group cursor-pointer"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          <div className="w-14 h-14 rounded-full bg-black/70 group-hover:bg-primary text-white flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
            <span className="material-symbols-outlined text-[32px]">
              {isPlaying ? 'pause' : 'play_arrow'}
            </span>
          </div>
        </button>
      </div>

      {/* Timeline Risk Bar Chart / Heatmap Track */}
      <div className="flex flex-col gap-1.5 pt-1">
        <div className="flex items-center justify-between text-[11px] font-mono text-on-surface-variant">
          <span>{formatTime(currentTime)}</span>
          <span className="text-[10px] text-on-surface-variant/80 uppercase tracking-wider">
            Frame-by-Frame Neural Heatmap
          </span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Interactive Timeline Heatmap Track */}
        <div className="relative w-full h-7 bg-surface-container-highest rounded-lg overflow-hidden border border-outline-variant/30 flex items-end cursor-pointer group">
          {/* Risk Bars */}
          {timeline.length > 0 ? (
            <div className="absolute inset-0 flex items-end">
              {timeline.map((score, idx) => {
                const heightPct = Math.max(15, Math.round(score * 100));
                let colorClass = 'bg-emerald-500/70 hover:bg-emerald-400';
                if (score > 0.65) {
                  colorClass = 'bg-error/80 hover:bg-error';
                } else if (score > 0.35) {
                  colorClass = 'bg-amber-500/70 hover:bg-amber-400';
                }
                const isCurrent = idx === currentFrameIdx;

                return (
                  <div
                    key={idx}
                    className={`flex-1 transition-all ${colorClass} ${isCurrent ? 'ring-2 ring-white z-10' : ''}`}
                    style={{ height: `${heightPct}%` }}
                    title={`Frame ${idx + 1}: ${(score * 100).toFixed(1)}% anomaly`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (duration > 0 && frameCount > 0) {
                        handleSeek((idx / frameCount) * duration);
                      }
                    }}
                  />
                );
              })}
            </div>
          ) : (
            <div
              className={`absolute inset-0 opacity-40 ${isFake ? 'bg-gradient-to-r from-error/60 via-error to-error/60' : 'bg-gradient-to-r from-emerald-500/60 via-emerald-400 to-emerald-500/60'}`}
            />
          )}

          {/* Scrubber Playhead Line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)] z-20 pointer-events-none"
            style={{ left: `${progressRatio * 100}%` }}
          >
            <div className="absolute -top-1 -left-1.5 w-3.5 h-3.5 bg-white rounded-full shadow-md border-2 border-primary" />
          </div>

          {/* Native Range Input (Transparent overlay for accessible drag-seeking) */}
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={duration > 0 && frameCount > 0 ? duration / frameCount : 0.05}
            value={currentTime}
            onChange={(e) => handleSeek(parseFloat(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
            aria-label="Seek video frame"
          />
        </div>
      </div>

      {/* Playback Controls & Heatmap Overlay Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 border-t border-outline-variant/20">
        {/* Step Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => stepFrame(-1)}
            className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/30 text-xs transition-colors cursor-pointer"
            title="Step Back 1 Frame"
          >
            <span className="material-symbols-outlined text-[16px]">skip_previous</span>
          </button>

          <button
            onClick={togglePlay}
            className="px-3 py-1.5 rounded-lg bg-primary text-on-primary font-bold text-xs flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px]">
              {isPlaying ? 'pause' : 'play_arrow'}
            </span>
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            onClick={() => stepFrame(1)}
            className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/30 text-xs transition-colors cursor-pointer"
            title="Step Forward 1 Frame"
          >
            <span className="material-symbols-outlined text-[16px]">skip_next</span>
          </button>
        </div>

        {/* Heatmap Overlay Toggle */}
        {heatmapSrc && (
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-on-surface select-none">
              <input
                type="checkbox"
                checked={overlayHeatmap}
                onChange={(e) => setOverlayHeatmap(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary/40 bg-surface-container border-outline-variant cursor-pointer"
              />
              <span className="font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-primary">heat_pump</span>
                Heatmap Overlay
              </span>
            </label>

            {overlayHeatmap && (
              <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-mono">
                <span>Opacity:</span>
                <input
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.05"
                  value={heatmapOpacity}
                  onChange={(e) => setHeatmapOpacity(parseFloat(e.target.value))}
                  className="w-20 h-1.5 accent-primary cursor-pointer"
                />
                <span>{Math.round(heatmapOpacity * 100)}%</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
