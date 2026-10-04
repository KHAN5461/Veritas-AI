import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    // Check for shared media file(s)
    const validFiles: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (value && typeof value === 'object' && typeof (value as any).size === 'number' && (value as any).size > 0) {
        validFiles.push(value as File);
      }
    }

    // Check for link / URL
    const sharedUrl = (formData.get('url') as string) || (formData.get('link') as string);
    const sharedText = formData.get('text') as string;
    const sharedTitle = formData.get('title') as string;

    let targetLink = typeof sharedUrl === 'string' && sharedUrl.startsWith('http') ? sharedUrl : null;
    if (!targetLink && typeof sharedText === 'string') {
      targetLink = sharedText.match(/https?:\/\/[^\s"']+/)?.[0] || null;
    }
    if (!targetLink && typeof sharedTitle === 'string') {
      targetLink = sharedTitle.match(/https?:\/\/[^\s"']+/)?.[0] || null;
    }

    if (validFiles.length > 0) {
      const file = validFiles[0];
      // If file is within serverless memory envelope (<= 4MB), construct an HTML bridge
      if (file.size <= 4 * 1024 * 1024) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const base64 = buffer.toString('base64');
        const mime = file.type || 'application/octet-stream';
        const name = file.name || 'shared-media';

        const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Veritas AI - Ingesting Media</title>
</head>
<body style="background:#0f1419;color:#e1e3e5;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
  <p>Ingesting shared media...</p>
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
        const fileObj = new File([blob], "${encodeURIComponent(name)}", { type: "${mime}" });

        const cache = await caches.open('veritas-shared-media');
        const oldKeys = await cache.keys();
        await Promise.all(oldKeys.map(k => cache.delete(k)));

        const key = '/__shared__/' + Date.now() + '-0';
        await cache.put(
          key,
          new Response(fileObj, {
            headers: { 'Content-Type': "${mime}", 'X-Original-Name': "${encodeURIComponent(name)}" }
          })
        );
        await cache.put(
          '/__shared__/meta',
          new Response(JSON.stringify({ files: [{ key, name: "${encodeURIComponent(name)}", type: "${mime}", size: ${file.size} }] }), {
            headers: { 'Content-Type': 'application/json' }
          })
        );
        window.location.replace('/analyze?shared=true');
      } catch (err) {
        window.location.replace('/analyze?shared=true');
      }
    })();
  </script>
</body>
</html>`;

        return new NextResponse(html, {
          status: 200,
          headers: { 'Content-Type': 'text/html' }
        });
      }

      // For larger files, redirect to analyze so user can pick it or PWA picks it up
      return NextResponse.redirect(new URL('/analyze?large_file=1', request.url), 303);
    }

    if (targetLink) {
      return NextResponse.redirect(new URL(`/analyze?shared_url=${encodeURIComponent(targetLink)}`, request.url), 303);
    }
  } catch (err) {
    console.error('[share-target POST fallback route]', err);
  }

  return NextResponse.redirect(new URL('/analyze', request.url), 303);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sharedUrl = searchParams.get('url') || searchParams.get('link');
  const sharedText = searchParams.get('text');
  const sharedTitle = searchParams.get('title');

  let targetLink = typeof sharedUrl === 'string' && sharedUrl.startsWith('http') ? sharedUrl : null;
  if (!targetLink && typeof sharedText === 'string') {
    targetLink = sharedText.match(/https?:\/\/[^\s"']+/)?.[0] || null;
  }
  if (!targetLink && typeof sharedTitle === 'string') {
    targetLink = sharedTitle.match(/https?:\/\/[^\s"']+/)?.[0] || null;
  }

  if (targetLink) {
    return NextResponse.redirect(new URL(`/analyze?shared_url=${encodeURIComponent(targetLink)}`, request.url), 303);
  }

  return NextResponse.redirect(new URL('/analyze', request.url), 303);
}
