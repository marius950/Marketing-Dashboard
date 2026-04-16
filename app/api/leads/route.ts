import { NextRequest, NextResponse } from 'next/server';

const WORKFLOW_UUID = 'b5ac8b79-ee14-4fa8-9457-00db9281f480';
const RETOOL_API    = 'https://api.retool.com/v1';

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
    // 1. Workflow starten
    const triggerRes = await fetch(
      `${RETOOL_API}/workflows/${WORKFLOW_UUID}/startTrigger`,
      {
        method: 'POST',
        headers: {
          'Content-Type':       'application/json',
          'X-Workflow-Api-Key': apiKey,
        },
        body: JSON.stringify({ from, to }),
      }
    );

    if (!triggerRes.ok) {
      const text = await triggerRes.text();
      return NextResponse.json({ error: `Trigger fehler ${triggerRes.status}`, detail: text }, { status: 502 });
    }

    const triggerData = await triggerRes.json();
    const runId = triggerData?.workflow_run?.id;

    if (!runId) {
      return NextResponse.json({ error: 'Keine Run-ID erhalten', raw: triggerData }, { status: 502 });
    }

    // 2. Auf Ergebnis warten (polling, max 30 Sekunden)
    const maxAttempts = 15;
    const delay = 2000; // 2 Sekunden zwischen Versuchen

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, delay));

      const statusRes = await fetch(
        `${RETOOL_API}/workflows/${WORKFLOW_UUID}/runs/${runId}`,
        {
          headers: {
            'X-Workflow-Api-Key': apiKey,
          },
        }
      );

      if (!statusRes.ok) continue;

      const statusData = await statusRes.json();
      const status = statusData?.workflow_run?.status ?? statusData?.status;

      if (status === 'SUCCESS' || status === 'COMPLETED') {
        // Ergebnis aus dem letzten Block holen
        const result = statusData?.workflow_run?.data ?? statusData?.data ?? statusData;
        
        if (!result?.kpis) {
          return NextResponse.json({ error: 'Workflow hat keine kpis zurückgegeben', raw: result }, { status: 502 });
        }

        return NextResponse.json(result);
      }

      if (status === 'FAILED' || status === 'ERROR') {
        return NextResponse.json({ error: 'Workflow fehlgeschlagen', raw: statusData }, { status: 502 });
      }

      // PENDING oder RUNNING → weiter warten
    }

    return NextResponse.json({ error: 'Workflow Timeout nach 30 Sekunden' }, { status: 504 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
