'use client';
import React, { useState, useEffect } from 'react';
import { Card, Button, Switch } from '@repo/ui';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../lib/firebase';
import { updateProfile } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const AVATAR_PRESETS = [
  { label: 'Cyber Sentinel', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=CyberSentinel' },
  { label: 'Forensic Agent', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=ForensicAgent' },
  { label: 'Tech Specialist', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=TechSpecialist' },
  { label: 'Security Shield', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=SecurityShield' },
];

export default function SettingsPage() {
  const { user, logOut } = useAuth();
  const router = useRouter();

  // Profile editing states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [photoUrlInput, setPhotoUrlInput] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Preference states
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

    // Check system or saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setDarkTheme(false);
    } else {
      setDarkTheme(true);
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

  const handleStartEditProfile = () => {
    setDisplayNameInput(user?.displayName || '');
    setPhotoUrlInput(user?.photoURL || '');
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    if (!auth.currentUser) {
      toast.error('You must be signed in to edit your profile.');
      return;
    }

    setIsSavingProfile(true);
    try {
      await updateProfile(auth.currentUser, {
        displayName: displayNameInput.trim() || undefined,
        photoURL: photoUrlInput.trim() || null,
      });

      toast.success('Profile updated successfully!');
      setIsEditingProfile(false);
    } catch (err: any) {
      toast.error('Failed to update profile: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleThemeChange = (isDark: boolean) => {
    setDarkTheme(isDark);
    if (isDark) {
      document.documentElement.classList.replace('light', 'dark');
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.replace('dark', 'light');
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const saveSettings = () => {
    const settings = { autoQuarantine, emailAlerts, darkTheme, threshold, truthscanKey, hfToken };
    localStorage.setItem('veritas-settings', JSON.stringify(settings));
    toast.success('Preferences saved successfully!');
  };

  const handleSignOut = async () => {
    try {
      await logOut();
      router.push('/login');
    } catch {
      toast.error('Failed to sign out');
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto flex flex-col gap-8 w-full pb-28">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-on-surface mb-1">Settings & Profile</h1>
        <p className="text-sm text-on-surface-variant">Manage your identity, forensic preferences, and engine integrations.</p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.3 }}
        className="flex flex-col gap-8"
      >
        {/* Profile Section */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-primary text-[22px]">person</span>
            <h2 className="text-lg font-bold text-on-surface">Analyst Profile</h2>
          </div>
          <Card className="bg-surface-container-low border border-outline-variant/30">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* Avatar display */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-3xl font-bold uppercase overflow-hidden shrink-0 shadow-md border-2 border-primary/20">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  user?.displayName?.[0] || user?.email?.[0] || 'U'
                )}
              </div>

              {/* Profile Details or Edit Form */}
              <div className="flex-1 w-full text-center md:text-left flex flex-col items-center md:items-start justify-center">
                {!isEditingProfile ? (
                  <>
                    <h3 className="text-2xl font-bold text-on-surface">{user?.displayName || 'Veritas Analyst'}</h3>
                    <p className="text-sm text-on-surface-variant font-mono mt-0.5 mb-4">{user?.email || 'Not signed in'}</p>
                    <Button variant="outlined" onClick={handleStartEditProfile} className="text-xs">
                      <span className="material-symbols-outlined text-[16px] mr-1.5">edit</span>
                      Edit Profile
                    </Button>
                  </>
                ) : (
                  <AnimatePresence>
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="w-full flex flex-col gap-4 mt-2"
                    >
                      <div>
                        <label className="block text-xs font-semibold text-on-surface mb-1">Display Name</label>
                        <input
                          type="text"
                          value={displayNameInput}
                          onChange={(e) => setDisplayNameInput(e.target.value)}
                          placeholder="Your Name or Call-sign"
                          className="w-full bg-surface-container-highest text-on-surface text-sm rounded-xl px-3.5 py-2.5 border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-on-surface mb-1">Avatar Preset or Image URL</label>
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {AVATAR_PRESETS.map((preset) => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => setPhotoUrlInput(preset.url)}
                              className={`w-9 h-9 rounded-full overflow-hidden border-2 transition-all p-0.5 ${photoUrlInput === preset.url ? 'border-primary ring-2 ring-primary/30 scale-105' : 'border-outline-variant/40 hover:border-primary/50'}`}
                              title={preset.label}
                            >
                              <img src={preset.url} alt={preset.label} className="w-full h-full rounded-full object-cover" />
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setPhotoUrlInput('')}
                            className={`px-2.5 py-1 text-[11px] rounded-full border transition-all ${photoUrlInput === '' ? 'border-primary text-primary font-bold' : 'border-outline-variant/30 text-on-surface-variant'}`}
                          >
                            Initials
                          </button>
                        </div>
                        <input
                          type="url"
                          value={photoUrlInput}
                          onChange={(e) => setPhotoUrlInput(e.target.value)}
                          placeholder="https://example.com/avatar.png"
                          className="w-full bg-surface-container-highest text-on-surface text-xs font-mono rounded-xl px-3.5 py-2 border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <Button 
                          variant="filled" 
                          onClick={handleSaveProfile} 
                          disabled={isSavingProfile}
                          className="text-xs"
                        >
                          <span className="material-symbols-outlined text-[16px] mr-1.5">check</span>
                          {isSavingProfile ? 'Saving...' : 'Save Changes'}
                        </Button>
                        <Button 
                          variant="text" 
                          onClick={() => setIsEditingProfile(false)} 
                          className="text-xs text-on-surface-variant"
                        >
                          Cancel
                        </Button>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
            </div>
          </Card>
        </section>

        {/* Connected Apps Section */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-primary text-[22px]">hub</span>
            <h2 className="text-lg font-bold text-on-surface">Connected Apps & Integrations</h2>
          </div>
          <Card className="bg-surface-container-low border border-outline-variant/30">
            <div className="flex flex-col divide-y divide-outline-variant/30">
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isPwaInstalled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-surface-container-high text-on-surface-variant'}`}>
                    <span className="material-symbols-outlined text-[20px]">phone_android</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-on-surface">Veritas AI Progressive Web App</p>
                    <p className="text-xs text-on-surface-variant">Native share-target & offline forensic cache</p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isPwaInstalled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-surface-container-highest text-on-surface-variant'}`}>
                  {isPwaInstalled ? 'Active' : 'Not Installed'}
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${extensionInstalled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-surface-container-high text-on-surface-variant'}`}>
                    <span className="material-symbols-outlined text-[20px]">extension</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-on-surface">Chrome / Edge Extension</p>
                    <p className="text-xs text-on-surface-variant">In-browser deepfake detection sidepanel</p>
                  </div>
                </div>
                {extensionInstalled ? (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400">Connected</span>
                ) : (
                  <button
                    onClick={() => alert('To install: Open chrome://extensions, enable Developer Mode, then Load Unpacked from apps/extension/dist')}
                    className="text-xs font-bold px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/30"
                  >
                    Install Guide
                  </button>
                )}
              </div>
            </div>
          </Card>
        </section>

        {/* Preferences Section */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-primary text-[22px]">tune</span>
            <h2 className="text-lg font-bold text-on-surface">Preferences</h2>
          </div>
          <Card className="bg-surface-container-low border border-outline-variant/30">
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">dark_mode</span> Dark Theme
                  </p>
                  <p className="text-xs text-on-surface-variant mt-0.5">Switch between high-contrast dark mode and clean light mode.</p>
                </div>
                <Switch checked={darkTheme} onChange={(v: boolean) => handleThemeChange(v)} />
              </div>
              <div className="border-t border-outline-variant/30" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">shield</span> Auto-Quarantine
                  </p>
                  <p className="text-xs text-on-surface-variant mt-0.5">Automatically tag high-confidence deepfakes for forensic quarantine.</p>
                </div>
                <Switch checked={autoQuarantine} onChange={(v: boolean) => setAutoQuarantine(v)} />
              </div>
              <div className="border-t border-outline-variant/30" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">notifications</span> Critical Threat Alerts
                  </p>
                  <p className="text-xs text-on-surface-variant mt-0.5">Trigger in-app notification badge on new threat discoveries.</p>
                </div>
                <Switch checked={emailAlerts} onChange={(v: boolean) => setEmailAlerts(v)} />
              </div>
            </div>
          </Card>
        </section>

        {/* Data & Privacy Section */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-primary text-[22px]">lock</span>
            <h2 className="text-lg font-bold text-on-surface">Detection Engine & API Keys</h2>
          </div>
          
          <div className="flex flex-col gap-4">
            <Card className="bg-surface-container-low border border-outline-variant/30">
              <h3 className="text-sm font-semibold text-on-surface mb-3">Confidence Quarantine Threshold</h3>
              <div>
                <div className="flex justify-between text-xs font-medium text-on-surface mb-2">
                  <span>Threshold Sensitivity</span>
                  <span className={`font-mono font-bold ${threshold > 80 ? 'text-error' : threshold > 60 ? 'text-amber-400' : 'text-primary'}`}>{threshold}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="99"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full accent-primary h-1.5 bg-surface-container-highest rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-on-surface-variant mt-1.5">
                  <span>50% (Permissive)</span>
                  <span>99% (Strict)</span>
                </div>
              </div>
            </Card>

            <Card className="bg-surface-container-low border border-outline-variant/30">
              <h3 className="text-sm font-semibold text-on-surface mb-3">Custom Inference Keys</h3>
              <div className="bg-primary-container/20 border border-primary/20 text-on-surface p-3 rounded-xl flex items-center gap-2.5 mb-4">
                <span className="material-symbols-outlined text-primary text-[20px] shrink-0">info</span>
                <p className="text-xs text-on-surface-variant">
                  API tokens are encrypted in your local browser storage and never uploaded to public registries.
                </p>
              </div>

              <div className="flex flex-col gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1.5">TruthScan Engine Key</label>
                  <input
                    type="password"
                    value={truthscanKey}
                    onChange={(e) => setTruthscanKey(e.target.value)}
                    placeholder="sk-truthscan-xxxxxxxxxxxxxxxx"
                    className="w-full bg-surface-container-highest text-on-surface placeholder:text-on-surface-variant/50 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary border border-outline-variant/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1.5">HuggingFace Model Hub Token</label>
                  <input
                    type="password"
                    value={hfToken}
                    onChange={(e) => setHfToken(e.target.value)}
                    placeholder="hf_xxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full bg-surface-container-highest text-on-surface placeholder:text-on-surface-variant/50 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary border border-outline-variant/20"
                  />
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2 border-t border-outline-variant/30">
          <Button variant="outlined" onClick={handleSignOut} className="text-error border-error/50 hover:bg-error/10 w-full sm:w-auto text-xs">
            <span className="material-symbols-outlined mr-1.5 text-[18px]">logout</span> Sign Out
          </Button>
          <Button onClick={saveSettings} className="w-full sm:w-auto text-xs">
            <span className="material-symbols-outlined mr-1.5 text-[18px]">save</span> Save All Settings
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
