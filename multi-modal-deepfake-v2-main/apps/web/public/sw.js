// sw.js (Service Worker)
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Match the action defined in manifest.json
  if (event.request.method === 'POST' && url.pathname === '/share-target/') {
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
          
          // Put the new file in cache
          await cache.put('/shared-file', new Response(file, {
            headers: {
              'Content-Type': file.type,
              'Content-Length': file.size.toString(),
              'X-Original-Name': file.name
            }
          }));

          // 2. Redirect the user to the destination page inside the app
          return Response.redirect('/analyze?shared=1', 303);
        }
        
        // If no files, just redirect to home
        return Response.redirect('/', 303);
      } catch (err) {
        console.error('Error handling share target:', err);
        return Response.redirect('/?error=share_failed', 303);
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
