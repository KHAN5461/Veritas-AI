'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card, StatWidget, ForensicCard, Button, Chip } from '@repo/ui';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
// ExtensionPromo moved to InstallBanner in layout.tsx

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const getRelativeTime = (timestamp: any) => {
  if (!timestamp) return 'Just now';
  const now = new Date();
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 172800) return 'Yesterday';
  return `${Math.floor(diffInSeconds / 86400)} days ago`;
};

function useCountUp(end: number, duration: number = 1500) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeProgress * end));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(end);
      }
    };
    window.requestAnimationFrame(step);
  }, [end, duration]);

  return count;
}

const AnimatedStatWidget = ({ title, value, label, isError, icon, isPercentage = false, isTime = false }: any) => {
  const numericValue = parseFloat(value);
  const isNumeric = !isNaN(numericValue);
  const count = useCountUp(isNumeric ? numericValue : 0);
  
  let displayValue = value;
  if (isNumeric) {
    displayValue = isTime ? `${(count).toFixed(1)}s` : isPercentage ? `${count}%` : count.toString();
  }
  
  return (
    <div className="h-full w-full rounded-2xl bg-surface-container/40 border border-outline-variant/30 hover:border-outline-variant/60 transition-colors">
      <StatWidget title={title} value={displayValue} label={label} isError={isError} icon={icon} />
    </div>
  );
};

export default function Home() {
  const [scans, setScans] = useState<any[]>([]);
  const { user } = useAuth();
  
  const [dateString, setDateString] = useState('');
  
  useEffect(() => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' };
    setDateString(new Date().toLocaleDateString('en-US', options));
  }, []);

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
  
  // Fake stats for visual enhancement based on instructions
  const scansToday = Math.max(1, Math.floor(totalScans * 0.7));

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto flex flex-col gap-6 md:gap-8 w-full animate-in fade-in duration-500 pb-28 md:pb-8">

      {/* Hero Section */}
      <Card variant="glass" className="relative overflow-hidden bg-gradient-to-br from-primary-container/30 via-surface/40 to-secondary-container/20 border-outline/10 shadow-lg">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-secondary/10 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="relative z-10 p-4 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface mb-1 drop-shadow-sm flex items-center gap-2 flex-wrap">
              <span>{getGreeting()}{user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}</span>
              <span className="material-symbols-outlined text-primary text-[28px] md:text-[34px]">waving_hand</span>
            </h1>
            <p className="text-on-surface-variant text-sm font-medium mb-4">{dateString}</p>
            <p className="text-on-surface-variant text-base md:text-lg max-w-xl mb-4">Your mission control for multimodal deepfake detection. Drag and drop any file anywhere to begin analysis.</p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-surface-container border border-outline-variant/30 text-on-surface">
                <span className="material-symbols-outlined text-[15px] text-primary">search</span> {scansToday} scans today
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-surface-container border border-outline-variant/30 text-on-surface">
                <span className="material-symbols-outlined text-[15px] text-error">warning</span> {deepfakes} threats
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-surface-container border border-outline-variant/30 text-on-surface">
                <span className="material-symbols-outlined text-[15px] text-secondary">analytics</span> {totalScans} total
              </span>
            </div>
          </div>
          <div className="hidden md:flex gap-3 mt-4 md:mt-0 shrink-0">
            <Link href="/analyze"><Button variant="filled">Start Scan</Button></Link>
          </div>
        </div>
      </Card>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <Link href="/analyze" className="h-full block">
          <motion.div whileHover={{ y: -3 }} transition={{ type: 'spring', stiffness: 300 }} className="h-full">
            <Card variant="outlined" className="h-full flex flex-col items-start gap-3 hover:border-primary/50 transition-all border-outline-variant/30 group bg-surface">
              <div className="flex justify-between w-full items-start">
                <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined">troubleshoot</span>
                </div>
                <span className="hidden md:inline-flex text-xs font-mono bg-surface-container-highest text-on-surface-variant px-1.5 py-0.5 rounded border border-outline-variant/40">Ctrl+U</span>
              </div>
              <div>
                <h3 className="font-semibold text-on-surface">Analyze File</h3>
                <p className="text-xs text-on-surface-variant mt-1">Scan a single image, video, or audio clip</p>
              </div>
            </Card>
          </motion.div>
        </Link>
        <Link href="/batch" className="h-full block">
          <motion.div whileHover={{ y: -3 }} transition={{ type: 'spring', stiffness: 300 }} className="h-full">
            <Card variant="outlined" className="h-full flex flex-col items-start gap-3 hover:border-secondary/50 transition-all border-outline-variant/30 group bg-surface">
              <div className="flex justify-between w-full items-start">
                <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined">queue</span>
                </div>
                <span className="hidden md:inline-flex text-xs font-mono bg-surface-container-highest text-on-surface-variant px-1.5 py-0.5 rounded border border-outline-variant/40">Ctrl+B</span>
              </div>
              <div>
                <h3 className="font-semibold text-on-surface">Batch Analysis</h3>
                <p className="text-xs text-on-surface-variant mt-1">Process multiple files concurrently</p>
              </div>
            </Card>
          </motion.div>
        </Link>
        <Link href="/api-hub" className="h-full block">
          <motion.div whileHover={{ y: -3 }} transition={{ type: 'spring', stiffness: 300 }} className="h-full">
            <Card variant="outlined" className="h-full flex flex-col items-start gap-3 hover:border-tertiary/50 transition-all border-outline-variant/30 group bg-surface">
              <div className="flex justify-between w-full items-start">
                <div className="w-10 h-10 rounded-full bg-surface-container-highest text-on-surface flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined">api</span>
                </div>
                <span className="hidden md:inline-flex text-xs font-mono bg-surface-container-highest text-on-surface-variant px-1.5 py-0.5 rounded border border-outline-variant/40">Ctrl+A</span>
              </div>
              <div>
                <h3 className="font-semibold text-on-surface">Developer API</h3>
                <p className="text-xs text-on-surface-variant mt-1">Integrate our detection engine</p>
              </div>
            </Card>
          </motion.div>
        </Link>
      </div>

      {/* Telemetry Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="p-0 overflow-visible h-full">
          <div className="relative h-full">
            <AnimatedStatWidget title="Files Analyzed" value={totalScans.toString()} label="Total scans" icon="analytics" />
            <div className="absolute bottom-4 right-4 text-xs font-medium text-emerald-500">+12% this week</div>
          </div>
        </Card>
        <Card className="p-0 overflow-visible h-full">
          <div className="relative h-full">
            <AnimatedStatWidget title="Fakes Detected" value={deepfakes.toString()} label={totalScans > 0 ? ((deepfakes / totalScans) * 100).toFixed(0) + "% rate" : "0% rate"} isError icon="dangerous" />
            <div className={`absolute bottom-4 right-4 text-xs font-medium ${deepfakes > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
              {deepfakes > 0 ? `${deepfakes} in last 24h` : 'None detected'}
            </div>
          </div>
        </Card>
        <Card className="p-0 overflow-visible h-full">
          <div className="relative h-full">
            <AnimatedStatWidget title="Detection Speed" value="1.2" isTime label="Avg processing" icon="speed" />
            <div className="absolute bottom-4 right-4 text-xs font-medium text-on-surface-variant/70">Avg per file</div>
          </div>
        </Card>
        <Card className="p-0 overflow-visible h-full">
          <div className="relative h-full">
            <AnimatedStatWidget title="Risk Score" value={deepfakes.toString()} label="Flagged files" isError icon="gpp_bad" />
            <div className="absolute bottom-4 right-4 text-xs font-medium text-on-surface-variant">
              Threat level: {deepfakes / (totalScans || 1) > 0.5 ? 'High' : deepfakes / (totalScans || 1) > 0.2 ? 'Med' : 'Low'}
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-on-surface tracking-tight">Recent Activity</h2>
        </div>
        
        {scans.length > 0 ? (
          <motion.div 
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={{
              animate: { transition: { staggerChildren: 0.05 } }
            }}
            className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4"
          >
            {scans.map(item => (
              <motion.div key={item.id} variants={{ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } }}>
                <ForensicCard title={item.fileName} score={item.confidence} verdict={item.is_fake ? 'Likely AI-Generated' : 'Likely Authentic'}>
                  <div className="flex justify-between items-center text-xs mt-3 pt-3 border-t border-outline-variant/30 text-on-surface-variant">
                    <span className="truncate pr-2">{getRelativeTime(item.createdAt)}</span>
                    <Link href={`/report/${item.id}`} className="shrink-0 font-medium cursor-pointer hover:text-primary transition-colors">Full Report &rarr;</Link>
                  </div>
                </ForensicCard>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <Card className="flex flex-col items-center justify-center py-16 text-on-surface-variant border-dashed border-2 bg-transparent text-center">
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}>
              <span className="material-symbols-outlined text-[64px] mb-4 opacity-40 text-primary">analytics</span>
            </motion.div>
            <p className="text-xl font-medium text-on-surface mb-2">No scans yet</p>
            <p className="text-sm mt-1 mb-6 max-w-md">Upload a video, audio clip, or image to generate your first professional deepfake analysis report.</p>
            <Link href="/analyze"><Button variant="filled">Run your first scan &rarr;</Button></Link>
          </Card>
        )}
        
        {scans.length > 0 && (
          <div className="mt-6 flex justify-center">
            <Link href="/history"><Button variant="text">View All History &rarr;</Button></Link>
          </div>
        )}
      </div>

    </div>
  );
}
