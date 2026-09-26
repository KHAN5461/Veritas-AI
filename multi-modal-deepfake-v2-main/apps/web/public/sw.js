// Veritas AI Service Worker v11
const SW_VERSION = 'v11';
const OFFLINE_CACHE = 'veritas-offline-v11';
const OFFLINE_URL = '/offline';

self.addEventListener('install', (event) => {
  console.log('[SW ' + SW_VERSION + '] Installing...');
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then((cache) => {
      console.log('[SW ' + SW_VERSION + '] Precaching offline fallback page...');
      return cache.addAll([OFFLINE_URL, '/logo.png', '/icon-192.png']);
    }).catch((err) => {
      console.warn('[SW ' + SW_VERSION + '] Failed to precache offline assets:', err);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW ' + SW_VERSION + '] Activating immediately...');
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== OFFLINE_CACHE && key !== 'veritas-shared-media') {
              console.log('[SW ' + SW_VERSION + '] Cleaning old cache:', key);
              return caches.delete(key);
            }
          })
        );
      })
    ])
  );
});

// Native IndexedDB Helper to reliably store binary media files without RAM bloat
function saveToIndexedDB(fileData) {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open('veritas_pwa_db', 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('shared_media')) {
          db.createObjectStore('shared_media', { keyPath: 'id' });
        }
      };
      req.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction('shared_media', 'readwrite');
        const store = tx.objectStore('shared_media');
        store.put({
          id: 'pending_share',
          file: fileData.file,
          fileName: fileData.fileName,
          fileType: fileData.fileType,
          fileSize: fileData.fileSize,
          timestamp: Date.now()
        });
        tx.oncomplete = () => {
          console.log('[SW ' + SW_VERSION + '] Saved file to IndexedDB successfully');
          resolve(true);
        };
        tx.onerror = (err) => {
          console.warn('[SW ' + SW_VERSION + '] IndexedDB transaction error:', err);
          resolve(false);
        };
      };
      req.onerror = (err) => {
        console.warn('[SW ' + SW_VERSION + '] IndexedDB open error:', err);
        resolve(false);
      };
    } catch (err) {
      console.warn('[SW ' + SW_VERSION + '] IndexedDB unhandled exception:', err);
      resolve(false);
    }
  });
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Handle share target POST on any ingestion route (/share-target, /_share-target, /analyze, /)
  if (event.request.method === 'POST' && (url.pathname.includes('share-target') || url.pathname.includes('analyze') || url.pathname === '/')) {
    console.log('[SW ' + SW_VERSION + '] Intercepted share target POST on:', url.pathname);
    event.respondWith(handleShareTarget(event.request));
    return;
  }

  // Offline fallback and 413 error recovery for HTML page navigation
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If Vercel or any proxy returns 413 (Payload Too Large), cleanly recover
          if (response.status === 413) {
            console.warn('[SW ' + SW_VERSION + '] Caught 413 from network, cleanly redirecting to /analyze');
            return Response.redirect(new URL('/analyze?large_file=1', self.registration.scope).href, 303);
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(OFFLINE_CACHE);
          const cachedOfflinePage = await cache.match(OFFLINE_URL);
          if (cachedOfflinePage) {
            return cachedOfflinePage;
          }
          return new Response(
            '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Veritas AI - Offline</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="background:#0f1419;color:#e1e3e5;font-family:sans-serif;text-align:center;padding:4rem 1rem"><h2>Veritas AI is offline</h2><p>Please check your internet connection.</p><button onclick="location.reload()" style="background:#7dd3fc;color:#003354;border:none;padding:10px 20px;border-radius:20px;font-weight:bold;cursor:pointer;margin-top:1rem">Try Again</button></body></html>',
            { status: 200, headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }
});

async function handleShareTarget(request) {
  try {
    // Read directly from request without memory-heavy stream cloning
    const formData = await request.formData();

    // Check all possible media form field keys
    let mediaFiles = formData.getAll('media');
    if (!mediaFiles || mediaFiles.length === 0) mediaFiles = formData.getAll('file');
    if (!mediaFiles || mediaFiles.length === 0) mediaFiles = formData.getAll('files');
    if (!mediaFiles || mediaFiles.length === 0) mediaFiles = formData.getAll('image');
    if (!mediaFiles || mediaFiles.length === 0) mediaFiles = formData.getAll('video');

    const validFiles = mediaFiles.filter((f) => f && (f.size > 0 || f.name));

    // Check for shared social media link or text (from Twitter, Reddit, YouTube, Instagram, etc.)
    const sharedUrl = formData.get('url') || formData.get('link');
    const sharedText = formData.get('text');
    const sharedTitle = formData.get('title');

    console.log('[SW ' + SW_VERSION + '] Files found:', validFiles.length, 'url:', sharedUrl, 'text:', sharedText);

    if (validFiles.length > 0) {
      const file = validFiles[0];
      let fileName = file.name || 'shared-media';
      if (!fileName.includes('.')) {
        const mimeToExt = {
          'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
          'image/gif': 'gif', 'video/mp4': 'mp4', 'audio/mpeg': 'mp3'
        };
        const ext = mimeToExt[file.type] || file.type.split('/')[1] || 'jpg';
        fileName = fileName + '.' + ext;
      }

      // 1. Primary Store: Native IndexedDB (disk-backed, low RAM)
      await saveToIndexedDB({
        file,
        fileName,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size
      });

      // 2. Broadcast to any open window clients
      try {
        const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of clientsList) {
          client.postMessage({
            type: 'VERITAS_PWA_MEDIA_SHARED',
            fileName,
            fileType: file.type || 'application/octet-stream'
          });
        }
      } catch (broadcastErr) {
        console.warn('[SW] Client broadcast error:', broadcastErr);
      }

      // 3. Secondary Store: Cache Storage fallback (only for moderate sizes < 10MB to avoid OOM)
      if (file.size < 10 * 1024 * 1024) {
        try {
          const cache = await caches.open('veritas-shared-media');
          await cache.delete('/shared-file');
          await cache.put(new Request('/shared-file'), new Response(file, {
            headers: {
              'Content-Type': file.type || 'application/octet-stream',
              'Content-Length': String(file.size),
              'X-Original-Name': encodeURIComponent(fileName),
              'X-SW-Version': SW_VERSION
            }
          }));
        } catch (cacheErr) {
          console.warn('[SW ' + SW_VERSION + '] Cache API fallback error:', cacheErr);
        }
      }

      const redirectUrl = new URL('/analyze?shared=true', self.registration.scope).href;
      return Response.redirect(redirectUrl, 303);
    }

    // Handle shared link from social media (Twitter/X, Instagram, YouTube, Reddit, etc.)
    const targetLink = sharedUrl || (typeof sharedText === 'string' && sharedText.match(/https?:\/\/[^\s]+/)?.[0]);
    if (targetLink) {
      console.log('[SW ' + SW_VERSION + '] Intercepted social media link:', targetLink);
      const redirectUrl = new URL(`/analyze?shared_url=${encodeURIComponent(targetLink)}`, self.registration.scope).href;
      return Response.redirect(redirectUrl, 303);
    }

    // Default fallback to analyze page
    return Response.redirect(new URL('/analyze', self.registration.scope).href, 303);

  } catch (err) {
    console.error('[SW ' + SW_VERSION + '] Share target error:', err);
    return Response.redirect(new URL('/analyze?share_error=1', self.registration.scope).href, 303);
  }
}
