import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    // Check for media file
    const file =
      (formData.get('media') as File | null) ||
      (formData.get('file') as File | null) ||
      (formData.get('files') as File | null) ||
      (formData.get('image') as File | null) ||
      (formData.get('video') as File | null);

    // Check for shared URL / text from social media
    const sharedUrl = (formData.get('url') as string | null) || (formData.get('link') as string | null);
    const sharedText = formData.get('text') as string | null;

    if (file && typeof file === 'object' && 'arrayBuffer' in file && file.size > 0) {
      // Memory guard for low-RAM mobile devices & serverless limits
      if (file.size > 4 * 1024 * 1024) {
        return NextResponse.redirect(new URL('/analyze?large_file=1', request.url), 303);
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const base64 = buffer.toString('base64');
      const mime = file.type || 'application/octet-stream';
      const name = file.name || 'shared-media';

      // Self-executing client-side bridge that stores into IndexedDB and forwards to /analyze
      const html = `<!DOCTYPE html>
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
</html>`;

      return new NextResponse(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Check for social media URL or link in text
    const targetLink =
      sharedUrl || (typeof sharedText === 'string' && sharedText.match(/https?:\/\/[^\s]+/)?.[0]);
    if (targetLink) {
      return NextResponse.redirect(
        new URL(`/analyze?shared_url=${encodeURIComponent(targetLink)}`, request.url),
        303
      );
    }
  } catch (err) {
    console.error('[share-target route] Failed to process incoming POST share:', err);
    return NextResponse.redirect(new URL('/analyze?share_error=1', request.url), 303);
  }

  return NextResponse.redirect(new URL('/analyze', request.url), 303);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sharedUrl = searchParams.get('url') || searchParams.get('link');
  const sharedText = searchParams.get('text');

  const targetLink =
    sharedUrl || (typeof sharedText === 'string' && sharedText.match(/https?:\/\/[^\s]+/)?.[0]);
  if (targetLink) {
    return NextResponse.redirect(
      new URL(`/analyze?shared_url=${encodeURIComponent(targetLink)}`, request.url),
      303
    );
  }

  return NextResponse.redirect(new URL('/analyze', request.url), 303);
}
