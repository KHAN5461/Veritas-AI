import re

with open('apps/web/src/app/share-target/route.ts', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace the HTML block inside route.ts to use Cache API instead of IndexedDB
new_html = """      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Veritas AI - Receiving Shared Media...</title>
  <style>
    body { background: #0f1419; color: #e1e3e5; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
    .loader { border: 3px solid rgba(255,255,255,0.1); border-top: 3px solid #7dd3fc; border-radius: 50%; width: 44px; height: 44px; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div>
    <div class="loader"></div>
    <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">Ingesting Shared Media</h3>
    <p style="margin: 0; color: #94a3b8; font-size: 14px;">Forwarding to forensic analysis engine...</p>
  </div>
  <script>
    (async function() {
      try {
        const base64Data = "${base64}";
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "${mime}" });
        const name = decodeURIComponent("${encodeURIComponent(name)}");
        const fileObj = new File([blob], name, { type: "${mime}" });

        const cache = await caches.open('veritas-shared-media');
        const oldKeys = await cache.keys();
        await Promise.all(oldKeys.map(k => cache.delete(k)));

        const key = '/__shared__/' + Date.now() + '-0';
        await cache.put(
          key,
          new Response(fileObj, {
            headers: {
              'Content-Type': "${mime}",
              'X-Original-Name': encodeURIComponent(name)
            }
          })
        );

        await cache.put(
          '/__shared__/meta',
          new Response(JSON.stringify({ files: [{ key, name, type: "${mime}", size: ${file.size} }] }), {
            headers: { 'Content-Type': 'application/json' }
          })
        );

        window.location.replace('/analyze?shared=true');
      } catch (err) {
        window.location.replace('/analyze?share_error=1');
      }
    })();
  </script>
</body>
</html>`;"""

# Locate where the HTML starts and ends
start_idx = code.find('      const html = `<!DOCTYPE html>')
end_idx = code.find('</html>`;') + 9

if start_idx != -1 and end_idx != -1:
    code = code[:start_idx] + new_html + code[end_idx:]
    with open('apps/web/src/app/share-target/route.ts', 'w', encoding='utf-8') as f:
        f.write(code)
    print("Patched route.ts successfully.")
else:
    print("Could not find HTML block.")
