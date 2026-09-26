'use client';
import React, { useState, useEffect } from 'react';
import { Card, Button, Switch } from '@repo/ui';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function SettingsPage() {
  const { user, logOut } = useAuth();
  const router = useRouter();

  const [autoQuarantine, setAutoQuarantine] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(false);
  const [darkTheme, setDarkTheme] = useState(true);
  const [threshold, setThreshold] = useState(85);
  const [truthscanKey, setTruthscanKey] = useState('');
  const [hfToken, setHfToken] = useState('');
  const [extensionInstalled, setExtensionInstalled] = useState(false);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('veritas-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setAutoQuarantine(parsed.autoQuarantine ?? true);
        setEmailAlerts(parsed.emailAlerts ?? false);
        setDarkTheme(parsed.darkTheme ?? true);
        setThreshold(parsed.threshold ?? 85);
        setTruthscanKey(parsed.truthscanKey ?? '');
        setHfToken(parsed.hfToken ?? '');
      } catch {}
    }
    // Detect extension
    const hasExt = !!document.querySelector('meta[name="veritas-extension-installed"]') ||
      !!(window as any).__VERITAS_EXTENSION__;
    setExtensionInstalled(hasExt);
    // Detect PWA standalone
    const isPwa = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsPwaInstalled(isPwa);
  }, []);

  const saveSettings = () => {
    const settings = { autoQuarantine, emailAlerts, darkTheme, threshold, truthscanKey, hfToken };
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
    <div className="p-8 max-w-4xl mx-auto flex flex-col gap-10 w-full pb-24">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-on-surface mb-2">Settings</h1>
        <p className="text-on-surface-variant">Manage your profile, preferences, and security settings.</p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}
        className="flex flex-col gap-8"
      >
        {/* Profile Section */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="material-symbols-outlined text-primary text-[24px]">person</span>
            <h2 className="text-xl font-bold text-on-surface">Profile</h2>
          </div>
          <Card>
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <div className="w-24 h-24 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-4xl font-bold uppercase overflow-hidden shrink-0">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  user?.displayName?.[0] || user?.email?.[0] || 'U'
                )}
              </div>
              <div className="flex-1 text-center md:text-left flex flex-col items-center md:items-start justify-center">
                <h3 className="text-2xl font-semibold text-on-surface">{user?.displayName || 'Veritas Analyst'}</h3>
                <p className="text-on-surface-variant mb-4">{user?.email || 'Not signed in'}</p>
                <Button variant="outlined" onClick={() => toast.info('Profile editing coming soon.')}>Edit Profile</Button>
              </div>
            </div>
          </Card>
        </section>

        {/* Connected Apps Section */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="material-symbols-outlined text-primary text-[24px]">hub</span>
            <h2 className="text-xl font-bold text-on-surface">Connected Apps</h2>
          </div>
          <Card>
            <div className="flex flex-col divide-y divide-outline-variant/30">
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isPwaInstalled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-surface-container-high text-on-surface-variant'}`}>
                    <span className="material-symbols-outlined text-[20px]">phone_android</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-on-surface">Veritas AI PWA</p>
                    <p className="text-xs text-on-surface-variant">Installed app with share target</p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isPwaInstalled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-surface-container-highest text-on-surface-variant'}`}>
                  {isPwaInstalled ? '✓ Installed' : 'Not Installed'}
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${extensionInstalled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-surface-container-high text-on-surface-variant'}`}>
                    <span className="material-symbols-outlined text-[20px]">extension</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-on-surface">Chrome Extension</p>
                    <p className="text-xs text-on-surface-variant">In-browser deepfake detection</p>
                  </div>
                </div>
                {extensionInstalled ? (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400">✓ Connected</span>
                ) : (
                  <button
                    onClick={() => alert('To install: Open chrome://extensions, enable Developer Mode, then Load Unpacked from apps/extension/dist')}
                    className="text-xs font-bold px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/30"
                  >
                    Install
                  </button>
                )}
              </div>
            </div>
          </Card>
        </section>

        {/* Preferences Section */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="material-symbols-outlined text-primary text-[24px]">tune</span>
            <h2 className="text-xl font-bold text-on-surface">Preferences</h2>
          </div>
          <Card>
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-on-surface flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">dark_mode</span> Dark Theme</p>
                  <p className="text-xs text-on-surface-variant mt-1">Switch between light and dark mode.</p>
                </div>
                <Switch checked={darkTheme} onChange={(v: boolean) => setDarkTheme(v)} />
              </div>
              <div className="border-t border-outline-variant/30" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-on-surface flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">shield</span> Auto-Quarantine</p>
                  <p className="text-xs text-on-surface-variant mt-1">Automatically isolate high-confidence deepfakes.</p>
                </div>
                <Switch checked={autoQuarantine} onChange={(v: boolean) => setAutoQuarantine(v)} />
              </div>
              <div className="border-t border-outline-variant/30" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-on-surface flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">notifications</span> Email Alerts</p>
                  <p className="text-xs text-on-surface-variant mt-1">Send notifications on critical threat detections.</p>
                </div>
                <Switch checked={emailAlerts} onChange={(v: boolean) => setEmailAlerts(v)} />
              </div>
            </div>
          </Card>
        </section>

        {/* Data & Privacy Section */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="material-symbols-outlined text-primary text-[24px]">lock</span>
            <h2 className="text-xl font-bold text-on-surface">Data & Privacy</h2>
          </div>
          
          <div className="flex flex-col gap-4">
            <Card>
              <h3 className="text-md font-semibold text-on-surface mb-4">Detection Thresholds</h3>
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
              </div>
            </Card>

            <Card>
              <h3 className="text-md font-semibold text-on-surface mb-4">API Configuration</h3>
              <div className="bg-primary-container text-on-primary-container p-4 rounded-xl flex items-center gap-3 mb-4">
                <span className="material-symbols-outlined">info</span>
                <div>
                  <h4 className="font-semibold text-sm">Local Storage Only</h4>
                  <p className="text-xs">API keys are securely stored in your local browser and never synced to the cloud.</p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
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
              </div>
            </Card>
          </div>
        </section>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4 pt-4 border-t border-outline-variant/30">
          <Button variant="outlined" onClick={handleSignOut} className="text-error border-error hover:bg-error-container w-full sm:w-auto">
            <span className="material-symbols-outlined mr-2">logout</span> Sign Out
          </Button>
          <Button onClick={saveSettings} className="w-full sm:w-auto">
            <span className="material-symbols-outlined mr-2">save</span> Save All Settings
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
