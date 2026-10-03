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
  let name = (file.name || '').trim() || `shared-media-${index}`;
  if (!/\.[a-z0-9]{2,5}$/i.test(name)) {
    name += '.' + (EXT_BY_MIME[file.type] || 'bin');
  }
  return name;
}

async function handleShareTarget(request) {
  const redirect = (path) => Response.redirect(new URL(path, self.registration.scope).href, 303);

  try {
    const formData = await request.formData();

    let mediaFiles = formData.getAll('media');
    if (!mediaFiles.length) mediaFiles = formData.getAll('file');
    if (!mediaFiles.length) mediaFiles = formData.getAll('files');

    // Real files only (text fields come through as strings)
    const validFiles = mediaFiles.filter((f) => f instanceof File && f.size > 0);

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
        const type = f.type || 'application/octet-stream';
        const key = `/__shared__/${stamp}-${i}`;

        // Wrapping the File directly avoids copying it into memory
        await cache.put(
          key,
          new Response(f, {
            headers: { 'Content-Type': type, 'X-Original-Name': encodeURIComponent(fileName) }
          })
        );
        meta.push({ key, name: fileName, type, size: f.size });
      }

      // Meta is written LAST, so its presence means every file is ready
      await cache.put(
        '/__shared__/meta',
        new Response(JSON.stringify({ files: meta }), {
          headers: { 'Content-Type': 'application/json' }
        })
      );

      // The redirect below always navigates the window, so no postMessage is needed
      // (a message to an old page that is about to unload would consume the files and lose them).
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
