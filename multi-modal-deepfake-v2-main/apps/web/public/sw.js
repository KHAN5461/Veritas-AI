// Veritas AI Service Worker v16 (Universal Media Ingestion Engine)
const SW_VERSION = 'v16';
const OFFLINE_CACHE = 'veritas-offline-v16';
const SHARE_CACHE = 'veritas-shared-media';
const OFFLINE_URL = '/offline';
const SHARE_PATH = '/share-target';

const EXT_BY_MIME = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'image/heic': 'heic', 'image/heif': 'heif', 'image/bmp': 'bmp', 'image/tiff': 'tiff',
  'image/svg+xml': 'svg',
  'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm', 'video/3gpp': '3gp',
  'video/3gpp2': '3g2', 'video/x-matroska': 'mkv', 'video/x-msvideo': 'avi', 'video/mpeg': 'mpeg',
  'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/aac': 'aac',
  'audio/ogg': 'ogg', 'audio/wav': 'wav', 'audio/flac': 'flac', 'audio/opus': 'opus',
  'audio/amr': 'amr'
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

  // Universal Share Target POST interception
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

// Magic number header inspection to recover authentic file extensions for raw streams
async function sniffMagicMime(blob) {
  try {
    const slice = blob.slice(0, 32);
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // JPEG: FF D8 FF
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return 'image/jpeg';
    // PNG: 89 50 4E 47
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return 'image/png';
    // GIF: 47 49 46 38
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return 'image/gif';
    // WEBP: RIFF....WEBP
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
        bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp';
    // MP4 / MOV / M4V (ftyp box at offset 4)
    if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) return 'video/mp4';
    // Matroska / WebM: 1A 45 DF A3
    if (bytes[0] === 0x1A && bytes[1] === 0x45 && bytes[2] === 0xDF && bytes[3] === 0xA3) return 'video/webm';
    // MP3 (ID3v2 tag or MPEG sync)
    if ((bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) || (bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0)) return 'audio/mpeg';
    // WAV: RIFF....WAVE
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
        bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45) return 'audio/wav';
    // OGG / Opus
    if (bytes[0] === 0x4F && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) return 'audio/ogg';
    // FLAC: 66 4C 61 43
    if (bytes[0] === 0x66 && bytes[1] === 0x4C && bytes[2] === 0x61 && bytes[3] === 0x43) return 'audio/flac';
  } catch {}
  return null;
}

async function resolveSafeFileMeta(file, index) {
  let name = (file.name || '').trim();
  let mime = (file.type || '').split(';')[0].trim().toLowerCase();

  // If MIME is missing or generic octet-stream, sniff header bytes
  if (!mime || mime === 'application/octet-stream' || mime === 'binary/octet-stream') {
    const sniffed = await sniffMagicMime(file);
    if (sniffed) mime = sniffed;
  }

  if (!name || name === 'blob' || name === 'shared-media' || name.startsWith('image.') || name.startsWith('video.') || name === 'file') {
    name = `shared-media-${index}`;
  }

  if (!/\.[a-z0-9]{2,5}$/i.test(name)) {
    const ext =
      EXT_BY_MIME[mime] ||
      (mime.startsWith('image/') ? 'jpg' :
       mime.startsWith('video/') ? 'mp4' :
       mime.startsWith('audio/') ? 'mp3' : 'jpg');
    name += '.' + ext;
  }

  const finalType = mime || (name.endsWith('.mp4') ? 'video/mp4' : name.endsWith('.mp3') ? 'audio/mpeg' : 'image/jpeg');
  return { name, type: finalType };
}

function saveToIDB(filesData) {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open('veritas_pwa_db', 2);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('shared_media_v2')) {
          db.createObjectStore('shared_media_v2', { keyPath: 'id' });
        }
      };
      req.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction('shared_media_v2', 'readwrite');
        const store = tx.objectStore('shared_media_v2');
        store.put({
          id: 'latest_share',
          files: filesData,
          timestamp: Date.now()
        });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      };
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

async function handleShareTarget(request) {
  const redirect = (path) => Response.redirect(new URL(path, self.registration.scope).href, 303);

  try {
    const formData = await request.formData();

    // 1. Comprehensive binary file extraction from ANY form field key
    const validFiles = [];
    for (const [key, value] of formData.entries()) {
      if (value && typeof value === 'object' && typeof value.size === 'number' && value.size > 0) {
        validFiles.push(value);
      }
    }

    // 2. Link / Text extraction (supports browser share, Twitter, YouTube, WhatsApp captions, Drive)
    let sharedUrl = formData.get('url') || formData.get('link');
    const sharedText = formData.get('text');
    const sharedTitle = formData.get('title');

    let targetLink = typeof sharedUrl === 'string' && sharedUrl.startsWith('http') ? sharedUrl : null;
    if (!targetLink && typeof sharedText === 'string') {
      targetLink = sharedText.match(/https?:\/\/[^\s"']+/)?.[0] || null;
    }
    if (!targetLink && typeof sharedTitle === 'string') {
      targetLink = sharedTitle.match(/https?:\/\/[^\s"']+/)?.[0] || null;
    }

    if (validFiles.length > 0) {
      const stamp = Date.now();
      const meta = [];
      const idbFiles = [];

      let cache = null;
      try {
        cache = await caches.open(SHARE_CACHE);
        const oldKeys = await cache.keys();
        await Promise.all(oldKeys.map((k) => cache.delete(k)));
      } catch (cacheOpenErr) {
        console.warn('[SW] Cache open error:', cacheOpenErr);
      }

      for (let i = 0; i < validFiles.length; i++) {
        const f = validFiles[i];
        const { name: fileName, type: cleanType } = await resolveSafeFileMeta(f, i);
        const key = `/__shared__/${stamp}-${i}`;

        // Save into Cache Storage
        if (cache) {
          try {
            await cache.put(
              key,
              new Response(f, {
                headers: { 'Content-Type': cleanType, 'X-Original-Name': encodeURIComponent(fileName) }
              })
            );
          } catch (putErr) {
            console.warn('[SW] Cache put failed for file:', fileName, putErr);
          }
        }

        meta.push({ key, name: fileName, type: cleanType, size: f.size });
        idbFiles.push({ key, name: fileName, type: cleanType, size: f.size, blob: f });
      }

      // Write meta to Cache Storage
      if (cache) {
        try {
          await cache.put(
            '/__shared__/meta',
            new Response(JSON.stringify({ files: meta }), {
              headers: { 'Content-Type': 'application/json' }
            })
          );
        } catch {}
      }

      // Dual persistence: Also save into IndexedDB for large WhatsApp videos
      await saveToIDB(idbFiles);

      return redirect('/analyze?shared=true');
    }

    // 3. Link-only share fallback (Browser image URL, YouTube, Drive, Twitter, Instagram link)
    if (targetLink) {
      return redirect(`/analyze?shared_url=${encodeURIComponent(targetLink)}`);
    }

    return redirect('/analyze');
  } catch (err) {
    console.error('[SW Share]', err);
    return redirect('/analyze?share_error=1');
  }
}
