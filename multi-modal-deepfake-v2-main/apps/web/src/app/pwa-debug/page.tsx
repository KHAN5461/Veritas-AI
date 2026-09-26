'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();
  const [swInfo, setSwInfo] = useState<SwInfo | null>(null);
  const [cacheInfo, setCacheInfo] = useState<CacheInfo[]>([]);
  const [sharedFileCache, setSharedFileCache] = useState<string>('Not found');
  const [sharedFileIdb, setSharedFileIdb] = useState<string>('Checking...');
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const log = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const checkStatus = async () => {
    setLoading(true);
    const newLogs: string[] = [];
    const addLog = (msg: string) => newLogs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);

    // 1. Check Service Worker
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

    // 2. Check IndexedDB veritas_pwa_db
    try {
      const idbReq = indexedDB.open('veritas_pwa_db', 1);
      idbReq.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('shared_media')) {
          db.createObjectStore('shared_media', { keyPath: 'id' });
        }
      };
      idbReq.onsuccess = (e: any) => {
        const db = e.target.result;
        if (db.objectStoreNames.contains('shared_media')) {
          const tx = db.transaction('shared_media', 'readonly');
          const store = tx.objectStore('shared_media');
          const getReq = store.get('pending_share');
          getReq.onsuccess = () => {
            const data = getReq.result;
            if (data && data.file) {
              setSharedFileIdb(`Pending: ${data.fileName} (${data.fileType}, ${data.fileSize} B)`);
              addLog(`IndexedDB has pending share: ${data.fileName}`);
            } else {
              setSharedFileIdb('Empty (Ready to receive)');
              addLog('IndexedDB object store ready (no pending item)');
            }
          };
          getReq.onerror = () => setSharedFileIdb('Query error');
        } else {
          setSharedFileIdb('Object store missing');
        }
      };
      idbReq.onerror = () => setSharedFileIdb('IDB open failed');
    } catch (e: any) {
      setSharedFileIdb(`Error: ${e.message}`);
    }

    // 3. Check Cache Storage
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

      // Check for shared file specifically in Cache API
      const sharedCache = await caches.open('veritas-shared-media');
      const sharedResp = await sharedCache.match('/shared-file');
      if (sharedResp) {
        const swVersion = sharedResp.headers.get('X-SW-Version') || '?';
        const fileName = sharedResp.headers.get('X-Original-Name') || '?';
        const contentType = sharedResp.headers.get('Content-Type') || '?';
        const size = sharedResp.headers.get('Content-Length') || '?';
        setSharedFileCache(`Found! name=${decodeURIComponent(fileName)}, type=${contentType}, size=${size}, sw=${swVersion}`);
        addLog(`Shared file in Cache API: ${decodeURIComponent(fileName)} (${contentType})`);
      } else {
        setSharedFileCache('Not found in Cache API');
        addLog('No shared file in Cache API');
      }
    } catch (e: any) {
      addLog(`Cache error: ${e.message}`);
    }

    setLogs(newLogs);
    setLoading(false);
  };

  const simulateShareTarget = async () => {
    log('Generating test image for Share Target simulation...');
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0f1419';
        ctx.fillRect(0, 0, 400, 400);
        ctx.fillStyle = '#7dd3fc';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText('Veritas AI Test Media', 60, 180);
        ctx.font = '16px monospace';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('Simulated PWA Share Intent', 70, 220);
      }

      const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'));
      if (!blob) throw new Error('Could not create test canvas blob');

      const testFile = new File([blob], 'simulated-share-test.png', { type: 'image/png' });

      // Save to IndexedDB
      const req = indexedDB.open('veritas_pwa_db', 1);
      req.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('shared_media')) {
          db.createObjectStore('shared_media', { keyPath: 'id' });
        }
      };
      req.onsuccess = (e: any) => {
        const db = e.target.result;
        const tx = db.transaction('shared_media', 'readwrite');
        tx.objectStore('shared_media').put({
          id: 'pending_share',
          file: testFile,
          fileName: 'simulated-share-test.png',
          fileType: 'image/png',
          fileSize: testFile.size,
          timestamp: Date.now()
        });
        tx.oncomplete = () => {
          log('Simulation payload placed in IndexedDB. Navigating to /analyze?shared=true...');
          router.push('/analyze?shared=true');
        };
      };
    } catch (err: any) {
      log(`Simulation failed: ${err.message}`);
    }
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
    log('Force registering SW v11...');
    try {
      const reg = await navigator.serviceWorker.register('/sw.js?v=11', {
        scope: '/',
        updateViaCache: 'none'
      });
      await reg.update();
      log(`Registered v11! scope=${reg.scope}, state=${(reg.active || reg.waiting || reg.installing)?.state}`);
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
      {ok ? '[OK]' : '[ERR]'} {label}
    </span>
  );

  return (
    <div style={{ padding: '24px', maxWidth: '640px', margin: '0 auto', fontFamily: 'monospace', color: '#e0e0e0' }}>
      <h1 style={{ fontSize: '20px', marginBottom: '16px' }}>PWA Share Target & Service Worker Terminal</h1>

      {loading ? <p>Checking status...</p> : swInfo && (
        <>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '16px', marginBottom: '8px', color: '#aaa' }}>Service Worker (v11)</h2>
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
            <h2 style={{ fontSize: '16px', marginBottom: '8px', color: '#aaa' }}>Storage Channels</h2>
            <div style={{ fontSize: '13px', marginBottom: '6px' }}>
              <span style={{ color: '#7dd3fc', fontWeight: 'bold' }}>IndexedDB Channel: </span>
              <span style={{ color: sharedFileIdb.includes('Pending') ? '#00c853' : '#ccc' }}>{sharedFileIdb}</span>
            </div>
            <div style={{ fontSize: '13px' }}>
              <span style={{ color: '#7dd3fc', fontWeight: 'bold' }}>Cache API Channel: </span>
              <span style={{ color: sharedFileCache.startsWith('Found') ? '#00c853' : '#999' }}>{sharedFileCache}</span>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '16px', marginBottom: '8px', color: '#aaa' }}>Active Caches</h2>
            {cacheInfo.length === 0 ? <div style={{ fontSize: '13px', color: '#666' }}>No caches</div> : cacheInfo.map(c => (
              <div key={c.name} style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#ccc' }}>{c.name} ({c.keys.length} entries)</div>
                {c.keys.map((k, i) => <div key={i} style={{ fontSize: '11px', color: '#666', paddingLeft: '12px', wordBreak: 'break-all' }}>{k}</div>)}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
        <button
          onClick={simulateShareTarget}
          style={{ padding: '10px 16px', borderRadius: '8px', background: '#00c853', color: '#003311', border: 'none', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Simulate Media Share
        </button>
        <button
          onClick={() => router.push('/analyze?shared_url=' + encodeURIComponent('https://twitter.com/example/status/synthetic_video_deepfake_post'))}
          style={{ padding: '10px 16px', borderRadius: '8px', background: '#38bdf8', color: '#00263d', border: 'none', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Simulate Social Link Share
        </button>
        <button
          onClick={checkStatus}
          style={{ padding: '10px 16px', borderRadius: '8px', background: '#333', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
        >
          Refresh Status
        </button>
        <button
          onClick={forceRegister}
          style={{ padding: '10px 16px', borderRadius: '8px', background: '#1a73e8', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
        >
          Update SW to v11
        </button>
        <button
          onClick={resetSW}
          style={{ padding: '10px 16px', borderRadius: '8px', background: '#ff3366', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
        >
          Reset All Caches
        </button>
      </div>

      <div>
        <h2 style={{ fontSize: '16px', marginBottom: '8px', color: '#aaa' }}>Live Execution Logs</h2>
        <div style={{ background: '#111', padding: '12px', borderRadius: '8px', fontSize: '11px', maxHeight: '240px', overflow: 'auto' }}>
          {logs.map((l, i) => (
            <div key={i} style={{ color: l.includes('error') || l.includes('NOT') || l.includes('NO ') ? '#ff3366' : '#8bc34a', marginBottom: '2px' }}>
              {l}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
