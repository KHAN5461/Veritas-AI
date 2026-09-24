import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  return new NextResponse('<html><body><h2>Service Worker not ready!</h2><p>Please completely force-close the Veritas app from your phone\'s app switcher, then try sharing the file again. The app needs to wake up properly to receive files.</p></body></html>', { status: 200, headers: { 'Content-Type': 'text/html' } });
}

export async function GET(request: Request) {
  return new NextResponse('<html><body><h2>Service Worker not ready!</h2><p>Please completely force-close the Veritas app from your phone\'s app switcher, then try sharing the file again.</p></body></html>', { status: 200, headers: { 'Content-Type': 'text/html' } });
}

