/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import React, { useState, useRef } from 'react';
import { toast } from 'sonner';
import { Card, Button, LinearProgress, RadialGauge, Skeleton } from '@repo/ui';

export default function AnalyzePage() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const analyzeFile = async (targetFile: File) => {
    setFile(targetFile);
    setIsLoading(true);
    setResult(null);
    toast.success("Loaded " + targetFile.name + " for deep analysis.");
    try {
      const formData = new FormData();
      formData.append('file', targetFile);
      const response = await fetch('https://upside-shower-handling.ngrok-free.dev/detect', { method: 'POST', body: formData });
      if (!response.ok) throw new Error('API Error');
      const data = await response.json();
      setResult(data);
      toast.success('Analysis complete!');
    } catch (err) {
      toast.error('Failed to analyze media. Is the backend running?');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) analyzeFile(droppedFile);
  };

  const handleBrowse = () => fileInputRef.current?.click();

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) analyzeFile(selected);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col gap-8 w-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-on-surface mb-1">Single Media Analysis</h1>
        <p className="text-on-surface-variant">Drop an image, video, or audio file to extract multi-modal deepfake biomarkers.</p>
      </div>

      {isLoading && <LinearProgress />}

      <input ref={fileInputRef} type="file" className="hidden" accept="image/*,video/*,audio/*" onChange={handleFileInput} />

      {!file ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={"border-2 border-dashed rounded-3xl h-[360px] flex flex-col items-center justify-center transition-all duration-200 " + (isDragging ? 'border-primary bg-primary/8 scale-[1.01]' : 'border-outline-variant hover:border-primary/50 bg-surface-container-low')}
        >
          <div className={"w-16 h-16 rounded-2xl flex items-center justify-center mb-4 " + (isDragging ? "bg-primary/16" : "bg-surface-container-high")}>
            <span className={"material-symbols-outlined text-[32px] " + (isDragging ? "text-primary" : "text-on-surface-variant")}>upload_file</span>
          </div>
          <h3 className="text-xl font-medium text-on-surface mb-1">Drag and drop evidence</h3>
          <p className="text-sm text-on-surface-variant mb-6">Supports MP4, AVI, WAV, MP3, JPG, PNG (Max 500MB)</p>
          <Button variant="tonal" onClick={handleBrowse}>Browse Local Files</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="flex flex-col gap-4">
              <h3 className="font-semibold flex items-center gap-2 text-on-surface">
                <span className="material-symbols-outlined">visibility</span> Visual Heatmap
              </h3>
              <div className="w-full h-[380px] bg-surface-container-highest rounded-2xl flex items-center justify-center overflow-hidden">
                {isLoading ? (
                  <Skeleton className="w-full h-full !rounded-none" />
                ) : result?.heatmap ? (
                  <img src={"data:image/png;base64," + result.heatmap} alt="Heatmap" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-on-surface-variant">No visual data available</span>
                )}
              </div>
            </Card>
          </div>

          <div className="flex flex-col gap-6">
            <Card>
              <h3 className={"font-semibold mb-4 " + (result?.is_fake ? 'text-error' : 'text-primary')}>Detection Score</h3>
              <div className="flex flex-col items-center justify-center py-6">
                {isLoading ? (
                  <div className="flex flex-col items-center gap-4">
                    <Skeleton className="w-[120px] h-[120px] !rounded-full" />
                    <Skeleton className="w-32 h-4 mt-2" />
                  </div>
                ) : (
                  <>
                    <RadialGauge value={result ? result.confidence * 100 : 0} isError={result?.is_fake} />
                    <span className={"text-sm mt-4 font-medium " + (result?.is_fake ? 'text-on-error-container' : 'text-on-surface-variant')}>
                      {result?.is_fake ? 'Synthetic Biomarkers Found' : 'Likely Authentic'}
                    </span>
                  </>
                )}
              </div>
              <div className="flex gap-2 w-full mt-4">
                <Button variant="outlined" onClick={() => { setFile(null); setResult(null); }} className="flex-1">Clear</Button>
                <Button variant="tonal" onClick={() => window.print()} className="flex-1" type="button">
                  <span className="material-symbols-outlined text-[18px]">download</span> PDF
                </Button>
              </div>
            </Card>

            {result && (
              <Card>
                <h3 className="font-semibold text-on-surface mb-4">Modality Breakdown</h3>
                <div className="flex flex-col gap-3 text-sm">
                  <div className="flex justify-between pb-2 border-b border-outline-variant/30">
                    <span className="text-on-surface-variant">Vision</span>
                    <span className="font-mono text-on-surface">{(result.breakdown.visual_score * 100).toFixed(1)}%</span>
                  </div>
                  {result.breakdown.audio_score !== null && (
                    <div className="flex justify-between pb-2 border-b border-outline-variant/30">
                      <span className="text-on-surface-variant">Audio</span>
                      <span className="font-mono text-on-surface">{(result.breakdown.audio_score * 100).toFixed(1)}%</span>
                    </div>
                  )}
                  {result.breakdown.lip_sync_score !== null && (
                    <div className="flex justify-between pb-2 border-b border-outline-variant/30">
                      <span className="text-on-surface-variant">Lip Sync</span>
                      <span className="font-mono text-on-surface">{(result.breakdown.lip_sync_score * 100).toFixed(1)}%</span>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
