'use client';
import React, { useState, useRef } from 'react';
import { toast } from 'sonner';
import { Dropzone, Button, Chip, Card, LinearProgress } from '@repo/ui';
import { useAuth } from '../../context/AuthContext';

export default function BatchPage() {
  const [queue, setQueue] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const addCountRef = useRef(0);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { user } = useAuth();
  
  const handleDrop = (file: File) => {
    addCountRef.current += 1;
    setQueue(prev => [{ id: Math.random().toString(), name: file.name, score: 0, verdict: 'PENDING', desc: 'Awaiting pipeline execution...', file }, ...prev]);
    
    // Debounce the toast so it doesn't spam for 100 files
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      toast.success(`Added ${addCountRef.current} files to batch queue.`);
      addCountRef.current = 0;
    }, 100);
  };

  const exportCSV = () => {
    if (queue.length === 0) return;
    const headers = ['File Name', 'Verdict', 'Confidence', 'Description'];
    const rows = queue.map(q => [
      `"${q.name}"`,
      `"${q.verdict}"`,
      `"${q.score ? (q.score * 100).toFixed(1) + '%' : 'N/A'}"`,
      `"${q.desc}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `veritas_batch_report_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV exported successfully!');
  };

  const processQueue = async () => {
    const pendingItems = queue.filter(item => item.verdict === 'PENDING' && item.file);
    if (pendingItems.length === 0) { toast.info('No pending files.'); return; }
    setIsProcessing(true);
    toast.info("Processing " + pendingItems.length + " files...");

    const MAX_CONCURRENT = 3;
    let index = 0;

    const processItem = async (item: any) => {
      setQueue(prev => prev.map(q => q.id === item.id ? { ...q, verdict: 'PROCESSING' } : q));
      try {
        const formData = new FormData();
        formData.append('file', item.file);
        
        let hash = 'Unavailable';
        try {
          const buffer = await item.file.arrayBuffer();
          const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
          hash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
        } catch(e) {}

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://upside-shower-handling.ngrok-free.dev'}/detect`, { method: 'POST', body: formData });
        if (!response.ok) throw new Error('API Error');
        const data = await response.json();
        
        let reportId = '';
        if (user) {
          const { saveScanResult } = await import('../../lib/scans');
          reportId = await saveScanResult(user.uid, { name: item.file.name, type: item.file.type, size: item.file.size }, data, hash);
        }

        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, score: data.confidence, verdict: data.is_fake ? 'MANIPULATED' : 'AUTHENTIC', desc: reportId ? "Saved as ID: " + reportId.substring(0, 8) : "Visual: " + (data.breakdown.visual_score * 100).toFixed(1) + "%" } : q));
      } catch (err: any) {
        const errorMessage = err?.message || String(err);
        let userDesc = "Analysis failed.";
        
        if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
          userDesc = "Engine waking up / disconnected.";
        } else if (errorMessage.includes('413') || errorMessage.includes('Payload Too Large')) {
          userDesc = "File too large to process.";
        } else {
          userDesc = "Unsupported or corrupted format.";
        }
        
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, verdict: 'ERROR', desc: userDesc } : q));
      }
    };

    const runWorker = async () => {
      while (index < pendingItems.length) {
        const item = pendingItems[index++];
        await processItem(item);
      }
    };

    const workers = [];
    for (let i = 0; i < Math.min(MAX_CONCURRENT, pendingItems.length); i++) {
      workers.push(runWorker());
    }

    await Promise.all(workers);

    setIsProcessing(false);
    toast.success('Batch processing finished!');
  };

  const clearDone = () => {
    setQueue(prev => prev.filter(q => q.verdict === 'PENDING' || q.verdict === 'PROCESSING'));
    toast.info('Cleared completed items.');
  };

  const pendingCount = queue.filter(q => q.verdict === 'PENDING').length;
  const doneCount = queue.filter(q => q.verdict !== 'PENDING' && q.verdict !== 'PROCESSING').length;

  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col gap-8 w-full pb-24">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-on-surface mb-1">Analyze Multiple Files</h1>
          <p className="text-on-surface-variant">Upload and analyze multiple videos or audio clips at once.</p>
        </div>
        <div className="flex gap-2">
          {queue.length > 0 && <Button variant="outlined" onClick={exportCSV} className="text-primary border-primary hover:bg-primary-container"><span className="material-symbols-outlined mr-2">download</span> Export CSV</Button>}
          {doneCount > 0 && <Button variant="outlined" onClick={clearDone}>Clear Done</Button>}
          <Button onClick={processQueue} className={isProcessing ? 'opacity-50 pointer-events-none' : ''}>
            <span className={"material-symbols-outlined mr-2 text-[18px] " + (isProcessing ? "animate-spin" : "")}>{isProcessing ? 'sync' : 'play_arrow'}</span>
            {isProcessing ? 'Processing...' : 'Run All (' + pendingCount + ')'}
          </Button>
        </div>
      </div>

      <Dropzone onFileDrop={handleDrop} multiple title="Add to Batch Queue" subtitle="Drop files or click to browse" />

      {queue.length > 0 ? (
        <Card className="p-0 overflow-hidden">
          <div className="px-6 py-4 bg-surface-container-high flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-on-surface">Queue</h2>
              <Chip label={queue.length + " items"} variant="filter" />
              {pendingCount > 0 && <Chip label={pendingCount + " pending"} variant="assist" />}
            </div>
            {isProcessing && (
              <div aria-live="polite" aria-atomic="true">
                <div className="flex justify-between text-xs text-on-surface-variant mb-1">
                  <span>Processing Batch...</span>
                  <span>{doneCount} / {queue.length} ({Math.round((doneCount / queue.length) * 100)}%)</span>
                </div>
                <LinearProgress value={(doneCount / queue.length) * 100} />
              </div>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-surface-container-highest text-on-surface-variant text-xs uppercase">
                <tr>
                  <th className="px-6 py-3 font-medium">File Name</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Confidence</th>
                  <th className="px-6 py-3 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((item) => (
                  <tr key={item.id} className="border-b border-outline-variant/30 hover:bg-surface-container transition-colors">
                    <td className="px-6 py-4 font-medium text-on-surface max-w-[200px] truncate" title={item.name}>{item.name}</td>
                    <td className="px-6 py-4">
                      {item.verdict === 'PENDING' && <Chip label="Pending" />}
                      {item.verdict === 'PROCESSING' && <Chip label="Processing" variant="assist" className="animate-pulse" />}
                      {item.verdict === 'AUTHENTIC' && <Chip label="Authentic" variant="filter" className="!bg-emerald-500/20 !text-emerald-500" />}
                      {item.verdict === 'MANIPULATED' && <Chip label="Manipulated" variant="filter" className="!bg-error-container !text-on-error-container" />}
                      {item.verdict === 'ERROR' && <Chip label="Error" variant="filter" className="!bg-orange-500/20 !text-orange-500" />}
                    </td>
                    <td className="px-6 py-4 font-mono">{item.score ? (item.score * 100).toFixed(1) + '%' : '--'}</td>
                    <td className="px-6 py-4 text-on-surface-variant max-w-[300px] truncate" title={item.desc}>{item.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="flex flex-col items-center justify-center py-12">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-3">inbox</span>
          <h3 className="text-lg font-medium text-on-surface">Nothing here yet</h3>
          <p className="text-sm text-on-surface-variant">Drop your files above to start adding them to the list.</p>
        </Card>
      )}
    </div>
  );
}
