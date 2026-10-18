'use client';

import React from 'react';

interface CustodyStripProps {
  fileName: string;
  fileType: string;
  fileSize: number;
  timestamp: string;
  fileHash: string;
  copiedHash: boolean;
  onCopyHash: () => void;
}

export function CustodyStrip({
  fileName,
  fileType,
  fileSize,
  timestamp,
  fileHash,
  copiedHash,
  onCopyHash,
}: CustodyStripProps) {
  // Format hash into 8-character chunks for human forensic readability
  const formattedHash = fileHash
    ? fileHash.match(/.{1,8}/g)?.join(' ') ?? fileHash
    : 'N/A';

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return 'Stream Buffer';
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const getFormatIcon = (type: string) => {
    if (type.startsWith('image/')) return 'image';
    if (type.startsWith('video/')) return 'videocam';
    if (type.startsWith('audio/')) return 'audiotrack';
    return 'description';
  };

  return (
    <section className="bg-surface-container-low p-5 sm:p-6 rounded-3xl border border-outline-variant/30 print:border-black/20 print:bg-transparent shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-primary">security</span>
          Chain of Custody &amp; Forensic Fingerprint
        </h2>
        <span className="text-[10.5px] font-mono text-on-surface-variant/70 bg-surface-container-highest px-2 py-0.5 rounded border border-outline-variant/20">
          Cryptographically Sealed
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
        {/* Card 1: Asset Identification */}
        <div className="p-3.5 rounded-2xl bg-surface-container/70 border border-outline-variant/25 flex flex-col justify-between hover:border-outline-variant/50 transition-colors">
          <span className="text-[11px] text-on-surface-variant mb-1.5 font-medium flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px] text-primary">
              {getFormatIcon(fileType)}
            </span>
            Asset Filename
          </span>
          <span className="font-mono font-semibold text-on-surface truncate block" title={fileName}>
            {fileName || 'Unknown Media Asset'}
          </span>
        </div>

        {/* Card 2: Dimension & Size */}
        <div className="p-3.5 rounded-2xl bg-surface-container/70 border border-outline-variant/25 flex flex-col justify-between hover:border-outline-variant/50 transition-colors">
          <span className="text-[11px] text-on-surface-variant mb-1.5 font-medium flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px] text-secondary">database</span>
            Payload Dimension
          </span>
          <span className="font-mono font-semibold text-on-surface block">
            {formatSize(fileSize)} • {fileType.split('/')[1]?.toUpperCase() || 'DATA'}
          </span>
        </div>

        {/* Card 3: Session Timestamp */}
        <div className="p-3.5 rounded-2xl bg-surface-container/70 border border-outline-variant/25 flex flex-col justify-between hover:border-outline-variant/50 transition-colors">
          <span className="text-[11px] text-on-surface-variant mb-1.5 font-medium flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px] text-tertiary">schedule</span>
            Examination Time
          </span>
          <span className="font-mono font-semibold text-on-surface block truncate" title={timestamp}>
            {timestamp}
          </span>
        </div>

        {/* Card 4: SHA-256 Fingerprint */}
        <div
          onClick={onCopyHash}
          className="p-3.5 rounded-2xl bg-surface-container/70 border border-outline-variant/25 flex flex-col justify-between cursor-pointer hover:border-primary/50 hover:bg-surface-container transition-all group"
          title="Click to copy full cryptographic SHA-256 fingerprint"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-on-surface-variant font-medium flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-primary">tag</span>
              SHA-256 Hash
            </span>
            <span className="material-symbols-outlined text-[15px] text-primary opacity-60 group-hover:opacity-100 transition-opacity">
              {copiedHash ? 'check' : 'content_copy'}
            </span>
          </div>
          <span className="font-mono font-bold text-on-surface truncate block text-[11px] tracking-tight group-hover:text-primary transition-colors">
            {fileHash ? `${fileHash.substring(0, 18)}...` : 'N/A'}
          </span>
        </div>
      </div>

      {/* Expanded Fingerprint Block */}
      {fileHash && (
        <div className="mt-3.5 p-2.5 rounded-xl bg-surface-container-highest/40 border border-outline-variant/20 flex items-center justify-between text-[10.5px] font-mono text-on-surface-variant overflow-x-auto">
          <span className="text-on-surface-variant/70 shrink-0 mr-2">Full SHA-256:</span>
          <span className="truncate select-all text-on-surface">{formattedHash}</span>
        </div>
      )}
    </section>
  );
}
