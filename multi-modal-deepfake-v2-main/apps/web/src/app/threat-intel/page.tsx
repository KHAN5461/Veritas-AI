/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { Card, StatWidget, Button, Skeleton } from '@repo/ui';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { getUserScans } from '../../lib/scans';

export default function ThreatIntelPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Instant SWR Cache from LocalStorage
  const [scans, setScans] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('veritas_threat_intel_cache');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });

  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('veritas_threat_intel_cache');
      if (cached) return false;
    }
    return true;
  });

  const [filterType, setFilterType] = useState<'all' | 'fake' | 'real'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) {
      getUserScans(user.uid, 50)
        .then((data) => {
          if (data) {
            setScans(data);
            try {
              localStorage.setItem('veritas_threat_intel_cache', JSON.stringify(data));
            } catch {}
          }
        })
        .catch((err) => {
          console.warn('[ThreatIntel] Firestore fetch error:', err);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  // Derived statistics
  const stats = useMemo(() => {
    const total = scans.length;
    const fakes = scans.filter((s) => s.is_fake).length;
    const reals = total - fakes;

    let low = 0;
    let medium = 0;
    let high = 0;

    let videoCount = 0;
    let imageCount = 0;
    let audioCount = 0;

    scans.forEach((s) => {
      const type = (s.fileType || '').toLowerCase();
      if (type.includes('video') || type.includes('mp4') || type.includes('avi') || type.includes('mov')) videoCount++;
      else if (type.includes('audio') || type.includes('mp3') || type.includes('wav')) audioCount++;
      else imageCount++;

      if (s.is_fake && s.confidence) {
        const conf = s.confidence > 1 ? s.confidence : s.confidence * 100;
        if (conf < 70) low++;
        else if (conf < 90) medium++;
        else high++;
      }
    });

    const fakePct = total > 0 ? (fakes / total) * 100 : 0;
    const realPct = total > 0 ? (reals / total) * 100 : 0;

    const barData = [
      { name: '50-70% (Suspicious)', count: low, color: '#f59e0b' },
      { name: '70-90% (Probable)', count: medium, color: '#f97316' },
      { name: '90-100% (Critical)', count: high, color: '#ef4444' }
    ];

    const maxBarCount = Math.max(low, medium, high, 1);

    const mediaDistribution = [
      { name: 'Video Clips', count: videoCount, icon: 'movie' },
      { name: 'Still Images', count: imageCount, icon: 'image' },
      { name: 'Audio & Speech', count: audioCount, icon: 'graphic_eq' }
    ];

    return { total, fakes, reals, fakePct, realPct, barData, maxBarCount, mediaDistribution };
  }, [scans]);

  const filteredScans = useMemo(() => {
    return scans.filter((s) => {
      const matchesType = filterType === 'all' ? true : filterType === 'fake' ? s.is_fake : !s.is_fake;
      const matchesSearch =
        searchQuery === '' ||
        (s.fileName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.id || '').includes(searchQuery);
      return matchesType && matchesSearch;
    });
  }, [scans, filterType, searchQuery]);

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto flex flex-col gap-6 w-full pb-32">
      {/* Header & Status Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-primary text-[28px]">radar</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-on-surface">
              Threat Intelligence
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-on-surface-variant">
            Continuous telemetry of synthetic media signatures, confidence tiers, and attack vectors.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container border border-outline-variant/30 text-xs font-semibold text-on-surface">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            DEFCON 2 Active Telemetry
          </div>
        </div>
      </div>

      {!user ? (
        <Card className="text-center p-10 flex flex-col items-center gap-3 bg-surface-container-low border border-outline-variant/30">
          <div className="w-14 h-14 rounded-2xl bg-surface-container-highest flex items-center justify-center text-primary mb-2">
            <span className="material-symbols-outlined text-[30px]">lock</span>
          </div>
          <h3 className="text-lg font-bold text-on-surface">Authentication Required</h3>
          <p className="text-xs text-on-surface-variant max-w-md">
            Sign in with your Veritas account to populate personalized threat telemetry and forensic tracking.
          </p>
          <Button variant="filled" onClick={() => router.push('/login')} className="mt-2 text-xs">
            Log In to View Threat Feed
          </Button>
        </Card>
      ) : loading && scans.length === 0 ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </div>
      ) : (
        <>
          {/* Top Telemetry Widgets */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="bg-surface-container-low border border-outline-variant/30 p-4 flex flex-col justify-between">
              <StatWidget title="Total Scanned" value={stats.total.toString()} icon="query_stats" />
              <span className="text-[11px] text-on-surface-variant mt-2 font-mono">All modalities</span>
            </Card>

            <Card className="bg-surface-container-low border border-outline-variant/30 p-4 flex flex-col justify-between">
              <StatWidget title="Deepfakes Flagged" value={stats.fakes.toString()} isError={stats.fakes > 0} icon="warning" />
              <span className="text-[11px] text-error mt-2 font-mono">Requires forensic audit</span>
            </Card>

            <Card className="bg-surface-container-low border border-outline-variant/30 p-4 flex flex-col justify-between">
              <StatWidget title="Authentic Media" value={stats.reals.toString()} icon="verified_user" />
              <span className="text-[11px] text-emerald-400 mt-2 font-mono">Valid signatures</span>
            </Card>

            <Card className="bg-surface-container-low border border-outline-variant/30 p-4 flex flex-col justify-between">
              <StatWidget
                title="Threat Ratio"
                value={stats.total > 0 ? `${Math.round((stats.fakes / stats.total) * 100)}%` : '0%'}
                icon="pie_chart"
              />
              <span className="text-[11px] text-on-surface-variant mt-2 font-mono">Synthetics / Total</span>
            </Card>
          </div>

          {/* Media Format Vectors Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {stats.mediaDistribution.map((item, idx) => (
              <Card key={idx} className="bg-surface-container-low p-4 flex items-center justify-between border border-outline-variant/30">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-surface-container-highest flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-on-surface">{item.name}</h4>
                    <p className="text-[11px] text-on-surface-variant font-mono">Ingested</p>
                  </div>
                </div>
                <span className="text-lg font-bold font-mono text-on-surface">{item.count}</span>
              </Card>
            ))}
          </div>

          {/* Graphical Analytics (Ultra-Fast 0ms Native SVG Visualizations) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Authenticity Ratio Donut */}
            <Card className="bg-surface-container-low flex flex-col p-5 border border-outline-variant/30">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">donut_large</span>
                  Authenticity Distribution
                </h2>
                <span className="text-[11px] text-on-surface-variant font-mono">{stats.total} total</span>
              </div>

              <div className="h-56 w-full flex items-center justify-center">
                {stats.total > 0 ? (
                  <div className="relative w-44 h-44 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      {/* Background track */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        className="text-surface-container-highest"
                        strokeWidth="12"
                        stroke="currentColor"
                        fill="transparent"
                      />
                      {/* Authentic Segment (Green) */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        stroke="#10b981"
                        strokeWidth="12"
                        fill="transparent"
                        strokeDasharray={238.76}
                        strokeDashoffset={238.76 * (1 - stats.realPct / 100)}
                        strokeLinecap="round"
                        className="transition-all duration-700 ease-out"
                      />
                      {/* Fake Segment (Red) */}
                      {stats.fakes > 0 && (
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          stroke="#ef4444"
                          strokeWidth="12"
                          fill="transparent"
                          strokeDasharray={238.76}
                          strokeDashoffset={238.76 * (1 - stats.fakePct / 100)}
                          strokeDasharray-offset={238.76 * (stats.realPct / 100)}
                          className="transition-all duration-700 ease-out"
                        />
                      )}
                    </svg>

                    {/* Donut Center Label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-2xl font-black font-mono text-on-surface">
                        {stats.total > 0 ? `${Math.round(stats.realPct)}%` : '0%'}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">Authentic</span>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-on-surface-variant text-xs">
                    No data recorded yet
                  </div>
                )}
              </div>

              <div className="flex justify-center gap-6 pt-3 border-t border-outline-variant/20 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></div>
                  <span className="text-on-surface">Authentic ({stats.reals})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/50"></div>
                  <span className="text-on-surface">Manipulated ({stats.fakes})</span>
                </div>
              </div>
            </Card>

            {/* Confidence Histogram (Native Fast Bar Visualizer) */}
            <Card className="bg-surface-container-low flex flex-col p-5 border border-outline-variant/30">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">bar_chart</span>
                  Confidence Severity Matrix
                </h2>
                <span className="text-[11px] text-on-surface-variant font-mono">Tiers</span>
              </div>

              <div className="h-56 w-full flex flex-col justify-center gap-4 px-2">
                {stats.fakes > 0 ? (
                  stats.barData.map((tier, idx) => (
                    <div key={idx} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-on-surface">{tier.name}</span>
                        <span className="font-mono font-bold text-on-surface-variant">{tier.count} detected</span>
                      </div>
                      <div className="w-full h-3 bg-surface-container-highest rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{
                            width: `${Math.max(tier.count > 0 ? (tier.count / stats.maxBarCount) * 100 : 0, tier.count > 0 ? 8 : 0)}%`,
                            backgroundColor: tier.color,
                            boxShadow: `0 0 10px ${tier.color}40`
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex items-center justify-center text-on-surface-variant text-xs">
                    No active threats flagged in matrix
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-outline-variant/20 text-[11px] text-on-surface-variant text-center">
                Critical tier flags indicate &gt;90% ViT facial artefact alignment or synthetic voice cloning.
              </div>
            </Card>
          </div>

          {/* Incident Log Feed */}
          <Card className="p-0 overflow-hidden bg-surface-container-low border border-outline-variant/30 shadow-sm">
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/20">
              <div>
                <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">assignment</span>
                  Forensic Incident Ledger
                </h2>
                <p className="text-xs text-on-surface-variant">Filterable audit feed of processed media objects.</p>
              </div>

              {/* Standard Filter Bar */}
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  placeholder="Filter logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-surface-container-highest text-xs rounded-xl px-3 py-1.5 text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary w-36 sm:w-44"
                />
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    filterType === 'all'
                      ? 'bg-primary-container text-on-primary-container'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  All ({scans.length})
                </button>
                <button
                  onClick={() => setFilterType('fake')}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    filterType === 'fake'
                      ? 'bg-error/20 text-error'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Threats ({stats.fakes})
                </button>
                <button
                  onClick={() => setFilterType('real')}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    filterType === 'real'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Authentic ({stats.reals})
                </button>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-surface-container-highest/60 text-on-surface-variant uppercase font-mono tracking-wider">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Incident Time</th>
                    <th className="px-5 py-3 font-semibold">Designation</th>
                    <th className="px-5 py-3 font-semibold">Format</th>
                    <th className="px-5 py-3 font-semibold">Verdict</th>
                    <th className="px-5 py-3 font-semibold">Confidence</th>
                    <th className="px-5 py-3 font-semibold text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {filteredScans.slice(0, 15).map((scan) => (
                    <tr key={scan.id} className="hover:bg-surface-container/60 transition-colors">
                      <td className="px-5 py-3 font-mono text-on-surface-variant">
                        {scan.createdAt?.toDate ? scan.createdAt.toDate().toLocaleString() : 'Just now'}
                      </td>
                      <td className="px-5 py-3 font-semibold text-on-surface max-w-[200px] truncate" title={scan.fileName}>
                        {scan.fileName}
                      </td>
                      <td className="px-5 py-3 uppercase text-on-surface-variant font-mono">
                        {scan.fileType?.split('/')[1] || scan.fileType || 'MEDIA'}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            scan.is_fake
                              ? 'bg-error/15 text-error border-error/30'
                              : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {scan.is_fake ? 'MANIPULATED' : 'AUTHENTIC'}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono font-bold">
                        {scan.confidence ? `${(scan.confidence > 1 ? scan.confidence : scan.confidence * 100).toFixed(1)}%` : 'N/A'}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => router.push(`/report/${scan.id}`)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
                        >
                          View Report &rarr;
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (optimized touch ergonomics) */}
            <div className="sm:hidden divide-y divide-outline-variant/20">
              {filteredScans.slice(0, 15).map((scan) => (
                <div key={scan.id} className="p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        scan.is_fake
                          ? 'bg-error/15 text-error border-error/30'
                          : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      {scan.is_fake ? 'MANIPULATED' : 'AUTHENTIC'}
                    </span>
                    <span className="font-mono text-xs font-bold text-on-surface">
                      {scan.confidence ? `${(scan.confidence > 1 ? scan.confidence : scan.confidence * 100).toFixed(1)}%` : 'N/A'}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-on-surface truncate">{scan.fileName}</p>

                  <div className="flex items-center justify-between text-[11px] text-on-surface-variant font-mono mt-1">
                    <span>{scan.createdAt?.toDate ? scan.createdAt.toDate().toLocaleDateString() : 'Recent'}</span>
                    <button
                      onClick={() => router.push(`/report/${scan.id}`)}
                      className="text-primary font-semibold hover:underline"
                    >
                      View Report &rarr;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
