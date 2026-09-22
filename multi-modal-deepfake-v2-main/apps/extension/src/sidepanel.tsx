import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Dropzone, Card, Button, Chip } from '@repo/ui';
import './index.css';

// ---------------------------------------------------------
// Sub-components
// ---------------------------------------------------------

const SVGScanner = () => (
  <div className="relative w-32 h-32 flex items-center justify-center">
    <svg className="absolute inset-0 w-full h-full animate-spin-slow text-primary/20" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="60 40" />
    </svg>
    <svg className="absolute inset-0 w-full h-full animate-spin text-primary" viewBox="0 0 100 100" style={{ animationDirection: 'reverse', animationDuration: '3s' }}>
      <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="30 70" />
    </svg>
    <span className="material-symbols-outlined text-4xl text-primary animate-pulse">troubleshoot</span>
  </div>
);

const TruthGauge = ({ score, isFake }: { score: number; isFake: boolean }) => {
  const percentage = score * 100;
  const color = isFake ? '#ef4444' : '#10b981';
  
  return (
    <div className="relative w-48 h-24 mx-auto overflow-hidden">
      <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible">
        {/* Background track */}
        <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="currentColor" strokeWidth="8" className="text-surface-container-highest" strokeLinecap="round" />
        {/* Fill track */}
        <motion.path 
          d="M 10 50 A 40 40 0 0 1 90 50" 
          fill="none" 
          stroke={color} 
          strokeWidth="8" 
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: score }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center">
        <span className="text-3xl font-mono font-bold" style={{ color }}>{percentage.toFixed(1)}%</span>
        <span className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase mt-1">Confidence</span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------
// Main App Component
// ---------------------------------------------------------

function SidepanelApp() {
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error' | 'settings'>('idle');
  const [currentScan, setCurrentScan] = useState<{ name: string; file: File | null; url: string | null } | null>(null);
  const [result, setResult] = useState<any>(null);
  const [overlayMode, setOverlayMode] = useState<'fab' | 'in-video'>('in-video');
  const [scanText, setScanText] = useState('Initializing scan...');

  useEffect(() => {
    // Load theme & settings
    const saved = localStorage.getItem("theme");
    if (saved === "light") document.documentElement.classList.replace("dark", "light");
    else document.documentElement.classList.add("dark");

    chrome.storage?.local.get(['overlayMode'], (res: any) => {
      if (res.overlayMode) setOverlayMode(res.overlayMode);
    });

    // Listen to background tasks
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const handleStorage = (scans: string[]) => {
        if (scans && scans.length > 0) {
          const url = scans[0];
          startAnalysis({ name: url.split('/').pop() || 'Web Media', url: url, file: null });
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

  const saveOverlayMode = (mode: 'fab' | 'in-video') => {
    setOverlayMode(mode);
    chrome.storage?.local.set({ overlayMode: mode });
  };

  const startAnalysis = async (scan: { name: string; file: File | null; url: string | null }) => {
    setCurrentScan(scan);
    setStatus('processing');
    
    const texts = ["Extracting metadata...", "Analyzing visual artifacts...", "Running audio forensics...", "Fusing modalities..."];
    let step = 0;
    const interval = setInterval(() => {
      if (step < texts.length) setScanText(texts[step++]);
    }, 800);
    
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
      
      clearInterval(interval);
      if (!response.ok) throw new Error('API Error');
      const data = await response.json();
      
      setResult(data);
      setCurrentScan({ ...scan, result: data });
      setTimeout(() => setStatus('done'), 1500);
      
      // Save to cloud sync
      chrome.runtime?.sendMessage({
        action: "forward_save_scan",
        payload: {
          fileData: { name: scan.name, type: fileToUpload.type, size: fileToUpload.size },
          result: data,
          hash: "ext-" + Date.now()
        }
      });
    } catch (err) {
      clearInterval(interval);
      setStatus('error');
    }
  };

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.contains("dark");
    const next = isDark ? "light" : "dark";
    if (isDark) document.documentElement.classList.replace("dark", "light");
    else {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
    }
    localStorage.setItem("theme", next);
  };

  const viewWebReport = () => {
    if (!currentScan) return;
    chrome.storage.local.set({ pending_web_report: { url: currentScan.url, result: currentScan.result, name: currentScan.name } }, () => {
        chrome.tabs.create({ url: `http://localhost:3000/analyze?from_ext=true` });
    });
  };

  const pageVariants = {
    initial: { opacity: 0, y: 10, scale: 0.98 },
    in: { opacity: 1, y: 0, scale: 1 },
    out: { opacity: 0, y: -10, scale: 0.98 }
  };

  const pageTransition = { type: "tween", ease: "anticipate", duration: 0.3 };

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col font-[Inter,system-ui,sans-serif] overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-outline-variant/20 bg-surface/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">policy</span>
          <span className="text-primary font-bold tracking-wider text-sm">VERITAS AI</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setStatus(status === 'settings' ? 'idle' : 'settings')} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-on-surface/10 transition-colors text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px]">settings</span>
          </button>
          <button onClick={toggleTheme} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-on-surface/10 transition-colors text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px]">contrast</span>
          </button>
        </div>
      </div>

      <div className="flex-1 relative">
        <AnimatePresence mode="wait">
          
          {/* Settings State */}
          {status === 'settings' && (
            <motion.div key="settings" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="p-4 flex flex-col gap-6">
              <div>
                <h2 className="text-lg font-semibold mb-1">Preferences</h2>
                <p className="text-xs text-on-surface-variant">Customize how Veritas AI integrates with the web.</p>
              </div>
              
              <div className="flex flex-col gap-3">
                <label className="text-sm font-medium">Web Overlay Style</label>
                
                <div onClick={() => saveOverlayMode('in-video')} className={`p-4 border rounded-xl cursor-pointer transition-all ${overlayMode === 'in-video' ? 'border-primary bg-primary/10' : 'border-outline-variant hover:border-on-surface/30'}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-sm">In-Video Overlay</span>
                    {overlayMode === 'in-video' && <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>}
                  </div>
                  <p className="text-xs text-on-surface-variant">Attaches directly to video players (Twitter, YouTube). Best for social media.</p>
                </div>
                
                <div onClick={() => saveOverlayMode('fab')} className={`p-4 border rounded-xl cursor-pointer transition-all ${overlayMode === 'fab' ? 'border-primary bg-primary/10' : 'border-outline-variant hover:border-on-surface/30'}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-sm">Floating Action Button</span>
                    {overlayMode === 'fab' && <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>}
                  </div>
                  <p className="text-xs text-on-surface-variant">A persistent floating button on the edge of your screen. Works on any page.</p>
                </div>
              </div>
              
              <Button variant="filled" onClick={() => setStatus('idle')} className="mt-4">Save & Close</Button>
            </motion.div>
          )}

          {/* Idle State */}
          {status === 'idle' && (
            <motion.div key="idle" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="p-4 flex flex-col gap-6">
              
              <div className="flex flex-col items-center justify-center pt-8 pb-4 text-center">
                <div className="w-20 h-20 bg-primary-container text-on-primary-container rounded-full flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-[40px]">shield_person</span>
                </div>
                <h2 className="text-xl font-bold mb-2">Ready to verify.</h2>
                <p className="text-sm text-on-surface-variant px-4">
                  Protect yourself from synthetic media. Right-click any image or video on the web to scan it instantly.
                </p>
              </div>

              <div className="relative">
                <Dropzone onFileDrop={(file) => startAnalysis({ name: file.name, file, url: null })} title="Drop Media Here" subtitle="Images, Audio, Video" multiple={false} />
              </div>
              
            </motion.div>
          )}

          {/* Processing State */}
          {status === 'processing' && (
            <motion.div key="processing" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="absolute inset-0 flex flex-col items-center justify-center p-4">
              <SVGScanner />
              <div className="mt-8 flex flex-col items-center gap-2">
                <span className="font-medium text-lg text-on-surface">Analyzing Media</span>
                <span className="text-sm text-primary font-mono bg-primary/10 px-3 py-1 rounded-full animate-pulse">{scanText}</span>
              </div>
            </motion.div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <motion.div key="error" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="p-4 flex flex-col items-center justify-center min-h-[400px] text-center">
              <div className="w-16 h-16 bg-error-container text-on-error-container rounded-full flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[32px]">cloud_off</span>
              </div>
              <h3 className="font-bold text-lg mb-1">Analysis Failed</h3>
              <p className="text-sm text-on-surface-variant mb-6">We couldn't connect to the Veritas Engine. Make sure the API is online.</p>
              <Button variant="tonal" onClick={() => setStatus('idle')}>Go Back</Button>
            </motion.div>
          )}

          {/* Done State */}
          {status === 'done' && result && (
            <motion.div key="done" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="p-4 flex flex-col gap-4 pb-8">
              
              <div className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/30 flex flex-col items-center">
                <Chip 
                  label={result.is_fake ? "HIGH RISK" : "AUTHENTIC"} 
                  icon={result.is_fake ? "warning" : "verified_user"}
                  variant={result.is_fake ? "filter" : "assist"}
                  className={`mb-6 !h-8 !px-4 !text-xs font-bold tracking-widest ${result.is_fake ? '!bg-error !text-on-error !border-error ring-2 ring-error/20' : '!bg-primary !text-on-primary !border-primary ring-2 ring-primary/20'}`}
                />
                
                <TruthGauge score={result.confidence} isFake={result.is_fake} />
              </div>

              <Card variant="elevated" className="flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-outline-variant/20 pb-3">
                  <span className="text-sm font-semibold">Forensic Breakdown</span>
                </div>
                
                <div className="flex flex-col gap-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-on-surface-variant">Vision Model</span>
                      <span className="font-mono font-bold">{(result.breakdown.visual_score * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: `${result.breakdown.visual_score * 100}%` }} 
                        className={`h-full ${result.breakdown.visual_score > 0.5 ? 'bg-error' : 'bg-primary'}`} 
                      />
                    </div>
                  </div>
                  
                  {result.breakdown.audio_score !== null && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-on-surface-variant">Audio Model</span>
                        <span className="font-mono font-bold">{(result.breakdown.audio_score * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }} 
                          animate={{ width: `${result.breakdown.audio_score * 100}%` }} 
                          className={`h-full ${result.breakdown.audio_score > 0.5 ? 'bg-error' : 'bg-primary'}`} 
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                {result.heatmap && (
                  <div className="mt-2 group relative cursor-pointer overflow-hidden rounded-xl border border-outline-variant/30">
                    <img src={"data:image/png;base64," + result.heatmap} className="w-full h-24 object-cover transition-transform duration-300 group-hover:scale-110" alt="Heatmap Thumbnail" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white text-xs font-semibold tracking-widest uppercase flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">zoom_in</span> Heatmap
                      </span>
                    </div>
                  </div>
                )}
              </Card>
              
              <Button 
                variant="filled" 
                onClick={viewWebReport} 
                className="w-full mt-2 group relative overflow-hidden"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                  View Detailed Web Report
                </span>
              </Button>
              <Button variant="text" onClick={() => setStatus('idle')} className="w-full text-on-surface-variant hover:text-on-surface">
                Dismiss
              </Button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <SidepanelApp />
  </React.StrictMode>
);
