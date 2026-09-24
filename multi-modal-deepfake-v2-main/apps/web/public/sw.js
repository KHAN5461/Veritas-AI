// sw.js (v4 backwards compat fix) (Service Worker)
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Match the action defined in manifest.json
  if (event.request.method === 'POST' && url.pathname.includes('share-target')) {
    event.respondWith((async () => {
      try {
        const formData = await event.request.formData();
        const mediaFiles = formData.getAll('media');

        if (mediaFiles && mediaFiles.length > 0) {
          // 1. Store shared files in Cache Storage
          const cache = await caches.open('veritas-shared-media');
          
          // We will store the first media file shared (Veritas currently handles one at a time in /analyze)
          // For batches, we could redirect to /batch, but /analyze is best for single shares
          const file = mediaFiles[0];
          
          // Clear any old shared files just in case
          await cache.delete('/shared-file');
          
          let fileName = file.name || 'shared-media';
          if (!fileName.includes('.')) {
            const ext = file.type.split('/')[1] || 'jpg';
            fileName = `${fileName}.${ext}`;
          }

          // Put the new file in cache
          await cache.put('/shared-file', new Response(file, {
            headers: {
              'Content-Type': file.type,
              'Content-Length': file.size.toString(),
              'X-Original-Name': fileName
            }
          }));

          // 2. Redirect the user to the destination page inside the app
          return Response.redirect('/analyze?shared=true', 303);
        }
        
        // If no files, just redirect to home
        return Response.redirect('/', 303);
      } catch (err) {
        console.error('Error handling share target:', err);
                return new Response('<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="font-family:sans-serif;text-align:center;padding:2rem;background:#000;color:#fff;"><h2>Share Failed</h2><p>Could not process the shared file. Please force-close the app and try again.</p><button onclick="window.location.href=\'/\'" style="padding:10px 20px;border-radius:8px;background:#ff3366;color:white;border:none;margin-top:20px;">Go to App</button></body></html>', { status: 200, headers: { 'Content-Type': 'text/html' } });
      }
    })());
    return;
  }

  // To pass Chrome PWA offline criteria, we need to at least respondWith for navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        // If network fails, try to serve from cache or just return a dummy offline page
        const cache = await caches.open('veritas-offline');
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) return cachedResponse;
        
        return new Response('Veritas AI is offline. Please check your connection.', {
          status: 200,
          headers: { 'Content-Type': 'text/html' }
        });
      })
    );
  }
});

