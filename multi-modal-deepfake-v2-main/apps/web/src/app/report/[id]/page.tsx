/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ForensicReport } from '../../../components/ForensicReport';
import { useAuth } from '../../../context/AuthContext';
import { getScanResult } from '../../../lib/scans';
import { Button, Skeleton } from '@repo/ui';

export default function ReportPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto flex flex-col gap-8 w-full">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="p-8 max-w-5xl mx-auto flex flex-col items-center justify-center h-[60vh] gap-4 w-full">
        <span className="material-symbols-outlined text-[64px] text-on-surface-variant">error</span>
        <h2 className="text-2xl font-bold text-on-surface">Report Not Found</h2>
        <p className="text-on-surface-variant">The forensic report you are looking for does not exist or you do not have access to it.</p>
        <Button variant="filled" onClick={() => router.push('/')}>Go to Dashboard</Button>
      </div>
    );
  }

  // Format the file data
  const fileData = {
    name: report.fileName,
    type: report.fileType,
    size: report.fileSize,
    url: undefined, // Cannot provide local URL from database without full storage bucket
  };

  const timestamp = report.createdAt?.toDate ? report.createdAt.toDate().toLocaleString() : 'Unknown Date';

  const handleDownload = () => {
    import('../../../lib/pdf').then(({ downloadPDF }) => {
      downloadPDF('forensic-report-content', `Veritas_Report_${id}.pdf`);
    });
  };

  return (
    <div className="p-8 max-w-5xl mx-auto flex flex-col w-full print:p-0 print:m-0 print:max-w-none print:bg-white print:text-black">
      <div className="flex justify-between items-center print:hidden bg-surface-container-low p-4 rounded-2xl mb-8">
        <Button variant="outlined" onClick={() => router.push('/history')}>
          <span className="material-symbols-outlined text-[18px] mr-2">arrow_back</span>
          Back to History
        </Button>
        <Button variant="filled" onClick={handleDownload}>
          <span className="material-symbols-outlined text-[18px] mr-2">download</span>
          Download PDF Report
        </Button>
      </div>

      <div id="forensic-report-content">
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
