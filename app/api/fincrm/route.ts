import { NextRequest, NextResponse } from 'next/server';

const BASE = 'https://effi.fincrm.de/api/v1';

const STAGE_CONFIG: Record<number, { label: string; category: 'active' | 'lost' | 'won' | 'inactive'; order: number }> = {
  1:  { label: 'Neuer Lead',            category: 'active',   order: 1 },
  9:  { label: 'Kontaktversuch / Mail', category: 'active',   order: 2 },
  10: { label: 'Wiedervorlage',         category: 'active',   order: 3 },
  16: { label: 'Immobiliensuche',       category: 'active',   order: 4 },
  2:  { label: 'Beratung',              category: 'active',   order: 5 },
  15: { label: 'Beratung Phase 2',      category: 'active',   order: 6 },
  22: { label: 'Warten auf RM',         category: 'active',   order: 7 },
  24: { label: 'Voranfrage',            category: 'active',   order: 8 },
  4:  { label: 'Bank',                  category: 'active',   order: 9 },
  5:  { label: 'Vertrag',               category: 'won',      order: 10 },
  6:  { label: 'Parkplatz',             category: 'inactive', order: 11 },
  21: { label: 'Nicht finanzierbar',    category: 'lost',     order: 12 },
  26: { label: 'Inaktiv',               category: 'inactive', order: 13 },
};

const FUNNEL_STAGES_IDS = [1, 9, 10, 16, 2, 15, 22, 24, 4, 5];
const ALL_STAGE_IDS     = [1, 9, 10, 16, 2, 15, 22, 24, 4, 5, 6, 21, 26];

function detectSource(notes: any[]): string {
  for (const n of notes) {
    const c = String(n.note ?? n.content ?? '');
    if (c.includes('ImmoScout')) return 'ImmoScout';
    if (c.includes('Abakus'))   return 'Abakus';
    if (c.includes('calendly') || c.includes('Calendly')) return 'Calendly';
    if (c.includes('Contact Form') || c.includes('Kontaktformular')) return 'Kontaktformular';
    if (c.includes('callback')) return 'Callback';
  }
  return 'Sonstige';
}

async function getHeaders() {
  const token = process.env.FINCRM_ACCESS_TOKEN;
  if (!token) throw new Error('FINCRM_ACCESS_TOKEN not configured');
  return { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json', 'Content-Type': 'application/json' };
}

async function fetchAllPages(url: string, headers: Record<string, string>): Promise<any[]> {
  const results: any[] = [];
  let nextUrl: string | null = url;
  let page = 0;
  while (nextUrl && page < 50) {
    page++;
    const res: Response = await fetch(nextUrl, { headers });
    if (!res.ok) { const text = await res.text(); throw new Error(`finCRM API ${res.status}: ${text}`); }
    const data: any = await res.json();
    const items = data.data ?? data;
    if (Array.isArray(items)) results.push(...items);
    else if (Array.isArray(data)) results.push(...data);
    const next = data.links?.next ?? data.meta?.next_page_url ?? null;
    if (!next && Array.isArray(items) && items.length === 100) {
      const pageNum = page + 1;
      const sep: string = nextUrl.includes('?') ? '&' : '?';
      nextUrl = `${url}${sep}page=${pageNum}`;
    } else { nextUrl = next; }
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
    const [stagesRes, purposes] = await Promise.all([
      fetch(`${BASE}/stages`, { headers }),
      fetchAllPages(`${BASE}/purposes?per_page=100`, headers),
    ]);
    const stagesData = stagesRes.ok ? await stagesRes.json() : { data: [] };
    const stages: any[] = stagesData.data ?? stagesData ?? [];

    purposes.sort((a: any, b: any) =>
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );

    const fromTs = from ? new Date(from).getTime() : 0;
    const toTs   = to   ? new Date(to).getTime() + 86400000 : Date.now();
    const now    = Date.now();

    const filtered = purposes.filter((p: any) => {
      const raw = p.created_at || '';
      if (!raw) return true;
      const ts = new Date(raw).getTime();
      if (isNaN(ts)) return true;
      return ts >= fromTs && ts <= toTs;
    });

    // Basis-Gruppierung
    const byStageId: Record<number, any[]> = {};
    const lossReasons: Record<string, number> = {};
    filtered.forEach((p: any) => {
      const sid = Number(p.stage_id ?? 0);
      if (!byStageId[sid]) byStageId[sid] = [];
      byStageId[sid].push(p);
      const state = p.state ?? 'ACTIVE';
      if ((state === 'LOST' || sid === 21) && (p.state_reason || p.state_note)) {
        const r = p.state_reason || p.state_note;
        lossReasons[r] = (lossReasons[r] ?? 0) + 1;
      }
    });

    const wonCount   = byStageId[5]?.length ?? 0;
    const lostCount  = byStageId[21]?.length ?? 0;
    const totalLeads = filtered.length;
    const activePipeline = filtered.filter((p: any) => (p.state ?? 'ACTIVE') === 'ACTIVE').length;

    // Notes für 30 neueste
    const notesResults = await Promise.allSettled(
      filtered.slice(0, 30).map(async (p: any) => {
        if (!p.customer_id) return null;
        try {
          const res: Response = await fetch(`${BASE}/customers/${p.customer_id}/notes?per_page=5&sort=-created_at`, { headers });
          if (!res.ok) return null;
          const data: any = await res.json();
          const notes: any[] = data.data ?? data ?? [];
          return {
            purposeId: p.id, customerId: p.customer_id,
            stageId: Number(p.stage_id ?? 0),
            stageName: STAGE_CONFIG[Number(p.stage_id)]?.label ?? String(p.stage_id),
            state: p.state ?? 'ACTIVE',
            stateReason: p.state_reason ?? null,
            createdAt: p.created_at ?? '',
            financialDemand: p.financial_demand ?? null,
            source: detectSource(notes),
            notes: notes.slice(0, 3).map((n: any) => ({
              id: n.id,
              content: n.note ?? n.content ?? n.body ?? '',
              createdAt: n.created_at ?? '',
              author: typeof n.user?.name === 'string' ? n.user.name : (typeof n.author === 'string' ? n.author : 'Berater'),
            })),
          };
        } catch { return null; }
      })
    );
    const notesList = notesResults
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value !== null)
      .map(r => r.value).filter(v => v.notes.length > 0);

    // Volumen + Durchlaufzeit pro Stage
    const volumeByStage: Record<number, { total: number; count: number }> = {};
    const daysInStage:   Record<number, number[]>                          = {};
    filtered.forEach((p: any) => {
      const sid  = Number(p.stage_id ?? 0);
      const vol  = Number(p.financial_demand ?? 0);
      const days = Math.round((now - new Date(p.created_at || 0).getTime()) / 86400000);
      if (!volumeByStage[sid]) volumeByStage[sid] = { total: 0, count: 0 };
      if (vol > 0) { volumeByStage[sid].total += vol; volumeByStage[sid].count++; }
      if (!daysInStage[sid]) daysInStage[sid] = [];
      if (days >= 0) daysInStage[sid].push(days);
    });
    const avgDaysInStage: Record<number, number> = {};
    Object.entries(daysInStage).forEach(([sid, days]) => {
      avgDaysInStage[Number(sid)] = Math.round(days.reduce((a, b) => a + b, 0) / days.length);
    });

    // Conversion-Funnel
    const closeProbability: Record<number, number> = {
      1: 0.05, 9: 0.08, 10: 0.10, 16: 0.15,
      2: 0.25, 15: 0.35, 22: 0.45, 24: 0.60, 4: 0.75, 5: 1.0,
    };
    const funnelStages = FUNNEL_STAGES_IDS.map(sid => ({
      stageId:  sid,
      label:    STAGE_CONFIG[sid]?.label ?? String(sid),
      category: STAGE_CONFIG[sid]?.category ?? ('active' as const),
      count:    byStageId[sid]?.length ?? 0,
      avgVolume: volumeByStage[sid]?.count ? Math.round(volumeByStage[sid].total / volumeByStage[sid].count) : 0,
      avgDays:  avgDaysInStage[sid] ?? 0,
      conversionToNext: 0,
    }));
    for (let i = 0; i < funnelStages.length - 1; i++) {
      const cur = funnelStages[i].count;
      const nxt = funnelStages[i + 1].count;
      funnelStages[i].conversionToNext = cur > 0 ? Math.round((nxt / cur) * 1000) / 10 : 0;
    }

    const funnel = ALL_STAGE_IDS.map(sid => ({
      stage: String(sid),
      label: STAGE_CONFIG[sid]?.label ?? String(sid),
      category: STAGE_CONFIG[sid]?.category ?? ('active' as const),
      count: byStageId[sid]?.length ?? 0,
      avgVolume: volumeByStage[sid]?.count ? Math.round(volumeByStage[sid].total / volumeByStage[sid].count) : 0,
      avgDays: avgDaysInStage[sid] ?? 0,
    }));

    // Monats + Daily
    const monthlyMap: Record<string, number> = {};
    const dailyMap:   Record<string, number> = {};
    filtered.forEach((p: any) => {
      const d = (p.created_at || '').slice(0, 10);
      if (!d) return;
      monthlyMap[d.slice(0, 7)] = (monthlyMap[d.slice(0, 7)] ?? 0) + 1;
      dailyMap[d] = (dailyMap[d] ?? 0) + 1;
    });
    const monthly = Object.entries(monthlyMap).map(([month, count]) => ({ month, count })).sort((a, b) => a.month > b.month ? 1 : -1);
    const daily   = Object.entries(dailyMap).map(([date, count]) => ({ date, count })).sort((a, b) => a.date > b.date ? 1 : -1);

    // Pipeline-Wert
    let pipelineValue = 0;
    filtered.forEach((p: any) => {
      const sid  = Number(p.stage_id ?? 0);
      const vol  = Number(p.financial_demand ?? 0);
      const prob = closeProbability[sid] ?? 0;
      pipelineValue += vol * prob * 0.01;
    });

    // Quellen
    const sourceMap: Record<string, { count: number; wonCount: number }> = {};
    notesList.forEach((e: any) => {
      const src = e.source || 'Sonstige';
      if (!sourceMap[src]) sourceMap[src] = { count: 0, wonCount: 0 };
      sourceMap[src].count++;
      if (e.stageId === 5) sourceMap[src].wonCount++;
    });
    const sources = Object.entries(sourceMap).map(([source, d]) => ({
      source, count: d.count, wonCount: d.wonCount,
      rate: d.count > 0 ? Math.round((d.wonCount / d.count) * 1000) / 10 : 0,
    })).sort((a, b) => b.count - a.count);

    // Needs Attention
    const needsAttention: any[] = [];
    notesList.forEach((e: any) => {
      if (e.state !== 'ACTIVE') return;
      if ([6, 21, 26].includes(e.stageId)) return;
      const lastNote = e.notes[0];
      if (!lastNote?.createdAt) return;
      const daysSince = Math.round((now - new Date(lastNote.createdAt).getTime()) / 86400000);
      if (daysSince >= 14) {
        needsAttention.push({
          purposeId: e.purposeId, stageName: e.stageName, daysSince,
          lastNote: lastNote.content, lastNoteDate: lastNote.createdAt,
        });
      }
    });
    needsAttention.sort((a, b) => b.daysSince - a.daysSince);

    // BaufiExpertin Performance
    const weeklyMap: Record<string, number> = {};
    filtered.forEach((p: any) => {
      const d = new Date(p.created_at || 0);
      const dow = d.getDay() || 7;
      const mon = new Date(d); mon.setDate(d.getDate() - dow + 1);
      const week = mon.toISOString().slice(0, 10);
      weeklyMap[week] = (weeklyMap[week] ?? 0) + 1;
    });
    const weeklyLeads = Object.entries(weeklyMap)
      .map(([week, count]) => ({ week, count }))
      .sort((a, b) => a.week > b.week ? 1 : -1).slice(-12);

    const responseTimes: number[] = [];
    notesList.forEach((e: any) => {
      const created = new Date(e.createdAt || 0).getTime();
      if (!created) return;
      const first = [...e.notes]
        .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .find((n: any) => new Date(n.createdAt).getTime() > created);
      if (!first) return;
      const hrs = (new Date(first.createdAt).getTime() - created) / 3600000;
      if (hrs > 0 && hrs < 168) responseTimes.push(hrs);
    });
    const avgResponseHours = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length * 10) / 10
      : null;

    const totalVolume = filtered.reduce((s: number, p: any) => s + Number(p.financial_demand ?? 0), 0);
    const avgVolume   = totalLeads > 0 ? Math.round(totalVolume / totalLeads) : 0;

    return NextResponse.json({
      kpis: {
        totalLeads, activePipeline, wonCount, lostCount,
        conversionRate: totalLeads > 0 ? Math.round((wonCount / totalLeads) * 1000) / 10 : 0,
        revenuePerDeal: 3000, totalVolume, avgVolume,
        pipelineValue: Math.round(pipelineValue),
        avgResponseHours, needsAttentionCount: needsAttention.length,
      },
      funnelStages, funnel,
      lossReasons: Object.entries(lossReasons).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count),
      notesList, needsAttention: needsAttention.slice(0, 15),
      sources, monthly, daily, weeklyLeads,
      stages: stages.map((s: any) => ({ id: s.id, name: s.name ?? s.title })),
      meta: { totalPurposes: purposes.length, filtered: filtered.length },
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
