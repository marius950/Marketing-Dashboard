module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { dateRange = 'last_30d', from, to } = req.query;
  const token     = process.env.META_ACCESS_TOKEN;
  const accountId = process.env.META_AD_ACCOUNT_ID;
  const fields    = 'spend,impressions,clicks,actions,action_values,ctr,cpc';

  const getAction = (actions, type) =>
    parseFloat(actions?.find(a => a.action_type === type)?.value || 0);

  const extractConv = (actions) =>
    getAction(actions, 'lead') ||
    getAction(actions, 'complete_registration') ||
    getAction(actions, 'purchase');

  let since, until;
  if (dateRange === 'custom' && from && to) {
    since = from; until = to;
  } else {
    const toDate = new Date();
    toDate.setDate(toDate.getDate() - 1);
    until = toDate.toISOString().slice(0, 10);
    const days = dateRange === 'last_7d' ? 7 : dateRange === 'last_90d' ? 90 :
                 dateRange === 'last_180d' ? 180 : dateRange === 'last_year' ? 365 : 30;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    since = fromDate.toISOString().slice(0, 10);
  }

  try {
    const sinceDate = new Date(since);
    const untilDate = new Date(until);
    const chunks = [];
    let cur = new Date(sinceDate);
    while (cur <= untilDate) {
      const chunkEnd = new Date(cur);
      chunkEnd.setDate(chunkEnd.getDate() + 29);
      if (chunkEnd > untilDate) chunkEnd.setTime(untilDate.getTime());
      chunks.push({
        since: cur.toISOString().slice(0, 10),
        until: chunkEnd.toISOString().slice(0, 10),
      });
      cur = new Date(chunkEnd);
      cur.setDate(cur.getDate() + 1);
    }

    const fetchChunk = async (chunk) => {
      const tr = encodeURIComponent(JSON.stringify(chunk));
      const url = `https://graph.facebook.com/v19.0/${accountId}/insights?fields=${fields}&time_range=${tr}&time_increment=1&access_token=${token}`;
      const r = await fetch(url);
      const d = await r.json();
      return d.data || [];
    };

    const summaryTR = encodeURIComponent(JSON.stringify({ since, until }));
    const [summaryRes, ...chunkResults] = await Promise.all([
      fetch(`https://graph.facebook.com/v19.0/${accountId}/insights?fields=${fields}&time_range=${summaryTR}&access_token=${token}`).then(r => r.json()),
      ...chunks.map(fetchChunk),
    ]);

    if (summaryRes.error) return res.status(500).json({ error: summaryRes.error });

    const s = summaryRes.data?.[0] || {};
    const spend       = parseFloat(s.spend || 0);
    const conversions = extractConv(s.actions);
    const convValue   = getAction(s.action_values, 'purchase');
    const cpl         = conversions > 0 ? spend / conversions : 0;
    const roas        = spend > 0 ? convValue / spend : 0;

    const allDaily = chunkResults.flat().map(d => ({
      date:        d.date_start,
      spend:       parseFloat(d.spend || 0),
      impressions: parseInt(d.impressions || 0),
      clicks:      parseInt(d.clicks || 0),
      conversions: extractConv(d.actions),
    })).sort((a, b) => a.date > b.date ? 1 : -1);

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
      daily: allDaily,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
