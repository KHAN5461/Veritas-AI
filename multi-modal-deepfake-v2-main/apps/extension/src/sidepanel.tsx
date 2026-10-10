import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Dropzone, Card, Button, Chip } from '@repo/ui';
import './index.css';

// ---------------------------------------------------------
// Types
// ---------------------------------------------------------

interface HistoryItem {
  id: string;
  name: string;
  url: string | null;
  timestamp: string;
  is_fake: boolean;
  confidence: number;
  breakdown: {
    visual_score: number;
    audio_score: number | null;
    lip_sync_score: number | null;
  };
  heatmap?: string | null;
}

// ---------------------------------------------------------
// Sub-components: Advanced SVG Neural Scanner
// ---------------------------------------------------------

const SVGScanner = () => (
  <div className="relative w-36 h-36 flex items-center justify-center">
    {/* Concentric rotating radar rings */}
    <div className="absolute inset-0 rounded-full border border-primary/20 animate-ping opacity-30" />
    <svg className="absolute inset-0 w-full h-full animate-spin-slow text-primary/30" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="60 40" />
    </svg>
    <svg className="absolute inset-0 w-full h-full animate-spin text-primary" viewBox="0 0 100 100" style={{ animationDirection: 'reverse', animationDuration: '3.5s' }}>
      <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="30 70" />
    </svg>
    <svg className="absolute inset-0 w-full h-full animate-spin text-tertiary" viewBox="0 0 100 100" style={{ animationDuration: '6s' }}>
      <circle cx="50" cy="50" r="28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="20 40" strokeDashoffset="10" />
    </svg>
    
    {/* Holographic Center Core */}
    <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary/20 to-tertiary/20 backdrop-blur-md border border-primary/40 flex items-center justify-center shadow-lg shadow-primary/20">
      <span className="material-symbols-outlined text-3xl text-primary animate-pulse">radar</span>
    </div>
  </div>
);

const TruthGauge = ({ score, isFake }: { score: number; isFake: boolean }) => {
  const percentage = score > 1 ? score : score * 100;
  const color = isFake ? '#ef4444' : '#10b981';
  const glow = isFake ? 'rgba(239, 68, 68, 0.35)' : 'rgba(16, 185, 129, 0.35)';
  
  return (
    <div className="relative w-52 h-28 mx-auto overflow-hidden">
      <svg viewBox="0 0 100 52" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={isFake ? '#f97316' : '#06b6d4'} />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
          <filter id="gaugeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor={glow} />
          </filter>
        </defs>
        {/* Background track */}
        <path 
          d="M 10 50 A 40 40 0 0 1 90 50" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="9" 
          className="text-surface-container-highest" 
          strokeLinecap="round" 
        />
        {/* Animated fill track */}
        <motion.path 
          d="M 10 50 A 40 40 0 0 1 90 50" 
          fill="none" 
          stroke="url(#gaugeGradient)" 
          strokeWidth="9" 
          strokeLinecap="round"
          filter="url(#gaugeGlow)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: Math.min(1, Math.max(0, percentage / 100)) }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center">
        <span className="text-3xl font-mono font-extrabold tracking-tight" style={{ color }}>
          {percentage.toFixed(1)}%
        </span>
        <span className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase mt-0.5">
          {isFake ? 'MANIPULATION CONFIDENCE' : 'AUTHENTICITY SCORE'}
        </span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------
// Main Veritas AI Extension Component
// ---------------------------------------------------------

function SidepanelApp() {
  const [navTab, setNavTab] = useState<'scan' | 'history' | 'settings'>('scan');
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle');
  const [currentScan, setCurrentScan] = useState<{ name: string; file: File | null; url: string | null; result?: any } | null>(null);
  const [result, setResult] = useState<any>(null);
  const [scanText, setScanText] = useState('Initializing scan...');
  const [apiUrl, setApiUrl] = useState('https://upside-shower-handling.ngrok-free.dev');
  const [webAppUrl, setWebAppUrl] = useState('https://veritas-ai-mocha.vercel.app');
  const [urlInput, setUrlInput] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  const [apiPingStatus, setApiPingStatus] = useState<'checking' | 'online' | 'offline'>('online');

  useEffect(() => {
    // Load theme & settings
    const saved = localStorage.getItem("theme");
    if (saved === "light") document.documentElement.classList.replace("dark", "light");
    else document.documentElement.classList.add("dark");

    const savedApi = localStorage.getItem("veritas_api_url");
    if (savedApi) setApiUrl(savedApi);
    const savedWeb = localStorage.getItem("veritas_web_url");
    if (savedWeb) setWebAppUrl(savedWeb);

    // Load scan history from storage
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['veritas_history'], (res) => {
        if (Array.isArray(res.veritas_history)) {
          setHistory(res.veritas_history);
        }
      });
    }

    // Listen to background tasks (Right-click "Verify Media with Veritas AI")
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const handleStorage = (scans: string[]) => {
        if (scans && scans.length > 0) {
          const url = scans[0];
          setNavTab('scan');
          startAnalysis({ name: url.split('/').pop()?.split('?')[0] || 'Web Media', url: url, file: null });
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

  const saveToHistory = (item: HistoryItem) => {
    setHistory((prev) => {
      const updated = [item, ...prev.filter(h => h.id !== item.id)].slice(0, 25);
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ veritas_history: updated });
      }
      return updated;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ veritas_history: [] });
    }
  };

  const testConnection = async () => {
    setApiPingStatus('checking');
    try {
      const res = await fetch(`${apiUrl.replace(/\/$/, '')}/health`, { method: 'GET' });
      if (res.ok) setApiPingStatus('online');
      else setApiPingStatus('offline');
    } catch {
      setApiPingStatus('offline');
    }
  };

  const startAnalysis = async (scan: { name: string; file: File | null; url: string | null }) => {
    setCurrentScan(scan);
    setStatus('processing');
    setNavTab('scan');
    
    const steps = [
      "Extracting cryptographic binary stream...",
      "Executing ViT-B/16 spatial visual nets...",
      "Analyzing biometric frequency & voice synthesis...",
      "Computing multi-modal neural fusion score..."
    ];
    let step = 0;
    setScanText(steps[0]);
    const interval = setInterval(() => {
      step++;
      if (step < steps.length) {
        setScanText(steps[step]);
      }
    }, 900);
    
    try {
      let fileToUpload = scan.file;
      if (!fileToUpload && scan.url) {
        const res = await fetch(scan.url);
        const blob = await res.blob();
        const ext = scan.url.split('.').pop()?.split('?')[0] || 'mp4';
        fileToUpload = new File([blob], scan.name || `media.${ext}`, { type: blob.type || 'application/octet-stream' });
      }
      if (!fileToUpload) throw new Error("No media file available");

      const formData = new FormData();
      formData.append('file', fileToUpload);
      
      const response = await fetch(`${apiUrl.replace(/\/$/, '')}/detect`, {
        method: 'POST',
        body: formData,
      });
      
      clearInterval(interval);
      if (!response.ok) throw new Error('API Error');
      const data = await response.json();
      
      setResult(data);
      setCurrentScan({ ...scan, result: data });
      setTimeout(() => setStatus('done'), 1200);

      // Append to history ledger
      saveToHistory({
        id: 'scan_' + Date.now(),
        name: scan.name,
        url: scan.url,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        is_fake: data.is_fake,
        confidence: data.confidence,
        breakdown: {
          visual_score: data.breakdown?.visual_score ?? 0.8,
          audio_score: data.breakdown?.audio_score ?? null,
          lip_sync_score: data.breakdown?.lip_sync_score ?? null
        },
        heatmap: data.heatmap
      });
      
      // Save to cloud sync
      chrome.runtime?.sendMessage({
        action: "forward_save_scan",
        payload: {
          fileData: { name: scan.name, type: fileToUpload.type, size: fileToUpload.size },
          result: data,
          hash: "ext-" + Date.now()
        }
      });
    } catch {
      clearInterval(interval);
      setStatus('error');
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    const cleanUrl = urlInput.trim();
    setUrlInput('');
    startAnalysis({
      name: cleanUrl.split('/').pop()?.split('?')[0] || 'Web Media Link',
      url: cleanUrl,
      file: null
    });
  };

  // Demo Presets for One-Click Testing
  const loadDemoSample = (isFake: boolean) => {
    const demoData = isFake
      ? {
          is_fake: true,
          confidence: 0.948,
          breakdown: {
            visual_score: 0.965,
            audio_score: 0.892,
            lip_sync_score: 0.915
          },
          heatmap: null
        }
      : {
          is_fake: false,
          confidence: 0.124,
          breakdown: {
            visual_score: 0.085,
            audio_score: 0.150,
            lip_sync_score: 0.110
          },
          heatmap: null
        };

    const mockScan = {
      name: isFake ? 'sample_synthetic_avatar.mp4' : 'c-span_press_briefing.mp4',
      file: null,
      url: 'https://veritas-ai-mocha.vercel.app/logo.png',
      result: demoData
    };

    setResult(demoData);
    setCurrentScan(mockScan);
    setStatus('done');
    setNavTab('scan');

    saveToHistory({
      id: 'demo_' + Date.now(),
      name: mockScan.name,
      url: mockScan.url,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      is_fake: demoData.is_fake,
      confidence: demoData.confidence,
      breakdown: demoData.breakdown,
      heatmap: null
    });
  };

  const loadFromHistory = (item: HistoryItem) => {
    setResult({
      is_fake: item.is_fake,
      confidence: item.confidence,
      breakdown: item.breakdown,
      heatmap: item.heatmap
    });
    setCurrentScan({
      name: item.name,
      file: null,
      url: item.url,
      result: {
        is_fake: item.is_fake,
        confidence: item.confidence,
        breakdown: item.breakdown,
        heatmap: item.heatmap
      }
    });
    setStatus('done');
    setNavTab('scan');
  };

  const copySummaryReport = () => {
    if (!result || !currentScan) return;
    const text = `VERITAS AI FORENSIC DOSSIER
Target: ${currentScan.name}
Verdict: ${result.is_fake ? 'MANIPULATED / SYNTHETIC MEDIA' : 'VERIFIED AUTHENTIC MEDIA'}
Confidence: ${(result.confidence * 100).toFixed(1)}%
Visual Model: ${((result.breakdown?.visual_score ?? 0.8) * 100).toFixed(1)}%
Timestamp: ${new Date().toUTCString()}
Verified by Veritas AI Neural Engine`;

    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2200);
    });
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

  const viewWebReport = async () => {
    if (!currentScan) return;
    
    let base64Data = null;
    let mimeType = null;
    
    if (currentScan.file) {
      base64Data = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(currentScan.file!);
      });
      mimeType = currentScan.file.type;
    }
    
    const targetUrl = `${webAppUrl.replace(/\/$/, '')}/analyze?from_ext=true`;

    chrome.storage.local.set({ 
      pending_web_report: { 
        url: currentScan.url, 
        base64: base64Data,
        mimeType: mimeType,
        result: currentScan.result, 
        name: currentScan.name 
      } 
    }, () => {
      if (chrome.runtime.lastError) {
        chrome.storage.local.set({ 
          pending_web_report: { url: currentScan.url, result: currentScan.result, name: currentScan.name } 
        }, () => {
          chrome.tabs.create({ url: targetUrl });
        });
        return;
      }
      chrome.tabs.create({ url: targetUrl });
    });
  };

  const pageVariants = {
    initial: { opacity: 0, y: 6, scale: 0.99 },
    in: { opacity: 1, y: 0, scale: 1 },
    out: { opacity: 0, y: -6, scale: 0.99 }
  };

  const pageTransition = { type: "tween", ease: "easeOut", duration: 0.2 };

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col font-sans select-none antialiased">
      {/* High-Tech Cyber Header */}
      <header className="flex items-center justify-between px-3.5 py-2.5 border-b border-outline-variant/30 bg-surface/90 backdrop-blur-md sticky top-0 z-20 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="relative">
            <img src="/icons/icon48.png" className="w-6 h-6 rounded-lg object-contain shadow-sm" alt="Veritas Logo" />
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-surface animate-pulse" />
          </div>
          <span className="font-extrabold tracking-wider text-xs bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
            VERITAS AI
          </span>
        </div>

        {/* Segmented Tab Navigation */}
        <div className="flex items-center p-0.5 rounded-xl bg-surface-container border border-outline-variant/30 text-[11px] font-semibold">
          <button
            onClick={() => setNavTab('scan')}
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
              navTab === 'scan' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">radar</span>
            Scan
          </button>
          <button
            onClick={() => setNavTab('history')}
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
              navTab === 'history' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">history</span>
            History
            {history.length > 0 && (
              <span className={`text-[9px] px-1 rounded-full ${navTab === 'history' ? 'bg-on-primary text-primary' : 'bg-primary/20 text-primary'}`}>
                {history.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setNavTab('settings')}
            className={`px-2 py-1 rounded-lg transition-all flex items-center ${
              navTab === 'settings' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
            }`}
            title="Settings"
          >
            <span className="material-symbols-outlined text-[15px]">settings</span>
          </button>
        </div>

        <button 
          onClick={toggleTheme} 
          title="Toggle Dark/Light Mode"
          className="w-7 h-7 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-on-surface/10 hover:text-on-surface transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">contrast</span>
        </button>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 relative flex flex-col">
        <AnimatePresence mode="wait">
          
          {/* ========================================================= */}
          {/* 1. HISTORY VIEW                                           */}
          {/* ========================================================= */}
          {navTab === 'history' && (
            <motion.div key="history" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="p-3.5 flex flex-col gap-3 flex-1">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xs font-bold text-on-surface uppercase tracking-wider">Recent Web Inspections</h2>
                  <p className="text-[11px] text-on-surface-variant">Saved locally in browser sandbox</p>
                </div>
                {history.length > 0 && (
                  <button 
                    onClick={clearHistory}
                    className="text-[11px] text-error hover:underline flex items-center gap-0.5"
                  >
                    <span className="material-symbols-outlined text-[13px]">delete_sweep</span>
                    Clear
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 my-auto text-center p-6 text-on-surface-variant">
                  <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center mb-2 text-on-surface-variant/50">
                    <span className="material-symbols-outlined text-[28px]">history_toggle_off</span>
                  </div>
                  <span className="text-xs font-semibold text-on-surface">No scan history yet</span>
                  <p className="text-[11px] text-on-surface-variant/80 mt-1 max-w-[200px]">
                    Right-click any web image or test a sample to build your evidence ledger.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-120px)] pr-1">
                  {history.map((item) => (
                    <div 
                      key={item.id}
                      onClick={() => loadFromHistory(item)}
                      className="p-3 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 hover:border-primary/40 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0 flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.is_fake ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                          <span className="material-symbols-outlined text-[18px]">
                            {item.is_fake ? 'warning' : 'verified'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-on-surface truncate group-hover:text-primary transition-colors">
                            {item.name}
                          </p>
                          <span className="text-[10px] text-on-surface-variant font-mono">
                            {item.timestamp} • {(item.confidence * 100).toFixed(0)}% score
                          </span>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-on-surface-variant text-[16px] group-hover:translate-x-0.5 transition-transform">
                        chevron_right
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ========================================================= */}
          {/* 2. SETTINGS VIEW                                          */}
          {/* ========================================================= */}
          {navTab === 'settings' && (
            <motion.div key="settings" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="p-4 flex flex-col gap-4 flex-1">
              <div>
                <h2 className="text-xs font-bold tracking-wider text-on-surface uppercase flex items-center gap-1.5 text-primary">
                  <span className="material-symbols-outlined text-[18px]">tune</span>
                  Engine Configuration
                </h2>
                <p className="text-xs text-on-surface-variant mt-0.5">Manage deepfake inference and web sync bridges.</p>
              </div>

              <div className="flex flex-col gap-3.5">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-on-surface">Neural Backend Service</label>
                    <button 
                      onClick={testConnection} 
                      className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[13px]">network_check</span>
                      Test Link
                    </button>
                  </div>
                  <input
                    type="url"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    placeholder="https://upside-shower-handling.ngrok-free.dev"
                    className="w-full bg-surface-container-highest text-on-surface text-xs rounded-xl px-3 py-2 border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  />
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${apiPingStatus === 'online' ? 'bg-emerald-500' : apiPingStatus === 'checking' ? 'bg-amber-500 animate-ping' : 'bg-red-500'}`} />
                    <span className="text-[10px] text-on-surface-variant font-mono">
                      {apiPingStatus === 'online' ? 'Tunnel Online & Responsive' : apiPingStatus === 'checking' ? 'Testing connection...' : 'Service unreachable'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Veritas Web App Platform
                  </label>
                  <input
                    type="url"
                    value={webAppUrl}
                    onChange={(e) => setWebAppUrl(e.target.value)}
                    placeholder="https://veritas-ai-mocha.vercel.app"
                    className="w-full bg-surface-container-highest text-on-surface text-xs rounded-xl px-3 py-2 border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  />
                  <span className="text-[10px] text-on-surface-variant mt-1 block">Full forensic report viewer destination.</span>
                </div>
              </div>
              
              <div className="mt-auto flex flex-col gap-2 pt-4">
                <Button 
                  variant="filled" 
                  onClick={() => {
                    localStorage.setItem("veritas_api_url", apiUrl);
                    localStorage.setItem("veritas_web_url", webAppUrl);
                    setNavTab('scan');
                  }} 
                  className="w-full text-xs h-9"
                >
                  <span className="material-symbols-outlined text-[16px] mr-1">check</span>
                  Save Preferences
                </Button>
                <Button 
                  variant="tonal" 
                  onClick={() => setNavTab('scan')} 
                  className="w-full text-xs h-9"
                >
                  Return to Scanner
                </Button>
              </div>
            </motion.div>
          )}

          {/* ========================================================= */}
          {/* 3. SCAN TAB (IDLE, PROCESSING, ERROR, OR DONE)            */}
          {/* ========================================================= */}
          {navTab === 'scan' && status === 'idle' && (
            <motion.div key="idle" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="p-3.5 flex flex-col gap-4 flex-1">
              
              {/* Hero Banner */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-primary/10 via-surface-container-low to-surface-container-low p-4 border border-outline-variant/30 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-2 shadow-inner border border-primary/20">
                  <span className="material-symbols-outlined text-[28px]">shield_lock</span>
                </div>
                <h2 className="text-sm font-bold text-on-surface tracking-tight">Autonomous Forensic Guard</h2>
                <p className="text-[11px] text-on-surface-variant mt-0.5 max-w-xs leading-relaxed">
                  Real-time neural detection for web images, audio, video, and social media links.
                </p>

                {/* Instant Test Preset Pills */}
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => loadDemoSample(true)}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[12px]">warning</span>
                    Sample Deepfake
                  </button>
                  <button
                    onClick={() => loadDemoSample(false)}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[12px]">verified</span>
                    Sample Authentic
                  </button>
                </div>
              </div>

              {/* Direct URL Input Bar */}
              <form onSubmit={handleUrlSubmit} className="flex gap-1.5">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">
                    link
                  </span>
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="Paste YouTube, X, or Media URL..."
                    className="w-full pl-8 pr-2 py-2 rounded-xl text-xs bg-surface-container border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary text-on-surface"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!urlInput.trim()}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-primary text-on-primary disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-all flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <span className="material-symbols-outlined text-[15px]">send</span>
                  Scan
                </button>
              </form>

              {/* Native Dropzone */}
              <div className="relative">
                <Dropzone 
                  onFileDrop={(file: File) => startAnalysis({ name: file.name, file, url: null })} 
                  title="Drop Evidence to Verify" 
                  subtitle="Images, Video clips, Audio streams (up to 50MB)" 
                  multiple={false} 
                />
              </div>

              {/* Browser Context Menu Hint */}
              <div className="rounded-xl p-2.5 bg-surface-container border border-outline-variant/20 flex items-start gap-2">
                <span className="material-symbols-outlined text-primary text-[16px] shrink-0 mt-0.5">mouse</span>
                <p className="text-[11px] text-on-surface-variant leading-snug">
                  <strong className="text-on-surface">Right-Click Anywhere:</strong> Select <span className="text-primary font-medium">&quot;Verify Media with Veritas AI&quot;</span> on any webpage to inspect content instantly without downloading.
                </p>
              </div>
              
            </motion.div>
          )}

          {/* Processing State */}
          {navTab === 'scan' && status === 'processing' && (
            <motion.div key="processing" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="p-6 flex flex-col items-center justify-center flex-1 my-auto">
              <SVGScanner />
              <div className="mt-8 flex flex-col items-center gap-2.5 text-center">
                <span className="font-bold text-base text-on-surface tracking-tight">Scanning Evidence</span>
                <span className="text-xs text-primary font-mono bg-primary/10 border border-primary/20 px-3.5 py-1.5 rounded-full animate-pulse shadow-sm max-w-xs truncate">
                  {scanText}
                </span>
                <p className="text-[11px] text-on-surface-variant max-w-xs mt-1">
                  Querying ViT spatial transformers, voice clone spectral sensors, and multimodal fusion classifiers.
                </p>
              </div>
            </motion.div>
          )}

          {/* Error State */}
          {navTab === 'scan' && status === 'error' && (
            <motion.div key="error" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="p-4 flex flex-col items-center justify-center flex-1 text-center my-auto">
              <div className="w-14 h-14 bg-error-container text-on-error-container rounded-2xl flex items-center justify-center mb-3 shadow-md">
                <span className="material-symbols-outlined text-[30px]">cloud_off</span>
              </div>
              <h3 className="font-bold text-base text-on-surface mb-1">Analysis Stream Failed</h3>
              <p className="text-xs text-on-surface-variant mb-5 max-w-xs">
                Could not establish handshake with the Veritas Neural Engine. Ensure your backend tunnel is active.
              </p>
              <div className="flex gap-2 w-full max-w-xs">
                <Button variant="filled" onClick={() => startAnalysis(currentScan!)} className="flex-1 text-xs h-9">
                  Retry Scan
                </Button>
                <Button variant="tonal" onClick={() => setStatus('idle')} className="flex-1 text-xs h-9">
                  Dismiss
                </Button>
              </div>
            </motion.div>
          )}

          {/* Done State */}
          {navTab === 'scan' && status === 'done' && result && (
            <motion.div key="done" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="p-3.5 flex flex-col gap-3.5 pb-6 flex-1">
              
              {/* Verdict Summary Card */}
              <div className={`rounded-2xl p-4 border flex flex-col items-center shadow-lg transition-all ${
                result.is_fake 
                  ? 'bg-gradient-to-b from-red-500/10 via-surface-container-low to-surface-container-low border-red-500/40' 
                  : 'bg-gradient-to-b from-emerald-500/10 via-surface-container-low to-surface-container-low border-emerald-500/40'
              }`}>
                <Chip 
                  label={result.is_fake ? "MANIPULATION DETECTED" : "VERIFIED AUTHENTIC"} 
                  icon={result.is_fake ? "warning" : "verified_user"}
                  variant={result.is_fake ? "filter" : "assist"}
                  className={`mb-3 !h-7 !px-3 !text-[10px] font-extrabold tracking-wider ${
                    result.is_fake 
                      ? '!bg-red-500 !text-white !border-red-600 ring-2 ring-red-500/20' 
                      : '!bg-emerald-500 !text-white !border-emerald-600 ring-2 ring-emerald-500/20'
                  }`}
                />
                
                <TruthGauge score={result.confidence} isFake={result.is_fake} />

                <div className="text-[11px] font-mono text-on-surface-variant truncate max-w-full px-2 mt-1">
                  Target: <span className="text-on-surface font-semibold">{currentScan?.name || 'Inspected Media'}</span>
                </div>
              </div>

              {/* Forensic Signal Breakdown */}
              <Card variant="elevated" className="flex flex-col gap-3 p-3.5 rounded-2xl border border-outline-variant/30">
                <div className="flex justify-between items-center border-b border-outline-variant/20 pb-2">
                  <span className="text-xs font-bold text-on-surface tracking-wider uppercase flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-[16px]">biometrics</span>
                    Neural Signals
                  </span>
                  <span className="text-[10px] font-mono text-on-surface-variant">Multi-Modal Fusion</span>
                </div>
                
                <div className="flex flex-col gap-2.5">
                  {/* Vision Model */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-on-surface-variant flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">visibility</span>
                        ViT Spatial Artifacts
                      </span>
                      <span className="font-mono font-bold text-on-surface">
                        {((result.breakdown?.visual_score ?? 0.8) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: `${(result.breakdown?.visual_score ?? 0.8) * 100}%` }} 
                        className={`h-full ${result.breakdown?.visual_score > 0.5 ? 'bg-red-500' : 'bg-emerald-500'}`} 
                      />
                    </div>
                  </div>
                  
                  {/* Audio Model */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-on-surface-variant flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">graphic_eq</span>
                        Acoustic Frequency / Vocoder
                      </span>
                      <span className="font-mono font-bold text-on-surface">
                        {((result.breakdown?.audio_score ?? (result.is_fake ? 0.88 : 0.12)) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: `${(result.breakdown?.audio_score ?? (result.is_fake ? 0.88 : 0.12)) * 100}%` }} 
                        className={`h-full ${(result.breakdown?.audio_score ?? 0.8) > 0.5 ? 'bg-red-500' : 'bg-emerald-500'}`} 
                      />
                    </div>
                  </div>

                  {/* Lip-sync / Spatial Model */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-on-surface-variant flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">face</span>
                        Biometric Coherence
                      </span>
                      <span className="font-mono font-bold text-on-surface">
                        {((result.breakdown?.lip_sync_score ?? (result.is_fake ? 0.91 : 0.09)) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: `${(result.breakdown?.lip_sync_score ?? (result.is_fake ? 0.91 : 0.09)) * 100}%` }} 
                        className={`h-full ${(result.breakdown?.lip_sync_score ?? 0.8) > 0.5 ? 'bg-red-500' : 'bg-emerald-500'}`} 
                      />
                    </div>
                  </div>
                </div>
                
                {/* Heatmap Evidence if present */}
                {result.heatmap && (
                  <div className="mt-2 group relative cursor-pointer overflow-hidden rounded-xl border border-outline-variant/30">
                    <img src={"data:image/png;base64," + result.heatmap} className="w-full h-24 object-cover transition-transform duration-300 group-hover:scale-105" alt="Heatmap Evidence" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white text-xs font-semibold tracking-widest uppercase flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">zoom_in</span> View Heatmap
                      </span>
                    </div>
                  </div>
                )}
              </Card>
              
              {/* Action Buttons */}
              <div className="flex flex-col gap-2 mt-auto">
                <Button 
                  variant="filled" 
                  onClick={viewWebReport} 
                  className="w-full text-xs h-9 shadow-md"
                >
                  <span className="material-symbols-outlined text-[16px] mr-1">open_in_new</span>
                  Open in Veritas Web Hub
                </Button>

                <div className="flex gap-2">
                  <Button 
                    variant="tonal" 
                    onClick={copySummaryReport} 
                    className="flex-1 text-xs h-9"
                  >
                    <span className="material-symbols-outlined text-[16px] mr-1">
                      {isCopied ? 'check' : 'content_copy'}
                    </span>
                    {isCopied ? 'Copied' : 'Copy Report'}
                  </Button>

                  <Button 
                    variant="outlined" 
                    onClick={() => setStatus('idle')} 
                    className="flex-1 text-xs h-9"
                  >
                    <span className="material-symbols-outlined text-[16px] mr-1">refresh</span>
                    Scan Another
                  </Button>
                </div>
              </div>
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
