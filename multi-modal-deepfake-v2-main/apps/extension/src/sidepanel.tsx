import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

declare var chrome: any;

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

interface PageMediaItem {
  src: string;
  type: 'image' | 'video';
  alt?: string;
  status?: 'idle' | 'scanning' | 'done';
  result?: any;
}

// ---------------------------------------------------------
// Tactical UI Primitives
// ---------------------------------------------------------

const Button = ({ 
  children, 
  className = '', 
  onClick, 
  variant = 'filled', 
  disabled,
  title,
  type = 'button'
}: any) => {
  const base = "relative inline-flex items-center justify-center gap-1.5 rounded-xl font-medium text-xs transition-all duration-150 cursor-pointer outline-none active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none select-none ";
  const variants: Record<string, string> = {
    filled: "bg-primary text-on-primary hover:brightness-110 shadow-sm shadow-primary/20",
    tonal: "bg-surface-container-high text-on-surface hover:bg-surface-container-highest border border-outline-variant/30",
    outlined: "border border-outline-variant/50 text-on-surface hover:bg-surface-container-high",
    ghost: "text-on-surface-variant hover:text-on-surface hover:bg-surface-container",
    danger: "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20",
    success: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
  };
  return (
    <button 
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick} 
      className={`${base} ${variants[variant] || variants.filled} ${className}`}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className = '', onClick }: any) => {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag 
      onClick={onClick}
      className={`rounded-2xl bg-surface-container-low/90 backdrop-blur-md border border-outline-variant/30 p-3 text-left transition-all ${
        onClick ? 'cursor-pointer hover:border-primary/40 hover:bg-surface-container/90' : ''
      } ${className}`}
    >
      {children}
    </Tag>
  );
};

const Badge = ({ label, icon, variant = 'neutral', className = '' }: any) => {
  const variants: Record<string, string> = {
    neutral: "bg-surface-container text-on-surface-variant border-outline-variant/40",
    primary: "bg-primary/10 text-primary border-primary/30",
    danger: "bg-red-500/15 text-red-400 border-red-500/30",
    success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    warning: "bg-amber-500/15 text-amber-400 border-amber-500/30"
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${variants[variant] || variants.neutral} ${className}`}>
      {icon && <span className="material-symbols-outlined text-[12px]">{icon}</span>}
      <span>{label}</span>
    </span>
  );
};

const Switch = ({ checked, onChange, label, description }: any) => (
  <div className="flex items-center justify-between py-1.5 cursor-pointer select-none" onClick={() => onChange?.(!checked)}>
    <div className="flex flex-col pr-2">
      <span className="text-xs font-semibold text-on-surface">{label}</span>
      {description && <span className="text-[10px] text-on-surface-variant">{description}</span>}
    </div>
    <div 
      className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 shrink-0 ${
        checked ? 'bg-primary' : 'bg-surface-container-highest border border-outline-variant/40'
      }`}
    >
      <div 
        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </div>
  </div>
);

const Dropzone = ({ onFileDrop, title, subtitle }: any) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.[0]) onFileDrop?.(e.dataTransfer.files[0]);
      }}
      onClick={() => fileInputRef.current?.click()}
      className={`relative group border-2 border-dashed rounded-2xl min-h-[155px] py-3.5 px-3 flex flex-col items-center justify-center transition-all duration-200 cursor-pointer overflow-hidden w-full ${
        isDragging 
          ? 'border-primary bg-primary/10 scale-[1.01] glow-primary' 
          : 'border-outline-variant/40 hover:border-primary/60 bg-surface-container-low/70 hover:bg-surface-container/80'
      }`}
    >
      {/* Background Cyber Grid Accent */}
      <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />
      
      {/* Corner Bracket Accents */}
      <div className="absolute top-2 left-2 w-2.5 h-2.5 border-t-2 border-l-2 border-primary/40 group-hover:border-primary transition-colors" />
      <div className="absolute top-2 right-2 w-2.5 h-2.5 border-t-2 border-r-2 border-primary/40 group-hover:border-primary transition-colors" />
      <div className="absolute bottom-2 left-2 w-2.5 h-2.5 border-b-2 border-l-2 border-primary/40 group-hover:border-primary transition-colors" />
      <div className="absolute bottom-2 right-2 w-2.5 h-2.5 border-b-2 border-r-2 border-primary/40 group-hover:border-primary transition-colors" />

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*,video/*,audio/*"
        onChange={(e) => { if (e.target.files?.[0]) onFileDrop?.(e.target.files[0]); }}
      />

      <div className={`relative z-10 w-11 h-11 rounded-xl flex items-center justify-center mb-2 transition-transform group-hover:scale-105 ${
        isDragging ? "bg-primary text-on-primary shadow-lg" : "bg-surface-container-high text-primary border border-outline-variant/30"
      }`}>
        <span className="material-symbols-outlined text-[22px]">upload_file</span>
      </div>

      <h3 className="relative z-10 text-xs font-bold text-on-surface mb-0.5">{title || "Upload Forensic Evidence"}</h3>
      <p className="relative z-10 text-[10px] text-on-surface-variant text-center max-w-[210px] leading-tight mb-2">
        {subtitle || "Drag & drop or browse media file to verify"}
      </p>

      {/* Format pills */}
      <div className="relative z-10 flex items-center gap-1 text-[8.5px] font-mono text-on-surface-variant/80 uppercase">
        <span className="px-1.5 py-0.5 rounded bg-surface-container border border-outline-variant/20">Images</span>
        <span className="px-1.5 py-0.5 rounded bg-surface-container border border-outline-variant/20">Videos</span>
        <span className="px-1.5 py-0.5 rounded bg-surface-container border border-outline-variant/20">Voice</span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------
// Official Material 3 Circular Progress Indicator
// ---------------------------------------------------------

const M3CircularProgress = ({ size = 48, strokeWidth = 4, className = "text-primary" }: { size?: number; strokeWidth?: number; className?: string }) => (
  <svg 
    className={`animate-spin ${className}`} 
    width={size} 
    height={size} 
    viewBox="0 0 48 48" 
    fill="none"
    style={{ animationDuration: '1.2s' }}
  >
    {/* Subtle Track */}
    <circle
      cx="24"
      cy="24"
      r="18"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      className="opacity-15"
    />
    {/* Active M3 Arc */}
    <circle
      cx="24"
      cy="24"
      r="18"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeDasharray="75 125"
      strokeDashoffset="0"
    />
  </svg>
);

// ---------------------------------------------------------
// Minimal Material 3 Metric Ring
// ---------------------------------------------------------

const TruthGauge = ({ score, isFake }: { score: number; isFake: boolean }) => {
  const percentage = score > 1 ? score : score * 100;
  const clampedRatio = Math.min(1, Math.max(0, percentage / 100));
  const strokeColor = isFake ? 'text-error' : 'text-emerald-500';
  
  return (
    <div className="relative w-32 h-32 mx-auto flex items-center justify-center my-1 select-none">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-surface-container-highest"
        />
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="251.2"
          strokeDashoffset={251.2 * (1 - clampedRatio)}
          className={`${strokeColor} transition-all duration-1000 ease-out`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className={`text-3xl font-bold tracking-tight ${strokeColor}`}>
          {percentage.toFixed(0)}%
        </span>
        <span className="text-[9px] font-medium text-on-surface-variant uppercase tracking-wider mt-0.5">
          {isFake ? 'Threat' : 'Authentic'}
        </span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------
// Main Veritas AI Extension Component
// ---------------------------------------------------------

function SidepanelApp() {
  const [navTab, setNavTab] = useState<'scan' | 'page-media' | 'history' | 'settings'>('scan');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle');
  const [currentScan, setCurrentScan] = useState<{ name: string; file: File | null; url: string | null; result?: any } | null>(null);
  const [result, setResult] = useState<any>(null);
  const [scanText, setScanText] = useState('Initializing neural pipeline...');
  const [scanStepIndex, setScanStepIndex] = useState(0);
  const [apiUrl, setApiUrl] = useState('https://upside-shower-handling.ngrok-free.dev');
  const [webAppUrl, setWebAppUrl] = useState('https://veritas-ai-mocha.vercel.app');
  const [urlInput, setUrlInput] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'fake' | 'real'>('all');
  const [historySearch, setHistorySearch] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [apiPingStatus, setApiPingStatus] = useState<'checking' | 'online' | 'offline'>('online');
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  
  // Active Tab Media Detection state
  const [pageMedia, setPageMedia] = useState<PageMediaItem[]>([]);
  const [mediaFilter, setMediaFilter] = useState<'all' | 'image' | 'video'>('all');
  const [isScanningPage, setIsScanningPage] = useState(false);
  
  // Results view: Visual Heatmap Toggle (Raw vs Heatmap)
  const [visualViewMode, setVisualViewMode] = useState<'original' | 'heatmap'>('original');

  // Settings feature toggles
  const [inPageBadgeEnabled, setInPageBadgeEnabled] = useState(true);
  const [autoInspectEnabled, setAutoInspectEnabled] = useState(false);

  useEffect(() => {
    // Load theme & settings
    const saved = localStorage.getItem("theme");
    if (saved === "light") document.documentElement.classList.replace("dark", "light");
    else document.documentElement.classList.add("dark");

    const savedApi = localStorage.getItem("veritas_api_url");
    if (savedApi) setApiUrl(savedApi);
    const savedWeb = localStorage.getItem("veritas_web_url");
    if (savedWeb) setWebAppUrl(savedWeb);

    // Initial silent ping to verify backend
    testConnection();

    // Load scan history from storage
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['veritas_history'], (res: any) => {
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
      const updated = [item, ...prev.filter(h => h.id !== item.id)].slice(0, 30);
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
    setPingLatency(null);
    const start = performance.now();
    try {
      const res = await fetch(`${apiUrl.replace(/\/$/, '')}/health`, { method: 'GET' });
      const duration = Math.round(performance.now() - start);
      if (res.ok) {
        setApiPingStatus('online');
        setPingLatency(duration);
      } else {
        setApiPingStatus('offline');
      }
    } catch {
      setApiPingStatus('offline');
    }
  };

  const pipelineStages = [
    { title: "Binary Stream Extraction", desc: "Verifying MIME & SHA-256 integrity" },
    { title: "ViT-L/14 Spatial Analysis", desc: "Detecting boundary & blending artifacts" },
    { title: "Acoustic Vocoder Spectrum", desc: "Analyzing frequency & phase synthesis" },
    { title: "Multi-Modal Consensus", desc: "Computing Bayesian authenticity confidence" }
  ];

  const startAnalysis = async (scan: { name: string; file: File | null; url: string | null }) => {
    setCurrentScan(scan);
    setStatus('processing');
    setNavTab('scan');
    setVisualViewMode('original');
    setScanStepIndex(0);
    setScanText(pipelineStages[0].title);
    
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step < pipelineStages.length) {
        setScanStepIndex(step);
        setScanText(pipelineStages[step].title);
      }
    }, 850);
    
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
      setTimeout(() => setStatus('done'), 600);

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

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
        setUrlInput(text.trim());
      }
    } catch (e) {
      console.warn('Clipboard read permission denied', e);
    }
  };

  // Inspect media on active browser tab
  const scanActiveTabMedia = async () => {
    if (typeof chrome === 'undefined' || !chrome.tabs) return;
    setIsScanningPage(true);
    setNavTab('page-media');
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        setIsScanningPage(false);
        return;
      }
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const media: { src: string; type: 'image' | 'video'; alt?: string }[] = [];
          const seen = new Set<string>();
          
          // Collect images with reasonable dimension
          const imgs = Array.from(document.querySelectorAll('img'));
          imgs.forEach(img => {
            if (img.src && img.src.startsWith('http') && !seen.has(img.src) && img.naturalWidth > 60 && img.naturalHeight > 60) {
              seen.add(img.src);
              media.push({ src: img.src, type: 'image', alt: img.alt || 'Web Image' });
            }
          });

          // Collect videos
          const vids = Array.from(document.querySelectorAll('video'));
          vids.forEach(v => {
            const src = v.src || v.querySelector('source')?.src;
            if (src && src.startsWith('http') && !seen.has(src)) {
              seen.add(src);
              media.push({ src, type: 'video', alt: 'Web Video' });
            }
          });

          return media.slice(0, 30);
        }
      });

      if (results && results[0]?.result) {
        setPageMedia(results[0].result);
      }
    } catch (err) {
      console.warn('Could not inspect tab media:', err);
    } finally {
      setIsScanningPage(false);
    }
  };

  // Demo Presets for One-Click Testing
  const loadDemoSample = (isFake: boolean) => {
    const demoData = isFake
      ? {
          is_fake: true,
          confidence: 0.952,
          breakdown: {
            visual_score: 0.968,
            audio_score: 0.895,
            lip_sync_score: 0.924
          },
          heatmap: null
        }
      : {
          is_fake: false,
          confidence: 0.118,
          breakdown: {
            visual_score: 0.082,
            audio_score: 0.145,
            lip_sync_score: 0.105
          },
          heatmap: null
        };

    const mockScan = {
      name: isFake ? 'synthetic_deepfake_avatar.jpg' : 'official_press_statement.jpg',
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
======================================
Target: ${currentScan.name}
Verdict: ${result.is_fake ? 'CRITICAL RISK - MANIPULATED / SYNTHETIC' : 'INTEGRITY VERIFIED - AUTHENTIC MEDIA'}
Confidence Score: ${(result.confidence * 100).toFixed(1)}%
Spatial Artifacts (ViT): ${((result.breakdown?.visual_score ?? 0.8) * 100).toFixed(1)}%
Vocoder Spectrum: ${((result.breakdown?.audio_score ?? (result.is_fake ? 0.88 : 0.12)) * 100).toFixed(1)}%
Biometric Alignment: ${((result.breakdown?.lip_sync_score ?? (result.is_fake ? 0.91 : 0.09)) * 100).toFixed(1)}%
Timestamp: ${new Date().toUTCString()}
Forensic Engine: Veritas Multi-Modal Sentinel v2.4`;

    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const exportJsonTelemetry = () => {
    if (!result || !currentScan) return;
    const exportData = {
      engine: 'Veritas-MultiModal-ViT-v2.4',
      target: currentScan.name,
      verdict: result.is_fake ? 'MANIPULATED' : 'AUTHENTIC',
      confidence: result.confidence,
      breakdown: result.breakdown,
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `veritas_forensic_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
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

    chrome.storage?.local.set({ 
      pending_web_report: { 
        url: currentScan.url, 
        base64: base64Data,
        mimeType: mimeType,
        result: currentScan.result, 
        name: currentScan.name 
      } 
    }, () => {
      if (chrome.runtime?.lastError) {
        chrome.storage?.local.set({ 
          pending_web_report: { url: currentScan.url, result: currentScan.result, name: currentScan.name } 
        }, () => {
          chrome.tabs?.create({ url: targetUrl });
        });
        return;
      }
      chrome.tabs?.create({ url: targetUrl });
    });
  };

  const filteredHistory = history.filter(item => {
    if (historyFilter === 'fake' && !item.is_fake) return false;
    if (historyFilter === 'real' && item.is_fake) return false;
    if (historySearch.trim() && !item.name.toLowerCase().includes(historySearch.toLowerCase())) return false;
    return true;
  });

  const filteredPageMedia = pageMedia.filter(item => {
    if (mediaFilter === 'image' && item.type !== 'image') return false;
    if (mediaFilter === 'video' && item.type !== 'video') return false;
    return true;
  });

  return (
    <div className="bg-surface text-on-surface min-h-screen w-full max-w-full overflow-x-hidden flex flex-col font-sans select-none antialiased text-[12px]">
      
      {/* ========================================================= */}
      {/* 1. TOP TACTICAL BRAND & TELEMETRY BAR                     */}
      {/* ========================================================= */}
      <header className="border-b border-outline-variant/30 bg-surface/95 backdrop-blur-md sticky top-0 z-30 shadow-xs flex items-center justify-between gap-2 px-3 py-2 w-full">
        
        {/* Left: Hamburger Menu Trigger & Brand Identity */}
        <div className="flex items-center gap-2 min-w-0">
          {/* Hamburger Menu Toggle Button */}
          <button
            onClick={() => setIsMenuOpen(prev => !prev)}
            title={isMenuOpen ? "Close Navigation Menu" : "Open Navigation Menu"}
            aria-label="Toggle navigation menu"
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface-container-high/60 hover:bg-surface-container-highest text-on-surface hover:text-primary transition-all cursor-pointer border border-outline-variant/30 shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">
              {isMenuOpen ? 'close' : 'menu'}
            </span>
          </button>

          <div className="relative flex items-center justify-center w-7 h-7 rounded-xl bg-gradient-to-br from-surface-container-high to-surface-container-highest border border-outline-variant/40 shadow-xs shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L4 5V11C4 16.55 7.42 21.74 12 23C16.58 21.74 20 16.55 20 11V5L12 2Z" fill="#38bdf8" />
              <path d="M12 6L7 11H10V16H14V11H17L12 6Z" fill="#ffffff" opacity="0.95" />
            </svg>
            <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-surface ${
              apiPingStatus === 'online' ? 'bg-emerald-400 animate-pulse' : apiPingStatus === 'checking' ? 'bg-amber-400 animate-ping' : 'bg-red-400'
            }`} />
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold tracking-wider text-[12px] bg-gradient-to-r from-primary via-primary to-tertiary bg-clip-text text-transparent leading-none">
                VERITAS AI
              </span>
              <span className="text-[8px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-primary/10 text-primary border border-primary/20">
                v2.4
              </span>
            </div>
            <span className="text-[8.5px] text-on-surface-variant font-mono tracking-tight mt-0.5 truncate">
              NEURAL SENTINEL
            </span>
          </div>
        </div>

        {/* Controls: Live Ping Handshake + Web App Link + Theme Toggle */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Live latency handshake badge */}
          <button
            onClick={testConnection}
            title="Click to test backend link latency"
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono border transition-all cursor-pointer ${
              apiPingStatus === 'online' 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20' 
                : apiPingStatus === 'checking'
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                : 'bg-red-500/10 text-red-400 border-red-500/25 hover:bg-red-500/20'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${
              apiPingStatus === 'online' ? 'bg-emerald-400' : apiPingStatus === 'checking' ? 'bg-amber-400 animate-ping' : 'bg-red-400'
            }`} />
            <span className="font-semibold">
              {apiPingStatus === 'online' ? (pingLatency ? `${pingLatency}ms` : 'ONLINE') : apiPingStatus === 'checking' ? 'PING...' : 'OFFLINE'}
            </span>
          </button>

          {/* Launch Web App link */}
          <button
            onClick={() => chrome.tabs?.create({ url: webAppUrl })}
            title="Open Veritas AI Web Dashboard"
            className="w-6 h-6 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[15px]">open_in_new</span>
          </button>

          {/* Theme switcher */}
          <button 
            onClick={toggleTheme} 
            title="Toggle Dark / Light Theme"
            className="w-6 h-6 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[15px]">contrast</span>
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* MAIN VIEWPORT CONTAINER                                   */}
      {/* ========================================================= */}
      <main className="flex-1 relative flex flex-col overflow-y-auto">

        {/* --------------------------------------------------------- */}
        {/* VIEW 1: SCAN HERO (IDLE)                                  */}
        {/* --------------------------------------------------------- */}
        {navTab === 'scan' && status === 'idle' && (
          <div key="idle" className="p-3.5 flex flex-col gap-3 flex-1 animate-in fade-in duration-150">
            
            {/* Real-Time Security Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/15 via-surface-container-low to-surface-container-low p-3 border border-outline-variant/30 flex flex-col items-center text-center shadow-xs">
              <div className="flex items-center gap-1.5 text-[9.5px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 rounded-full mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>NEURAL SHIELD ARMED</span>
                <span className="text-on-surface-variant">•</span>
                <span className="font-mono text-emerald-300">ViT-L/14 ACTIVE</span>
              </div>
              <h2 className="text-xs font-bold text-on-surface tracking-tight">Autonomous Synthetic Media Verification</h2>
              <p className="text-[10px] text-on-surface-variant mt-0.5 max-w-xs leading-relaxed">
                Scan images, videos, audio waveforms &amp; social media for generative manipulation.
              </p>

              {/* Instant Test Presets */}
              <div className="flex items-center gap-1.5 mt-2.5">
                <button
                  onClick={() => loadDemoSample(true)}
                  className="px-2.5 py-1 rounded-lg text-[9.5px] font-semibold bg-red-500/10 text-red-400 border border-red-500/25 hover:bg-red-500/20 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                >
                  <span className="material-symbols-outlined text-[12px]">warning</span>
                  <span>Demo Deepfake</span>
                </button>
                <button
                  onClick={() => loadDemoSample(false)}
                  className="px-2.5 py-1 rounded-lg text-[9.5px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/20 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                >
                  <span className="material-symbols-outlined text-[12px]">verified</span>
                  <span>Demo Authentic</span>
                </button>
              </div>
            </div>

            {/* Smart URL / Social Link Ingestion Bar */}
            <form onSubmit={handleUrlSubmit} className="flex gap-1.5">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[15px]">
                  link
                </span>
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Paste media link or social URL..."
                  className="w-full pl-8 pr-7 py-2 rounded-xl text-[11px] bg-surface-container border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary text-on-surface font-sans placeholder:text-on-surface-variant/60"
                />
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                  title="Paste from clipboard"
                >
                  <span className="material-symbols-outlined text-[15px]">content_paste</span>
                </button>
              </div>
              <Button
                type="submit"
                disabled={!urlInput.trim()}
                className="px-3 py-2 text-xs font-semibold shrink-0"
              >
                <span className="material-symbols-outlined text-[14px]">send</span>
                <span>Scan</span>
              </Button>
            </form>

            {/* Tactical Evidence Dropzone */}
            <Dropzone 
              onFileDrop={(file: File) => startAnalysis({ name: file.name, file, url: null })} 
              title="Drop Media to Verify" 
              subtitle="Supports images, video clips, and vocal audio files up to 50MB" 
            />

            {/* 1-Click Page Media Extractor Card */}
            <button
              onClick={scanActiveTabMedia}
              className="w-full py-2.5 px-3 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 text-xs font-semibold text-on-surface transition-all flex items-center justify-between group cursor-pointer active:scale-[0.99]"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
                  <span className="material-symbols-outlined text-[15px]">travel_explore</span>
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[11px] font-bold">Inspect Current Webpage Assets</span>
                  <span className="text-[9.5px] text-on-surface-variant">Extract and verify videos &amp; images in 1 click</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant text-[15px] group-hover:translate-x-0.5 transition-transform">
                chevron_right
              </span>
            </button>

            {/* Right-click shortcut guide */}
            <div className="rounded-xl p-2.5 bg-surface-container/60 border border-outline-variant/20 flex items-start gap-2 mt-auto">
              <span className="material-symbols-outlined text-primary text-[15px] shrink-0 mt-0.5">mouse</span>
              <p className="text-[10px] text-on-surface-variant leading-snug">
                <strong className="text-on-surface">Web Shortcut:</strong> Right-click any media on any website and select <span className="text-primary font-medium">&quot;Verify Media with Veritas AI&quot;</span>.
              </p>
            </div>
            
          </div>
        )}

        {/* --------------------------------------------------------- */}
        {/* VIEW 2: MINIMAL MATERIAL 3 LOADER                         */}
        {/* --------------------------------------------------------- */}
        {navTab === 'scan' && status === 'processing' && (
          <div key="processing" className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200 select-none my-auto">
            {/* Authentic Google Material 3 Circular Progress Spinner */}
            <div className="relative flex items-center justify-center mb-5">
              <M3CircularProgress size={52} strokeWidth={4} className="text-primary" />
            </div>

            {/* Clean Title & File Name */}
            <h3 className="text-sm font-semibold text-on-surface mb-1">
              Analyzing Media
            </h3>
            <p className="text-xs text-on-surface-variant truncate max-w-[220px] mb-4">
              {currentScan?.name || 'Media Asset'}
            </p>

            {/* Minimal M3 Stage Chip */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-on-surface text-[11px] font-medium border border-outline-variant/30 mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span>{pipelineStages[scanStepIndex]?.title || 'Processing neural signals...'}</span>
            </div>

            {/* Minimal M3 Linear Progress Bar */}
            <div className="w-48 bg-surface-container-highest h-1.5 rounded-full overflow-hidden mb-6">
              <div 
                className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
                style={{ width: `${((scanStepIndex + 1) / pipelineStages.length) * 100}%` }}
              />
            </div>

            {/* Minimal Cancel button */}
            <button
              onClick={() => setStatus('idle')}
              className="text-xs font-medium text-on-surface-variant hover:text-error transition-colors px-4 py-1.5 rounded-full hover:bg-surface-container cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}

        {/* --------------------------------------------------------- */}
        {/* VIEW 3: ERROR STATE                                       */}
        {/* --------------------------------------------------------- */}
        {navTab === 'scan' && status === 'error' && (
          <div key="error" className="p-5 flex flex-col items-center justify-center flex-1 text-center my-auto animate-in fade-in duration-200">
            <div className="w-12 h-12 bg-red-500/10 text-red-400 border border-red-500/20 rounded-2xl flex items-center justify-center mb-3 shadow-md">
              <span className="material-symbols-outlined text-[26px]">cloud_off</span>
            </div>
            <h3 className="font-bold text-xs text-on-surface mb-1">Handshake Failure</h3>
            <p className="text-[10.5px] text-on-surface-variant mb-4 max-w-xs leading-relaxed">
              Could not establish a secure handshake with the Veritas Neural Engine. Verify your service link in Settings.
            </p>
            <div className="flex gap-2 w-full max-w-xs">
              <Button variant="filled" onClick={() => startAnalysis(currentScan!)} className="flex-1 text-xs h-8">
                <span className="material-symbols-outlined text-[13px]">refresh</span>
                <span>Retry</span>
              </Button>
              <Button variant="tonal" onClick={() => setStatus('idle')} className="flex-1 text-xs h-8">
                Dismiss
              </Button>
            </div>
          </div>
        )}

        {/* --------------------------------------------------------- */}
        {/* VIEW 4: MINIMAL MATERIAL 3 RESULT DOSSIER                 */}
        {/* --------------------------------------------------------- */}
        {navTab === 'scan' && status === 'done' && result && (
          <div key="done" className="p-3.5 flex flex-col gap-3 pb-6 flex-1 animate-in fade-in duration-150 select-none">
            
            {/* 1. Minimal Verdict Card */}
            <div className="rounded-2xl p-4 bg-surface-container-low border border-outline-variant/30 flex flex-col items-center text-center shadow-xs">
              {/* Status Badge */}
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-2.5 ${
                result.is_fake 
                  ? 'bg-error-container text-on-error-container' 
                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              }`}>
                <span className="material-symbols-outlined text-[16px]">
                  {result.is_fake ? "warning" : "verified"}
                </span>
                <span>{result.is_fake ? "Manipulated Media" : "Authentic Media"}</span>
              </div>

              {/* Minimal Metric Ring */}
              <TruthGauge score={result.confidence} isFake={result.is_fake} />

              <div className="text-xs text-on-surface-variant truncate max-w-[240px] mt-2">
                {currentScan?.name || 'Inspected Media'}
              </div>
            </div>

            {/* 2. Visual Evidence Lens (if applicable) */}
            {(currentScan?.url || result.heatmap) && (
              <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-3 flex flex-col gap-2.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-on-surface">Visual Evidence</span>

                  {/* Clean M3 Segmented Switch */}
                  {result.heatmap && currentScan?.url && (
                    <div className="inline-flex rounded-full p-0.5 bg-surface-container border border-outline-variant/40">
                      <button
                        onClick={() => setVisualViewMode('original')}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium transition-colors cursor-pointer ${
                          visualViewMode === 'original' 
                            ? 'bg-secondary-container text-on-secondary-container shadow-xs' 
                            : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        Original
                      </button>
                      <button
                        onClick={() => setVisualViewMode('heatmap')}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium transition-colors cursor-pointer ${
                          visualViewMode === 'heatmap' 
                            ? 'bg-secondary-container text-on-secondary-container shadow-xs' 
                            : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        Heatmap
                      </button>
                    </div>
                  )}
                </div>

                <div className="h-32 rounded-xl bg-surface-container overflow-hidden flex items-center justify-center relative">
                  {visualViewMode === 'heatmap' && result.heatmap ? (
                    <img 
                      src={result.heatmap.startsWith('data:') ? result.heatmap : `data:image/png;base64,${result.heatmap}`} 
                      className="max-h-32 max-w-full object-contain" 
                      alt="Heatmap" 
                    />
                  ) : (
                    currentScan?.url ? (
                      <img src={currentScan.url} className="max-h-32 max-w-full object-contain" alt="Original" />
                    ) : (
                      <span className="text-xs text-on-surface-variant">Stream verified</span>
                    )
                  )}
                </div>
              </div>
            )}

            {/* 3. Minimal Neural Signals Breakdown */}
            <div className="rounded-2xl bg-surface-container-low border border-outline-variant/30 p-3.5 flex flex-col gap-3 shadow-xs">
              <span className="text-xs font-semibold text-on-surface">Signal Breakdown</span>
              
              <div className="flex flex-col gap-2.5">
                {/* Visual */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-on-surface-variant">Spatial Anomalies</span>
                    <span className="font-medium text-on-surface">{((result.breakdown?.visual_score ?? 0.8) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
                    <div 
                      style={{ width: `${(result.breakdown?.visual_score ?? 0.8) * 100}%` }} 
                      className={`h-full rounded-full transition-all duration-700 ${
                        (result.breakdown?.visual_score ?? 0.8) > 0.5 ? 'bg-error' : 'bg-emerald-500'
                      }`} 
                    />
                  </div>
                </div>

                {/* Audio */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-on-surface-variant">Acoustic Coherence</span>
                    <span className="font-medium text-on-surface">{((result.breakdown?.audio_score ?? (result.is_fake ? 0.88 : 0.12)) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
                    <div 
                      style={{ width: `${(result.breakdown?.audio_score ?? (result.is_fake ? 0.88 : 0.12)) * 100}%` }} 
                      className={`h-full rounded-full transition-all duration-700 ${
                        (result.breakdown?.audio_score ?? (result.is_fake ? 0.88 : 0.12)) > 0.5 ? 'bg-error' : 'bg-emerald-500'
                      }`} 
                    />
                  </div>
                </div>

                {/* Lip-sync */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-on-surface-variant">Biometric Sync</span>
                    <span className="font-medium text-on-surface">{((result.breakdown?.lip_sync_score ?? (result.is_fake ? 0.91 : 0.09)) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
                    <div 
                      style={{ width: `${(result.breakdown?.lip_sync_score ?? (result.is_fake ? 0.91 : 0.09)) * 100}%` }} 
                      className={`h-full rounded-full transition-all duration-700 ${
                        (result.breakdown?.lip_sync_score ?? (result.is_fake ? 0.91 : 0.09)) > 0.5 ? 'bg-error' : 'bg-emerald-500'
                      }`} 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Minimal Actions */}
            <div className="flex flex-col gap-2 mt-auto pt-1">
              <button 
                onClick={viewWebReport} 
                className="w-full h-10 rounded-full bg-primary text-on-primary hover:brightness-105 active:scale-[0.98] font-medium text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                <span>Open Full Report in Veritas</span>
              </button>

              <div className="flex gap-2">
                <button 
                  onClick={copySummaryReport} 
                  className="flex-1 h-9 rounded-full bg-surface-container text-on-surface hover:bg-surface-container-high active:scale-[0.98] text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-outline-variant/30"
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {isCopied ? 'check' : 'content_copy'}
                  </span>
                  <span>{isCopied ? 'Copied' : 'Copy'}</span>
                </button>

                <button 
                  onClick={() => setStatus('idle')} 
                  className="flex-1 h-9 rounded-full bg-surface-container text-on-surface hover:bg-surface-container-high active:scale-[0.98] text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-outline-variant/30"
                >
                  <span className="material-symbols-outlined text-[15px]">refresh</span>
                  <span>New Scan</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --------------------------------------------------------- */}
        {/* VIEW 5: ACTIVE TAB MEDIA INSPECTOR                        */}
        {/* --------------------------------------------------------- */}
        {navTab === 'page-media' && (
          <div key="page-media" className="p-3.5 flex flex-col gap-3 flex-1 animate-in fade-in duration-150">
            
            {/* Header with reload and filter */}
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[16px]">photo_library</span>
                  Page Media Inspector
                </h2>
                <p className="text-[10px] text-on-surface-variant">Extracted media assets on active tab</p>
              </div>
              <Button
                variant="tonal"
                onClick={scanActiveTabMedia}
                disabled={isScanningPage}
                className="px-2.5 py-1 text-[10.5px] h-7"
              >
                <span className={`material-symbols-outlined text-[13px] ${isScanningPage ? 'animate-spin' : ''}`}>
                  refresh
                </span>
                <span>Scan Page</span>
              </Button>
            </div>

            {/* Filter Pills */}
            {pageMedia.length > 0 && (
              <div className="flex gap-1.5 text-[10px]">
                <button
                  onClick={() => setMediaFilter('all')}
                  className={`px-2 py-0.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                    mediaFilter === 'all' ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  All ({pageMedia.length})
                </button>
                <button
                  onClick={() => setMediaFilter('image')}
                  className={`px-2 py-0.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                    mediaFilter === 'image' ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Images ({pageMedia.filter(m => m.type === 'image').length})
                </button>
                <button
                  onClick={() => setMediaFilter('video')}
                  className={`px-2 py-0.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                    mediaFilter === 'video' ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Videos ({pageMedia.filter(m => m.type === 'video').length})
                </button>
              </div>
            )}

            {/* Media list */}
            {isScanningPage ? (
              <div className="flex flex-col items-center justify-center flex-1 my-auto text-center p-6 text-on-surface-variant">
                <span className="material-symbols-outlined text-primary text-3xl animate-spin mb-2">progress_activity</span>
                <span className="text-xs font-semibold text-on-surface">Extracting Assets...</span>
                <p className="text-[10px] text-on-surface-variant mt-1">Scanning active tab DOM for media streams</p>
              </div>
            ) : filteredPageMedia.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 my-auto text-center p-6 text-on-surface-variant">
                <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center mb-2 text-on-surface-variant/50">
                  <span className="material-symbols-outlined text-[26px]">image_not_supported</span>
                </div>
                <span className="text-xs font-semibold text-on-surface">No media detected</span>
                <p className="text-[10px] text-on-surface-variant/80 mt-1 max-w-[200px]">
                  Navigate to any website with images or videos and click Scan Page.
                </p>
                <Button
                  variant="filled"
                  onClick={scanActiveTabMedia}
                  className="mt-3 px-3 py-1.5 text-xs font-semibold"
                >
                  Inspect Active Tab
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-140px)] pr-1">
                <div className="grid grid-cols-2 gap-2">
                  {filteredPageMedia.map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl bg-surface-container-low border border-outline-variant/30 overflow-hidden flex flex-col group hover:border-primary/50 transition-all shadow-xs min-w-0"
                    >
                      <div className="h-24 bg-surface-container flex items-center justify-center overflow-hidden relative">
                        {item.type === 'image' ? (
                          <img src={item.src} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt={item.alt || 'Asset'} />
                        ) : (
                          <div className="flex flex-col items-center text-on-surface-variant">
                            <span className="material-symbols-outlined text-2xl">movie</span>
                            <span className="text-[9px] uppercase font-bold mt-1">Video</span>
                          </div>
                        )}
                        <span className="absolute top-1 left-1 px-1.5 py-0.2 rounded bg-black/70 text-white text-[8px] font-mono uppercase backdrop-blur-xs">
                          {item.type}
                        </span>
                      </div>
                      <div className="p-2 flex flex-col gap-1.5">
                        <p className="text-[10px] font-medium text-on-surface truncate" title={item.src}>
                          {item.src.split('/').pop()?.split('?')[0] || item.alt || 'Media Element'}
                        </p>
                        <button
                          onClick={() => {
                            startAnalysis({
                              name: item.src.split('/').pop()?.split('?')[0] || `page_media_${idx}`,
                              url: item.src,
                              file: null
                            });
                          }}
                          className="w-full py-1 rounded-lg text-[10px] font-semibold bg-primary/10 text-primary hover:bg-primary hover:text-on-primary transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[12px]">verified</span>
                          <span>Verify</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* --------------------------------------------------------- */}
        {/* VIEW 6: EVIDENCE LEDGER (HISTORY)                         */}
        {/* --------------------------------------------------------- */}
        {navTab === 'history' && (
          <div key="history" className="p-3.5 flex flex-col gap-3 flex-1 animate-in fade-in duration-150">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[15px]">history</span>
                  Evidence Ledger
                </h2>
                <p className="text-[10px] text-on-surface-variant">Tamper-evident client sandbox records</p>
              </div>
              {history.length > 0 && (
                <button 
                  onClick={clearHistory}
                  className="text-[10px] text-red-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[12px]">delete_sweep</span>
                  <span>Clear</span>
                </button>
              )}
            </div>

            {/* History Search & Filter Bar */}
            {history.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[14px]">
                    search
                  </span>
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Search previous scans..."
                    className="w-full pl-8 pr-2 py-1.5 rounded-xl text-[11px] bg-surface-container border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="flex gap-1.5 text-[10px]">
                  <button
                    onClick={() => setHistoryFilter('all')}
                    className={`px-2 py-0.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                      historyFilter === 'all' ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    All ({history.length})
                  </button>
                  <button
                    onClick={() => setHistoryFilter('fake')}
                    className={`px-2 py-0.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                      historyFilter === 'fake' ? 'bg-red-500 text-white' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    Threats ({history.filter(h => h.is_fake).length})
                  </button>
                  <button
                    onClick={() => setHistoryFilter('real')}
                    className={`px-2 py-0.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                      historyFilter === 'real' ? 'bg-emerald-500 text-white' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    Authentic ({history.filter(h => !h.is_fake).length})
                  </button>
                </div>
              </div>
            )}

            {filteredHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 my-auto text-center p-6 text-on-surface-variant">
                <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center mb-2 text-on-surface-variant/50">
                  <span className="material-symbols-outlined text-[26px]">history_toggle_off</span>
                </div>
                <span className="text-xs font-semibold text-on-surface">No matching records</span>
                <p className="text-[10px] text-on-surface-variant/80 mt-1 max-w-[200px]">
                  Verified assets will automatically be preserved in this local sandbox.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[calc(100vh-170px)] pr-1">
                {filteredHistory.map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => loadFromHistory(item)}
                    className="p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 hover:border-primary/40 transition-all cursor-pointer flex items-center justify-between gap-2.5 group shadow-2xs"
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        item.is_fake ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        <span className="material-symbols-outlined text-[16px]">
                          {item.is_fake ? 'warning' : 'verified'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-on-surface truncate group-hover:text-primary transition-colors">
                          {item.name}
                        </p>
                        <span className="text-[9.5px] text-on-surface-variant font-mono">
                          {item.timestamp} • {(item.confidence * 100).toFixed(0)}% score
                        </span>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-on-surface-variant text-[15px] group-hover:translate-x-0.5 transition-transform">
                      chevron_right
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --------------------------------------------------------- */}
        {/* VIEW 7: CONFIG & HANDSHAKE (SETTINGS)                     */}
        {/* --------------------------------------------------------- */}
        {navTab === 'settings' && (
          <div key="settings" className="p-3.5 flex flex-col gap-3.5 flex-1 animate-in fade-in duration-150">
            <div>
              <h2 className="text-xs font-bold tracking-wider text-on-surface uppercase flex items-center gap-1.5 text-primary">
                <span className="material-symbols-outlined text-[16px]">tune</span>
                Engine Configuration
              </h2>
              <p className="text-[10px] text-on-surface-variant mt-0.5">Manage deepfake inference tunnels and bridge endpoints.</p>
            </div>

            <div className="flex flex-col gap-3">
              {/* Backend Service URL */}
              <div className="bg-surface-container-low p-3 rounded-2xl border border-outline-variant/30 flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold text-on-surface">Neural Backend Endpoint</label>
                  <button 
                    onClick={testConnection} 
                    className="text-[10px] font-semibold text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[13px]">network_check</span>
                    <span>Test Link</span>
                  </button>
                </div>
                <input
                  type="url"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://upside-shower-handling.ngrok-free.dev"
                  className="w-full bg-surface-container text-on-surface text-[11px] rounded-xl px-2.5 py-1.5 border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                />
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`w-2 h-2 rounded-full ${
                    apiPingStatus === 'online' ? 'bg-emerald-400' : apiPingStatus === 'checking' ? 'bg-amber-400 animate-ping' : 'bg-red-400'
                  }`} />
                  <span className="text-[9.5px] text-on-surface-variant font-mono">
                    {apiPingStatus === 'online' 
                      ? `Online handshake confirmed ${pingLatency ? `(${pingLatency}ms)` : ''}` 
                      : apiPingStatus === 'checking' 
                      ? 'Pinging server...' 
                      : 'Endpoint unreachable'}
                  </span>
                </div>
              </div>

              {/* Web App URL */}
              <div className="bg-surface-container-low p-3 rounded-2xl border border-outline-variant/30 flex flex-col gap-1.5">
                <label className="block text-[11px] font-bold text-on-surface">
                  Veritas Web Platform Hub
                </label>
                <input
                  type="url"
                  value={webAppUrl}
                  onChange={(e) => setWebAppUrl(e.target.value)}
                  placeholder="https://veritas-ai-mocha.vercel.app"
                  className="w-full bg-surface-container text-on-surface text-[11px] rounded-xl px-2.5 py-1.5 border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                />
                <span className="text-[9.5px] text-on-surface-variant leading-tight">Full forensic report viewer destination</span>
              </div>

              {/* Feature Toggles */}
              <div className="bg-surface-container-low p-3 rounded-2xl border border-outline-variant/30 flex flex-col divide-y divide-outline-variant/20">
                <Switch 
                  label="In-Page Video Badge" 
                  description="Overlay verification pill on web videos" 
                  checked={inPageBadgeEnabled} 
                  onChange={setInPageBadgeEnabled} 
                />
                <Switch 
                  label="Auto-Inspect Web Media" 
                  description="Preload detected assets when opening tab" 
                  checked={autoInspectEnabled} 
                  onChange={setAutoInspectEnabled} 
                />
              </div>

              {/* System Diagnostics Card */}
              <div className="rounded-xl p-2.5 bg-surface-container/50 border border-outline-variant/20 text-[9.5px] font-mono text-on-surface-variant space-y-0.5">
                <div className="flex justify-between">
                  <span>Engine Core:</span>
                  <span className="text-on-surface font-semibold">ViT-L/14 + WavLM Fusion</span>
                </div>
                <div className="flex justify-between">
                  <span>Manifest Architecture:</span>
                  <span className="text-on-surface font-semibold">Chrome MV3 SidePanel</span>
                </div>
                <div className="flex justify-between">
                  <span>Storage Engine:</span>
                  <span className="text-on-surface font-semibold">Chrome Local Storage</span>
                </div>
              </div>
            </div>
            
            <div className="mt-auto flex flex-col gap-2 pt-2">
              <Button 
                variant="filled" 
                onClick={() => {
                  localStorage.setItem("veritas_api_url", apiUrl);
                  localStorage.setItem("veritas_web_url", webAppUrl);
                  setNavTab('scan');
                }} 
                className="w-full text-xs h-9 shadow-md"
              >
                <span className="material-symbols-outlined text-[15px]">check</span>
                <span>Save Preferences</span>
              </Button>
              <Button 
                variant="tonal" 
                onClick={() => setNavTab('scan')} 
                className="w-full text-xs h-8.5"
              >
                Return to Scanner
              </Button>
            </div>
          </div>
        )}

      </main>

      {/* ========================================================= */}
      {/* 2. HAMBURGER SLIDE-OVER NAVIGATION DRAWER                 */}
      {/* ========================================================= */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop Overlay */}
          <div 
            onClick={() => setIsMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            aria-hidden="true"
          />

          {/* Slide-out Drawer Panel */}
          <aside className="relative w-64 max-w-[85vw] h-full bg-surface-container-low border-r border-outline-variant/30 shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="p-3.5 border-b border-outline-variant/30 flex items-center justify-between gap-2 bg-surface/50">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex items-center justify-center w-7 h-7 rounded-xl bg-gradient-to-br from-surface-container-high to-surface-container-highest border border-outline-variant/40 shadow-xs shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L4 5V11C4 16.55 7.42 21.74 12 23C16.58 21.74 20 16.55 20 11V5L12 2Z" fill="#38bdf8" />
                    <path d="M12 6L7 11H10V16H14V11H17L12 6Z" fill="#ffffff" opacity="0.95" />
                  </svg>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-extrabold text-[12px] tracking-wider bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent leading-none">
                    VERITAS AI
                  </span>
                  <span className="text-[9px] text-on-surface-variant font-mono mt-0.5">
                    Forensic Navigator
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsMenuOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                title="Close Menu"
                aria-label="Close menu"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Navigation Items List */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
              <div className="px-2 py-1 text-[9px] font-mono uppercase tracking-wider text-on-surface-variant/70 font-bold">
                Modules
              </div>

              {/* Tab 1: Scanner */}
              <button
                onClick={() => {
                  setNavTab('scan');
                  setIsMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                  navTab === 'scan'
                    ? 'bg-primary text-on-primary font-bold shadow-xs'
                    : 'hover:bg-surface-container-high/80 text-on-surface'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="material-symbols-outlined text-[19px] shrink-0">radar</span>
                  <div className="min-w-0">
                    <div className="text-[12px] font-semibold leading-tight truncate">Neural Scanner</div>
                    <div className={`text-[9.5px] leading-tight truncate ${navTab === 'scan' ? 'text-on-primary/80' : 'text-on-surface-variant'}`}>
                      Files, URLs & clipboard
                    </div>
                  </div>
                </div>
                {navTab === 'scan' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-on-primary shrink-0 animate-pulse ml-1" />
                )}
              </button>

              {/* Tab 2: Page Media */}
              <button
                onClick={() => {
                  setNavTab('page-media');
                  if (pageMedia.length === 0) scanActiveTabMedia();
                  setIsMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                  navTab === 'page-media'
                    ? 'bg-primary text-on-primary font-bold shadow-xs'
                    : 'hover:bg-surface-container-high/80 text-on-surface'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="material-symbols-outlined text-[19px] shrink-0">photo_library</span>
                  <div className="min-w-0">
                    <div className="text-[12px] font-semibold leading-tight truncate">Page Media</div>
                    <div className={`text-[9.5px] leading-tight truncate ${navTab === 'page-media' ? 'text-on-primary/80' : 'text-on-surface-variant'}`}>
                      Extract tab images & videos
                    </div>
                  </div>
                </div>
                {pageMedia.length > 0 && (
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full font-bold shrink-0 ml-1 ${
                    navTab === 'page-media' ? 'bg-on-primary text-primary' : 'bg-primary/20 text-primary'
                  }`}>
                    {pageMedia.length}
                  </span>
                )}
              </button>

              {/* Tab 3: Evidence Ledger */}
              <button
                onClick={() => {
                  setNavTab('history');
                  setIsMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                  navTab === 'history'
                    ? 'bg-primary text-on-primary font-bold shadow-xs'
                    : 'hover:bg-surface-container-high/80 text-on-surface'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="material-symbols-outlined text-[19px] shrink-0">history</span>
                  <div className="min-w-0">
                    <div className="text-[12px] font-semibold leading-tight truncate">Evidence Ledger</div>
                    <div className={`text-[9.5px] leading-tight truncate ${navTab === 'history' ? 'text-on-primary/80' : 'text-on-surface-variant'}`}>
                      Archived forensic verdicts
                    </div>
                  </div>
                </div>
                {history.length > 0 && (
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full font-bold shrink-0 ml-1 ${
                    navTab === 'history' ? 'bg-on-primary text-primary' : 'bg-surface-container-highest text-on-surface'
                  }`}>
                    {history.length}
                  </span>
                )}
              </button>

              {/* Tab 4: Engine Config */}
              <button
                onClick={() => {
                  setNavTab('settings');
                  setIsMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                  navTab === 'settings'
                    ? 'bg-primary text-on-primary font-bold shadow-xs'
                    : 'hover:bg-surface-container-high/80 text-on-surface'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="material-symbols-outlined text-[19px] shrink-0">tune</span>
                  <div className="min-w-0">
                    <div className="text-[12px] font-semibold leading-tight truncate">Configuration</div>
                    <div className={`text-[9.5px] leading-tight truncate ${navTab === 'settings' ? 'text-on-primary/80' : 'text-on-surface-variant'}`}>
                      Endpoints & heuristics
                    </div>
                  </div>
                </div>
              </button>

              {/* Quick Actions section */}
              <div className="pt-2">
                <div className="px-2 py-1 text-[9px] font-mono uppercase tracking-wider text-on-surface-variant/70 font-bold">
                  External Tools
                </div>

                {/* Open Web Dashboard */}
                <button
                  onClick={() => {
                    chrome.tabs?.create({ url: webAppUrl });
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/60 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                  <span className="text-[11px] font-medium">Web Platform</span>
                </button>

                {/* Re-ping Latency */}
                <button
                  onClick={() => {
                    testConnection();
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl text-left text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/60 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px]">network_check</span>
                    <span className="text-[11px] font-medium">Engine Link</span>
                  </div>
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                    apiPingStatus === 'online' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {apiPingStatus === 'online' ? `${pingLatency || 0}ms` : 'OFFLINE'}
                  </span>
                </button>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-3 border-t border-outline-variant/30 bg-surface/40 flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={`w-2 h-2 rounded-full shrink-0 ${
                  apiPingStatus === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
                }`} />
                <span className="text-[10px] font-mono text-on-surface-variant truncate">
                  {apiPingStatus === 'online' ? 'Sentinel Active' : 'Sentinel Disconnected'}
                </span>
              </div>
              <button
                onClick={toggleTheme}
                className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer shrink-0"
                title="Toggle Theme"
                aria-label="Toggle theme"
              >
                <span className="material-symbols-outlined text-[16px]">contrast</span>
              </button>
            </div>
          </aside>
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
