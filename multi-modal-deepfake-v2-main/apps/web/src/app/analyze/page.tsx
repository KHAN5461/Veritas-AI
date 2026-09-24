/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import React, { useState, useRef } from 'react';
import { toast } from 'sonner';
import { Button, LinearProgress } from '@repo/ui';
import { ForensicReport } from '../../components/ForensicReport';
import { useAuth } from '../../context/AuthContext';
import { saveScanResult } from '../../lib/scans';
import { useRouter, useSearchParams } from 'next/navigation';

async function calculateSHA256(file: File) {
  try {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    return "Hash calculation failed";
  }
}

function AnalyzeContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileHash, setFileHash] = useState<string>('');
  const [fileUrl, setFileUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [timestamp, setTimestamp] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (searchParams.get('shared') === '1') {
      caches.open('veritas-shared-media').then(cache => {
        cache.match('/shared-file').then(response => {
          if (response) {
            response.blob().then(blob => {
              let fileName = response.headers.get('X-Original-Name'); if (!fileName || fileName === 'null') { const ext = blob.type.split('/')[1] || 'jpg'; fileName = 'shared-media.' + ext; }
              const fileObj = new File([blob], fileName, { type: blob.type });
              // Clear URL to prevent infinite loop on refresh
              router.replace('/analyze');
              toast.success('Received shared media file');
              analyzeFile(fileObj);
              cache.delete('/shared-file');
            });
          }
        });
      });
    }

    // We use a mutable flag inside the effect to safely deduplicate synchronous messages
    let isProcessing = false;
    let intervalId: NodeJS.Timeout | null = null;
    
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'VERITAS_LOAD_REPORT') {
        if (isProcessing) return; // Prevent duplicate toasts
        isProcessing = true;
        
        if (intervalId) clearInterval(intervalId);
        
        console.log("[Web App] Received VERITAS_LOAD_REPORT", event.data.payload ? "with payload" : "without payload");
        const payload = event.data.payload;
        
        let finalUrl = payload.url;
        let mime = "video/mp4";
        
        // If the extension passed a base64 payload (for local files dropped in sidepanel)
        if (payload.base64) {
          finalUrl = payload.base64;
          mime = payload.mimeType || "video/mp4";
        } else if (payload.name) {
          // Guess mime from name
          if (payload.name.match(/\.(jpg|jpeg|png|webp|gif)$/i)) mime = "image/jpeg";
          if (payload.name.match(/\.(mp3|wav|m4a)$/i)) mime = "audio/mpeg";
        }
        
        const mockFile = new File([], payload.name || "Extension Scan", { type: mime });
        setFile(mockFile);
        setFileUrl(finalUrl);
        setResult(payload.result);
        setFileHash("ext-scan-complete");
        setTimestamp(new Date().toLocaleString());
        toast.success("Loaded report instantly from extension!");
      }
    };
    window.addEventListener('message', handleMessage);
    
    // Tell the extension we are ready to receive the report
    if (searchParams.get('from_ext') === 'true' && !result) {
      console.log("[Web App] Sending VERITAS_READY to Extension!");
      window.postMessage({ type: 'VERITAS_READY' }, '*');
      
      // Poll just in case the content script injected late
      intervalId = setInterval(() => {
        if (!result) {
          console.log("[Web App] Polling VERITAS_READY...");
          window.postMessage({ type: 'VERITAS_READY' }, '*');
        }
      }, 500);
    }

    const url = searchParams.get('url');
    if (url && !file && !isLoading && searchParams.get('from_ext') !== 'true') {
      // Auto analyze the URL
      fetch(url).then(r => r.blob()).then(blob => {
        const ext = url.split('.').pop()?.split('?')[0] || 'mp4';
        const name = url.split('/').pop()?.split('?')[0] || `media.${ext}`;
        const newFile = new File([blob], name, { type: blob.type });
        analyzeFile(newFile);
      }).catch(err => {
      });
    }

    return () => {
      window.removeEventListener('message', handleMessage);
      if (intervalId) clearInterval(intervalId);
    };
  }, [searchParams, result]);

  const analyzeFile = async (targetFile: File) => {
    setFile(targetFile);
    setIsLoading(true);
    setProgress(0);
    setLoadingText('Uploading media securely...');
    setResult(null);
    setFileUrl(URL.createObjectURL(targetFile));
    const now = new Date().toLocaleString();
    setTimestamp(now);
    
    // Simulate progress
    const loadingMessages = [
      "Extracting multi-modal features...",
      "Running Vision Transformer (ViT)...",
      "Analyzing facial landmarks...",
      "Performing frequency domain analysis...",
      "Cross-referencing audio-visual sync...",
      "Finalizing forensic report..."
    ];
    
    let currentProgress = 0;
    let messageIndex = 0;
    const progressInterval = setInterval(() => {
      currentProgress += Math.random() * 8 + 2; // Add 2-10%
      if (currentProgress > 95) currentProgress = 95; // Cap at 95% until complete
      setProgress(currentProgress);
      
      // Update text every ~15% progress
      if (currentProgress > (messageIndex + 1) * 15 && messageIndex < loadingMessages.length - 1) {
        messageIndex++;
        setLoadingText(loadingMessages[messageIndex]);
      }
    }, 600);

    const hash = await calculateSHA256(targetFile);
    setFileHash(hash);

    try {
      const formData = new FormData();
      formData.append('file', targetFile);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://upside-shower-handling.ngrok-free.dev'}/detect`, { method: 'POST', body: formData });
      
      clearInterval(progressInterval);
      setProgress(100);
      setLoadingText('Complete!');
      
      if (!response.ok) throw new Error('API Error');
      const data = await response.json();
      setResult(data);
      toast.success('Analysis complete!');

      if (user) {
        // Save to Firestore non-blocking
        const fileData = {
          name: targetFile.name,
          type: targetFile.type,
          size: targetFile.size,
        };
        saveScanResult(user.uid, fileData, data, hash)
          .then(scanId => {
            toast.success(`Report permanently saved (ID: ${scanId.substring(0,6)}...)`);
            chrome.runtime?.sendMessage({ action: "scan_completed" }).catch(() => {});
          })
          .catch(e => {
            console.error("Failed to save to Firestore:", e);
          });
      }
    } catch (err: any) {
      clearInterval(progressInterval);
      setProgress(0);
      const errorMessage = err?.message || String(err);
      
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        toast.error("We're having trouble connecting to our analysis engine right now. It might be waking up—please give it a minute and try again!");
      } else if (errorMessage.includes('413') || errorMessage.includes('Payload Too Large')) {
        toast.error("This file is a bit too large for us to process right now. Please try a shorter clip.");
      } else {
        toast.error("We couldn't analyze this file. It might be corrupted or in an unsupported format.");
      }
      setFile(null); // Reset file so they can try again
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

  const reset = () => {
    setFile(null);
    setResult(null);
    setFileHash('');
    setFileUrl('');
  };

  const handleDownload = () => {
    import('../../lib/pdf').then(({ downloadPDF }) => {
      downloadPDF('forensic-report-content', 'Veritas_Analysis_Report.pdf');
    });
  };

  return (
    <div className="p-8 max-w-5xl mx-auto flex flex-col w-full print:p-0 print:m-0 print:max-w-none print:bg-white print:text-black">
      
      {!file && (
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-on-surface mb-1">Forensic Analysis</h1>
          <p className="text-on-surface-variant">Upload media to generate a professional deepfake analysis report.</p>
        </div>
      )}

      {isLoading && (
        <div className="mb-8">
          <LinearProgress value={progress} />
          <div className="text-center mt-2 text-sm text-primary font-mono">{loadingText} {Math.floor(progress)}%</div>
        </div>
      )}

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
          <h3 className="text-xl font-medium text-on-surface mb-1">Drag and drop a file to begin</h3>
          <p className="text-sm text-on-surface-variant mb-6">We support MP4, AVI, WAV, MP3, JPG, and PNG formats.</p>
          <Button variant="tonal" onClick={handleBrowse}>Browse Local Files</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-12 pb-16 print:gap-8 print:pb-0">
          {/* Print controls */}
          <div className="flex justify-between items-center print:hidden bg-surface-container-low p-4 rounded-2xl">
            <Button variant="outlined" onClick={reset}>
              <span className="material-symbols-outlined text-[18px] mr-2">arrow_back</span>
              Scan Another
            </Button>
            <Button variant="filled" onClick={handleDownload}>
              <span className="material-symbols-outlined text-[18px] mr-2">download</span>
              Download PDF Report
            </Button>
          </div>

          <div id="forensic-report-content">
            <ForensicReport 
              isLoading={isLoading} 
              result={result} 
              fileData={{ name: file.name, type: file.type, size: file.size, url: fileUrl }} 
              fileHash={fileHash} 
              timestamp={timestamp} 
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function AnalyzePage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <AnalyzeContent />
    </React.Suspense>
  );
}
