/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Button, LinearProgress, Card } from '@repo/ui';
import { motion, AnimatePresence } from 'framer-motion';
import { ForensicReport } from '../../components/ForensicReport';
import { useAuth } from '../../context/AuthContext';
import { saveScanResult } from '../../lib/scans';
import { useRouter, useSearchParams } from 'next/navigation';

async function calculateSHA256(file: File) {
  try {
    let source: Blob = file;
    // On low-RAM mobile devices, slice to 10MB to avoid Out-Of-Memory heap crashes
    if (file.size > 10 * 1024 * 1024) {
      source = file.slice(0, 10 * 1024 * 1024);
    }
    const buffer = await source.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return 'Hash calculation failed';
  }
}

const STEPS = [
  { id: 'upload', label: 'Upload' },
  { id: 'extract', label: 'Extract Features' },
  { id: 'analyze', label: 'AI Inference' },
  { id: 'report', label: 'Generate Findings' }
];

interface QueueItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  hash: string;
  verdict: 'PENDING' | 'PROCESSING' | 'AUTHENTIC' | 'MANIPULATED' | 'ERROR';
  score: number;
  desc: string;
  result?: any;
}

async function retrieveSharedMediaOnce(): Promise<File | null> {
  // 1. Primary: Retrieve from IndexedDB (low memory, disk-backed)
  try {
    const fileFromIdb = await new Promise<File | null>((resolve) => {
      const req = indexedDB.open('veritas_pwa_db', 1);
      req.onerror = () => resolve(null);
      req.onsuccess = (e: any) => {
        try {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('shared_media')) {
            resolve(null);
            return;
          }
          const tx = db.transaction('shared_media', 'readwrite');
          const store = tx.objectStore('shared_media');
          const getReq = store.get('pending_share');
          getReq.onsuccess = () => {
            const data = getReq.result;
            if (data && data.file) {
              store.delete('pending_share');
              const reconstructed = new File([data.file], data.fileName || 'shared-media', {
                type: data.fileType || data.file.type || 'application/octet-stream',
              });
              resolve(reconstructed);
            } else {
              resolve(null);
            }
          };
          getReq.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      };
    });

    if (fileFromIdb) return fileFromIdb;
  } catch (err) {
    console.warn('[retrieveSharedMediaOnce] IndexedDB read error:', err);
  }

  // 2. Secondary: Fallback to Cache Storage API
  try {
    const cache = await caches.open('veritas-shared-media');
    const response = await cache.match('/shared-file');
    if (response) {
      const blob = await response.blob();
      let fileName = response.headers.get('X-Original-Name');
      if (fileName) fileName = decodeURIComponent(fileName);
      if (!fileName || fileName === 'null') {
        const ext = blob.type.split('/')[1] || 'jpg';
        fileName = 'shared-media.' + ext;
      }
      await cache.delete('/shared-file');
      return new File([blob], fileName, { type: blob.type });
    }
  } catch (err) {
    console.warn('[retrieveSharedMediaOnce] Cache API fallback error:', err);
  }

  return null;
}

// Resilient polling helper: polls for up to 2.5 seconds to eliminate mobile race conditions
async function retrieveSharedMediaWithRetry(maxAttempts = 10, intervalMs = 250): Promise<File | null> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const file = await retrieveSharedMediaOnce();
    if (file) return file;
    if (attempt < maxAttempts) {
      await new Promise((res) => setTimeout(res, intervalMs));
    }
  }
  return null;
}

function AnalyzeContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();

  // Mode: 'single' | 'batch'
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>(
    searchParams.get('mode') === 'batch' ? 'batch' : 'single'
  );

  // Single file states
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileHash, setFileHash] = useState<string>('');
  const [fileUrl, setFileUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [analysisError, setAnalysisError] = useState(false);
  const [sharedLinkUrl, setSharedLinkUrl] = useState<string>('');
  const [timestamp, setTimestamp] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('');
  const [currentStep, setCurrentStep] = useState(0);

  // Batch queue states
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [inspectedBatchItem, setInspectedBatchItem] = useState<QueueItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const isIngestingSharedRef = useRef(false);

  // Handle URL mode switch query
  useEffect(() => {
    if (searchParams.get('mode') === 'batch') {
      setActiveTab('batch');
    }
  }, [searchParams]);

  // Clean URL and break any browser POST-resubmission history loop
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search) {
      if (searchParams.get('large_file') || searchParams.get('share_error')) {
        const timer = setTimeout(() => {
          window.history.replaceState({}, '', '/analyze');
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [searchParams]);

  // Handle shared media file or social media URL from PWA share target
  useEffect(() => {
    if (searchParams.get('share_error') === '1') {
      toast.error('Could not receive shared file. Please select file directly.');
      window.history.replaceState({}, '', '/analyze');
      return;
    }

    if (searchParams.get('large_file') === '1') {
      toast.info('File too large for background transfer. Please select it via browse.');
      window.history.replaceState({}, '', '/analyze');
      return;
    }

    // Inbound social media link (Twitter, YouTube, Reddit, Instagram, etc.)
    const incomingUrl = searchParams.get('shared_url');
    if (incomingUrl) {
      window.history.replaceState({}, '', '/analyze');
      setSharedLinkUrl(incomingUrl);
      setActiveTab('single');
      toast.success('Shared link ready for forensic analysis');
      return;
    }

    // Shared media file from Android intent
    if (searchParams.get('shared') === 'true' && !isIngestingSharedRef.current) {
      isIngestingSharedRef.current = true;
      window.history.replaceState({}, '', '/analyze');
      
      const toastId = toast.loading('Receiving shared media from Android...');

      retrieveSharedMediaWithRetry(12, 250).then((fileObj) => {
        toast.dismiss(toastId);
        if (fileObj) {
          toast.success(`Received: ${fileObj.name}`);
          setActiveTab('single');
          analyzeSingleFile(fileObj);
        } else {
          toast.error('Shared file was not found in storage. Please select file directly.');
        }
        isIngestingSharedRef.current = false;
      });
    }

    // Direct push notification from Service Worker if PWA was already open
    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'VERITAS_PWA_MEDIA_SHARED') {
        retrieveSharedMediaWithRetry(5, 200).then((fileObj) => {
          if (fileObj) {
            toast.success(`Received shared media: ${fileObj.name}`);
            setActiveTab('single');
            analyzeSingleFile(fileObj);
          }
        });
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
    }

    // Extension sync listener
    let isProcessing = false;
    let intervalId: NodeJS.Timeout | null = null;
    
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'VERITAS_LOAD_REPORT') {
        if (isProcessing) return;
        isProcessing = true;
        if (intervalId) clearInterval(intervalId);
        
        const payload = event.data.payload;
        let finalUrl = payload.url;
        let mime = 'video/mp4';
        
        if (payload.base64) {
          finalUrl = payload.base64;
          mime = payload.mimeType || 'video/mp4';
        } else if (payload.name) {
          if (payload.name.match(/\.(jpg|jpeg|png|webp|gif)$/i)) mime = 'image/jpeg';
          if (payload.name.match(/\.(mp3|wav|m4a)$/i)) mime = 'audio/mpeg';
        }
        
        const mockFile = new File([], payload.name || 'Extension Scan', { type: mime });
        setFile(mockFile);
        setFileUrl(finalUrl);
        setResult(payload.result);
        setTimestamp(new Date().toLocaleString());
        setActiveTab('single');
        toast.success(`Loaded forensic analysis for ${payload.name || 'Media'}`);
      }
    };

    window.addEventListener('message', handleMessage);
    if (window.location.search.includes('from_ext=true')) {
      intervalId = setInterval(() => {
        window.postMessage({ type: 'VERITAS_READY' }, '*');
      }, 500);
      setTimeout(() => {
        if (intervalId) clearInterval(intervalId);
      }, 5000);
    }

    return () => {
      window.removeEventListener('message', handleMessage);
      if (intervalId) clearInterval(intervalId);
    };
  }, [router, searchParams]);

  // Unified Drop / Upload Handler
  const handleFilesIngest = async (filesList: FileList | File[]) => {
    const files = Array.from(filesList);
    if (files.length === 0) return;

    if (files.length === 1 && activeTab === 'single') {
      analyzeSingleFile(files[0]);
      return;
    }

    // Multiple files OR currently in batch mode -> Enqueue in batch pipeline
    setActiveTab('batch');
    const newItems: QueueItem[] = [];
    for (const f of files) {
      newItems.push({
        id: 'q_' + Math.random().toString(36).substring(2, 9),
        file: f,
        name: f.name,
        size: f.size,
        type: f.type,
        hash: 'Pending calculation...',
        verdict: 'PENDING',
        score: 0,
        desc: 'Ready for analysis'
      });
    }

    setQueue(prev => [...prev, ...newItems]);
    toast.success(`Enqueued ${files.length} ${files.length === 1 ? 'file' : 'files'} for batch processing`);
  };

  // Single file deep analysis
  const analyzeSingleFile = async (selectedFile: File) => {
    // Revoke previous object URL to prevent memory accumulation on mobile
    if (fileUrl) {
      try {
        URL.revokeObjectURL(fileUrl);
      } catch {}
    }

    setFile(selectedFile);
    setAnalysisError(false);
    setIsLoading(true);
    setResult(null);
    setProgress(5);
    setCurrentStep(0);
    setLoadingText('Ingesting binary stream...');

    if (selectedFile.type.startsWith('image/') || selectedFile.type.startsWith('video/')) {
      setFileUrl(URL.createObjectURL(selectedFile));
    } else {
      setFileUrl('');
    }

    try {
      setCurrentStep(1);
      setLoadingText('Computing cryptographic SHA-256 fingerprint...');
      setProgress(25);
      const hash = await calculateSHA256(selectedFile);
      setFileHash(hash);

      setCurrentStep(2);
      setLoadingText('Executing ViT & Frequency spectral neural networks...');
      setProgress(55);

      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'https://upside-shower-handling.ngrok-free.dev'}/detect`,
        { method: 'POST', body: formData }
      );

      if (!response.ok) throw new Error('API Error');

      setProgress(85);
      setCurrentStep(3);
      setLoadingText('Fusing multi-modal inference vectors...');

      const data = await response.json();
      setResult(data);
      const currentTime = new Date().toLocaleString();
      setTimestamp(currentTime);

      if (user) {
        await saveScanResult(
          user.uid,
          { name: selectedFile.name, type: selectedFile.type, size: selectedFile.size },
          data,
          hash
        );
      }

      setProgress(100);
      toast.success('Forensic analysis completed');
    } catch {
      toast.error('Veritas engine is initializing. You can retry or inspect the file.');
      // Keep file loaded in UI, don't wipe it out!
      setAnalysisError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const resetSingle = () => {
    setFile(null);
    setResult(null);
    setAnalysisError(false);
    setFileHash('');
    if (fileUrl) {
      try {
        URL.revokeObjectURL(fileUrl);
      } catch {}
    }
    setFileUrl('');
    setIsLoading(false);
    setProgress(0);
    setCurrentStep(0);
  };

  const loadDemo = () => {
    const mockFile = new File(['mock'], 'sample_synthetic_deepfake.jpg', { type: 'image/jpeg' });
    setFile(mockFile);
    setFileHash('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    setFileUrl('/logo.png');
    setResult({
      is_fake: true,
      confidence: 0.945,
      breakdown: {
        visual_score: 0.962,
        audio_score: 0.88,
        lip_sync_score: 0.91
      },
      heatmap: null
    });
    setTimestamp(new Date().toLocaleString());
    setActiveTab('single');
    toast.success('Loaded forensic demo preview');
  };

  // Batch queue processing
  const processBatchQueue = async () => {
    const pendingItems = queue.filter(item => item.verdict === 'PENDING');
    if (pendingItems.length === 0) {
      toast.info('No pending files to process.');
      return;
    }

    setIsBatchProcessing(true);
    toast.info(`Processing ${pendingItems.length} files in background...`);

    const MAX_CONCURRENT = 3;
    let index = 0;

    const processItem = async (item: QueueItem) => {
      setQueue(prev => prev.map(q => (q.id === item.id ? { ...q, verdict: 'PROCESSING', desc: 'Running models...' } : q)));

      try {
        const hash = await calculateSHA256(item.file);
        const formData = new FormData();
        formData.append('file', item.file);

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'https://upside-shower-handling.ngrok-free.dev'}/detect`,
          { method: 'POST', body: formData }
        );

        if (!response.ok) throw new Error('API Error');
        const data = await response.json();

        if (user) {
          await saveScanResult(
            user.uid,
            { name: item.file.name, type: item.file.type, size: item.file.size },
            data,
            hash
          );
        }

        const isFake = data.is_fake;
        const confidence = data.confidence > 1 ? data.confidence : data.confidence * 100;

        setQueue(prev =>
          prev.map(q =>
            q.id === item.id
              ? {
                  ...q,
                  hash,
                  result: data,
                  score: confidence,
                  verdict: isFake ? 'MANIPULATED' : 'AUTHENTIC',
                  desc: `Visual: ${((data.breakdown?.visual_score ?? 0.8) * 100).toFixed(0)}%`
                }
              : q
          )
        );
      } catch {
        setQueue(prev =>
          prev.map(q =>
            q.id === item.id ? { ...q, verdict: 'ERROR', desc: 'Pipeline connection timed out.' } : q
          )
        );
      }
    };

    const runWorker = async () => {
      while (index < pendingItems.length) {
        const current = pendingItems[index++];
        await processItem(current);
      }
    };

    const workers = Array.from({ length: Math.min(MAX_CONCURRENT, pendingItems.length) }, () => runWorker());
    await Promise.all(workers);

    setIsBatchProcessing(false);
    toast.success('Batch pipeline completed');
  };

  const exportBatchCSV = () => {
    if (queue.length === 0) return;
    const headers = ['Filename', 'Verdict', 'Confidence (%)', 'SHA-256', 'Status'];
    const rows = queue.map(q => [
      `"${q.name.replace(/"/g, '""')}"`,
      `"${q.verdict}"`,
      `"${q.score ? q.score.toFixed(1) : 'N/A'}"`,
      `"${q.hash}"`,
      `"${q.desc}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.join('\n')].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.href = encodedUri;
    link.download = `veritas_batch_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Exported batch ledger as CSV');
  };

  // Batch stats summary
  const batchStats = useMemo(() => {
    const total = queue.length;
    const completed = queue.filter(q => q.verdict === 'AUTHENTIC' || q.verdict === 'MANIPULATED').length;
    const threats = queue.filter(q => q.verdict === 'MANIPULATED').length;
    const pending = queue.filter(q => q.verdict === 'PENDING').length;
    return { total, completed, threats, pending };
  }, [queue]);

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto flex flex-col gap-6 w-full pb-32">
      {/* Top Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-on-surface">
            Media Verification Center
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant">
            Analyze single files for deep forensic dissection or queue multi-file batches concurrently.
          </p>
        </div>

        {/* Material 3 Segmented Toggle */}
        <div className="flex items-center p-1 rounded-2xl bg-surface-container border border-outline-variant/30 text-xs font-semibold self-stretch sm:self-auto">
          <button
            onClick={() => setActiveTab('single')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'single'
                ? 'bg-primary-container text-on-primary-container font-bold shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">troubleshoot</span>
            Single File
          </button>
          <button
            onClick={() => setActiveTab('batch')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'batch'
                ? 'bg-primary-container text-on-primary-container font-bold shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">queue</span>
            Batch Queue {queue.length > 0 && `(${queue.length})`}
          </button>
        </div>
      </div>

      {/* Hidden File Input (supports multiple) */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        accept="image/*,video/*,audio/*"
        onChange={e => {
          if (e.target.files) handleFilesIngest(e.target.files);
        }}
      />

      {/* Hidden Camera Input for direct mobile device capture */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*,video/*"
        capture="environment"
        className="hidden"
        onChange={e => {
          if (e.target.files && e.target.files[0]) handleFilesIngest(e.target.files);
        }}
      />

      {/* ========================================================================= */}
      {/* TAB 1: SINGLE DEEP SCAN                                                    */}
      {/* ========================================================================= */}
      {activeTab === 'single' && (
        <div className="flex flex-col gap-6">
          {/* Progress Indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/30 shadow-sm"
            >
              <div className="grid grid-cols-4 gap-2 mb-4 relative">
                {STEPS.map((step, idx) => (
                  <div key={step.id} className="flex flex-col items-center text-center z-10">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                        idx < currentStep
                          ? 'bg-emerald-500 text-white'
                          : idx === currentStep
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container-highest text-on-surface-variant'
                      }`}
                    >
                      {idx < currentStep ? '✓' : idx + 1}
                    </div>
                    <span className="text-[11px] mt-1 hidden sm:block text-on-surface-variant">{step.label}</span>
                  </div>
                ))}
              </div>
              <LinearProgress value={progress} />
              <p className="text-center mt-3 text-xs text-on-surface-variant font-mono">{loadingText}</p>
            </motion.div>
          )}

          {!file ? (
            <>
              {/* Shared Link Card if a URL was shared from social media */}
              {sharedLinkUrl && (
                <div className="bg-surface-container-low border border-primary/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[22px]">link</span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[11px] font-bold text-primary uppercase tracking-wider">Shared Link Captured</span>
                      <p className="text-xs text-on-surface font-mono truncate max-w-sm sm:max-w-md">{sharedLinkUrl}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <Button
                      variant="filled"
                      onClick={() => {
                        toast.info('Downloading media from link...');
                        fetch(sharedLinkUrl)
                          .then((res) => res.blob())
                          .then((blob) => {
                            const fileName = sharedLinkUrl.split('/').pop()?.split('?')[0] || 'shared-media';
                            const fileObj = new File([blob], fileName, { type: blob.type });
                            setSharedLinkUrl('');
                            analyzeSingleFile(fileObj);
                          })
                          .catch(() => {
                            toast.error('Direct download restricted by provider. Please save media and upload directly.');
                          });
                      }}
                      className="text-xs !py-2 !px-4"
                    >
                      Scan Link
                    </Button>
                    <button
                      onClick={() => setSharedLinkUrl('')}
                      className="text-xs text-on-surface-variant hover:text-on-surface px-3 py-2 rounded-xl transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {/* Upload Dropzone */}
              <div
                onDragOver={e => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={e => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer?.files) handleFilesIngest(e.dataTransfer.files);
                }}
                className={`border-2 border-dashed rounded-3xl h-[340px] sm:h-[380px] flex flex-col items-center justify-center transition-all duration-200 text-center p-6 ${
                  isDragging
                    ? 'border-primary bg-primary/10 scale-[1.01]'
                    : 'border-outline-variant/40 bg-surface-container-low hover:border-primary/50'
                }`}
              >
                <div className="w-16 h-16 rounded-2xl bg-surface-container-highest text-primary flex items-center justify-center mb-4 shadow-sm">
                  <span className="material-symbols-outlined text-[36px]">cloud_upload</span>
                </div>
                <h3 className="text-xl font-bold text-on-surface mb-1">Drop media here or browse</h3>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button variant="filled" onClick={() => fileInputRef.current?.click()} className="text-xs !px-6 !py-2.5">
                    <span className="material-symbols-outlined text-[18px] mr-1.5">folder_open</span>
                    Browse Files
                  </Button>
                  <Button variant="tonal" onClick={() => cameraInputRef.current?.click()} className="text-xs !px-5 !py-2.5 sm:hidden">
                    <span className="material-symbols-outlined text-[18px] mr-1.5">photo_camera</span>
                    Camera Scan
                  </Button>
                </div>

                <div className="mt-6 flex items-center gap-2 text-xs text-on-surface-variant">
                  <span>Want to test first?</span>
                  <button onClick={loadDemo} className="text-primary hover:underline font-semibold flex items-center gap-1">
                    Try sample analysis <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Single Result View or Error Recovery */
            <div className="flex flex-col gap-6">
              {analysisError && !isLoading && (
                <div className="bg-surface-container-low border border-amber-500/30 rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3">
                    <span className="material-symbols-outlined text-[32px]">warning</span>
                  </div>
                  <h3 className="text-lg font-bold text-on-surface mb-1">Media Loaded: {file.name}</h3>
                  <p className="text-xs text-on-surface-variant max-w-md mb-6 leading-relaxed">
                    Veritas AI received your media ({((file.size || 0) / 1024 / 1024).toFixed(2)} MB), but the deepfake neural engine could not be reached. The backend may be offline or initializing.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <Button variant="filled" onClick={() => analyzeSingleFile(file)} className="text-xs !px-5">
                      <span className="material-symbols-outlined text-[16px] mr-1.5">refresh</span>
                      Retry Deep Analysis
                    </Button>
                    <Button variant="tonal" onClick={loadDemo} className="text-xs !px-5">
                      <span className="material-symbols-outlined text-[16px] mr-1.5">visibility</span>
                      View Sample Report
                    </Button>
                    <Button variant="outlined" onClick={resetSingle} className="text-xs !px-5">
                      Choose Another File
                    </Button>
                  </div>
                </div>
              )}
            <AnimatePresence>
              {result && !isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-6"
                >
                  <div className="flex justify-between items-center bg-surface-container-low p-3.5 rounded-2xl border border-outline-variant/30 print:hidden">
                    <Button variant="outlined" onClick={resetSingle} className="text-xs">
                      <span className="material-symbols-outlined text-[16px] mr-1.5">refresh</span>
                      Scan Another
                    </Button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (file) {
                            setQueue(prev => [
                              ...prev,
                              {
                                id: 'q_' + Math.random().toString(36).substring(2, 9),
                                file,
                                name: file.name,
                                size: file.size,
                                type: file.type,
                                hash: fileHash,
                                verdict: result.is_fake ? 'MANIPULATED' : 'AUTHENTIC',
                                score: result.confidence * 100,
                                desc: 'Imported from Single Scan',
                                result
                              }
                            ]);
                            setActiveTab('batch');
                            toast.success('Moved scan to Batch Queue');
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl border border-outline-variant/30 text-xs text-on-surface-variant hover:text-on-surface transition-colors"
                      >
                        + Add to Batch
                      </button>
                      <Button
                        variant="filled"
                        onClick={() => {
                          import('../../lib/pdf').then(({ downloadPDF }) => {
                            downloadPDF('forensic-report-content', `Veritas_${file.name}.pdf`);
                          });
                        }}
                        className="text-xs"
                      >
                        <span className="material-symbols-outlined text-[16px] mr-1.5">download</span>
                        Download PDF
                      </Button>
                    </div>
                  </div>

                  <ForensicReport
                    isLoading={isLoading}
                    result={result}
                    fileData={{ name: file.name, type: file.type, size: file.size, url: fileUrl }}
                    fileHash={fileHash}
                    timestamp={timestamp}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: BATCH QUEUE MANAGER                                                */}
      {/* ========================================================================= */}
      {activeTab === 'batch' && (
        <div className="flex flex-col gap-6">
          {/* Batch Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="bg-surface-container-low border border-outline-variant/30 p-3.5 flex flex-col justify-between">
              <span className="text-[11px] text-on-surface-variant font-medium">Total In Queue</span>
              <span className="text-xl font-bold font-mono text-on-surface mt-1">{batchStats.total}</span>
            </Card>
            <Card className="bg-surface-container-low border border-outline-variant/30 p-3.5 flex flex-col justify-between">
              <span className="text-[11px] text-on-surface-variant font-medium">Completed</span>
              <span className="text-xl font-bold font-mono text-emerald-400 mt-1">{batchStats.completed}</span>
            </Card>
            <Card className="bg-surface-container-low border border-outline-variant/30 p-3.5 flex flex-col justify-between">
              <span className="text-[11px] text-on-surface-variant font-medium">Flagged Threats</span>
              <span className="text-xl font-bold font-mono text-error mt-1">{batchStats.threats}</span>
            </Card>
            <Card className="bg-surface-container-low border border-outline-variant/30 p-3.5 flex flex-col justify-between">
              <span className="text-[11px] text-on-surface-variant font-medium">Pending Scan</span>
              <span className="text-xl font-bold font-mono text-on-surface-variant mt-1">{batchStats.pending}</span>
            </Card>
          </div>

          {/* Batch Ingest & Action Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface-container-low p-4 rounded-2xl border border-outline-variant/30">
            <div className="flex items-center gap-2">
              <Button
                variant="filled"
                onClick={processBatchQueue}
                disabled={isBatchProcessing || batchStats.pending === 0}
                className="text-xs"
              >
                <span className="material-symbols-outlined text-[16px] mr-1.5">
                  {isBatchProcessing ? 'hourglass_top' : 'play_arrow'}
                </span>
                {isBatchProcessing ? 'Processing Queue...' : `Start Queue (${batchStats.pending})`}
              </Button>
              <Button variant="outlined" onClick={() => fileInputRef.current?.click()} className="text-xs">
                <span className="material-symbols-outlined text-[16px] mr-1.5">add</span>
                Add Files
              </Button>
            </div>

            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={exportBatchCSV}
                disabled={queue.length === 0}
                className="px-3 py-1.5 rounded-xl border border-outline-variant/30 text-xs font-semibold text-on-surface hover:bg-surface-container disabled:opacity-40 transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                Export CSV
              </button>
              <button
                onClick={() => setQueue([])}
                disabled={isBatchProcessing || queue.length === 0}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-error hover:bg-error/10 disabled:opacity-40 transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
                Clear
              </button>
            </div>
          </div>

          {/* Queue Table or Empty State */}
          {queue.length === 0 ? (
            <div
              onDragOver={e => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={e => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer?.files) handleFilesIngest(e.dataTransfer.files);
              }}
              className="border-2 border-dashed border-outline-variant/40 rounded-3xl h-64 flex flex-col items-center justify-center p-6 text-center bg-surface-container-low"
            >
              <span className="material-symbols-outlined text-[40px] text-on-surface-variant/60 mb-2">queue</span>
              <p className="text-sm font-bold text-on-surface">Batch Queue is empty</p>
              <p className="text-xs text-on-surface-variant mt-1 mb-4">
                Drag multiple audio, video, or image files here to start bulk verification.
              </p>
              <Button variant="outlined" onClick={() => fileInputRef.current?.click()} className="text-xs">
                Select Multiple Media Files
              </Button>
            </div>
          ) : (
            <div className="bg-surface-container-low rounded-2xl border border-outline-variant/30 overflow-hidden shadow-sm">
              <div className="divide-y divide-outline-variant/20">
                {queue.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-surface-container/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-surface-container-highest flex items-center justify-center text-xs font-mono font-bold text-on-surface-variant shrink-0">
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-semibold text-on-surface truncate max-w-xs sm:max-w-md">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-on-surface-variant font-mono">
                          {(item.size / 1024 / 1024).toFixed(2)} MB • {item.desc}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                          item.verdict === 'AUTHENTIC'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : item.verdict === 'MANIPULATED'
                            ? 'bg-error/15 text-error border-error/30'
                            : item.verdict === 'PROCESSING'
                            ? 'bg-primary/15 text-primary border-primary/30 animate-pulse'
                            : item.verdict === 'ERROR'
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            : 'bg-surface-container-highest text-on-surface-variant border-outline-variant/30'
                        }`}
                      >
                        {item.verdict}
                      </span>

                      {item.result && (
                        <button
                          onClick={() => setInspectedBatchItem(item)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-primary hover:bg-primary/10 transition-colors flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">visibility</span>
                          Inspect
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inspected Item Modal */}
          {inspectedBatchItem && inspectedBatchItem.result && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-surface border border-outline-variant/30 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl flex flex-col gap-6">
                <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[22px]">troubleshoot</span>
                    <h2 className="text-base font-bold text-on-surface truncate max-w-md">
                      {inspectedBatchItem.name}
                    </h2>
                  </div>
                  <button
                    onClick={() => setInspectedBatchItem(null)}
                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container-highest text-on-surface-variant"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>

                <ForensicReport
                  isLoading={false}
                  result={inspectedBatchItem.result}
                  fileData={{
                    name: inspectedBatchItem.name,
                    type: inspectedBatchItem.type,
                    size: inspectedBatchItem.size
                  }}
                  fileHash={inspectedBatchItem.hash}
                  timestamp={new Date().toLocaleString()}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mobile Quick-Scan Floating Action Button */}
      {!file && (
        <div className="fixed bottom-24 right-4 z-40 md:hidden">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-primary text-on-primary font-bold text-xs py-3 px-5 rounded-full shadow-2xl active:scale-95 transition-all border border-white/10"
          >
            <span className="material-symbols-outlined text-[20px]">add_photo_alternate</span>
            <span>Scan Media</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function AnalyzePage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-on-surface-variant font-mono">Loading Media Verification Center...</div>}>
      <AnalyzeContent />
    </React.Suspense>
  );
}
