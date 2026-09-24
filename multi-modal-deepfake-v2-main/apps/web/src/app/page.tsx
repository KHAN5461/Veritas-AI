'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, StatWidget, ForensicCard, Button, Chip } from '@repo/ui';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { ExtensionPromo } from '../components/ExtensionPromo';

export default function Home() {
  const [scans, setScans] = useState<any[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, `users/${user.uid}/scans`), orderBy('createdAt', 'desc'), limit(3));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setScans(data);
    });
    return () => unsubscribe();
  }, [user]);

  const totalScans = scans.length; // In a real app, use an aggregation query
  const deepfakes = scans.filter(h => h.is_fake).length;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto flex flex-col gap-6 md:gap-8 w-full animate-in fade-in duration-500 pb-24 md:pb-8">

      {/* Hero Section */}
      <Card variant="glass" className="relative overflow-hidden bg-gradient-to-br from-primary-container/40 via-surface/20 to-secondary-container/40 border-outline/10 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-primary/20 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-secondary/20 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="relative z-10 p-4 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface mb-2 drop-shadow-sm">Welcome back{user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}</h1>
            <p className="text-on-surface-variant text-base md:text-lg max-w-xl">Your mission control for multimodal deepfake detection. Drag and drop any file anywhere to begin analysis.</p>
          </div>
          <div className="hidden md:flex gap-3">
            <Link href="/analyze"><Button variant="filled">Start Scan</Button></Link>
          </div>
        </div>
      </Card>

      <ExtensionPromo />

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <Link href="/analyze">
          <Card variant="outlined" className="h-full flex flex-col items-start gap-3 hover:border-primary/50 transition-colors group">
            <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined">troubleshoot</span>
            </div>
            <div>
              <h3 className="font-semibold text-on-surface">Analyze File</h3>
              <p className="text-xs text-on-surface-variant mt-1">Scan a single image, video, or audio clip</p>
            </div>
          </Card>
        </Link>
        <Link href="/batch">
          <Card variant="outlined" className="h-full flex flex-col items-start gap-3 hover:border-primary/50 transition-colors group">
            <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined">queue</span>
            </div>
            <div>
              <h3 className="font-semibold text-on-surface">Batch Analysis</h3>
              <p className="text-xs text-on-surface-variant mt-1">Process multiple files concurrently</p>
            </div>
          </Card>
        </Link>
        <Link href="/api-hub">
          <Card variant="outlined" className="h-full flex flex-col items-start gap-3 hover:border-primary/50 transition-colors group">
            <div className="w-10 h-10 rounded-full bg-surface-container-highest text-on-surface flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined">api</span>
            </div>
            <div>
              <h3 className="font-semibold text-on-surface">Developer API</h3>
              <p className="text-xs text-on-surface-variant mt-1">Integrate our detection engine</p>
            </div>
          </Card>
        </Link>
      </div>

      {/* Telemetry Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card><StatWidget title="Files" value={totalScans.toString()} label="Total scans" icon="analytics" /></Card>
        <Card><StatWidget title="Fakes" value={deepfakes.toString()} label={totalScans > 0 ? ((deepfakes / totalScans) * 100).toFixed(0) + "% rate" : "0% rate"} isError icon="dangerous" /></Card>
        <Card><StatWidget title="Speed" value="1.2s" label="Avg processing" icon="speed" /></Card>
        <Card><StatWidget title="Risk" value={deepfakes.toString()} label="Flagged files" isError icon="gpp_bad" /></Card>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-on-surface tracking-tight">Recent Activity</h2>
          <Link href="/history"><Button variant="text">View All</Button></Link>
        </div>
        
        {scans.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {scans.map(item => (
              <ForensicCard key={item.id} title={item.fileName} score={item.confidence} verdict={item.is_fake ? 'Likely AI-Generated' : 'Likely Authentic'}>
                <div className="flex justify-between items-center text-xs mt-3 pt-3 border-t border-outline-variant/30 text-on-surface-variant">
                  <span className="truncate pr-2">Processed seamlessly</span>
                  <a href={`/report/${item.id}`} className="shrink-0 font-medium cursor-pointer hover:text-primary transition-colors">Full Report &rarr;</a>
                </div>
              </ForensicCard>
            ))}
          </div>
        ) : (
          <Card className="flex flex-col items-center justify-center py-12 text-on-surface-variant border-dashed border-2 bg-transparent">
            <span className="material-symbols-outlined text-[48px] mb-3 opacity-50">inbox</span>
            <p className="font-medium text-on-surface">No scans yet</p>
            <p className="text-sm mt-1">Upload a video or audio clip to get started!</p>
          </Card>
        )}
      </div>

    </div>
  );
}
