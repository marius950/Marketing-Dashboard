module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { dateRange = 'last_30d', from, to } = req.query;
  const token     = process.env.META_ACCESS_TOKEN;
  const accountId = process.env.META_AD_ACCOUNT_ID;
  const fields    = 'spend,impressions,clicks,actions,action_values,ctr,cpc';

  let summaryUrl, dailyUrl;

  const toDate = new Date();
  toDate.setDate(toDate.getDate() - 1);
  const toStr = toDate.toISOString().slice(0, 10);

  const getDaysAgo = (days) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  };

  const dynamicPresets = {
    last_7d:   { since: getDaysAgo(7),   until: toStr },
    last_30d:  { since: getDaysAgo(30),  until: toStr },
    last_90d:  { since: getDaysAgo(90),  until: toStr },
    last_180d: { since: getDaysAgo(180), until: toStr },
    last_year: { since: getDaysAgo(365), until: toStr },
  };

  if (dateRange === 'custom' && from && to) {
    const timeRange = encodeURIComponent(JSON.stringify({ since: from, until: to }));
    summaryUrl = `https://graph.facebook.com/v19.0/${accountId}/insights?fields=${fields}&time_range=${timeRange}&access_token=${token}`;
    dailyUrl   = `https://graph.facebook.com/v19.0/${accountId}/insights?fields=${fields}&time_range=${timeRange}&time_increment=1&access_token=${token}`;
  } else {
    const range = dynamicPresets[dateRange] || dynamicPresets.last_30d;
    const timeRange = encodeURIComponent(JSON.stringify(range));
    summaryUrl = `https://graph.facebook.com/v19.0/${accountId}/insights?fields=${fields}&time_range=${timeRange}&access_token=${token}`;
    dailyUrl   = `https://graph.facebook.com/v19.0/${accountId}/insights?fields=${fields}&time_range=${timeRange}&time_increment=1&access_token=${token}`;
  }

  try {
    const [summaryRes, dailyRes] = await Promise.all([
      fetch(summaryUrl),
      fetch(dailyUrl),
    ]);

    const summaryData = await summaryRes.json();
    const dailyData   = await dailyRes.json();

    if (summaryData.error) return res.status(500).json({ error: summaryData.error });

    const s = summaryData.data?.[0] || {};

    const getAction = (actions, type) =>
      parseFloat(actions?.find(a => a.action_type === type)?.value || 0);

    const conversions = getAction(s.actions, 'lead') ||
                        getAction(s.actions, 'complete_registration') ||
                        getAction(s.actions, 'purchase');
    const convValue   = getAction(s.action_values, 'purchase');
    const spend       = parseFloat(s.spend || 0);
    const cpl         = conversions > 0 ? spend / conversions : 0;
    const roas        = spend > 0 ? convValue / spend : 0;

    const daily = (dailyData.data || []).map(d => {
      const conv = getAction(d.actions, 'lead') ||
                   getAction(d.actions, 'complete_registration') ||
                   getAction(d.actions, 'purchase');
      return {
        date:        d.date_start,
        spend:       parseFloat(d.spend || 0),
        impressions: parseInt(d.impressions || 0),
        clicks:      parseInt(d.clicks || 0),
        conversions: conv,
      };
    }).sort((a, b) => a.date > b.date ? 1 : -1);

    res.status(200).json({
      summary: {
        spend:       Math.round(spend * 100) / 100,
        impressions: parseInt(s.impressions || 0),
        clicks:      parseInt(s.clicks || 0),
        conversions: Math.round(conversions * 10) / 10,
        cpl:         Math.round(cpl * 100) / 100,
        roas:        Math.round(roas * 100) / 100,
        ctr:         Math.round(parseFloat(s.ctr || 0) * 100) / 100,
      },
      daily,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
