import { NextRequest, NextResponse } from 'next/server';

const BASE = 'https://effi.fincrm.de/api/v1';

// Stage-Mapping basierend auf deinen Definitionen
const STAGE_LABELS: Record<string, { label: string; category: 'active' | 'lost' | 'won' | 'inactive' }> = {
  'Neuer Lead':                   { label: 'Neuer Lead',             category: 'active' },
  'Kontaktversuch Mail':          { label: 'Kontaktversuch / Mail',  category: 'active' },
  'Wiedervorlage':                { label: 'Wiedervorlage',          category: 'active' },
  'Immobiliensuche':              { label: 'Immobiliensuche',        category: 'active' },
  'Beratung':                     { label: 'Beratung',               category: 'active' },
  'Beratung Phase 2':             { label: 'Beratung Phase 2',       category: 'active' },
  'Warten auf Rückmeldung':       { label: 'Warten auf RM',          category: 'active' },
  'Bank':                         { label: 'Bank',                   category: 'active' },
  'Voranfrage':                   { label: 'Voranfrage',             category: 'active' },
  'Vertrag':                      { label: 'Vertrag ✅',             category: 'won' },
  'Parkplatz':                    { label: 'Parkplatz',              category: 'inactive' },
};

// Funnel-Reihenfolge
const FUNNEL_ORDER = [
  'Neuer Lead',
  'Kontaktversuch Mail',
  'Wiedervorlage',
  'Immobiliensuche',
  'Beratung',
  'Beratung Phase 2',
  'Warten auf Rückmeldung',
  'Voranfrage',
  'Bank',
  'Vertrag',
  'Parkplatz',
];

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

    // Stage-Namen aus API oder Mapping
    const stageMap: Record<string, string> = {};
    stages.forEach((s: any) => {
      stageMap[String(s.id)] = s.name ?? s.title ?? String(s.id);
    });

    // Purposes nach Stage gruppieren
    const byStage: Record<string, any[]> = {};
    const byState: Record<string, number> = { ACTIVE: 0, WON: 0, LOST: 0, ON_HOLD: 0 };
    const lossReasons: Record<string, number> = {};

    filtered.forEach((p: any) => {
      const stageId   = String(p.stage_id ?? p.stageId ?? '');
      const stageName = stageMap[stageId] ?? p.stage?.name ?? stageId ?? 'Unbekannt';

      if (!byStage[stageName]) byStage[stageName] = [];
      byStage[stageName].push(p);

      const state = p.state ?? p.status ?? 'ACTIVE';
      byState[state] = (byState[state] ?? 0) + 1;

      if (state === 'LOST' && (p.state_reason || p.loss_reason)) {
        const reason = p.state_reason || p.loss_reason;
        lossReasons[reason] = (lossReasons[reason] ?? 0) + 1;
      }
    });

    // Funnel aufbauen
    const funnel = FUNNEL_ORDER.map(stageName => {
      const count    = byStage[stageName]?.length ?? 0;
      const stageInfo = STAGE_LABELS[stageName] ?? { label: stageName, category: 'active' };
      return {
        stage:    stageName,
        label:    stageInfo.label,
        category: stageInfo.category,
        count,
      };
    });

    // Auch Stages die nicht im FUNNEL_ORDER sind hinzufügen
    Object.keys(byStage).forEach(stageName => {
      if (!FUNNEL_ORDER.includes(stageName)) {
        funnel.push({
          stage:    stageName,
          label:    stageName,
          category: 'active' as const,
          count:    byStage[stageName].length,
        });
      }
    });

    // Won = Vertrag Stage oder WON state
    const wonCount  = (byStage['Vertrag']?.length ?? 0) + (byState['WON'] ?? 0);
    const lostCount = byState['LOST'] ?? 0;
    const totalLeads = filtered.length;

    // Revenue: WON × Provision (Platzhalter €3000 aus Budget-Tab)
    const revenuePerDeal = 3000;
    const totalRevenue = wonCount * revenuePerDeal;

    // Tägliche Neuzugänge
    const dailyMap: Record<string, number> = {};
    filtered.forEach((p: any) => {
      const date = (p.created_at || p.createdAt || '').slice(0, 10);
      if (date) dailyMap[date] = (dailyMap[date] ?? 0) + 1;
    });
    const daily = Object.entries(dailyMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date > b.date ? 1 : -1);

    // Aktuelle Pipeline-Werte
    const activePipeline = filtered.filter((p: any) =>
      (p.state ?? 'ACTIVE') === 'ACTIVE'
    ).length;

    return NextResponse.json({
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
