import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const url = searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

  try {
    const decoded = decodeURIComponent(url);
    const response = await fetch(decoded, {
      headers: {
        'Referer': 'https://www.facebook.com/',
        'User-Agent': 'Mozilla/5.0 (compatible; effi-dashboard/1.0)',
      },
    });
    if (!response.ok) return new NextResponse(null, { status: response.status });

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
