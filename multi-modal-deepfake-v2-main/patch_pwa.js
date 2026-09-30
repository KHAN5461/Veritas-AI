const fs = require('fs');

let code = fs.readFileSync('apps/web/src/app/analyze/page.tsx', 'utf8');
const start = code.indexOf('async function retrieveSharedMediaOnce');
const end = code.indexOf('// Resilient polling helper');

if (start !== -1 && end !== -1) {
  const newFunc = `async function retrieveSharedMediaOnce(): Promise<File | null> {
  try {
    const cache = await caches.open('veritas-shared-media');
    const metaRes = await cache.match('/__shared__/meta');
    if (!metaRes) return null;

    const meta = await metaRes.json();
    if (!meta.files || meta.files.length === 0) return null;

    const m = meta.files[0];
    const res = await cache.match(m.key);
    if (!res) return null;
    
    const blob = await res.blob();
    const file = new File([blob], m.name || 'shared-file', { type: m.type || blob.type });

    const keys = await cache.keys();
    await Promise.all(keys.map((k) => cache.delete(k)));

    return file;
  } catch (err) {
    console.warn('[retrieveSharedMediaOnce] Cache API error:', err);
    return null;
  }
}

`;
  code = code.substring(0, start) + newFunc + code.substring(end);
  fs.writeFileSync('apps/web/src/app/analyze/page.tsx', code);
  console.log('Patched');
} else {
  console.log('Could not find bounds');
}
