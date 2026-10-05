import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function extractYouTubeId(url: string): string | null {
  const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/;
  const match = url.match(regExp);
  return match ? match[1] : null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  let targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  // If text contains a URL inside, extract just the URL
  const extractedUrl = targetUrl.match(/https?:\/\/[^\s"']+/)?.[0];
  if (extractedUrl) {
    targetUrl = extractedUrl;
  }

  try {
    const parsedUrl = new URL(targetUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: 'Invalid URL protocol' }, { status: 400 });
    }

    // 1. Cloud Drive Links: Forward internally to cloud drive resolver
    if (
      targetUrl.includes('drive.google.com') ||
      targetUrl.includes('dropbox.com') ||
      targetUrl.includes('1drv.ms') ||
      targetUrl.includes('sharepoint.com')
    ) {
      const resolverUrl = new URL('/api/cloud-drive-resolver', request.url);
      resolverUrl.searchParams.set('url', targetUrl);
      const cloudRes = await fetch(resolverUrl.href);
      if (cloudRes.ok) {
        const buffer = await cloudRes.arrayBuffer();
        const contentType = cloudRes.headers.get('content-type') || 'application/octet-stream';
        const disposition = cloudRes.headers.get('content-disposition') || 'inline; filename="cloud-media"';
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': disposition,
            'Cache-Control': 'no-store'
          }
        });
      }
    }

    // 2. YouTube & YouTube Shorts
    const ytId = extractYouTubeId(targetUrl);
    if (ytId) {
      const ytThumbUrls = [
        `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`,
        `https://img.youtube.com/vi/${ytId}/sddefault.jpg`,
        `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
      ];

      for (const thumbUrl of ytThumbUrls) {
        try {
          const thumbRes = await fetch(thumbUrl);
          if (thumbRes.ok && thumbRes.status === 200) {
            const buffer = await thumbRes.arrayBuffer();
            if (buffer.byteLength > 5000 || thumbUrl.includes('hqdefault')) {
              return new NextResponse(buffer, {
                status: 200,
                headers: {
                  'Content-Type': 'image/jpeg',
                  'Content-Disposition': `inline; filename="youtube-${ytId}-frame.jpg"`,
                  'Cache-Control': 'no-store'
                }
              });
            }
          }
        } catch {}
      }
    }

    // 3. Reddit Clean-up
    if (targetUrl.includes('reddit.com') || targetUrl.includes('redd.it')) {
      if (targetUrl.includes('preview.redd.it') || targetUrl.includes('i.redd.it')) {
        targetUrl = targetUrl.replace(/&amp;/g, '&');
      }
    }

    // 4. Fetch target with realistic browser headers
    const upstreamRes = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1'
      },
      redirect: 'follow'
    });

    if (!upstreamRes.ok) {
      return NextResponse.json(
        { error: `Remote server returned HTTP ${upstreamRes.status}. The host may block automated access.` },
        { status: upstreamRes.status }
      );
    }

    const contentType = (upstreamRes.headers.get('content-type') || '').toLowerCase();

    // 5. If HTML Page, parse OpenGraph, Twitter, and HTML5 media tags
    if (contentType.includes('text/html')) {
      const html = await upstreamRes.text();
      const candidateUrls: string[] = [];

      // Look for og:video, twitter:player:stream, video tags
      const videoMatches = [
        ...html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:video|og:video:url|og:video:secure_url|twitter:player:stream)["'][^>]+content=["']([^"']+)["']/gi),
        ...html.matchAll(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:video|og:video:url|og:video:secure_url|twitter:player:stream)["']/gi),
        ...html.matchAll(/<video[^>]+src=["']([^"']+)["']/gi),
        ...html.matchAll(/<source[^>]+src=["']([^"']+)["']/gi)
      ];
      for (const m of videoMatches) {
        if (m[1]) candidateUrls.push(m[1]);
      }

      // Look for og:image, twitter:image, link image_src
      const imageMatches = [
        ...html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:image|og:image:url|og:image:secure_url|twitter:image|twitter:image:src)["'][^>]+content=["']([^"']+)["']/gi),
        ...html.matchAll(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|og:image:url|og:image:secure_url|twitter:image|twitter:image:src)["']/gi),
        ...html.matchAll(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/gi)
      ];
      for (const m of imageMatches) {
        if (m[1]) candidateUrls.push(m[1]);
      }

      for (let rawUrl of candidateUrls) {
        rawUrl = rawUrl.replace(/&amp;/g, '&').trim();
        if (!rawUrl || rawUrl.startsWith('data:')) continue;

        let absoluteMediaUrl = rawUrl;
        if (absoluteMediaUrl.startsWith('//')) {
          absoluteMediaUrl = 'https:' + absoluteMediaUrl;
        } else if (absoluteMediaUrl.startsWith('/')) {
          absoluteMediaUrl = new URL(absoluteMediaUrl, targetUrl).href;
        }

        try {
          const mediaRes = await fetch(absoluteMediaUrl, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              'Accept': 'image/*,video/*,audio/*,*/*',
              'Referer': targetUrl
            }
          });

          if (mediaRes.ok) {
            const mediaType = (mediaRes.headers.get('content-type') || '').toLowerCase();
            if (mediaType.startsWith('image/') || mediaType.startsWith('video/') || mediaType.startsWith('audio/')) {
              const mediaBuffer = await mediaRes.arrayBuffer();
              const ext = mediaType.split('/')[1]?.split(';')[0] || (mediaType.startsWith('video/') ? 'mp4' : 'jpg');
              return new NextResponse(mediaBuffer, {
                status: 200,
                headers: {
                  'Content-Type': mediaType,
                  'Content-Disposition': `inline; filename="extracted-media.${ext}"`,
                  'Cache-Control': 'no-store'
                }
              });
            }
          }
        } catch {}
      }

      return NextResponse.json(
        { error: 'Could not extract direct media from this link. Please download the file and upload directly.' },
        { status: 422 }
      );
    }

    // 6. Direct media file stream (Image/Video/Audio)
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
