import re

with open('apps/web/src/app/analyze/page.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace retrieveSharedMediaOnce completely
old_func_start = code.find('async function retrieveSharedMediaOnce')
old_func_end = code.find('async function retrieveSharedMediaWithRetry')

if old_func_start != -1 and old_func_end != -1:
    new_func = """async function retrieveSharedMediaOnce(): Promise<File | null> {
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

"""
    code = code[:old_func_start] + new_func + code[old_func_end:]
    with open('apps/web/src/app/analyze/page.tsx', 'w', encoding='utf-8') as f:
        f.write(code)
    print("Replaced retrieveSharedMediaOnce!")
else:
    print("Could not find function bounds.")
