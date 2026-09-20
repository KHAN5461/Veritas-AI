/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
'use client';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { Dropzone, ForensicCard, Button, Chip, Card, LinearProgress } from '@repo/ui';

export default function BatchPage() {
  const [queue, setQueue] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDrop = (file: File) => {
    toast.success("Added " + file.name + " to batch queue.");
    setQueue(prev => [{ id: Math.random().toString(), name: file.name, score: 0, verdict: 'PENDING', desc: 'Awaiting pipeline execution...', file }, ...prev]);
  };

  const processQueue = async () => {
    const pendingItems = queue.filter(item => item.verdict === 'PENDING' && item.file);
    if (pendingItems.length === 0) { toast.info('No pending files.'); return; }
    setIsProcessing(true);
    toast.info("Processing " + pendingItems.length + " files...");

    for (const item of pendingItems) {
      setQueue(prev => prev.map(q => q.id === item.id ? { ...q, verdict: 'PROCESSING' } : q));
      try {
        const formData = new FormData();
        formData.append('file', item.file);
        const response = await fetch('https://upside-shower-handling.ngrok-free.dev/detect', { method: 'POST', body: formData });
        if (!response.ok) throw new Error('API Error');
        const data = await response.json();
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, score: data.confidence, verdict: data.is_fake ? 'MANIPULATED' : 'AUTHENTIC', desc: "Visual: " + (data.breakdown.visual_score * 100).toFixed(1) + "%" } : q));
      } catch (err) {
        toast.error("Failed: " + item.name);
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, verdict: 'ERROR', desc: 'Backend unreachable.' } : q));
      }
    }
    setIsProcessing(false);
    toast.success('Batch complete!');
  };

  const clearDone = () => {
    setQueue(prev => prev.filter(q => q.verdict === 'PENDING' || q.verdict === 'PROCESSING'));
    toast.info('Cleared completed items.');
  };

  const pendingCount = queue.filter(q => q.verdict === 'PENDING').length;
  const doneCount = queue.filter(q => q.verdict !== 'PENDING' && q.verdict !== 'PROCESSING').length;

  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col gap-8 w-full">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-on-surface mb-1">Batch Queue</h1>
          <p className="text-on-surface-variant">Process hundreds of files simultaneously.</p>
        </div>
        <div className="flex gap-2">
          {doneCount > 0 && <Button variant="outlined" onClick={clearDone}>Clear Done</Button>}
          <Button onClick={processQueue} className={isProcessing ? 'opacity-50 pointer-events-none' : ''}>
            <span className={"material-symbols-outlined text-[18px] " + (isProcessing ? "animate-spin" : "")}>{isProcessing ? 'sync' : 'play_arrow'}</span>
            {isProcessing ? 'Processing...' : 'Run All (' + pendingCount + ')'}
          </Button>
        </div>
      </div>

      <Dropzone onFileDrop={handleDrop} multiple title="Add to Batch Queue" subtitle="Drop files or click to browse" />

      {queue.length > 0 ? (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-semibold text-on-surface">Queue</h2>
            <Chip label={queue.length + " items"} variant="filter" />
            {pendingCount > 0 && <Chip label={pendingCount + " pending"} variant="assist" />}
          </div>
          {isProcessing && (
            <div className="mb-4" aria-live="polite" aria-atomic="true">
              <div className="flex justify-between text-xs text-on-surface-variant mb-1">
                <span>Processing Batch...</span>
                <span>{doneCount} / {queue.length} ({Math.round((doneCount / queue.length) * 100)}%)</span>
              </div>
              <LinearProgress value={(doneCount / queue.length) * 100} />
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {queue.map(item => (
              <ForensicCard key={item.id} title={item.name} score={item.score} verdict={item.verdict}>
                {item.desc}
              </ForensicCard>
            ))}
          </div>
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center py-12">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-3">inbox</span>
          <h3 className="text-lg font-medium text-on-surface">Queue is empty</h3>
          <p className="text-sm text-on-surface-variant">Drop files above to start building your batch.</p>
        </Card>
      )}
    </div>
  );
}
