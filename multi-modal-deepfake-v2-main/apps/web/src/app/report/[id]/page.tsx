/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ForensicReport } from '../../../components/ForensicReport';
import { useAuth } from '../../../context/AuthContext';
import { getScanResult } from '../../../lib/scans';
import { Button, Skeleton, Chip } from '@repo/ui';
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
        setError('Failed to load report');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [user, id]);

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Report share link copied to clipboard!');
    }
  };

  const handleDownload = () => {
    setIsDownloading(true);
    toast.info('Generating high-resolution forensic PDF...');
    import('../../../lib/pdf').then(({ downloadPDF }) => {
      downloadPDF('forensic-report-content', `Veritas_Forensic_Report_${id}.pdf`);
      setIsDownloading(false);
      toast.success('PDF report downloaded successfully!');
    }).catch(() => {
      setIsDownloading(false);
      toast.error('Failed to generate PDF. You can also print this page directly.');
    });
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-8 max-w-5xl mx-auto flex flex-col gap-6 w-full pb-24">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-[600px] w-full rounded-3xl" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="p-8 max-w-5xl mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-4 w-full text-center">
        <div className="w-20 h-20 rounded-full bg-error/10 text-error flex items-center justify-center mb-2">
          <span className="material-symbols-outlined text-[44px]">sentiment_dissatisfied</span>
        </div>
        <h2 className="text-2xl font-bold text-on-surface">Report Not Found</h2>
        <p className="text-on-surface-variant max-w-md">The forensic report you are trying to access does not exist, has expired, or is restricted to another user account.</p>
        <div className="flex gap-3 mt-4">
          <Button variant="outlined" onClick={() => router.push('/history')}>Back to History</Button>
          <Button variant="filled" onClick={() => router.push('/')}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  // Format file metadata
  const fileData = {
    name: report.fileName,
    type: report.fileType,
    size: report.fileSize,
    url: undefined,
  };

  const timestamp = report.createdAt?.toDate ? report.createdAt.toDate().toLocaleString() : 'Recent';

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto flex flex-col w-full pb-24 print:p-0 print:m-0 print:max-w-none print:bg-white print:text-black">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-on-surface-variant mb-4 print:hidden">
        <button onClick={() => router.push('/')} className="hover:text-primary transition-colors">Dashboard</button>
        <span>/</span>
        <button onClick={() => router.push('/history')} className="hover:text-primary transition-colors">History</button>
        <span>/</span>
        <span className="font-mono text-on-surface truncate max-w-[200px]">{report.fileName || id}</span>
      </nav>

      {/* Action Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-container-low p-4 sm:p-5 rounded-2xl mb-8 border border-outline-variant/30 print:hidden shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="outlined" onClick={() => router.push('/history')} className="!py-2 !px-3 text-xs">
            <span className="material-symbols-outlined text-[18px] mr-1.5">arrow_back</span>
            History
          </Button>
          <div className="h-6 w-px bg-outline-variant/40 hidden sm:block"></div>
          <div>
            <h1 className="text-base font-bold text-on-surface truncate max-w-[260px] sm:max-w-md">{report.fileName}</h1>
            <p className="text-xs text-on-surface-variant font-mono">Report Ref: {String(id).substring(0, 16)}...</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <Button variant="tonal" onClick={handleShare} className="!py-2 !px-3 text-xs">
            <span className="material-symbols-outlined text-[18px] mr-1.5">share</span>
            Share
          </Button>
          <Button variant="filled" onClick={handleDownload} disabled={isDownloading} className="!py-2 !px-4 text-xs font-semibold shadow-md shadow-primary/20">
            <span className="material-symbols-outlined text-[18px] mr-1.5">{isDownloading ? 'hourglass_top' : 'download'}</span>
            {isDownloading ? 'Generating...' : 'Download PDF'}
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
