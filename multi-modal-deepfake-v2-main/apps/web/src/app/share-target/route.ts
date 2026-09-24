import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // Fallback if SW didn't intercept: redirect to analyze page
  return NextResponse.redirect(new URL('/analyze', request.url), 303);
}

export async function GET(request: Request) {
  return NextResponse.redirect(new URL('/analyze', request.url), 303);
}
