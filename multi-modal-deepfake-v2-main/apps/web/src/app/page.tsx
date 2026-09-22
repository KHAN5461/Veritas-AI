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
    <div className="p-8 max-w-6xl mx-auto flex flex-col gap-8 w-full">

      <div>
        <h1 className="text-3xl font-bold tracking-tight text-on-surface mb-1">Welcome back</h1>
        <p className="text-on-surface-variant">Here's a quick overview of your recent activity and system health.</p>
      </div>

      <ExtensionPromo />

      <div className="flex gap-3 flex-wrap">
        <Link href="/analyze"><Chip icon="troubleshoot" label="Analyze a File" /></Link>
        <Link href="/batch"><Chip icon="queue" label="Analyze Multiple Files" /></Link>
        <Link href="/api-hub"><Chip icon="api" label="Developer API" /></Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><StatWidget title="Files Checked" value={totalScans.toString()} label="Recent activity" icon="analytics" /></Card>
        <Card><StatWidget title="Edits Detected" value={deepfakes.toString()} label={totalScans > 0 ? ((deepfakes / totalScans) * 100).toFixed(0) + "% detection rate" : "0% detection rate"} isError icon="dangerous" /></Card>
        <Card><StatWidget title="Processing Speed" value="1.2s" label="Average per file" icon="speed" /></Card>
        <Card><StatWidget title="High Risk Files" value={deepfakes.toString()} label="Flagged for review" isError icon="gpp_bad" /></Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-on-surface">Your Recent Activity</h2>
          <Link href="/history"><Button variant="text">View All</Button></Link>
        </div>
        
        {scans.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {scans.map(item => (
              <ForensicCard key={item.id} title={item.fileName} score={item.confidence} verdict={item.is_fake ? 'Likely AI-Generated' : 'Likely Authentic'}>
                <div className="flex justify-between items-center text-xs mt-2 text-on-surface-variant">
                  <span>Processed seamlessly</span>
                  <a href={`/report/${item.id}`} className="cursor-pointer hover:text-primary underline">View Full Report</a>
                </div>
              </ForensicCard>
            ))}
          </div>
        ) : (
          <Card className="flex flex-col items-center justify-center py-8 text-on-surface-variant">
            <span className="material-symbols-outlined text-[32px] mb-2">inbox</span>
            <p>You haven't analyzed any files yet. Upload a video or audio clip to get started!</p>
          </Card>
        )}
      </div>

    </div>
  );
}
