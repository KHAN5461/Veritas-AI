'use client';
import React, { useState, useEffect } from 'react';
import { Card, Button, Switch } from '@repo/ui';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [autoQuarantine, setAutoQuarantine] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(false);
  const [threshold, setThreshold] = useState(85);
  const [truthscanKey, setTruthscanKey] = useState('');
  const [hfToken, setHfToken] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('veritas-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setAutoQuarantine(parsed.autoQuarantine ?? true);
        setEmailAlerts(parsed.emailAlerts ?? false);
        setThreshold(parsed.threshold ?? 85);
        setTruthscanKey(parsed.truthscanKey ?? '');
        setHfToken(parsed.hfToken ?? '');
      } catch {}
    }
  }, []);

  const saveSettings = () => {
    const settings = { autoQuarantine, emailAlerts, threshold, truthscanKey, hfToken };
    localStorage.setItem('veritas-settings', JSON.stringify(settings));
    toast.success('Settings saved successfully!');
  };

  return (
    <div className="p-8 max-w-3xl mx-auto flex flex-col gap-8 w-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-on-surface mb-1">Settings</h1>
        <p className="text-on-surface-variant">Manage API keys, thresholds, and system preferences.</p>
      </div>

      <Card>
        <h2 className="text-xl font-semibold text-on-surface mb-6">API Configuration</h2>
        <div className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-medium text-on-surface mb-2">TruthScan Enterprise Key</label>
            <input
              type="password"
              value={truthscanKey}
              onChange={(e) => setTruthscanKey(e.target.value)}
              placeholder="sk-truthscan-xxxxxxxxxxxxxxxx"
              className="w-full bg-surface-container-highest text-on-surface placeholder:text-on-surface-variant rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary border-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-2">HuggingFace Token</label>
            <input
              type="password"
              value={hfToken}
              onChange={(e) => setHfToken(e.target.value)}
              placeholder="hf_xxxxxxxxxxxxxxxxxxxxxx"
              className="w-full bg-surface-container-highest text-on-surface placeholder:text-on-surface-variant rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary border-none"
            />
          </div>
          <Button className="self-start" onClick={saveSettings}>Save Keys</Button>
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold text-on-surface mb-6">Detection Thresholds</h2>
        <div>
          <label className="flex justify-between text-sm font-medium text-on-surface mb-2">
            <span>Quarantine Confidence Threshold</span>
            <span className="text-primary font-semibold">{threshold}%</span>
          </label>
          <input
            type="range"
            min="50"
            max="99"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <p className="text-xs text-on-surface-variant mt-2">Media scoring above this threshold will be automatically isolated.</p>
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold text-on-surface mb-6">Preferences</h2>
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-on-surface">Auto-Quarantine</p>
              <p className="text-xs text-on-surface-variant">Automatically isolate high-confidence deepfakes.</p>
            </div>
            <Switch checked={autoQuarantine} onChange={(v: boolean) => { setAutoQuarantine(v); }} />
          </div>
          <div className="border-t border-outline-variant/30" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-on-surface">Email Alerts</p>
              <p className="text-xs text-on-surface-variant">Send notifications on critical threat detections.</p>
            </div>
            <Switch checked={emailAlerts} onChange={(v: boolean) => { setEmailAlerts(v); }} />
          </div>
        </div>
        <div className="mt-6">
          <Button onClick={saveSettings}>Save Preferences</Button>
        </div>
      </Card>
    </div>
  );
}
