import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function extractGoogleDriveFileId(url: string): string | null {
  const match1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match1) return match1[1];
  const match2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match2) return match2[1];
  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const driveUrl = searchParams.get('url');

  if (!driveUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    let directDownloadUrl = driveUrl;

    // 1. Google Drive
    const gDriveId = extractGoogleDriveFileId(driveUrl);
    if (gDriveId) {
      directDownloadUrl = `https://drive.google.com/uc?export=download&id=${gDriveId}`;
    }
    // 2. Dropbox
    else if (driveUrl.includes('dropbox.com')) {
      directDownloadUrl = driveUrl.replace(/[?&]dl=0/, '').replace(/[?&]dl=1/, '');
      directDownloadUrl += (directDownloadUrl.includes('?') ? '&' : '?') + 'raw=1';
    }
    // 3. OneDrive / SharePoint
    else if (driveUrl.includes('1drv.ms') || driveUrl.includes('sharepoint.com')) {
      directDownloadUrl = driveUrl.includes('?') ? `${driveUrl}&download=1` : `${driveUrl}?download=1`;
    }

    // Stream download from cloud provider
    let upstreamRes = await fetch(directDownloadUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      },
      redirect: 'follow'
    });

    // Handle Google Drive large file confirmation page loop
    if (gDriveId && upstreamRes.headers.get('content-type')?.includes('text/html')) {
      const htmlText = await upstreamRes.text();
      const confirmMatch = htmlText.match(/confirm=([0-9a-zA-Z_-]+)/);
      if (confirmMatch) {
        const confirmCode = confirmMatch[1];
        const confirmedUrl = `https://drive.google.com/uc?export=download&id=${gDriveId}&confirm=${confirmCode}`;
        upstreamRes = await fetch(confirmedUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
          }
        });
      }
    }

    if (!upstreamRes.ok) {
      return NextResponse.json(
        { error: `Cloud provider returned HTTP ${upstreamRes.status}. The file may be private or restricted.` },
        { status: upstreamRes.status }
      );
    }

    const contentType = upstreamRes.headers.get('content-type') || 'application/octet-stream';
    const disposition = upstreamRes.headers.get('content-disposition');
    let fileName = `cloud-media-${Date.now()}`;

    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?/i);
      if (match && match[1]) fileName = decodeURIComponent(match[1]);
    } else {
      const ext = contentType.split('/')[1]?.split(';')[0] || 'media';
      fileName += `.${ext}`;
    }

    const arrayBuffer = await upstreamRes.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
        'Cache-Control': 'no-store'
      }
    });
  } catch (err: any) {
    console.error('[cloud-drive-resolver] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to download file from Cloud Drive.' },
      { status: 500 }
    );
  }
}
