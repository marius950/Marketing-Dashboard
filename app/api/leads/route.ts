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
    // Workflow triggern und auf synchrone Antwort warten
    // Retool gibt das Ergebnis direkt zurück wenn der Workflow einen Response-Block hat
    // Andernfalls pollen wir auf /runs/{id}/results
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
      return NextResponse.json({ error: `Trigger Fehler ${triggerRes.status}`, detail: text }, { status: 502 });
    }

    const triggerData = await triggerRes.json();
    const runId = triggerData?.workflow_run?.id;

    if (!runId) {
      return NextResponse.json({ error: 'Keine Run-ID', raw: triggerData }, { status: 502 });
    }

    // Auf Ergebnis pollen — Retool speichert Block-Output unter /runs/{id}/results
    const maxAttempts = 20;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, 2000));

      // Versuche zuerst /results Endpoint
      const resultsRes = await fetch(
        `${RETOOL_API}/workflows/${WORKFLOW_UUID}/runs/${runId}/results`,
        { headers: { 'X-Workflow-Api-Key': apiKey } }
      );

      if (resultsRes.ok) {
        const resultsData = await resultsRes.json();
        
        // Suche kpis in verschiedenen Strukturen
        const payload = resultsData?.data
          ?? resultsData?.results
          ?? resultsData?.output
          ?? resultsData?.code1
          ?? resultsData;

        if (payload?.kpis) {
          return NextResponse.json(payload);
        }

        // Wenn kein kpis, prüfe ob noch läuft
        const status = resultsData?.status ?? resultsData?.workflow_run?.status;
        if (status === 'FAILED' || status === 'ERROR') {
          return NextResponse.json({ error: 'Workflow fehlgeschlagen', raw: resultsData }, { status: 502 });
        }
        // Noch kein Ergebnis → weiter warten
        continue;
      }

      // Fallback: Status prüfen
      const statusRes = await fetch(
        `${RETOOL_API}/workflows/${WORKFLOW_UUID}/runs/${runId}`,
        { headers: { 'X-Workflow-Api-Key': apiKey } }
      );
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        const status = statusData?.workflow_run?.status ?? statusData?.status;
        if (status === 'FAILED') {
          return NextResponse.json({ error: 'Workflow fehlgeschlagen', raw: statusData }, { status: 502 });
        }
      }
    }

    return NextResponse.json({ error: 'Timeout — keine Daten vom Workflow erhalten nach 40s' }, { status: 504 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
