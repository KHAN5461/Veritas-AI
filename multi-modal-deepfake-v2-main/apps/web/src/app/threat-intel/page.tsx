/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { Card, StatWidget, Button, Skeleton } from '@repo/ui';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { getUserScans } from '../../lib/scans';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function ThreatIntelPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [scans, setScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'fake' | 'real'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) {
      getUserScans(user.uid)
        .then(data => {
          setScans(data || []);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  // Derived statistics
  const stats = useMemo(() => {
    const total = scans.length;
    const fakes = scans.filter(s => s.is_fake).length;
    const reals = total - fakes;

    let low = 0;
    let medium = 0;
    let high = 0;
    
    let videoCount = 0;
    let imageCount = 0;
    let audioCount = 0;

    scans.forEach(s => {
      const type = (s.fileType || '').toLowerCase();
      if (type.includes('video') || type.includes('mp4') || type.includes('avi')) videoCount++;
      else if (type.includes('audio') || type.includes('mp3') || type.includes('wav')) audioCount++;
      else imageCount++;

      if (s.is_fake && s.confidence) {
        const conf = s.confidence > 1 ? s.confidence : s.confidence * 100;
        if (conf < 70) low++;
        else if (conf < 90) medium++;
        else high++;
      }
    });

    const pieData = [
      { name: 'Authentic Media', value: reals, color: '#10b981' },
      { name: 'Manipulated / Deepfake', value: fakes, color: '#ef4444' }
    ];

    const barData = [
      { name: '50-70% (Suspicious)', count: low },
      { name: '70-90% (Probable)', count: medium },
      { name: '90-100% (Critical)', count: high }
    ];

    const mediaDistribution = [
      { name: 'Video Clips', count: videoCount, icon: 'movie' },
      { name: 'Still Images', count: imageCount, icon: 'image' },
      { name: 'Audio & Speech', count: audioCount, icon: 'graphic_eq' },
    ];

    return { total, fakes, reals, pieData, barData, mediaDistribution };
  }, [scans]);

  const filteredScans = useMemo(() => {
    return scans.filter(s => {
      const matchesType =
        filterType === 'all' ? true : filterType === 'fake' ? s.is_fake : !s.is_fake;
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
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
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
      ) : loading ? (
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

          {/* Graphical Analytics Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Authenticity Ratio Pie */}
            <Card className="bg-surface-container-low flex flex-col p-5 border border-outline-variant/30">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">donut_large</span>
                  Authenticity Distribution
                </h2>
                <span className="text-[11px] text-on-surface-variant font-mono">{stats.total} total</span>
              </div>
              <div className="h-56 w-full">
                {stats.total > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {stats.pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f1419',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '12px',
                          color: '#f8fafc',
                          fontSize: '12px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-on-surface-variant text-xs">
                    No data recorded yet
                  </div>
                )}
              </div>
              <div className="flex justify-center gap-6 pt-3 border-t border-outline-variant/20 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                  <span className="text-on-surface">Authentic ({stats.reals})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                  <span className="text-on-surface">Manipulated ({stats.fakes})</span>
                </div>
              </div>
            </Card>

            {/* Confidence Histogram */}
            <Card className="bg-surface-container-low flex flex-col p-5 border border-outline-variant/30">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">bar_chart</span>
                  Confidence Severity Matrix
                </h2>
                <span className="text-[11px] text-on-surface-variant font-mono">Tiers</span>
              </div>
              <div className="h-56 w-full">
                {stats.fakes > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={10} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        contentStyle={{
                          backgroundColor: '#0f1419',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '12px',
                          color: '#f8fafc',
                          fontSize: '12px'
                        }}
                      />
                      <Bar dataKey="count" fill="#ef4444" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
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
                  onChange={e => setSearchQuery(e.target.value)}
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
                  {filteredScans.slice(0, 15).map(scan => (
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
              {filteredScans.slice(0, 15).map(scan => (
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
