'use client';
import React from 'react';
import { Card, StatWidget, Chip } from '@repo/ui';

const THREAT_FEED = [
  { id: '1', actor: 'APT-DeepVoice', modality: 'Audio Clone', severity: 'CRITICAL', origin: 'Unknown', target: 'Financial Sector' },
  { id: '2', actor: 'Unknown', modality: 'Face Swap', severity: 'HIGH', origin: 'Social Media', target: 'Political Figures' },
  { id: '3', actor: 'GenZ-MemeGroup', modality: 'Lip Sync', severity: 'LOW', origin: 'TikTok', target: 'General Public' },
];

export default function ThreatIntelPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col gap-8 w-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-on-surface mb-1 flex items-center gap-3">
          <span className="material-symbols-outlined text-error text-[32px]">radar</span>
          Global Threat Intelligence
        </h1>
        <p className="text-on-surface-variant">Real-time monitoring of emerging synthetic media threat actors.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><StatWidget title="Global Threat Level" value="ELEVATED" isError icon="public" /></Card>
        <Card><StatWidget title="New Modalities" value="3" label="Last 24 hours" icon="new_releases" /></Card>
        <Card><StatWidget title="API Requests" value="1.2M" label="Global network" icon="dns" /></Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-6 py-4 bg-surface-container-high flex items-center justify-between">
          <h2 className="text-lg font-semibold text-on-surface">Live Threat Feed</h2>
          <Chip label="Live" icon="radio_button_checked" variant="filter" className="!bg-error-container !text-on-error-container" />
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-container-highest text-on-surface-variant text-xs uppercase">
            <tr>
              <th className="px-6 py-3 font-medium">Threat Actor</th>
              <th className="px-6 py-3 font-medium">Modality</th>
              <th className="px-6 py-3 font-medium">Severity</th>
              <th className="px-6 py-3 font-medium">Origin</th>
              <th className="px-6 py-3 font-medium">Target</th>
            </tr>
          </thead>
          <tbody>
            {THREAT_FEED.map((feed) => (
              <tr key={feed.id} className="border-b border-outline-variant/30 hover:bg-surface-container transition-colors">
                <td className="px-6 py-4 font-medium text-on-surface">{feed.actor}</td>
                <td className="px-6 py-4 text-on-surface-variant">{feed.modality}</td>
                <td className="px-6 py-4">
                  <Chip
                    label={feed.severity}
                    variant="filter"
                    className={feed.severity === 'CRITICAL' ? '!bg-error-container !text-on-error-container' : feed.severity === 'HIGH' ? '!bg-tertiary-container !text-on-tertiary-container' : ''}
                  />
                </td>
                <td className="px-6 py-4 text-on-surface-variant">{feed.origin}</td>
                <td className="px-6 py-4 text-on-surface-variant">{feed.target}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
