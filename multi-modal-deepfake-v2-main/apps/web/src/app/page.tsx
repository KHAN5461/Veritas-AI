'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, StatWidget, ForensicCard, Button, Chip } from '@repo/ui';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

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
  const deepfakes = scans.filter(h => h.score > 0.5).length;

  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col gap-8 w-full">

      <div>
        <h1 className="text-3xl font-bold tracking-tight text-on-surface mb-1">Welcome back</h1>
        <p className="text-on-surface-variant">Your multimodal deepfake detection workspace.</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Link href="/analyze"><Chip icon="troubleshoot" label="Analyze Media" /></Link>
        <Link href="/batch"><Chip icon="queue" label="Batch Upload" /></Link>
        <Link href="/api-hub"><Chip icon="api" label="API Docs" /></Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><StatWidget title="Total Scans" value={totalScans.toString()} label="Recent" icon="analytics" /></Card>
        <Card><StatWidget title="Deepfakes Found" value={deepfakes.toString()} label={totalScans > 0 ? ((deepfakes / totalScans) * 100).toFixed(0) + "% hit rate" : "0% hit rate"} isError icon="dangerous" /></Card>
        <Card><StatWidget title="Avg Latency" value="1.2s" label="Per media file" icon="speed" /></Card>
        <Card><StatWidget title="Active Threats" value={deepfakes.toString()} label="Quarantined" isError icon="gpp_bad" /></Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-on-surface">Recent Scans</h2>
          <Link href="/history"><Button variant="text">View All</Button></Link>
        </div>
        
        {scans.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {scans.map(item => (
              <ForensicCard key={item.id} title={item.name} score={item.score} verdict={item.verdict}>
                Processed via ensemble pipeline.
              </ForensicCard>
            ))}
          </div>
        ) : (
          <Card className="flex flex-col items-center justify-center py-8 text-on-surface-variant">
            <span className="material-symbols-outlined text-[32px] mb-2">inbox</span>
            <p>No recent scans. Start by dropping a file.</p>
          </Card>
        )}
      </div>

    </div>
  );
}
