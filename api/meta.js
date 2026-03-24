export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { dateRange = 'last_30d' } = req.query;
  const token     = process.env.META_ACCESS_TOKEN;
  const accountId = process.env.META_AD_ACCOUNT_ID;

  const datePresets = {
    last_7d:  'last_7d',
    last_30d: 'last_30d',
    last_90d: 'last_90d',
  };
  const preset = datePresets[dateRange] || 'last_30_days';

  try { = `https://graph.facebook.com/v19.0/${accountId}/insights?fields=${fields}&date_preset=${preset}&access_token=${token}`;
    const dailyUrl   = `https://graph.facebook.com/v19.0/${accountId}/insights?fields=${fields}&date_preset=${preset}&time_increment=1&access_token=${token}`;

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
