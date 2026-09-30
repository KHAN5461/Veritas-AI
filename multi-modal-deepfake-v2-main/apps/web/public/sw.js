// Veritas AI Service Worker v13 (Optimized CacheStorage Share Target)
const SW_VERSION = 'v13';
const OFFLINE_CACHE = 'veritas-offline-v13';
const SHARE_CACHE = 'veritas-shared-media';
const OFFLINE_URL = '/offline';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then((cache) => {
      return cache.addAll([OFFLINE_URL, '/logo.png', '/icon-192.png']);
    }).catch(err => console.warn('[SW] Precache fail', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== OFFLINE_CACHE && key !== SHARE_CACHE) {
              return caches.delete(key);
            }
          })
        );
      })
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Handle share target POST
  if (event.request.method === 'POST' && (url.pathname.includes('share-target') || url.pathname.includes('analyze') || url.pathname === '/')) {
    event.respondWith(handleShareTarget(event.request));
    return;
  }

  // Offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 413) {
            return Response.redirect(new URL('/analyze?large_file=1', self.registration.scope).href, 303);
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(OFFLINE_CACHE);
          const cachedOfflinePage = await cache.match(OFFLINE_URL);
          if (cachedOfflinePage) return cachedOfflinePage;
          return new Response('Offline', { status: 200, headers: { 'Content-Type': 'text/plain' } });
        })
    );
    return;
  }
});

async function handleShareTarget(request) {
  try {
    const formData = await request.formData();
    
    let mediaFiles = formData.getAll('media');
    if (!mediaFiles || mediaFiles.length === 0) mediaFiles = formData.getAll('file');
    if (!mediaFiles || mediaFiles.length === 0) mediaFiles = formData.getAll('files');
    const validFiles = mediaFiles.filter((f) => f && (f.size > 0 || f.name));

    const sharedUrl = formData.get('url') || formData.get('link');
    const sharedText = formData.get('text');

    if (validFiles.length > 0) {
      const cache = await caches.open(SHARE_CACHE);
      
      // Clear previous shares
      const oldKeys = await cache.keys();
      await Promise.all(oldKeys.map(k => cache.delete(k)));

      const meta = [];
      
      for (let i = 0; i < validFiles.length; i++) {
        const f = validFiles[i];
        let fileName = f.name || `shared-media-${i}`;
        if (!fileName.includes('.')) {
          fileName += '.jpg'; // Fallback
        }
        
        const key = `/__shared__/${Date.now()}-${i}`;
        
        // This avoids DataCloneError and OOM because we wrap the stream-backed file directly into a Response
        await cache.put(
          key,
          new Response(f, {
            headers: {
              'Content-Type': f.type || 'application/octet-stream',
              'X-Original-Name': encodeURIComponent(fileName)
            }
          })
        );
        
        meta.push({ key, name: fileName, type: f.type || 'application/octet-stream', size: f.size });
      }

      await cache.put(
        '/__shared__/meta',
        new Response(JSON.stringify({ files: meta }), {
          headers: { 'Content-Type': 'application/json' }
        })
      );

      // Notify open clients just in case
      try {
        const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of clientsList) client.postMessage({ type: 'VERITAS_PWA_MEDIA_SHARED' });
      } catch (e) {}

      return Response.redirect(new URL('/analyze?shared=true', self.registration.scope).href, 303);
    }

    // Shared Link fallback
    const targetLink = sharedUrl || (typeof sharedText === 'string' && sharedText.match(/https?:\/\/[^\s]+/)?.[0]);
    if (targetLink) {
      return Response.redirect(new URL(`/analyze?shared_url=${encodeURIComponent(targetLink)}`, self.registration.scope).href, 303);
    }

    return Response.redirect(new URL('/analyze', self.registration.scope).href, 303);
  } catch (err) {
    console.error('[SW Share]', err);
    return Response.redirect(new URL('/analyze?share_error=1', self.registration.scope).href, 303);
  }
}
