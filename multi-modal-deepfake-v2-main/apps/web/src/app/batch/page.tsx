'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BatchRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/analyze?mode=batch');
  }, [router]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
      <p className="text-sm font-semibold text-on-surface">Redirecting to Unified Media Verification...</p>
      <p className="text-xs text-on-surface-variant mt-1">Batch capabilities are now built directly into the Analyze center.</p>
    </div>
  );
}
