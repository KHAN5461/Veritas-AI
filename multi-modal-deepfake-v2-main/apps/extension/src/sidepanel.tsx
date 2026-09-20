import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Card, CircularProgress, Button, Dropzone, Chip } from '@repo/ui';
import './index.css';

// Add chrome ambient declaration
declare var chrome: any;

function SidepanelApp() {
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle');
  const [currentScan, setCurrentScan] = useState<{ name: string; file: File | null; url: string | null } | null>(null);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light") {
      document.documentElement.classList.replace("dark", "light");
    } else {
      document.documentElement.classList.add("dark");
    }

    if (typeof chrome !== 'undefined' && chrome.storage) {
      const handleStorage = (scans: string[]) => {
        if (scans && scans.length > 0) {
          const url = scans[0]; // Only take the first one
          startAnalysis({
            name: url.split('/').pop() || 'Web Media',
            url: url,
            file: null
          });
          chrome.storage.local.set({ pendingScans: [] });
        }
      };

      chrome.storage.onChanged.addListener((changes: any) => {
        if (changes.pendingScans && changes.pendingScans.newValue) {
          handleStorage(changes.pendingScans.newValue);
        }
      });

      chrome.storage.local.get(['pendingScans'], (res: any) => {
        if (res.pendingScans) handleStorage(res.pendingScans);
      });
    }
  }, []);

  const handleDrop = async (file: File) => {
    startAnalysis({ name: file.name, file, url: null });
  };

  const startAnalysis = async (scan: { name: string; file: File | null; url: string | null }) => {
    setCurrentScan(scan);
    setStatus('processing');
    
    try {
      let fileToUpload = scan.file;
      
      if (!fileToUpload && scan.url) {
        const res = await fetch(scan.url);
        const blob = await res.blob();
        fileToUpload = new File([blob], scan.name, { type: blob.type });
      }
      
      if (!fileToUpload) throw new Error("No file");

      const formData = new FormData();
      formData.append('file', fileToUpload);
      
      const response = await fetch('https://upside-shower-handling.ngrok-free.dev/detect', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('API Error');
      const data = await response.json();
      
      setResult(data);
      setStatus('done');
    } catch (err) {
      setStatus('error');
    }
  };

  const reset = () => {
    setStatus('idle');
    setResult(null);
    setCurrentScan(null);
  };

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.contains("dark");
    const next = isDark ? "light" : "dark";
    if (isDark) {
      document.documentElement.classList.replace("dark", "light");
    } else {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
    }
    localStorage.setItem("theme", next);
  };

  return (
    <div className="bg-surface text-on-surface min-h-screen p-4 flex flex-col gap-4 font-[Inter,system-ui,sans-serif]">
      <div className="flex items-center justify-between mb-4">
        <span className="text-primary font-bold tracking-wider">VERITAS AI</span>
        <button onClick={toggleTheme} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-on-surface/10 transition-colors text-on-surface-variant cursor-pointer">
          <span className="material-symbols-outlined text-[18px]">contrast</span>
        </button>
      </div>

      {status === 'idle' && (
        <div className="flex flex-col gap-4 animate-in fade-in zoom-in-95">
          <Dropzone 
            onFileDrop={handleDrop} 
            title="Drop Media" 
            subtitle="Images, Audio, Video" 
            multiple={false}
          />
          <div className="text-xs text-on-surface-variant text-center mt-2 px-4">
            You can also right-click any image/video on the web and select "Scan with Veritas AI".
          </div>
        </div>
      )}

      {status === 'processing' && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 animate-in fade-in">
          <CircularProgress />
          <span className="text-sm font-medium animate-pulse">Analyzing {currentScan?.name}...</span>
        </div>
      )}

      {status === 'error' && (
        <Card className="flex flex-col items-center justify-center py-12 gap-4 text-center animate-in fade-in slide-in-from-bottom-4">
          <span className="material-symbols-outlined text-error text-[48px]">error</span>
          <div>
            <h3 className="font-semibold text-lg text-on-surface">Analysis Failed</h3>
            <p className="text-sm text-on-surface-variant mt-1">Make sure the ngrok API tunnel is active</p>
          </div>
          <Button variant="tonal" onClick={reset} className="mt-2">Try Again</Button>
        </Card>
      )}

      {status === 'done' && result && (
        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 pb-4">
          <div className="flex justify-between items-center px-1">
            <span className="font-medium text-sm truncate max-w-[200px] text-on-surface-variant" title={currentScan?.name}>
              {currentScan?.name}
            </span>
            <button onClick={reset} className="text-xs text-primary font-medium hover:underline cursor-pointer">
              Scan Another
            </button>
          </div>

          <Card variant="elevated" className="flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className={"w-10 h-10 rounded-full flex items-center justify-center shrink-0 " + (result.is_fake ? "bg-error-container text-on-error-container" : "bg-primary-container text-on-primary-container")}>
                  <span className="material-symbols-outlined">{result.is_fake ? "warning" : "verified_user"}</span>
                </div>
                <span className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">AI Confidence</span>
              </div>
              <Chip
                label={result.is_fake ? "FAKE" : "REAL"}
                variant={result.is_fake ? 'filter' : 'assist'}
                icon={result.is_fake ? "gpp_bad" : "gpp_good"}
                className={"shrink-0 !h-7 !text-xs " + (result.is_fake ? '!bg-error !text-on-error !border-error ring-1 ring-error/20' : '')}
              />
            </div>
            
            <div className={"text-5xl font-bold font-mono tracking-tight " + (result.is_fake ? 'text-error' : 'text-primary')}>
              {(result.confidence * 100).toFixed(1)}%
            </div>

            <div className="flex flex-col gap-2 mt-2 pt-3 border-t border-outline-variant/30 text-xs">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Vision Model</span>
                <span className="font-mono text-on-surface">{(result.breakdown.visual_score * 100).toFixed(1)}%</span>
              </div>
              {result.breakdown.audio_score !== null && (
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Audio Model</span>
                  <span className="font-mono text-on-surface">{(result.breakdown.audio_score * 100).toFixed(1)}%</span>
                </div>
              )}
            </div>
            
            {result.heatmap && (
              <img src={"data:image/png;base64," + result.heatmap} className="w-full h-32 object-cover rounded-xl mt-2" alt="Heatmap" />
            )}
            
            <Button variant="filled" onClick={() => window.open('https://upside-shower-handling.ngrok-free.dev/docs', '_blank')} className="w-full mt-2">
              View Detailed Report
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <SidepanelApp />
  </React.StrictMode>
);
