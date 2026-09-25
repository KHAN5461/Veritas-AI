import React from 'react';
import Link from 'next/link';
import { Button } from '@repo/ui';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4 text-center">
      <span className="material-symbols-outlined text-[120px] text-primary/80 mb-6 drop-shadow-lg">
        explore_off
      </span>
      <h1 className="text-8xl font-black text-on-surface tracking-tighter mb-4 drop-shadow-md">
        404
      </h1>
      <h2 className="text-3xl font-bold text-primary mb-3">Lost in the data?</h2>
      <p className="text-lg text-on-surface-variant max-w-md mx-auto mb-8">
        The page you're looking for doesn't exist or has been moved.
      </p>
      
      <Link href="/" passHref>
        <Button variant="filled" className="!px-8 !h-12 !rounded-full text-base">
          Go Home
        </Button>
      </Link>
    </div>
  );
}
