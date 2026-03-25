// In-Memory Cache – 30 Minuten TTL
const cache = new Map();
const CACHE_TTL = 30 * 60 * 1000;

function getCacheKey(from, to) { return `google_${from}_${to}`; }

function getFromCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
}

function setCache(key, data) { cache.set(key, { data, timestamp: Date.now() }); }

async function getAccessToken() {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      grant_type:    'refresh_token',
    }),
  });
  const d = await r.json();
  if (!d.access_token) throw new Error('Google token refresh failed: ' + JSON.stringify(d));
  return d.access_token;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { from, to, refresh } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'from and to required' });

  const cacheKey = getCacheKey(from, to);
  if (refresh !== '1') {
    const cached = getFromCache(cacheKey);
    if (cached) { res.setHeader('X-Cache', 'HIT'); return res.status(200).json(cached); }
  }

  try {
    const accessToken = await getAccessToken();
    const customerId  = process.env.GOOGLE_ADS_CUSTOMER_ID?.replace(/-/g, '');
    const devToken    = process.env.GOOGLE_DEVELOPER_TOKEN;

    const headers = {
      Authorization:     `Bearer ${accessToken}`,
      'developer-token': devToken,
      'Content-Type':    'application/json',
    };

    // ── 1. Summary + Daily (1 API-Call) ──────────────────────────────────
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
      `https://googleads.googleapis.com/v19/customers/${customerId}/googleAds:search`,
      { method: 'POST', headers, body: JSON.stringify({ query: summaryQuery }) }
    );
    const summaryData = await summaryRes.json();
    if (!summaryRes.ok) return res.status(500).json({ error: summaryData });

    const rows = summaryData.results || [];

    const agg = rows.reduce((acc, r) => {
      const m = r.metrics;
      acc.spend       += (m.costMicros || 0) / 1_000_000;
      acc.impressions += parseInt(m.impressions || 0);
      acc.clicks      += parseInt(m.clicks || 0);
      acc.conversions += parseFloat(m.conversions || 0);
      acc.convValue   += parseFloat(m.conversionsValue || 0);
      return acc;
    }, { spend: 0, impressions: 0, clicks: 0, conversions: 0, convValue: 0 });

    const cpl  = agg.conversions > 0 ? agg.spend / agg.conversions : 0;
    const roas = agg.spend > 0 ? agg.convValue / agg.spend : 0;
    const ctr  = agg.impressions > 0 ? (agg.clicks / agg.impressions) * 100 : 0;

    const daily = rows.map(r => ({
      date:        r.segments?.date,
      spend:       Math.round((r.metrics.costMicros || 0) / 1_000_000 * 100) / 100,
      impressions: parseInt(r.metrics.impressions || 0),
      clicks:      parseInt(r.metrics.clicks || 0),
      conversions: parseFloat(r.metrics.conversions || 0),
    }));

    // ── 2. Kampagnen (1 API-Call) ─────────────────────────────────────────
    const campQuery = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
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
      `https://googleads.googleapis.com/v19/customers/${customerId}/googleAds:search`,
      { method: 'POST', headers, body: JSON.stringify({ query: campQuery }) }
    );
    const campData = await campRes.json();

    const campaigns = campRes.ok ? (campData.results || []).map(r => ({
      id:          r.campaign.id,
      name:        r.campaign.name,
      status:      r.campaign.status,
      spend:       Math.round((r.metrics.costMicros || 0) / 1_000_000 * 100) / 100,
      impressions: parseInt(r.metrics.impressions || 0),
      clicks:      parseInt(r.metrics.clicks || 0),
      conversions: parseFloat(r.metrics.conversions || 0),
      ctr:         Math.round(parseFloat(r.metrics.ctr || 0) * 10000) / 100,
    })) : [];

    const result = {
      summary: {
        spend:       Math.round(agg.spend * 100) / 100,
        impressions: agg.impressions,
        clicks:      agg.clicks,
        conversions: Math.round(agg.conversions * 10) / 10,
        cpl:         Math.round(cpl * 100) / 100,
        roas:        Math.round(roas * 100) / 100,
        ctr:         Math.round(ctr * 100) / 100,
      },
      daily,
      campaigns,
      cachedAt: new Date().toISOString(),
    };

    setCache(cacheKey, result);
    res.setHeader('X-Cache', 'MISS');
    res.status(200).json(result);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
