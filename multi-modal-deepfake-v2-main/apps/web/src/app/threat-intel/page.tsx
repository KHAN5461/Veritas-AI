'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { Card, StatWidget, Chip } from '@repo/ui';
import { useAuth } from '../../context/AuthContext';
import { getUserScans } from '../../lib/scans';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@repo/ui';

export default function ThreatIntelPage() {
  const { user } = useAuth();
  const [scans, setScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    
    scans.forEach(s => {
      if (s.is_fake && s.confidence) {
        const conf = s.confidence * 100;
        if (conf < 70) low++;
        else if (conf < 90) medium++;
        else high++;
      }
    });

    const pieData = [
      { name: 'Authentic', value: reals, color: '#10b981' },
      { name: 'Synthetic / Deepfake', value: fakes, color: '#ef4444' }
    ];

    const barData = [
      { name: '50-70% (Suspicious)', count: low },
      { name: '70-90% (Probable)', count: medium },
      { name: '90-100% (Critical)', count: high }
    ];

    return { total, fakes, reals, pieData, barData };
  }, [scans]);

  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col gap-8 w-full pb-24">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-on-surface mb-1 flex items-center gap-3">
          <span className="material-symbols-outlined text-error text-[32px]">radar</span>
          Global Threat Intelligence
        </h1>
        <p className="text-on-surface-variant">Real-time monitoring of synthetic media you have scanned.</p>
      </div>

      {!user ? (
        <Card className="text-center p-12">
          <p>Please log in to view your personalized threat intelligence dashboard.</p>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card><StatWidget title="Total Scans" value={stats.total.toString()} icon="query_stats" /></Card>
            <Card><StatWidget title="Detected Threats" value={stats.fakes.toString()} isError={stats.fakes > 0} icon="warning" /></Card>
            <Card><StatWidget title="Threat Ratio" value={stats.total > 0 ? Math.round((stats.fakes / stats.total) * 100) + '%' : '0%'} icon="pie_chart" /></Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="flex flex-col">
              <h2 className="text-lg font-semibold text-on-surface mb-4">Authenticity Ratio</h2>
              <div className="flex-1 min-h-[250px]">
                {stats.total > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {stats.pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--color-surface-container)', border: 'none', borderRadius: '8px', color: 'var(--color-on-surface)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-on-surface-variant text-sm">No data available</div>
                )}
              </div>
              <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div><span className="text-sm">Authentic</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div><span className="text-sm">Synthetic</span></div>
              </div>
            </Card>

            <Card className="flex flex-col">
              <h2 className="text-lg font-semibold text-on-surface mb-4">Threats by Confidence</h2>
              <div className="flex-1 min-h-[250px]">
                {stats.fakes > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)' }} axisLine={false} tickLine={false} />
                      <Tooltip 
                        cursor={{ fill: 'var(--color-surface-container-high)' }}
                        contentStyle={{ backgroundColor: 'var(--color-surface-container)', border: 'none', borderRadius: '8px', color: 'var(--color-on-surface)' }}
                      />
                      <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-on-surface-variant text-sm">No threats detected yet</div>
                )}
              </div>
            </Card>
          </div>

          <Card className="p-0 overflow-hidden">
            <div className="px-6 py-4 bg-surface-container-high flex items-center justify-between">
              <h2 className="text-lg font-semibold text-on-surface">Recent Threat Log</h2>
              <Chip label="Live" icon="radio_button_checked" variant="filter" className="!bg-error-container !text-on-error-container" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-surface-container-highest text-on-surface-variant text-xs uppercase">
                  <tr>
                    <th className="px-6 py-3 font-medium">Timestamp</th>
                    <th className="px-6 py-3 font-medium">File Name</th>
                    <th className="px-6 py-3 font-medium">Type</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {scans.slice(0, 10).map((scan) => (
                    <tr key={scan.id} className="border-b border-outline-variant/30 hover:bg-surface-container transition-colors">
                      <td className="px-6 py-4 text-on-surface-variant">{scan.createdAt?.toDate ? scan.createdAt.toDate().toLocaleString() : 'Just now'}</td>
                      <td className="px-6 py-4 font-medium text-on-surface max-w-[200px] truncate" title={scan.fileName}>{scan.fileName}</td>
                      <td className="px-6 py-4 text-on-surface-variant">{scan.fileType?.split('/')[0] || 'unknown'}</td>
                      <td className="px-6 py-4">
                        <Chip
                          label={scan.is_fake ? 'FAKE' : 'REAL'}
                          variant="filter"
                          className={scan.is_fake ? '!bg-error-container !text-on-error-container' : '!bg-emerald-500/20 !text-emerald-500'}
                        />
                      </td>
                      <td className="px-6 py-4 font-mono">{scan.confidence ? (scan.confidence * 100).toFixed(1) + '%' : 'N/A'}</td>
                    </tr>
                  ))}
                  {scans.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-on-surface-variant">
                        No scan history available.
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
