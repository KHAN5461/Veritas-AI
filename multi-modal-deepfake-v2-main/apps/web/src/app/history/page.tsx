'use client';
import React, { useState, useEffect } from 'react';
import { ForensicCard, Card, StatWidget, Button, Chip } from '@repo/ui';

import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';

type FilterType = 'all' | 'high_risk' | 'authentic' | 'audio';

export default function HistoryPage() {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [scans, setScans] = useState<any[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, `users/${user.uid}/scans`), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setScans(data);
    });
    return () => unsubscribe();
  }, [user]);

  const filtered = scans.filter(item => {
    const matchesSearch = search === '' || item.name.toLowerCase().includes(search.toLowerCase()) || item.id.includes(search);
    let matchesFilter = true;
    if (activeFilter === 'high_risk') matchesFilter = item.score > 0.8;
    if (activeFilter === 'authentic') matchesFilter = item.score < 0.3;
    if (activeFilter === 'audio') matchesFilter = item.modality === 'audio';
    return matchesSearch && matchesFilter;
  });

  const totalScans = scans.length;
  const deepfakes = scans.filter(h => h.score > 0.5).length;

  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col gap-8 w-full">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-on-surface mb-1">Scan History</h1>
          <p className="text-on-surface-variant">Review past investigations and export forensic reports.</p>
        </div>
        <div className="flex gap-3 items-center">
          <input
            type="text"
            placeholder="Search by name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2.5 bg-surface-container-highest border-none rounded-full text-sm text-on-surface w-64 focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-on-surface-variant"
          />
          <Button variant="tonal" onClick={() => { setSearch(''); setActiveFilter('all'); }}>
            <span className="material-symbols-outlined text-[18px]">clear_all</span> Reset
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><StatWidget title="Total Scans" value={String(totalScans)} label="All time" icon="history" /></Card>
        <Card><StatWidget title="Deepfakes" value={String(deepfakes)} label={totalScans > 0 ? ((deepfakes / totalScans) * 100).toFixed(0) + "% hit rate" : "0% hit rate"} isError icon="warning" /></Card>
        <Card><StatWidget title="Avg Time" value="1.2s" label="Per file" icon="timer" /></Card>
        <Card><StatWidget title="Showing" value={String(filtered.length)} label={"of " + totalScans + " total"} icon="filter_list" /></Card>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Chip label="All" selected={activeFilter === 'all'} onClick={() => setActiveFilter('all')} />
        <Chip label="High Risk" icon="warning" selected={activeFilter === 'high_risk'} onClick={() => setActiveFilter('high_risk')} />
        <Chip label="Authentic" icon="verified" selected={activeFilter === 'authentic'} onClick={() => setActiveFilter('authentic')} />
        <Chip label="Audio Only" icon="mic" selected={activeFilter === 'audio'} onClick={() => setActiveFilter('audio')} />
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => (
            <ForensicCard key={item.id} title={item.name} score={item.score} verdict={item.verdict}>
              <div className="flex justify-between items-center text-xs mt-2 text-on-surface-variant">
                <span>{item.date || new Date(item.createdAt?.toDate?.() || Date.now()).toLocaleString()}</span>
                <span className="cursor-pointer hover:text-primary underline">View Report</span>
              </div>
            </ForensicCard>
          ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center py-12">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-3">search_off</span>
          <h3 className="text-lg font-medium text-on-surface mb-1">No results found</h3>
          <p className="text-sm text-on-surface-variant mb-4">Try adjusting your search or filters to find what you're looking for.</p>
          <Button variant="tonal" onClick={() => { setSearch(''); setActiveFilter('all'); }}>
            Clear all filters
          </Button>
        </Card>
      )}
    </div>
  );
}
