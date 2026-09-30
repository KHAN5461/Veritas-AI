'use client';

import { useEffect } from 'react';
import { Card, Button } from '@repo/ui';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log the error to an error reporting service
    console.error('[Global Error Boundary]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card variant="glass" className="flex flex-col items-center text-center p-8 border-error/20">
          <div className="w-20 h-20 bg-error/10 rounded-full flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-[48px] text-error">
              warning
            </span>
          </div>
          
          <h2 className="text-2xl font-bold text-on-surface mb-2 tracking-tight">
            System Anomaly Detected
          </h2>
          
          <p className="text-on-surface-variant mb-8 text-sm">
            Veritas AI encountered an unexpected error while processing your request. Our telemetry systems have logged the issue.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Button 
              variant="tonal" 
              className="flex-1"
              onClick={() => router.push('/')}
            >
              Return Home
            </Button>
            <Button 
              className="flex-1 bg-error hover:bg-error/90 text-on-error"
              onClick={() => reset()}
            >
              Refresh Application
            </Button>
          </div>
          
          {error.digest && (
            <p className="mt-6 text-[10px] font-mono text-on-surface-variant/50">
              Error ID: {error.digest}
            </p>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
