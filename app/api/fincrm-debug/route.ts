'use server';
import { NextRequest, NextResponse } from 'next/server';

const BASE = 'https://effi.fincrm.de/api/v1';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const customerId = searchParams.get('customer_id') ?? '107';

  const token = (process.env.NEXT_PUBLIC_FINCRM_ACCESS_TOKEN ?? process.env.FINCRM_ACCESS_TOKEN);
  if (!token) return NextResponse.json({ error: 'no token' }, { status: 500 });

  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' } as const;

  const res = await fetch(`${BASE}/customers/${customerId}/notes?per_page=5`, { headers });
  const raw = await res.json();
  const notes: any[] = raw.data ?? raw ?? [];

  return NextResponse.json({
    customerId,
    httpStatus: res.status,
    totalNotes: notes.length,
    allKeys: notes[0] ? Object.keys(notes[0]) : [],
    firstThreeNotes: notes.slice(0, 3),
  });
}
