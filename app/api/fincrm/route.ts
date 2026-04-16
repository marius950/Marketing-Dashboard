import { NextRequest, NextResponse } from 'next/server';

const BASE = 'https://effi.fincrm.de/api/v1';

// Stage-Mapping basierend auf deinen Definitionen
// Stage-IDs aus finCRM (aus der API gelesen)
const STAGE_CONFIG: Record<number, { label: string; category: 'active' | 'lost' | 'won' | 'inactive' }> = {
  1:  { label: 'Neuer Lead',             category: 'active' },
  9:  { label: 'Kontaktversuch / Mail',  category: 'active' },
  10: { label: 'Wiedervorlage',          category: 'active' },
  16: { label: 'Immobiliensuche',        category: 'active' },
  2:  { label: 'Beratung',              category: 'active' },
  15: { label: 'Beratung Phase 2',      category: 'active' },
  22: { label: 'Warten auf RM',         category: 'active' },
  24: { label: 'Voranfrage',            category: 'active' },
  4:  { label: 'Bank',                  category: 'active' },
  5:  { label: 'Vertrag ✅',            category: 'won' },
  6:  { label: 'Parkplatz',             category: 'inactive' },
  21: { label: 'Nicht finanzierbar',    category: 'lost' },
  26: { label: 'Inaktiv',              category: 'inactive' },
};

// Funnel-Reihenfolge (nach Stage-ID)
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

async function fetchAllPages(url: string, headers: Record<string, string>) {
  const results: any[] = [];
  let nextUrl: string | null = url;

  while (nextUrl) {
    const res: Response = await fetch(nextUrl, { headers });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`finCRM API ${res.status}: ${text}`);
    }
    const data: any = await res.json();

    // finCRM pagination: { data: [...], links: { next: ... }, meta: { total: ... } }
    const items = data.data ?? data;
    if (Array.isArray(items)) results.push(...items);
    else if (Array.isArray(data)) results.push(...data);

    nextUrl = data.links?.next ?? null;
    // Safety: max 20 pages
    if (results.length > 2000) break;
  }
  return results;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const from = searchParams.get('from');
  const to   = searchParams.get('to');

  try {
    const headers = await getHeaders();

    // Stages laden
    const stagesRes = await fetch(`${BASE}/stages`, { headers });
    const stagesData = stagesRes.ok ? await stagesRes.json() : { data: [] };
    const stages: any[] = stagesData.data ?? stagesData ?? [];

    // Alle Purposes laden
    // Alle Purposes laden ohne Server-Filter (API unterstützt = Operator nicht)
    // Zeitraum-Filter wird client-seitig angewendet
    const purposesUrl = `${BASE}/purposes?per_page=100`;

    const purposes = await fetchAllPages(purposesUrl, headers);

    // Zeitraum-Filter (client-side als Fallback)
    const fromTs = from ? new Date(from).getTime() : 0;
    const toTs   = to   ? new Date(to).getTime() + 86400000 : Infinity;

    const filtered = purposes.filter((p: any) => {
      const ts = new Date(p.created_at || p.createdAt || 0).getTime();
      return ts >= fromTs && ts <= toTs;
    });

    // Purposes nach Stage-ID gruppieren
    const byStageId: Record<number, any[]> = {};
    const byState: Record<string, number> = { ACTIVE: 0, WON: 0, LOST: 0, ON_HOLD: 0 };
    const lossReasons: Record<string, number> = {};

    filtered.forEach((p: any) => {
      const stageId = Number(p.stage_id ?? p.stageId ?? 0);
      if (!byStageId[stageId]) byStageId[stageId] = [];
      byStageId[stageId].push(p);

      const state = p.state ?? p.status ?? 'ACTIVE';
      byState[state] = (byState[state] ?? 0) + 1;

      if ((state === 'LOST' || state === 'WON') && (p.state_reason || p.loss_reason)) {
        const reason = p.state_reason || p.loss_reason;
        lossReasons[reason] = (lossReasons[reason] ?? 0) + 1;
      }
    });

    // Funnel aufbauen nach Stage-ID Reihenfolge
    const funnel = FUNNEL_ORDER_IDS.map(stageId => {
      const config = STAGE_CONFIG[stageId] ?? { label: String(stageId), category: 'active' as const };
      const count  = byStageId[stageId]?.length ?? 0;
      return { stage: String(stageId), label: config.label, category: config.category, count };
    });

    // Won = Vertrag (ID 5) oder WON state
    const wonCount  = (byStageId[5]?.length ?? 0) + (byState['WON'] ?? 0);
    const lostCount = (byStageId[21]?.length ?? 0) + (byState['LOST'] ?? 0);
    const totalLeads = filtered.length;

    // Revenue: WON × Provision (Platzhalter €3000 aus Budget-Tab)
    const revenuePerDeal = 3000;
    const totalRevenue = wonCount * revenuePerDeal;

    // Tägliche Neuzugänge
    const dailyMap: Record<string, number> = {};
    filtered.forEach((p: any) => {
      const date = (p.created_at || p.createdAt || p.updated_at || '').slice(0, 10);
      if (date) dailyMap[date] = (dailyMap[date] ?? 0) + 1;
    });
    const daily = Object.entries(dailyMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date > b.date ? 1 : -1);

    // Aktuelle Pipeline-Werte
    const activePipeline = filtered.filter((p: any) => {
      const state = p.state ?? 'ACTIVE';
      return state === 'ACTIVE';
    }).length;

    // Debug: zeige ersten Purpose um Struktur zu verstehen
    const debugSample = purposes.slice(0, 2).map((p: any) => ({
      id: p.id,
      state: p.state,
      stage_id: p.stage_id,
      created_at: p.created_at,
      keys: Object.keys(p).slice(0, 15),
    }));

    return NextResponse.json({
      _debug: { totalPurposes: purposes.length, filtered: filtered.length, sample: debugSample },
      kpis: {
        totalLeads,
        activePipeline,
        wonCount,
        lostCount,
        totalRevenue,
        revenuePerDeal,
        conversionRate: totalLeads > 0 ? Math.round((wonCount / totalLeads) * 1000) / 10 : 0,
      },
      funnel,
      lossReasons: Object.entries(lossReasons)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count),
      daily,
      stages: stages.map((s: any) => ({ id: s.id, name: s.name ?? s.title })),
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
