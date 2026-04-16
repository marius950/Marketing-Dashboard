import { NextRequest, NextResponse } from 'next/server';

const BASE = 'https://effi.fincrm.de/api/v1';

const STAGE_CONFIG: Record<number, { label: string; category: 'active' | 'lost' | 'won' | 'inactive' }> = {
  1:  { label: 'Neuer Lead',            category: 'active' },
  9:  { label: 'Kontaktversuch / Mail', category: 'active' },
  10: { label: 'Wiedervorlage',         category: 'active' },
  16: { label: 'Immobiliensuche',       category: 'active' },
  2:  { label: 'Beratung',             category: 'active' },
  15: { label: 'Beratung Phase 2',     category: 'active' },
  22: { label: 'Warten auf RM',        category: 'active' },
  24: { label: 'Voranfrage',           category: 'active' },
  4:  { label: 'Bank',                 category: 'active' },
  5:  { label: 'Vertrag',              category: 'won' },
  6:  { label: 'Parkplatz',            category: 'inactive' },
  21: { label: 'Nicht finanzierbar',   category: 'lost' },
  26: { label: 'Inaktiv',             category: 'inactive' },
};

const FUNNEL_ORDER_IDS = [1, 9, 10, 16, 2, 15, 22, 24, 4, 5, 6, 21, 26];

async function getHeaders() {
  const token = process.env.FINCRM_ACCESS_TOKEN;
  if (!token) throw new Error('FINCRM_ACCESS_TOKEN not configured');
  return {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };
}

async function fetchAllPages(url: string, headers: Record<string, string>): Promise<any[]> {
  const results: any[] = [];
  let nextUrl: string | null = url;
  let page = 0;
  while (nextUrl && page < 50) {
    page++;
    const res: Response = await fetch(nextUrl, { headers });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`finCRM API ${res.status}: ${text}`);
    }
    const data: any = await res.json();
    const items = data.data ?? data;
    if (Array.isArray(items)) results.push(...items);
    else if (Array.isArray(data)) results.push(...data);
    nextUrl = data.links?.next ?? null;
    if (results.length > 10000) break;
  }
  return results;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const from = searchParams.get('from');
  const to   = searchParams.get('to');

  try {
    const headers = await getHeaders();

    // Stages + Purposes parallel laden - neueste zuerst, alle Seiten
    const [stagesRes, purposes] = await Promise.all([
      fetch(`${BASE}/stages`, { headers }),
      fetchAllPages(`${BASE}/purposes?per_page=100`, headers),
    ]);

    const stagesData = stagesRes.ok ? await stagesRes.json() : { data: [] };
    const stages: any[] = stagesData.data ?? stagesData ?? [];

    // Lokal nach created_at absteigend sortieren (neueste zuerst)
    purposes.sort((a: any, b: any) => {
      const ta = new Date(a.created_at || 0).getTime();
      const tb = new Date(b.created_at || 0).getTime();
      return tb - ta;
    });

    // Zeitraum-Filter auf created_at
    const fromTs = from ? new Date(from).getTime() : 0;
    const toTs   = to   ? new Date(to).getTime() + 86400000 : Date.now();

    const filtered = purposes.filter((p: any) => {
      const raw = p.created_at || p.createdAt || '';
      if (!raw) return true; // wenn kein Datum, mitnehmen
      const ts = new Date(raw).getTime();
      return ts >= fromTs && ts <= toTs;
    });

    // Nach Stage-ID gruppieren
    const byStageId: Record<number, any[]> = {};
    const byState: Record<string, number> = { ACTIVE: 0, WON: 0, LOST: 0, ON_HOLD: 0 };
    const lossReasons: Record<string, number> = {};

    filtered.forEach((p: any) => {
      const stageId = Number(p.stage_id ?? p.stageId ?? 0);
      if (!byStageId[stageId]) byStageId[stageId] = [];
      byStageId[stageId].push(p);

      const state = p.state ?? 'ACTIVE';
      byState[state] = (byState[state] ?? 0) + 1;

      // state_reason oder state_note als Nicht-Abschluss-Grund
      if ((state === 'LOST' || stageId === 21) && (p.state_reason || p.state_note)) {
        const reason = p.state_reason || p.state_note;
        lossReasons[reason] = (lossReasons[reason] ?? 0) + 1;
      }
    });

    // Notes für LOST/Parkplatz Purposes laden (max 20 um API nicht zu überlasten)
    // Neueste 30 Purposes für Notes laden (sortiert nach created_at desc da API so liefert)
    const purposesForNotes = filtered.slice(0, 30);

    const notesResults = await Promise.allSettled(
      purposesForNotes.map(async (p: any) => {
        if (!p.customer_id) return null;
        try {
          const res: Response = await fetch(
            `${BASE}/customers/${p.customer_id}/notes?per_page=5&sort=-created_at`,
            { headers }
          );
          if (!res.ok) return null;
          const data: any = await res.json();
          const notes: any[] = data.data ?? data ?? [];
          return {
            purposeId:  p.id,
            customerId: p.customer_id,
            stageName:  STAGE_CONFIG[Number(p.stage_id)]?.label ?? String(p.stage_id),
            state:      p.state,
            stateReason: p.state_reason ?? p.state_note ?? null,
            notes: notes.slice(0, 3).map((n: any) => ({
              id:        n.id,
              content:   n.note ?? n.content ?? n.body ?? n.text ?? String(n),
              createdAt: n.created_at ?? n.createdAt ?? '',
              author:    n.user?.name ?? n.author ?? n.created_by ?? 'BaufiExpertin',
            })),
          };
        } catch {
          return null;
        }
      })
    );

    const notesList = notesResults
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value !== null)
      .map(r => r.value)
      .filter(v => v.notes.length > 0);

    // Funnel
    const funnel = FUNNEL_ORDER_IDS.map(stageId => {
      const config = STAGE_CONFIG[stageId] ?? { label: String(stageId), category: 'active' as const };
      return { stage: String(stageId), label: config.label, category: config.category, count: byStageId[stageId]?.length ?? 0 };
    });

    // Unbekannte Stages auch anzeigen
    Object.keys(byStageId).forEach(sid => {
      const id = Number(sid);
      if (!FUNNEL_ORDER_IDS.includes(id)) {
        const config = STAGE_CONFIG[id] ?? { label: `Stage ${id}`, category: 'active' as const };
        funnel.push({ stage: sid, label: config.label, category: config.category, count: byStageId[id].length });
      }
    });

    const wonCount  = byStageId[5]?.length ?? 0;
    const lostCount = (byStageId[21]?.length ?? 0) + (byState['LOST'] ?? 0);
    const totalLeads = filtered.length;

    // Daily chart
    const dailyMap: Record<string, number> = {};
    filtered.forEach((p: any) => {
      const date = (p.created_at || '').slice(0, 10);
      if (date) dailyMap[date] = (dailyMap[date] ?? 0) + 1;
    });
    const daily = Object.entries(dailyMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date > b.date ? 1 : -1);

    const activePipeline = filtered.filter((p: any) => (p.state ?? 'ACTIVE') === 'ACTIVE').length;

    return NextResponse.json({
      kpis: {
        totalLeads,
        activePipeline,
        wonCount,
        lostCount,
        totalRevenue: 0,
        revenuePerDeal: 3000,
        conversionRate: totalLeads > 0 ? Math.round((wonCount / totalLeads) * 1000) / 10 : 0,
      },
      funnel,
      lossReasons: Object.entries(lossReasons)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count),
      notesList, // Kommentare der BaufiExpertin
      daily,
      stages: stages.map((s: any) => ({ id: s.id, name: s.name ?? s.title })),
      meta: { totalPurposes: purposes.length, filtered: filtered.length },
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
