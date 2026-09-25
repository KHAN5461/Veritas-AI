/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import React, { useState, useRef } from 'react';
import { toast } from 'sonner';
import { Button, LinearProgress } from '@repo/ui';
import { motion, AnimatePresence } from 'framer-motion';
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

// Dummy demo result for "Try with sample"
const DEMO_RESULT = {
  is_fake: true,
  confidence: 94.5,
  details: {
    visual_artifacts: ["Inconsistent lighting on face", "Unnatural eye blinking pattern"],
    audio_anomalies: ["Synthesized vocal tract features detected"]
  }
};

const STEPS = [
  { id: 'upload', label: 'Upload' },
  { id: 'extract', label: 'Extract Features' },
  { id: 'analyze', label: 'AI Analysis' },
  { id: 'report', label: 'Generate Report' }
];

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
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    // Handle share error (SW couldn't process the file)
    if (searchParams.get('share_error') === '1') {
      toast.error('Could not receive the shared file. Please try uploading directly.');
      router.replace('/analyze');
    }

    // Handle shared file from SW cache
    if (searchParams.get('shared') === 'true') {
      caches.open('veritas-shared-media').then(cache => {
        cache.match('/shared-file').then(response => {
          if (response) {
            response.blob().then(blob => {
              let fileName = response.headers.get('X-Original-Name');
              if (fileName) fileName = decodeURIComponent(fileName);
              if (!fileName || fileName === 'null') {
                const ext = blob.type.split('/')[1] || 'jpg';
                fileName = 'shared-media.' + ext;
              }
              const fileObj = new File([blob], fileName, { type: blob.type });
              router.replace('/analyze');
              toast.success('Received shared media file');
              analyzeFile(fileObj);
              cache.delete('/shared-file');
            });
          } else {
            toast.error('Shared file not found in cache. Please try uploading directly.');
            router.replace('/analyze');
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

  const analyzeFile = async (targetFile: File, isDemo = false) => {
    setFile(targetFile);
    setIsLoading(true);
    setProgress(0);
    setCurrentStep(0);
    setLoadingText('Uploading media securely...');
    setResult(null);
    setFileUrl(isDemo ? '/demo-image.jpg' : URL.createObjectURL(targetFile));
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
      
      // Update step indicator based on progress
      if (currentProgress < 20) setCurrentStep(0);
      else if (currentProgress < 50) setCurrentStep(1);
      else if (currentProgress < 85) setCurrentStep(2);
      else setCurrentStep(3);

      // Update text every ~15% progress
      if (currentProgress > (messageIndex + 1) * 15 && messageIndex < loadingMessages.length - 1) {
        messageIndex++;
        setLoadingText(loadingMessages[messageIndex]);
      }
    }, 400); // slightly faster for better UX

    const hash = isDemo ? "demo-hash-1234567890" : await calculateSHA256(targetFile);
    setFileHash(hash);

    try {
      if (isDemo) {
        // Simulate API delay for demo
        await new Promise(resolve => setTimeout(resolve, 3000));
        clearInterval(progressInterval);
        setProgress(100);
        setCurrentStep(3);
        setLoadingText('Complete!');
        setResult(DEMO_RESULT);
        toast.success('Demo analysis complete!');
        setIsLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append('file', targetFile);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://upside-shower-handling.ngrok-free.dev'}/detect`, { method: 'POST', body: formData });
      
      clearInterval(progressInterval);
      setProgress(100);
      setCurrentStep(3);
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

  const loadDemo = () => {
    const demoFile = new File(["dummy content"], "sample_deepfake_video.mp4", { type: "video/mp4" });
    analyzeFile(demoFile, true);
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
    <div className="p-4 md:p-8 max-w-5xl mx-auto flex flex-col w-full print:p-0 print:m-0 print:max-w-none print:bg-white print:text-black min-h-[80vh]">
      
      {!file && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-on-surface mb-1">Forensic Analysis</h1>
          <p className="text-on-surface-variant">Upload media to generate a professional deepfake analysis report.</p>
        </motion.div>
      )}

      {isLoading && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-8 bg-surface-container p-6 rounded-3xl border border-outline/10">
          <div className="flex justify-between mb-6 text-sm overflow-hidden relative">
            {/* Steps indicator */}
            {STEPS.map((step, idx) => (
              <div key={step.id} className={`flex flex-col items-center gap-2 z-10 ${idx <= currentStep ? 'text-primary' : 'text-on-surface-variant/50'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-500 ${idx < currentStep ? 'bg-primary text-on-primary' : idx === currentStep ? 'bg-primary-container text-on-primary-container ring-4 ring-primary/20' : 'bg-surface-container-high'}`}>
                  <span className="material-symbols-outlined text-[16px]">
                    {idx < currentStep ? 'check' : idx === 0 ? 'upload' : idx === 1 ? 'memory' : idx === 2 ? 'psychology' : 'description'}
                  </span>
                </div>
                <span className="font-medium hidden sm:block">{step.label}</span>
              </div>
            ))}
            {/* Connecting line */}
            <div className="absolute top-4 left-[10%] right-[10%] h-[2px] bg-surface-container-high -z-0">
               <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }} />
            </div>
          </div>
          <LinearProgress value={progress} />
          <div className="text-center mt-4 text-sm text-on-surface-variant font-mono bg-surface-container-high py-2 rounded-lg">{loadingText} {Math.floor(progress)}%</div>
        </motion.div>
      )}

      <input ref={fileInputRef} type="file" className="hidden" accept="image/*,video/*,audio/*" onChange={handleFileInput} />

      {!file ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="relative w-full"
        >
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={"relative z-10 border-2 border-dashed rounded-[2rem] h-[400px] flex flex-col items-center justify-center transition-all duration-300 overflow-hidden " + (isDragging ? 'border-primary bg-primary/10 scale-[1.02] shadow-xl' : 'border-outline-variant hover:border-primary/50 bg-surface-container-low')}
          >
            {/* Decorative animated icons floating in the background */}
            <motion.span animate={{ y: [0, -15, 0], opacity: [0.1, 0.3, 0.1] }} transition={{ repeat: Infinity, duration: 4 }} className="absolute top-10 left-10 material-symbols-outlined text-5xl text-primary pointer-events-none">image</motion.span>
            <motion.span animate={{ y: [0, 20, 0], opacity: [0.1, 0.2, 0.1] }} transition={{ repeat: Infinity, duration: 5, delay: 1 }} className="absolute bottom-10 right-20 material-symbols-outlined text-4xl text-secondary pointer-events-none">movie</motion.span>
            <motion.span animate={{ x: [0, 15, 0], opacity: [0.1, 0.4, 0.1] }} transition={{ repeat: Infinity, duration: 3.5, delay: 2 }} className="absolute top-20 right-16 material-symbols-outlined text-3xl text-tertiary pointer-events-none">audio_file</motion.span>

            <div className={"w-20 h-20 rounded-3xl flex items-center justify-center mb-6 transition-colors duration-300 " + (isDragging ? "bg-primary text-on-primary" : "bg-surface-container-high text-primary")}>
              <span className={"material-symbols-outlined text-[40px]"}>upload_file</span>
            </div>
            <h3 className="text-2xl font-bold text-on-surface mb-2">Drag and drop a file to begin</h3>
            <p className="text-base text-on-surface-variant mb-2">We support MP4, AVI, WAV, MP3, JPG, and PNG formats.</p>
            <p className="text-sm font-mono text-on-surface-variant/70 mb-8 bg-surface-container px-3 py-1 rounded-md">Supports images, videos, and audio up to 50MB</p>
            <Button variant="filled" onClick={handleBrowse} className="px-8 py-2 text-lg">Browse Local Files</Button>
            
            <div className="absolute bottom-6 flex items-center gap-2 text-sm text-on-surface-variant">
              <span>Don't have a file?</span>
              <button onClick={loadDemo} className="text-primary hover:underline font-medium focus:outline-none flex items-center gap-1">
                Try with sample <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </motion.div>
      ) : (
        <AnimatePresence>
          {result && !isLoading && (
            <motion.div 
              initial={{ opacity: 0, y: 30 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="flex flex-col gap-12 pb-16 print:gap-8 print:pb-0"
            >
              {/* Print controls */}
              <div className="flex justify-between items-center print:hidden bg-surface-container-low p-4 rounded-3xl shadow-sm border border-outline/10">
                <Button variant="outlined" onClick={reset}>
                  <span className="material-symbols-outlined text-[18px] mr-2">refresh</span>
                  Scan Another
                </Button>
                <Button variant="filled" onClick={handleDownload}>
                  <span className="material-symbols-outlined text-[18px] mr-2">download</span>
                  Download PDF
                </Button>
              </div>

              <div id="forensic-report-content" className="bg-surface rounded-3xl overflow-hidden shadow-sm">
                <ForensicReport 
                  isLoading={isLoading} 
                  result={result} 
                  fileData={{ name: file.name, type: file.type, size: file.size, url: fileUrl }} 
                  fileHash={fileHash} 
                  timestamp={timestamp} 
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

export default function AnalyzePage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center"><LinearProgress /></div>}>
      <AnalyzeContent />
    </React.Suspense>
  );
}
