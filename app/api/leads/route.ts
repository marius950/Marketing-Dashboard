import { NextRequest, NextResponse } from 'next/server';

// Retool API - führt gespeicherte Queries aus
const RETOOL_API = 'https://api.retool.com/v1';
// App UUID aus der URL: /apps/1a333832-d703-11ee-8af8-5b0c8c38321a/
const APP_UUID = '1a333832-d703-11ee-8af8-5b0c8c38321a';

async function runRetoolQuery(queryName: string, params: Record<string, any> = {}) {
  const token = process.env.RETOOL_API_KEY;
  if (!token) throw new Error('RETOOL_API_KEY not set');

  const res = await fetch(`${RETOOL_API}/workflows/${APP_UUID}/startTrigger`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Workflow-Api-Key': token,
    },
    body: JSON.stringify({ queryName, parameters: params }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Retool API error ${res.status}: ${text}`);
  }

  return res.json();
}

// Direkte DynamoDB-Abfrage über Retool Queries API
async function runAppQuery(queryName: string, params: Record<string, any> = {}) {
  const token = process.env.RETOOL_API_KEY;
  if (!token) throw new Error('RETOOL_API_KEY not set');

  const res = await fetch(`${RETOOL_API}/retool-db/queries/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      appUuid: APP_UUID,
      queryName,
      parameters: params,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Retool query error ${res.status}: ${text}`);
  }

  return res.json();
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const from = searchParams.get('from');
  const to   = searchParams.get('to');

  if (!from || !to) {
    return NextResponse.json({ error: 'from and to required' }, { status: 400 });
  }

  const token = process.env.RETOOL_API_KEY;
  if (!token) {
    return NextResponse.json({ error: 'RETOOL_API_KEY not configured' }, { status: 500 });
  }

  try {
    // Leads aus DynamoDB über Retool Queries API holen
    // Query: getAllLeads (bereits in der App definiert, scannt ush-prod-effi-leads)
    const [leadsRes, forwardingRes] = await Promise.all([
      fetch(`${RETOOL_API}/retool-db/queries/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          appUuid: APP_UUID,
          queryName: 'getAllLeads',
          parameters: {},
        }),
      }),
      fetch(`${RETOOL_API}/retool-db/queries/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          appUuid: APP_UUID,
          queryName: 'getAllLeads', // wir filtern lokal nach forwarding
          parameters: {},
        }),
      }),
    ]);

    // Falls Retool Queries API nicht verfügbar ist → Fallback auf direkte DynamoDB via Retool REST
    if (!leadsRes.ok) {
      const errText = await leadsRes.text();
      return NextResponse.json({
        error: 'Retool API nicht erreichbar',
        detail: errText,
        hint: 'Prüfe ob RETOOL_API_KEY korrekt ist und queries:read Scope hat',
      }, { status: 502 });
    }

    const leadsData = await leadsRes.json();
    const allLeads: any[] = leadsData?.data || leadsData?.rows || leadsData || [];

    // Zeitraum filtern (createdAt zwischen from und to)
    const fromTs = new Date(from).getTime();
    const toTs   = new Date(to).getTime() + 86400000; // bis Ende des Tages

    const filteredLeads = allLeads.filter((lead: any) => {
      const createdAt = lead.createdAt || lead.created_at || lead.updatedAtDay;
      if (!createdAt) return false;
      const ts = new Date(createdAt).getTime();
      return ts >= fromTs && ts <= toTs;
    });

    // Produkt-Typen extrahieren
    const productFields = [
      { key: 'insulationLead',     label: 'Dämmung' },
      { key: 'pvLead',             label: 'PV-Anlage' },
      { key: 'heatPumpLead',       label: 'Wärmepumpe' },
      { key: 'wallboxLead',        label: 'Wallbox' },
      { key: 'windowLead',         label: 'Fenstertausch' },
      { key: 'financingLead',      label: 'Finanzierung' },
      { key: 'energyConsultingLead', label: 'Energieberatung' },
    ];

    // Sanierungsleads = insulationLead, pvLead, heatPumpLead, wallboxLead, windowLead
    const sanierungsKeys = ['insulationLead', 'pvLead', 'heatPumpLead', 'wallboxLead', 'windowLead', 'energyConsultingLead'];

    const sanierungsLeads = filteredLeads.filter((lead: any) =>
      sanierungsKeys.some(k => lead[k] === true || lead[k] === 'true')
    );

    // Weitervermittelte Leads (leads-to-partners Tabelle)
    // Im Lead-Datensatz gibt es ein Feld das die Weitervermittlung anzeigt
    // Wir schauen nach bekannten Forwarding-Feldern
    const forwardedLeads = filteredLeads.filter((lead: any) =>
      lead.leadPartnerForwardingEvent ||
      lead.forwardedToPartner ||
      lead.partnerId ||
      lead.partnerForwarded === true
    );

    // KPIs berechnen
    const totalLeads       = filteredLeads.length;
    const totalSanierung   = sanierungsLeads.length;
    const totalForwarded   = forwardedLeads.length;
    const revenuePerLead   = 25; // €25 Platzhalter
    const totalRevenue     = totalForwarded * revenuePerLead;

    // Produkt-Breakdown
    const productBreakdown = productFields.map(p => ({
      key:   p.key,
      label: p.label,
      count: filteredLeads.filter((l: any) => l[p.key] === true || l[p.key] === 'true').length,
    }));

    // Tägliche Leads für Chart
    const dailyMap = new Map<string, { date: string; total: number; sanierung: number; forwarded: number }>();
    filteredLeads.forEach((lead: any) => {
      const raw = lead.createdAt || lead.updatedAtDay || '';
      const date = raw ? new Date(raw).toISOString().slice(0, 10) : null;
      if (!date) return;
      const existing = dailyMap.get(date) ?? { date, total: 0, sanierung: 0, forwarded: 0 };
      existing.total++;
      if (sanierungsKeys.some(k => lead[k] === true || lead[k] === 'true')) existing.sanierung++;
      if (lead.leadPartnerForwardingEvent || lead.forwardedToPartner || lead.partnerId) existing.forwarded++;
      dailyMap.set(date, existing);
    });
    const daily = Array.from(dailyMap.values()).sort((a, b) => a.date > b.date ? 1 : -1);

    // Top Leads Tabelle (neueste 50 Sanierungsleads)
    const recentLeads = sanierungsLeads
      .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 50)
      .map((l: any) => ({
        id:         l.id,
        firstName:  l.firstName || l.first_name || '',
        lastName:   l.lastName  || l.last_name  || '',
        email:      l.email     || '',
        postCode:   l.postCode  || l.post_code  || '',
        createdAt:  l.createdAt || l.created_at || '',
        forwarded:  !!(l.leadPartnerForwardingEvent || l.forwardedToPartner || l.partnerId),
        products:   productFields.filter(p => l[p.key] === true || l[p.key] === 'true').map(p => p.label),
      }));

    return NextResponse.json({
      kpis: {
        totalLeads,
        totalSanierung,
        totalForwarded,
        totalRevenue,
        revenuePerLead,
        conversionRate: totalLeads > 0 ? Math.round((totalForwarded / totalLeads) * 1000) / 10 : 0,
      },
      productBreakdown,
      daily,
      recentLeads,
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
