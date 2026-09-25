'use client';
import React, { useState, useEffect } from 'react';
import { ForensicCard, Card, StatWidget, Button, Chip } from '@repo/ui';
import { motion, AnimatePresence } from 'framer-motion';

import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';

type FilterType = 'all' | 'high_risk' | 'authentic' | 'audio';
type SortType = 'newest' | 'oldest' | 'highest_risk';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function HistoryPage() {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [sortOrder, setSortOrder] = useState<SortType>('newest');
  const [scans, setScans] = useState<any[]>([]);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, `users/${user.uid}/scans`), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setScans(data);
    });
    return () => unsubscribe();
  }, [user]);

  let filtered = scans.filter(item => {
    const matchesSearch = search === '' || item.fileName?.toLowerCase().includes(search.toLowerCase()) || item.id.includes(search);
    let matchesFilter = true;
    if (activeFilter === 'high_risk') matchesFilter = item.confidence > 0.8;
    if (activeFilter === 'authentic') matchesFilter = item.confidence < 0.3;
    if (activeFilter === 'audio') matchesFilter = item.fileType?.startsWith('audio/');
    return matchesSearch && matchesFilter;
  });

  filtered.sort((a, b) => {
    const timeA = a.createdAt?.toMillis?.() || a.createdAt || 0;
    const timeB = b.createdAt?.toMillis?.() || b.createdAt || 0;
    if (sortOrder === 'newest') return timeB - timeA;
    if (sortOrder === 'oldest') return timeA - timeB;
    if (sortOrder === 'highest_risk') return (b.confidence || 0) - (a.confidence || 0);
    return 0;
  });

  const totalScans = scans.length;
  const deepfakes = scans.filter(h => h.is_fake).length;

  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col gap-8 w-full">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold tracking-tight text-on-surface">Scan History</h1>
            <span className="bg-primary-container text-on-primary-container text-xs font-bold px-2.5 py-1 rounded-full">
              {filtered.length} {filtered.length === 1 ? 'Result' : 'Results'}
            </span>
          </div>
          <p className="text-on-surface-variant">Review past investigations and export forensic reports.</p>
        </div>
        <div className="flex gap-3 items-center flex-wrap">
          <input
            type="text"
            placeholder="Search by name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2.5 bg-surface-container-highest border-none rounded-full text-sm text-on-surface w-64 focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-on-surface-variant"
          />
          <div className="relative flex items-center bg-surface-container-highest rounded-full px-4 py-2.5">
            <span className="material-symbols-outlined text-on-surface-variant text-[18px] mr-2">sort</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortType)}
              className="bg-transparent border-none text-sm text-on-surface focus:outline-none cursor-pointer appearance-none pr-4"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest_risk">Highest Risk</option>
            </select>
          </div>
          <Button variant="tonal" onClick={() => { setSearch(''); setActiveFilter('all'); setSortOrder('newest'); }}>
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
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          <AnimatePresence>
            {filtered.map(item => (
              <motion.div 
                key={item.id} 
                variants={itemVariants}
                whileHover={{ scale: 1.02, y: -4 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                layout
              >
                <ForensicCard title={item.fileName} score={item.confidence} verdict={item.is_fake ? 'AI-Generated' : 'Authentic'}>
                  <div className="flex justify-between items-center text-xs mt-2 text-on-surface-variant">
                    <span>{item.date || new Date(item.createdAt?.toDate?.() || Date.now()).toLocaleString()}</span>
                    <a href={`/report/${item.id}`} className="cursor-pointer hover:text-primary underline">View Report</a>
                  </div>
                </ForensicCard>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 bg-surface-container-highest rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[48px] text-primary">manage_search</span>
            </div>
            <h3 className="text-xl font-bold text-on-surface mb-2">No results found</h3>
            <p className="text-base text-on-surface-variant mb-6 max-w-md">
              We couldn't find any scans matching your current filters. Adjust your search or run a new scan.
            </p>
            <div className="flex gap-4">
              <Button variant="tonal" onClick={() => { setSearch(''); setActiveFilter('all'); }}>
                Clear all filters
              </Button>
              <Button onClick={() => router.push('/')}>
                Run your first scan →
              </Button>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

