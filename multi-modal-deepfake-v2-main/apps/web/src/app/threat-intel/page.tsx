/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { Card, StatWidget, Chip, Button, Skeleton } from '@repo/ui';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { getUserScans } from '../../lib/scans';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { motion } from 'framer-motion';

export default function ThreatIntelPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [scans, setScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'fake' | 'real'>('all');

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

    // Confidence buckets for fakes
    let low = 0; // <70
    let medium = 0; // 70-90
    let high = 0; // >90
    
    // Type counts
    let videoCount = 0;
    let imageCount = 0;
    let audioCount = 0;

    scans.forEach(s => {
      const type = (s.fileType || '').toLowerCase();
      if (type.includes('video') || type.includes('mp4') || type.includes('avi')) videoCount++;
      else if (type.includes('audio') || type.includes('mp3') || type.includes('wav')) audioCount++;
      else imageCount++;

      if (s.is_fake && s.confidence) {
        const conf = s.confidence * 100;
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
    if (filterType === 'fake') return scans.filter(s => s.is_fake);
    if (filterType === 'real') return scans.filter(s => !s.is_fake);
    return scans;
  }, [scans, filterType]);

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto flex flex-col gap-8 w-full pb-28">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-on-surface mb-1 flex items-center gap-3">
            <span className="material-symbols-outlined text-error text-[36px] animate-pulse">radar</span>
            Global Threat Intelligence
          </h1>
          <p className="text-on-surface-variant">Continuous telemetry of synthetic media signatures, artifact distributions, and confidence tiers.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-error/10 border border-error/30 text-error text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-error animate-ping"></span>
            DEFCON 2 Active Monitoring
          </div>
        </div>
      </div>

      {!user ? (
        <Card className="text-center p-12 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[32px]">lock</span>
          </div>
          <h3 className="text-xl font-bold text-on-surface">Authentication Required</h3>
          <p className="text-on-surface-variant max-w-md">Sign in with your Veritas account to populate personalized threat telemetry and forensic tracking.</p>
          <Button variant="filled" onClick={() => router.push('/login')}>Log In to View Feed</Button>
        </Card>
      ) : loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      ) : (
        <>
          {/* Top Telemetry Widgets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5 flex flex-col justify-between">
              <StatWidget title="Total Audited Media" value={stats.total.toString()} icon="query_stats" />
              <div className="mt-2 text-xs text-on-surface-variant">All multi-modal ingestions</div>
            </Card>

            <Card className="p-5 flex flex-col justify-between border-l-4 border-l-error">
              <StatWidget title="Synthetics Detected" value={stats.fakes.toString()} isError={stats.fakes > 0} icon="warning" />
              <div className="mt-2 text-xs text-error font-medium">Requires verification tag</div>
            </Card>

            <Card className="p-5 flex flex-col justify-between border-l-4 border-l-emerald-500">
              <StatWidget title="Verified Authentic" value={stats.reals.toString()} icon="verified_user" />
              <div className="mt-2 text-xs text-emerald-400 font-medium">Original biometric signatures</div>
            </Card>

            <Card className="p-5 flex flex-col justify-between">
              <StatWidget 
                title="Overall Threat Ratio" 
                value={stats.total > 0 ? `${Math.round((stats.fakes / stats.total) * 100)}%` : '0%'} 
                icon="pie_chart" 
              />
              <div className="mt-2 text-xs text-on-surface-variant">Synthetics vs Authentic ratio</div>
            </Card>
          </div>

          {/* Media Format Vectors Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.mediaDistribution.map((item, idx) => (
              <Card key={idx} className="p-4 flex items-center justify-between border border-outline-variant/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">{item.icon}</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-on-surface">{item.name}</h4>
                    <p className="text-xs text-on-surface-variant">Audited entries</p>
                  </div>
                </div>
                <span className="text-xl font-bold font-mono text-on-surface">{item.count}</span>
              </Card>
            ))}
          </div>

          {/* Graphical Analytics Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Authenticity Ratio Pie */}
            <Card className="flex flex-col p-6 border border-outline-variant/30">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">donut_large</span>
                  Authenticity Ratio Distribution
                </h2>
                <span className="text-xs text-on-surface-variant font-mono">{stats.total} total objects</span>
              </div>
              <div className="flex-1 min-h-[260px]">
                {stats.total > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={6}
                        dataKey="value"
                      >
                        {stats.pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1e293b', 
                          border: '1px solid rgba(255,255,255,0.1)', 
                          borderRadius: '12px', 
                          color: '#f8fafc',
                          fontSize: '12px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-on-surface-variant text-sm">
                    No data recorded yet
                  </div>
                )}
              </div>
              <div className="flex justify-center gap-8 mt-2 pt-3 border-t border-outline-variant/20">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span className="text-xs font-medium text-on-surface">Authentic ({stats.reals})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-xs font-medium text-on-surface">Synthetic / Deepfake ({stats.fakes})</span>
                </div>
              </div>
            </Card>

            {/* Threat Severity Buckets */}
            <Card className="flex flex-col p-6 border border-outline-variant/30">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-error text-xl">bar_chart</span>
                  Severity Tiers by Model Confidence
                </h2>
                <span className="text-xs text-on-surface-variant font-mono">High confidence flags</span>
              </div>
              <div className="flex-1 min-h-[260px]">
                {stats.fakes > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.barData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant, #94a3b8)' }} 
                        axisLine={false} 
                        tickLine={false} 
                      />
                      <YAxis 
                        tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant, #94a3b8)' }} 
                        axisLine={false} 
                        tickLine={false} 
                      />
                      <Tooltip 
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        contentStyle={{ 
                          backgroundColor: '#1e293b', 
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
                  <div className="h-full flex items-center justify-center text-on-surface-variant text-sm">
                    No active threats flagged in confidence matrix
                  </div>
                )}
              </div>
              <div className="mt-2 pt-3 border-t border-outline-variant/20 text-xs text-on-surface-variant text-center">
                Critical tier flags indicate &gt;90% ViT facial artefact alignment or audio phase distortion.
              </div>
            </Card>
          </div>

          {/* Detailed Threat Audit Feed */}
          <Card className="p-0 overflow-hidden border border-outline-variant/40 shadow-xl">
            <div className="px-6 py-4 bg-surface-container-high flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/20">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">security_update_warning</span>
                <div>
                  <h2 className="text-lg font-bold text-on-surface">Recent Forensic Incidents & Logs</h2>
                  <p className="text-xs text-on-surface-variant">Live audit ledger of scanned artifacts.</p>
                </div>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filterType === 'all' ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  All ({scans.length})
                </button>
                <button
                  onClick={() => setFilterType('fake')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filterType === 'fake' ? 'bg-error text-on-error' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Threats Only ({stats.fakes})
                </button>
                <button
                  onClick={() => setFilterType('real')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filterType === 'real' ? 'bg-emerald-500 text-white' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Authentic ({stats.reals})
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-surface-container-highest text-on-surface-variant text-xs uppercase font-mono tracking-wider">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Incident Time</th>
                    <th className="px-6 py-3 font-semibold">File Designation</th>
                    <th className="px-6 py-3 font-semibold">Format</th>
                    <th className="px-6 py-3 font-semibold">Verdict</th>
                    <th className="px-6 py-3 font-semibold">Confidence</th>
                    <th className="px-6 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {filteredScans.slice(0, 15).map((scan) => (
                    <tr key={scan.id} className="hover:bg-surface-container/60 transition-colors">
                      <td className="px-6 py-4 text-xs font-mono text-on-surface-variant">
                        {scan.createdAt?.toDate ? scan.createdAt.toDate().toLocaleString() : 'Just now'}
                      </td>
                      <td className="px-6 py-4 font-semibold text-on-surface max-w-[220px] truncate" title={scan.fileName}>
                        {scan.fileName}
                      </td>
                      <td className="px-6 py-4 text-xs uppercase text-on-surface-variant">
                        <span className="px-2 py-0.5 rounded bg-surface-container-high font-mono">
                          {scan.fileType?.split('/')[1] || scan.fileType || 'MEDIA'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Chip
                          label={scan.is_fake ? 'MANIPULATED' : 'AUTHENTIC'}
                          variant="filter"
                          className={scan.is_fake ? '!bg-error/20 !text-error !font-bold text-xs' : '!bg-emerald-500/20 !text-emerald-400 !font-bold text-xs'}
                        />
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-sm">
                        {scan.confidence ? (scan.confidence * 100).toFixed(1) + '%' : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button 
                          variant="text" 
                          onClick={() => router.push(`/report/${scan.id}`)}
                          className="!py-1 !px-2 text-xs"
                        >
                          <span className="material-symbols-outlined text-[16px] mr-1">description</span>
                          Report
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filteredScans.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant">
                        <div className="flex flex-col items-center gap-2">
                          <span className="material-symbols-outlined text-[40px] text-on-surface-variant/40">search_off</span>
                          <span>No incidents matching active filter criteria.</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
