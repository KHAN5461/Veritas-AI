// Veritas AI Service Worker v14 (Share Target: exact route, multi-file, MIME-based names)
const SW_VERSION = 'v14';
const OFFLINE_CACHE = 'veritas-offline-v14';
const SHARE_CACHE = 'veritas-shared-media';
const OFFLINE_URL = '/offline';
const SHARE_PATH = '/share-target';

const EXT_BY_MIME = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'image/heic': 'heic', 'image/heif': 'heif', 'image/bmp': 'bmp', 'image/tiff': 'tiff',
  'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm', 'video/3gpp': '3gp',
  'video/x-matroska': 'mkv', 'video/x-msvideo': 'avi', 'video/mpeg': 'mpeg',
  'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/aac': 'aac',
  'audio/ogg': 'ogg', 'audio/wav': 'wav', 'audio/flac': 'flac'
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then((cache) => {
      return cache.addAll([OFFLINE_URL, '/logo.png', '/icon-192.png']);
    }).catch((err) => console.warn('[SW] Precache fail', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== OFFLINE_CACHE && key !== SHARE_CACHE) return caches.delete(key);
          })
        )
      )
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Share target: ONLY the exact same-origin route. Never touch uploads to the API or other POSTs.
  if (
    event.request.method === 'POST' &&
    url.origin === self.location.origin &&
    url.pathname === SHARE_PATH
  ) {
    event.respondWith(handleShareTarget(event.request));
    return;
  }

  // Offline fallback for page navigations
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
  }
});

function safeName(file, index) {
  let name = (file.name || '').trim();
  const cleanMime = (file.type || '').split(';')[0].trim().toLowerCase();
  
  if (!name || name === 'blob' || name === 'shared-media') {
    name = `shared-media-${index}`;
  }
  
  if (!/\.[a-z0-9]{2,5}$/i.test(name)) {
    const ext = EXT_BY_MIME[cleanMime] || 
      (cleanMime.startsWith('image/') ? 'jpg' :
       cleanMime.startsWith('video/') ? 'mp4' :
       cleanMime.startsWith('audio/') ? 'mp3' : 'jpg');
    name += '.' + ext;
  }
  return name;
}

async function handleShareTarget(request) {
  const redirect = (path) => Response.redirect(new URL(path, self.registration.scope).href, 303);

  try {
    const formData = await request.formData();

    // Comprehensive extraction of all binary files from any form field key
    const validFiles = [];
    for (const [key, value] of formData.entries()) {
      if (value && typeof value === 'object' && typeof value.size === 'number' && value.size > 0) {
        validFiles.push(value);
      }
    }

    const sharedUrl = formData.get('url') || formData.get('link');
    const sharedText = formData.get('text');

    if (validFiles.length > 0) {
      const cache = await caches.open(SHARE_CACHE);

      // Clear previous share
      const oldKeys = await cache.keys();
      await Promise.all(oldKeys.map((k) => cache.delete(k)));

      const meta = [];
      const stamp = Date.now();

      for (let i = 0; i < validFiles.length; i++) {
        const f = validFiles[i];
        const fileName = safeName(f, i);
        const cleanType = (f.type || '').split(';')[0].trim() || 
          (fileName.endsWith('.mp4') || fileName.endsWith('.mov') || fileName.endsWith('.webm') ? 'video/mp4' :
           fileName.endsWith('.mp3') || fileName.endsWith('.wav') || fileName.endsWith('.ogg') ? 'audio/mpeg' : 'image/jpeg');
        const key = `/__shared__/${stamp}-${i}`;

        // Wrapping the File directly avoids copying it into memory
        await cache.put(
          key,
          new Response(f, {
            headers: { 'Content-Type': cleanType, 'X-Original-Name': encodeURIComponent(fileName) }
          })
        );
        meta.push({ key, name: fileName, type: cleanType, size: f.size });
      }

      // Meta is written LAST, so its presence means every file is ready
      await cache.put(
        '/__shared__/meta',
        new Response(JSON.stringify({ files: meta }), {
          headers: { 'Content-Type': 'application/json' }
        })
      );

      return redirect('/analyze?shared=true');
    }

    // Link-only share fallback
    const targetLink =
      (typeof sharedUrl === 'string' && sharedUrl) ||
      (typeof sharedText === 'string' ? sharedText.match(/https?:\/\/[^\s]+/)?.[0] : null);
    if (targetLink) {
      return redirect(`/analyze?shared_url=${encodeURIComponent(targetLink)}`);
    }

    return redirect('/analyze');
  } catch (err) {
    console.error('[SW Share]', err);
    return redirect('/analyze?share_error=1');
  }
}
