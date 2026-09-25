'use client';
import React, { useState, useRef } from 'react';
import { toast } from 'sonner';
import { Dropzone, Button, Chip, Card, LinearProgress } from '@repo/ui';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

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
  const threatsCount = queue.filter(q => q.verdict === 'MANIPULATED').length;

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

      {queue.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-surface-container rounded-xl p-4 flex items-center justify-between border border-outline-variant/50">
          <div className="flex items-center gap-2 text-sm">
            <span className="material-symbols-outlined text-primary">data_usage</span>
            <span className="font-semibold text-on-surface">{doneCount}/{queue.length} complete</span>
            <span className="text-on-surface-variant mx-2">•</span>
            {threatsCount > 0 ? (
              <span className="text-error font-medium flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">warning</span> {threatsCount} threats detected</span>
            ) : (
              <span className="text-emerald-500 font-medium flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">check_circle</span> No threats detected yet</span>
            )}
          </div>
        </motion.div>
      )}

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
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
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
                  <AnimatePresence>
                    {queue.map((item) => {
                      let bgClass = "bg-transparent hover:bg-surface-container";
                      if (item.verdict === 'AUTHENTIC') bgClass = "bg-emerald-500/5 hover:bg-emerald-500/10";
                      else if (item.verdict === 'MANIPULATED') bgClass = "bg-error-container/20 hover:bg-error-container/30";
                      else if (item.verdict === 'PENDING') bgClass = "bg-surface-container-lowest hover:bg-surface-container-low";
                      
                      return (
                        <motion.tr 
                          layout
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, height: 0 }}
                          key={item.id} 
                          className={`border-b border-outline-variant/30 transition-colors ${bgClass}`}
                        >
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
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
            
            {/* Mobile Card List */}
            <div className="md:hidden flex flex-col divide-y divide-outline-variant/30">
              <AnimatePresence>
                {queue.map((item) => {
                  let bgClass = "bg-transparent hover:bg-surface-container";
                  if (item.verdict === 'AUTHENTIC') bgClass = "bg-emerald-500/5 hover:bg-emerald-500/10";
                  else if (item.verdict === 'MANIPULATED') bgClass = "bg-error-container/20 hover:bg-error-container/30";
                  else if (item.verdict === 'PENDING') bgClass = "bg-surface-container-lowest hover:bg-surface-container-low";
                  
                  return (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, height: 0 }}
                      key={item.id} 
                      className={`p-4 flex flex-col gap-3 transition-colors ${bgClass}`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-medium text-on-surface truncate pr-4" title={item.name}>{item.name}</span>
                        <span className="shrink-0">
                          {item.verdict === 'PENDING' && <Chip label="Pending" />}
                          {item.verdict === 'PROCESSING' && <Chip label="Processing" variant="assist" className="animate-pulse" />}
                          {item.verdict === 'AUTHENTIC' && <Chip label="Authentic" variant="filter" className="!bg-emerald-500/20 !text-emerald-500" />}
                          {item.verdict === 'MANIPULATED' && <Chip label="Manipulated" variant="filter" className="!bg-error-container !text-on-error-container" />}
                          {item.verdict === 'ERROR' && <Chip label="Error" variant="filter" className="!bg-orange-500/20 !text-orange-500" />}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm text-on-surface-variant">
                        <span className="font-mono">{item.score ? 'Confidence: ' + (item.score * 100).toFixed(1) + '%' : 'Awaiting analysis'}</span>
                      </div>
                      {item.desc && (
                        <div className="text-sm text-on-surface-variant line-clamp-2">{item.desc}</div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </Card>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', damping: 20 }}>
          <Card className="flex flex-col items-center justify-center py-20 text-center border-dashed border-2 border-outline-variant/50 bg-surface/50">
            <div className="w-24 h-24 bg-surface-container rounded-full flex items-center justify-center mb-6 shadow-sm">
              <span className="material-symbols-outlined text-[56px] text-primary">topic</span>
            </div>
            <h3 className="text-2xl font-bold text-on-surface mb-2">Queue is Empty</h3>
            <p className="text-base text-on-surface-variant max-w-md">
              Drag and drop your media files above, or click to browse. You can analyze dozens of files simultaneously.
            </p>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
