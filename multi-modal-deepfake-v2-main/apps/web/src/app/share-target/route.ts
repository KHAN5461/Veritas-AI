// app/share-target/route.ts  (Next.js App Router)
// Safety net: if the service worker is not controlling the page yet (first launch after install,
// SW updating, SW killed), Android POSTs the shared files straight to the server.
// Without this route the user gets a 404/405 and "only links work" appears to be the bug.
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  return NextResponse.redirect(new URL('/analyze?share_error=1', request.url), 303);
}

export async function GET(request: Request) {
  return NextResponse.redirect(new URL('/analyze', request.url), 303);
}
