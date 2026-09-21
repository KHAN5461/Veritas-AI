/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import React, { useState, useRef } from 'react';
import { toast } from 'sonner';
import { Button, LinearProgress } from '@repo/ui';
import { ForensicReport } from '../../components/ForensicReport';
import { useAuth } from '../../context/AuthContext';
import { saveScanResult } from '../../lib/scans';
import { useRouter } from 'next/navigation';

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

export default function AnalyzePage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileHash, setFileHash] = useState<string>('');
  const [fileUrl, setFileUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [timestamp, setTimestamp] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const analyzeFile = async (targetFile: File) => {
    setFile(targetFile);
    setIsLoading(true);
    setResult(null);
    setFileUrl(URL.createObjectURL(targetFile));
    const now = new Date().toLocaleString();
    setTimestamp(now);
    
    const hash = await calculateSHA256(targetFile);
    setFileHash(hash);

    toast.success("Loaded " + targetFile.name + " for deep analysis.");
    try {
      const formData = new FormData();
      formData.append('file', targetFile);
      const response = await fetch('https://upside-shower-handling.ngrok-free.dev/detect', { method: 'POST', body: formData });
      if (!response.ok) throw new Error('API Error');
      const data = await response.json();
      setResult(data);
      toast.success('Analysis complete!');

      if (user) {
        // Save to Firestore
        const fileData = {
          name: targetFile.name,
          type: targetFile.type,
          size: targetFile.size,
        };
        const scanId = await saveScanResult(user.uid, fileData, data, hash);
        toast.success(`Report permanently saved (ID: ${scanId.substring(0,6)}...)`);
        
        // Optional: Redirect to the dedicated report page right after saving
        // router.push(`/report/${scanId}`);
      }
    } catch (err) {
      toast.error('Failed to analyze media. Is the backend running?');
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

      {isLoading && <LinearProgress />}

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
          <h3 className="text-xl font-medium text-on-surface mb-1">Drag and drop evidence</h3>
          <p className="text-sm text-on-surface-variant mb-6">Supports MP4, AVI, WAV, MP3, JPG, PNG</p>
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
