'use client';
import React, { useState, useEffect } from 'react';
import { Card, Button, Switch } from '@repo/ui';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { user, logOut } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'profile' | 'analysis' | 'api'>('profile');

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

  const handleSignOut = async () => {
    try {
      await logOut();
      router.push('/login');
    } catch (e) {
      toast.error('Failed to sign out');
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto flex flex-col md:flex-row gap-8 w-full">
      {/* Sidebar Navigation */}
      <div className="w-full md:w-64 flex flex-col gap-2 shrink-0">
        <h1 className="text-3xl font-bold tracking-tight text-on-surface mb-6">Settings</h1>
        
        <button 
          onClick={() => setActiveTab('profile')}
          className={`text-left px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'profile' ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
        >
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[20px]">person</span>
            User Profile
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('analysis')}
          className={`text-left px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'analysis' ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
        >
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[20px]">tune</span>
            Analysis Preferences
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('api')}
          className={`text-left px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'api' ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
        >
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[20px]">key</span>
            API Configuration
          </div>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col gap-6">
        
        {activeTab === 'profile' && (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-2xl font-bold text-on-surface mb-1">User Profile</h2>
              <p className="text-on-surface-variant text-sm">Manage your account and identity.</p>
            </div>
            <Card>
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-4xl font-bold uppercase overflow-hidden">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    user?.email?.[0] || 'U'
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-on-surface">{user?.displayName || 'Veritas Analyst'}</h3>
                  <p className="text-on-surface-variant">{user?.email || 'Not signed in'}</p>
                  <div className="mt-4 flex gap-3">
                    <Button variant="outlined" onClick={handleSignOut} className="text-error border-error hover:bg-error-container">
                      Sign Out
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-2xl font-bold text-on-surface mb-1">Analysis Preferences</h2>
              <p className="text-on-surface-variant text-sm">Configure how deepfake detection handles threats.</p>
            </div>
            
            <Card>
              <h3 className="text-lg font-semibold text-on-surface mb-4">Detection Thresholds</h3>
              <div>
                <label className="flex justify-between text-sm font-medium text-on-surface mb-2">
                  <span>Quarantine Confidence Threshold</span>
                  <span className={`font-semibold ${threshold > 80 ? 'text-error' : threshold > 60 ? 'text-orange-500' : 'text-primary'}`}>{threshold}%</span>
                </label>
                <input
                  type="range"
                  min="50"
                  max="99"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-on-surface-variant mt-2">
                  <span>50% (Lenient)</span>
                  <span>99% (Strict)</span>
                </div>
                <p className="text-xs text-on-surface-variant mt-4 bg-surface-container p-3 rounded-lg border border-outline-variant/30">
                  Media scoring above this threshold will be automatically flagged for quarantine in the Threat Intel dashboard.
                </p>
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold text-on-surface mb-4">Automated Actions</h3>
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
              <div className="mt-6 flex justify-end">
                <Button onClick={saveSettings}>Save Preferences</Button>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'api' && (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-2xl font-bold text-on-surface mb-1">API Configuration</h2>
              <p className="text-on-surface-variant text-sm">Manage integration keys for external ML services.</p>
            </div>
            
            <div className="bg-primary-container text-on-primary-container p-4 rounded-xl flex items-center gap-3">
              <span className="material-symbols-outlined">info</span>
              <div>
                <h4 className="font-semibold text-sm">Local Storage Only</h4>
                <p className="text-xs">API keys are securely stored in your local browser and never synced to the cloud.</p>
              </div>
            </div>

            <Card>
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
                <div className="flex justify-end mt-2">
                  <Button onClick={saveSettings}>Save Keys</Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
