import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    const parsedUrl = new URL(targetUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: 'Invalid URL protocol' }, { status: 400 });
    }

    // Server-side fetch bypasses browser CORS restrictions
    const upstreamRes = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/*,video/*,audio/*,*/*'
      },
      redirect: 'follow'
    });

    if (!upstreamRes.ok) {
      return NextResponse.json(
        { error: `Remote server returned HTTP ${upstreamRes.status}` },
        { status: upstreamRes.status }
      );
    }

    const contentType = (upstreamRes.headers.get('content-type') || '').toLowerCase();

    // If it is an HTML page (like social media links), try to extract og:image or og:video
    if (contentType.includes('text/html')) {
      const html = await upstreamRes.text();
      const mediaMatch =
        html.match(/<meta[^>]+property=["']og:video(?::url)?["'][^>]+content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:video(?::url)?["']/i) ||
        html.match(/<meta[^>]+property=["']og:image(?::url)?["'][^>]+content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::url)?["']/i) ||
        html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);

      if (mediaMatch && mediaMatch[1]) {
        let extractedMediaUrl = mediaMatch[1];
        if (extractedMediaUrl.startsWith('/')) {
          extractedMediaUrl = new URL(extractedMediaUrl, targetUrl).href;
        }

        // Fetch the extracted direct media
        const mediaRes = await fetch(extractedMediaUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });

        if (mediaRes.ok) {
          const mediaType = mediaRes.headers.get('content-type') || 'application/octet-stream';
          const mediaBuffer = await mediaRes.arrayBuffer();
          return new NextResponse(mediaBuffer, {
            status: 200,
            headers: {
              'Content-Type': mediaType,
              'Content-Disposition': `inline; filename="extracted-media.${mediaType.split('/')[1]?.split(';')[0] || 'jpg'}"`,
              'Cache-Control': 'no-store'
            }
          });
        }
      }

      return NextResponse.json(
        { error: 'Could not extract direct media from this web page. Please save the media file and upload it directly.' },
        { status: 422 }
      );
    }

    // Direct media file stream
    const arrayBuffer = await upstreamRes.arrayBuffer();
    const finalContentType = contentType || 'application/octet-stream';
    const ext = finalContentType.split('/')[1]?.split(';')[0] || 'media';
    const fallbackName = targetUrl.split('/').pop()?.split('?')[0] || `shared-media.${ext}`;

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': finalContentType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(fallbackName)}"`,
        'Cache-Control': 'no-store'
      }
    });
  } catch (err: any) {
    console.error('[fetch-media] Error fetching media URL:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to download media from link' },
      { status: 500 }
    );
  }
}
