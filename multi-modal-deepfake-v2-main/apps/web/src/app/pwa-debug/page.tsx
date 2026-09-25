'use client';
import React, { useState, useEffect } from 'react';

interface SwInfo {
  registered: boolean;
  active: boolean;
  controlling: boolean;
  scriptURL: string;
  state: string;
  scope: string;
}

interface CacheInfo {
  name: string;
  keys: string[];
}

export default function PwaDebugPage() {
  const [swInfo, setSwInfo] = useState<SwInfo | null>(null);
  const [cacheInfo, setCacheInfo] = useState<CacheInfo[]>([]);
  const [sharedFile, setSharedFile] = useState<string>('Not found');
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const log = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const checkStatus = async () => {
    setLoading(true);
    const newLogs: string[] = [];
    const addLog = (msg: string) => newLogs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);

    // Check SW
    if ('serviceWorker' in navigator) {
      addLog('serviceWorker API available');
      const reg = await navigator.serviceWorker.getRegistration('/');
      if (reg) {
        const sw = reg.active || reg.waiting || reg.installing;
        const info: SwInfo = {
          registered: true,
          active: !!reg.active,
          controlling: !!navigator.serviceWorker.controller,
          scriptURL: sw?.scriptURL || 'unknown',
          state: sw?.state || 'unknown',
          scope: reg.scope,
        };
        setSwInfo(info);
        addLog(`SW registered: scope=${info.scope}`);
        addLog(`SW script: ${info.scriptURL}`);
        addLog(`SW state: ${info.state}`);
        addLog(`SW controlling: ${info.controlling}`);
      } else {
        setSwInfo({ registered: false, active: false, controlling: false, scriptURL: 'none', state: 'none', scope: 'none' });
        addLog('NO Service Worker registered!');
      }
    } else {
      addLog('serviceWorker API NOT available in this browser');
    }

    // Check caches
    try {
      const cacheNames = await caches.keys();
      addLog(`Found ${cacheNames.length} caches: ${cacheNames.join(', ')}`);
      const infos: CacheInfo[] = [];
      for (const name of cacheNames) {
        const cache = await caches.open(name);
        const keys = await cache.keys();
        infos.push({ name, keys: keys.map(r => r.url) });
      }
      setCacheInfo(infos);

      // Check for shared file specifically
      const sharedCache = await caches.open('veritas-shared-media');
      const sharedResp = await sharedCache.match('/shared-file');
      if (sharedResp) {
        const swVersion = sharedResp.headers.get('X-SW-Version') || '?';
        const fileName = sharedResp.headers.get('X-Original-Name') || '?';
        const contentType = sharedResp.headers.get('Content-Type') || '?';
        const size = sharedResp.headers.get('Content-Length') || '?';
        setSharedFile(`Found! name=${decodeURIComponent(fileName)}, type=${contentType}, size=${size}, sw=${swVersion}`);
        addLog(`Shared file in cache: ${decodeURIComponent(fileName)} (${contentType}, ${size} bytes)`);
      } else {
        setSharedFile('Not found');
        addLog('No shared file in cache');
      }
    } catch (e: any) {
      addLog(`Cache error: ${e.message}`);
    }

    setLogs(newLogs);
    setLoading(false);
  };

  const resetSW = async () => {
    log('Unregistering all service workers...');
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) {
      await reg.unregister();
      log(`Unregistered: ${reg.scope}`);
    }
    log('Clearing all caches...');
    const names = await caches.keys();
    for (const name of names) {
      await caches.delete(name);
      log(`Deleted cache: ${name}`);
    }
    log('Done! Refreshing page in 2 seconds...');
    setTimeout(() => window.location.reload(), 2000);
  };

  const forceRegister = async () => {
    log('Force registering SW...');
    try {
      const reg = await navigator.serviceWorker.register('/sw.js?v=6', {
        scope: '/',
        updateViaCache: 'none'
      });
      await reg.update();
      log(`Registered! scope=${reg.scope}, state=${(reg.active || reg.waiting || reg.installing)?.state}`);
      setTimeout(() => checkStatus(), 1000);
    } catch (e: any) {
      log(`Registration failed: ${e.message}`);
    }
  };

  useEffect(() => { checkStatus(); }, []);

  const StatusBadge = ({ ok, label }: { ok: boolean; label: string }) => (
    <span style={{
      display: 'inline-block', padding: '4px 12px', borderRadius: '9999px', fontSize: '13px', fontWeight: 600,
      background: ok ? '#00c85320' : '#ff336620', color: ok ? '#00c853' : '#ff3366', marginRight: '8px'
    }}>
      {ok ? '✅' : '❌'} {label}
    </span>
  );

  return (
    <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto', fontFamily: 'monospace', color: '#e0e0e0' }}>
      <h1 style={{ fontSize: '20px', marginBottom: '16px' }}>🔧 PWA Debug</h1>

      {loading ? <p>Checking...</p> : swInfo && (
        <>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '16px', marginBottom: '8px', color: '#aaa' }}>Service Worker</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
              <StatusBadge ok={swInfo.registered} label="Registered" />
              <StatusBadge ok={swInfo.active} label="Active" />
              <StatusBadge ok={swInfo.controlling} label="Controlling" />
            </div>
            <div style={{ fontSize: '12px', color: '#888', wordBreak: 'break-all' }}>
              <div>Script: {swInfo.scriptURL}</div>
              <div>Scope: {swInfo.scope}</div>
              <div>State: {swInfo.state}</div>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '16px', marginBottom: '8px', color: '#aaa' }}>Shared File Cache</h2>
            <div style={{ fontSize: '13px', color: sharedFile.startsWith('Found') ? '#00c853' : '#ff3366', wordBreak: 'break-all' }}>
              {sharedFile}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '16px', marginBottom: '8px', color: '#aaa' }}>All Caches</h2>
            {cacheInfo.length === 0 ? <div style={{ fontSize: '13px', color: '#666' }}>No caches</div> : cacheInfo.map(c => (
              <div key={c.name} style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#ccc' }}>{c.name} ({c.keys.length} entries)</div>
                {c.keys.map((k, i) => <div key={i} style={{ fontSize: '11px', color: '#666', paddingLeft: '12px', wordBreak: 'break-all' }}>{k}</div>)}
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button onClick={checkStatus} style={{ padding: '10px 16px', borderRadius: '8px', background: '#333', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 600 }}>
          🔄 Refresh Status
        </button>
        <button onClick={forceRegister} style={{ padding: '10px 16px', borderRadius: '8px', background: '#1a73e8', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 600 }}>
          📥 Force Register SW
        </button>
        <button onClick={resetSW} style={{ padding: '10px 16px', borderRadius: '8px', background: '#ff3366', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 600 }}>
          🗑️ Reset Everything
        </button>
      </div>

      <div>
        <h2 style={{ fontSize: '16px', marginBottom: '8px', color: '#aaa' }}>Logs</h2>
        <div style={{ background: '#111', padding: '12px', borderRadius: '8px', fontSize: '11px', maxHeight: '300px', overflow: 'auto' }}>
          {logs.map((l, i) => <div key={i} style={{ color: l.includes('error') || l.includes('NOT') || l.includes('NO ') ? '#ff3366' : '#8bc34a', marginBottom: '2px' }}>{l}</div>)}
        </div>
      </div>
    </div>
  );
}
