import { NextRequest, NextResponse } from 'next/server';

const WORKFLOW_UUID = 'b5ac8b79-ee14-4fa8-9457-00db9281f480';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const from = searchParams.get('from');
  const to   = searchParams.get('to');

  if (!from || !to) {
    return NextResponse.json({ error: 'from and to required' }, { status: 400 });
  }

  const apiKey = process.env.RETOOL_WORKFLOW_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'RETOOL_WORKFLOW_KEY not configured' }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://api.retool.com/v1/workflows/${WORKFLOW_UUID}/startTrigger`,
      {
        method: 'POST',
        headers: {
          'Content-Type':      'application/json',
          'X-Workflow-Api-Key': apiKey,
        },
        body: JSON.stringify({ from, to }),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Retool Workflow Fehler ${res.status}`, detail: text },
        { status: 502 }
      );
    }

    const data = await res.json();

    // Retool gibt { data: { ... } } oder direkt das Objekt zurück
    const payload = data?.data ?? data;

    // Falls der Workflow noch kein kpis-Objekt hat (z.B. noch nicht vollständig konfiguriert)
    if (!payload?.kpis) {
      return NextResponse.json(
        { error: 'Workflow hat keine kpis zurückgegeben', raw: payload },
        { status: 502 }
      );
    }

    return NextResponse.json(payload);

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
