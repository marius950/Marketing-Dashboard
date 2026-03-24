export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { dateRange = 'LAST_30_DAYS' } = req.query;

  try {
    const accessToken = await getAccessToken();
    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;

    const query = `
      SELECT
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.ctr,
        metrics.cost_per_conversion,
        metrics.conversions_value,
        segments.date
      FROM customer
      WHERE segments.date DURING ${dateRange}
    `;

    const response = await fetch(
      `https://googleads.googleapis.com/v17/customers/${customerId}/googleAds:search`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'developer-token': process.env.GOOGLE_DEVELOPER_TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      }
    );

    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: data });

    const rows = data.results || [];
    const agg = rows.reduce((acc, r) => {
      const m = r.metrics;
      acc.spend       += (m.costMicros || 0) / 1_000_000;
      acc.impressions += m.impressions || 0;
      acc.clicks      += m.clicks || 0;
      acc.conversions += m.conversions || 0;
      acc.convValue   += m.conversionsValue || 0;
      return acc;
    }, { spend: 0, impressions: 0, clicks: 0, conversions: 0, convValue: 0 });

    const cpl  = agg.conversions > 0 ? agg.spend / agg.conversions : 0;
    const roas = agg.spend > 0 ? agg.convValue / agg.spend : 0;
    const ctr  = agg.impressions > 0 ? (agg.clicks / agg.impressions) * 100 : 0;

    const daily = rows.map(r => ({
      date:        r.segments?.date,
      spend:       (r.metrics.costMicros || 0) / 1_000_000,
      impressions: r.metrics.impressions || 0,
      clicks:      r.metrics.clicks || 0,
      conversions: r.metrics.conversions || 0,
    })).sort((a, b) => a.date > b.date ? 1 : -1);

    res.status(200).json({
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
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

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
