// Veritas AI Service Worker v6
const SW_VERSION = 'v6';

self.addEventListener('install', (event) => {
  console.log('[SW ' + SW_VERSION + '] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW ' + SW_VERSION + '] Activating...');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Handle share target POST
  if (event.request.method === 'POST' && url.pathname.includes('share-target')) {
    console.log('[SW ' + SW_VERSION + '] Intercepted share-target POST:', url.pathname);
    event.respondWith(handleShareTarget(event.request));
    return;
  }

  // Offline fallback for navigation
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          '<html><body style="background:#000;color:#fff;font-family:sans-serif;text-align:center;padding:3rem"><h2>Veritas AI is offline</h2><p>Please check your connection.</p></body></html>',
          { status: 200, headers: { 'Content-Type': 'text/html' } }
        );
      })
    );
  }
});

async function handleShareTarget(request) {
  try {
    const formData = await request.formData();
    const mediaFiles = formData.getAll('media');
    console.log('[SW ' + SW_VERSION + '] Got ' + mediaFiles.length + ' media files');

    if (!mediaFiles || mediaFiles.length === 0) {
      console.log('[SW ' + SW_VERSION + '] No media files, redirecting home');
      return Response.redirect(new URL('/', self.registration.scope).href, 303);
    }

    const file = mediaFiles[0];
    console.log('[SW ' + SW_VERSION + '] File:', file.name, file.type, file.size);

    // Build filename with extension
    let fileName = file.name || 'shared-media';
    if (!fileName.includes('.')) {
      const mimeToExt = {
        'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
        'image/gif': 'gif', 'video/mp4': 'mp4', 'audio/mpeg': 'mp3'
      };
      const ext = mimeToExt[file.type] || file.type.split('/')[1] || 'jpg';
      fileName = fileName + '.' + ext;
    }

    // Store in Cache API
    const cache = await caches.open('veritas-shared-media');
    await cache.delete('/shared-file');
    await cache.put('/shared-file', new Response(file, {
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        'Content-Length': String(file.size),
        'X-Original-Name': encodeURIComponent(fileName),
        'X-SW-Version': SW_VERSION
      }
    }));

    console.log('[SW ' + SW_VERSION + '] Cached file, redirecting to /analyze');
    const redirectUrl = new URL('/analyze?shared=true', self.registration.scope).href;
    return Response.redirect(redirectUrl, 303);

  } catch (err) {
    console.error('[SW ' + SW_VERSION + '] Share target error:', err);
    return Response.redirect(new URL('/analyze?share_error=1', self.registration.scope).href, 303);
  }
}
