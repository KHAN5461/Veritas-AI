/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState } from 'react';
import { Button } from '@repo/ui';
import { toast } from 'sonner';

interface TelemetryViewerProps {
  exportData: any;
}

export function TelemetryViewer({ exportData }: TelemetryViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
    setCopied(true);
    toast.success('Forensic telemetry JSON copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="bg-surface-container-low p-5 sm:p-6 rounded-3xl border border-outline-variant/30 flex flex-col gap-4 shadow-xs">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-primary">data_object</span>
          Raw Model Inference Telemetry &amp; Structured Evidence
        </h2>
        <Button variant="tonal" onClick={handleCopy} className="!py-1.5 !px-3 text-xs rounded-xl">
          <span className="material-symbols-outlined text-[16px] mr-1">
            {copied ? 'check' : 'content_copy'}
          </span>
          {copied ? 'Copied' : 'Copy JSON'}
        </Button>
      </div>

      <pre className="p-4 sm:p-5 rounded-2xl bg-surface-container-lowest text-on-surface font-mono text-[11px] overflow-x-auto border border-outline-variant/30 leading-relaxed max-h-[480px] shadow-inner select-all">
        {JSON.stringify(exportData, null, 2)}
      </pre>
    </section>
  );
}
