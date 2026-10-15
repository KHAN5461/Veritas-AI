/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ForensicReport } from '../../../components/ForensicReport';
import { useAuth } from '../../../context/AuthContext';
import { getScanResult } from '../../../lib/scans';
import { Button, Skeleton } from '@repo/ui';
import { toast } from 'sonner';

export default function ReportPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!user || !id) return;

    const fetchReport = async () => {
      try {
        const data = await getScanResult(user.uid, id as string);
        if (data) {
          setReport(data);
        } else {
          setError('Report not found');
        }
      } catch (err) {
        console.error('Error fetching report:', err);
        setError('Failed to load report');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [user, id]);

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      if (navigator.share) {
        navigator.share({
          title: `Veritas AI Forensic Report: ${report?.fileName || 'Analysis'}`,
          text: `Forensic report for ${report?.fileName}: assessed as ${report?.is_fake ? 'MANIPULATED' : 'AUTHENTIC'}.`,
          url: window.location.href,
        }).catch(() => {});
      } else {
        navigator.clipboard.writeText(window.location.href);
        toast.success('Report share link copied to clipboard!');
      }
    }
  };

  const handleCopyId = () => {
    if (!id) return;
    navigator.clipboard.writeText(String(id));
    toast.success('Report Reference ID copied to clipboard');
  };

  const handleDownload = async () => {
    if (!report) return;
    try {
      setIsDownloading(true);
      toast.info('Generating high-resolution court-ready forensic PDF...');
      const { downloadPDF } = await import('../../../lib/pdf');
      await downloadPDF('forensic-report-content', `Veritas_Forensic_Report_${String(id).substring(0, 12)}.pdf`, {
        result: report,
        fileData,
        fileHash: report.fileHash || 'N/A',
        timestamp
      });
      toast.success('Forensic PDF dossier downloaded successfully!');
    } catch (err: any) {
      console.error('PDF error:', err);
      toast.error('Failed to generate PDF. You can also print this page directly.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-8 max-w-5xl mx-auto flex flex-col gap-6 w-full pb-24 animate-pulse">
        {/* Breadcrumb Skeleton */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-20 rounded" />
          <span className="text-on-surface-variant/40">/</span>
          <Skeleton className="h-4 w-16 rounded" />
          <span className="text-on-surface-variant/40">/</span>
          <Skeleton className="h-4 w-32 rounded" />
        </div>

        {/* Action Header Banner Skeleton */}
        <div className="h-24 w-full bg-surface-container-low rounded-2xl border border-outline-variant/30 p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-9 w-24 rounded-xl" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-5 w-48 rounded" />
              <Skeleton className="h-3.5 w-32 rounded" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20 rounded-xl" />
            <Skeleton className="h-9 w-32 rounded-xl" />
          </div>
        </div>

        {/* Executive Verdict Skeleton */}
        <div className="h-48 w-full bg-surface-container-low rounded-2xl border border-outline-variant/30 p-6 flex justify-between items-center">
          <div className="flex flex-col gap-3 w-1/2">
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="h-8 w-64 rounded" />
            <Skeleton className="h-4 w-full rounded" />
          </div>
          <Skeleton className="h-32 w-32 rounded-full" />
        </div>

        {/* Signals Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="p-8 max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-4 w-full text-center">
        <div className="w-20 h-20 rounded-2xl bg-error/10 text-error border border-error/20 flex items-center justify-center mb-2 shadow-sm">
          <span className="material-symbols-outlined text-[44px]">shield_lock</span>
        </div>
        <h2 className="text-2xl font-bold text-on-surface">Report Unavailable</h2>
        <p className="text-sm text-on-surface-variant max-w-md leading-relaxed">
          The forensic dossier you are trying to view does not exist, has expired from memory, or is restricted to another authorized investigator.
        </p>
        <div className="flex gap-3 mt-4">
          <Button variant="outlined" onClick={() => router.push('/history')} className="text-xs">
            <span className="material-symbols-outlined text-[16px] mr-1">history</span>
            Back to Evidence Ledger
          </Button>
          <Button variant="filled" onClick={() => router.push('/analyze')} className="text-xs">
            <span className="material-symbols-outlined text-[16px] mr-1">radar</span>
            New Media Scan
          </Button>
        </div>
      </div>
    );
  }

  // Format file metadata
  const fileData = {
    name: report.fileName || 'Inspected Media Asset',
    type: report.fileType || 'application/octet-stream',
    size: report.fileSize || 0,
    url: report.mediaUrl || report.fileUrl || report.heatmap || undefined,
  };

  const timestamp = report.createdAt?.toDate 
    ? report.createdAt.toDate().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    : typeof report.createdAt === 'string'
    ? new Date(report.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Recent Forensic Session';

  const isFake = Boolean(report.is_fake);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto flex flex-col w-full pb-28 print:p-0 print:m-0 print:max-w-none print:bg-white print:text-black">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-on-surface-variant mb-4 print:hidden">
        <button onClick={() => router.push('/')} className="hover:text-primary transition-colors flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">home</span>
          Dashboard
        </button>
        <span className="text-outline-variant">/</span>
        <button onClick={() => router.push('/history')} className="hover:text-primary transition-colors">
          Evidence Ledger
        </button>
        <span className="text-outline-variant">/</span>
        <span className="font-mono text-on-surface truncate max-w-[200px] font-medium">
          {report.fileName || id}
        </span>
      </nav>

      {/* Action Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface-container-low p-4 sm:p-5 rounded-2xl mb-8 border border-outline-variant/30 print:hidden shadow-xs">
        {/* Left Side: Back, Title, Reference ID & Status */}
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <Button 
            variant="outlined" 
            onClick={() => router.push('/history')} 
            className="!py-2 !px-3 text-xs shrink-0 rounded-xl"
            title="Return to scan history"
          >
            <span className="material-symbols-outlined text-[16px] mr-1">arrow_back</span>
            Back
          </Button>

          <div className="h-8 w-px bg-outline-variant/30 hidden sm:block shrink-0" />

          <div className="min-w-0 flex flex-col">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold text-on-surface truncate max-w-[240px] sm:max-w-md">
                {report.fileName || 'Forensic Examination'}
              </h1>
              {/* Verdict Status Badge */}
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider ${
                isFake
                  ? 'bg-error/15 text-error border border-error/30'
                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              }`}>
                <span className="material-symbols-outlined text-[14px]">
                  {isFake ? 'warning' : 'verified'}
                </span>
                {isFake ? 'Manipulated' : 'Authentic'}
              </span>
            </div>

            {/* Click to Copy Reference ID */}
            <button
              onClick={handleCopyId}
              className="group text-left inline-flex items-center gap-1.5 text-xs text-on-surface-variant font-mono mt-0.5 hover:text-primary transition-colors cursor-pointer"
              title="Click to copy reference ID"
            >
              <span>Ref: {String(id).substring(0, 16)}...</span>
              <span className="material-symbols-outlined text-[13px] opacity-60 group-hover:opacity-100">content_copy</span>
            </button>
          </div>
        </div>

        {/* Right Side Action Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
          <Button 
            variant="tonal" 
            onClick={() => window.print()} 
            className="!py-2 !px-3 text-xs rounded-xl"
            title="Print forensic dossier directly"
          >
            <span className="material-symbols-outlined text-[16px] mr-1">print</span>
            Print
          </Button>

          <Button 
            variant="tonal" 
            onClick={handleShare} 
            className="!py-2 !px-3 text-xs rounded-xl"
            title="Share report link"
          >
            <span className="material-symbols-outlined text-[16px] mr-1">share</span>
            Share
          </Button>

          <Button 
            variant="filled" 
            onClick={handleDownload} 
            disabled={isDownloading} 
            className="!py-2 !px-4 text-xs font-semibold rounded-xl shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px] mr-1.5">
              {isDownloading ? 'hourglass_top' : 'download'}
            </span>
            {isDownloading ? 'Compiling PDF...' : 'Download PDF'}
          </Button>
        </div>
      </div>

      {/* Core Forensic Report */}
      <div className="w-full">
        <ForensicReport
          isLoading={false}
          result={report}
          fileData={fileData}
          fileHash={report.fileHash || 'N/A'}
          timestamp={timestamp}
        />
      </div>
    </div>
  );
}
