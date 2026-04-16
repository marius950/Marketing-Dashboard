import { NextRequest, NextResponse } from 'next/server';

// In-Memory Cache – 30 Minuten TTL
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000;

function getCacheKey(from: string, to: string) { return `google_${from}_${to}`; }
function getFromCache(key: string) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
}
function setCache(key: string, data: any) { cache.set(key, { data, timestamp: Date.now() }); }

async function getAccessToken() {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
      grant_type:    'refresh_token',
    }),
  });
  const d = await r.json();
  if (!d.access_token) throw new Error('Token refresh failed: ' + JSON.stringify(d));
  return d.access_token as string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const refresh = searchParams.get('refresh');
  const debug = searchParams.get('debug');

  if (debug === '1') {
    try {
      const r = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
          grant_type: 'refresh_token',
        }),
      });
      const d = await r.json();
      return NextResponse.json({
        token_status: r.status,
        has_access_token: !!d.access_token,
        error: d.error || null,
        env_check: {
          customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
          login_id: process.env.GOOGLE_LOGIN_CUSTOMER_ID,
        },
      });
    } catch (e: any) {
      return NextResponse.json({ debug_error: e.message }, { status: 500 });
    }
  }

  if (!from || !to) return NextResponse.json({ error: 'from and to required' }, { status: 400 });

  const cacheKey = getCacheKey(from, to);
  if (refresh !== '1') {
    const cached = getFromCache(cacheKey);
    if (cached) {
      return NextResponse.json(cached, { headers: { 'X-Cache': 'HIT' } });
    }
  }

  try {
    const accessToken = await getAccessToken();
    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID?.replace(/-/g, '');
    const loginId = process.env.GOOGLE_LOGIN_CUSTOMER_ID?.replace(/-/g, '');
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
      'developer-token': process.env.GOOGLE_DEVELOPER_TOKEN!,
      'Content-Type': 'application/json',
      ...(loginId ? { 'login-customer-id': loginId } : {}),
    };

    const summaryQuery = `
      SELECT
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.conversions_value,
        segments.date
      FROM customer
      WHERE segments.date BETWEEN '${from}' AND '${to}'
      ORDER BY segments.date ASC
    `;

    const summaryRes = await fetch(
      `https://googleads.googleapis.com/v23/customers/${customerId}/googleAds:search`,
      { method: 'POST', headers, body: JSON.stringify({ query: summaryQuery }) }
    );
    const summaryText = await summaryRes.text();
    let summaryData: any;
    try { summaryData = JSON.parse(summaryText); }
    catch (e) { return NextResponse.json({ error: 'Invalid JSON', raw: summaryText.slice(0, 500) }, { status: 500 }); }
    if (!summaryRes.ok) return NextResponse.json({ error: summaryData }, { status: 500 });

    const rows = summaryData.results || [];
    const agg = rows.reduce(
      (acc: any, r: any) => {
        const m = r.metrics;
        acc.spend       += (m.costMicros || 0) / 1_000_000;
        acc.impressions += parseInt(m.impressions || 0);
        acc.clicks      += parseInt(m.clicks || 0);
        acc.conversions += parseFloat(m.conversions || 0);
        acc.convValue   += parseFloat(m.conversionsValue || 0);
        return acc;
      },
      { spend: 0, impressions: 0, clicks: 0, conversions: 0, convValue: 0 }
    );

    const cpl  = agg.conversions > 0 ? agg.spend / agg.conversions : 0;
    const roas = agg.spend > 0 ? agg.convValue / agg.spend : 0;
    const ctr  = agg.impressions > 0 ? (agg.clicks / agg.impressions) * 100 : 0;
    const cpm  = agg.impressions > 0 ? (agg.spend / agg.impressions) * 1000 : 0;

    const daily = rows.map((r: any) => ({
      date: r.segments?.date,
      spend: Math.round((r.metrics.costMicros || 0) / 1_000_000 * 100) / 100,
      impressions: parseInt(r.metrics.impressions || 0),
      clicks: parseInt(r.metrics.clicks || 0),
      conversions: parseFloat(r.metrics.conversions || 0),
    }));

    const sorted = [...daily].sort((a: any, b: any) => (b.date > a.date ? 1 : -1));
    const last7  = sorted.slice(0, 7);
    const prev7  = sorted.slice(7, 14);
    const wow = (metric: string) => {
      const cur  = last7.reduce((s: number, d: any) => s + (d[metric] || 0), 0);
      const prev = prev7.reduce((s: number, d: any) => s + (d[metric] || 0), 0);
      if (prev === 0) return null;
      return Math.round(((cur - prev) / prev) * 1000) / 10;
    };

    const campQuery = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign_budget.amount_micros,
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.ctr
      FROM campaign
      WHERE segments.date BETWEEN '${from}' AND '${to}'
        AND metrics.cost_micros > 0
      ORDER BY metrics.cost_micros DESC
      LIMIT 25
    `;

    const campRes = await fetch(
      `https://googleads.googleapis.com/v23/customers/${customerId}/googleAds:search`,
      { method: 'POST', headers, body: JSON.stringify({ query: campQuery }) }
    );
    const campData = campRes.ok ? await campRes.json() : { results: [] };

    const campaigns = (campData.results || []).map((r: any) => ({
      id:          r.campaign.id,
      name:        r.campaign.name,
      status:      r.campaign.status,
      dailyBudget: (r.campaignBudget?.amountMicros || 0) / 1_000_000,
      spend:       Math.round((r.metrics.costMicros || 0) / 1_000_000 * 100) / 100,
      impressions: parseInt(r.metrics.impressions || 0),
      clicks:      parseInt(r.metrics.clicks || 0),
      conversions: parseFloat(r.metrics.conversions || 0),
      ctr:         Math.round(parseFloat(r.metrics.ctr || 0) * 10000) / 100,
      cpm:         parseInt(r.metrics.impressions || 0) > 0
        ? Math.round((r.metrics.costMicros || 0) / 1_000_000 / parseInt(r.metrics.impressions) * 1000 * 100) / 100
        : 0,
    }));

    const activeDailyBudget = campaigns
      .filter((c: any) => c.status === 'ENABLED' && c.dailyBudget > 0)
      .reduce((sum: number, c: any) => sum + c.dailyBudget, 0);

    const result = {
      summary: {
        spend:       Math.round(agg.spend * 100) / 100,
        impressions: agg.impressions,
        clicks:      agg.clicks,
        conversions: Math.round(agg.conversions * 10) / 10,
        cpl:         Math.round(cpl * 100) / 100,
        roas:        Math.round(roas * 100) / 100,
        ctr:         Math.round(ctr * 100) / 100,
        cpm:         Math.round(cpm * 100) / 100,
      },
      daily,
      campaigns,
      activeDailyBudget: Math.round(activeDailyBudget * 100) / 100,
      wow: {
        spend:       wow('spend'),
        conversions: wow('conversions'),
        clicks:      wow('clicks'),
      },
      cachedAt: new Date().toISOString(),
    };

    setCache(cacheKey, result);
    return NextResponse.json(result, { headers: { 'X-Cache': 'MISS' } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
