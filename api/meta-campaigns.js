module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { from, to } = req.query;
  const token     = process.env.META_ACCESS_TOKEN;
  const accountId = process.env.META_AD_ACCOUNT_ID;

  if (!from || !to) return res.status(400).json({ error: 'from and to required' });

  const tr = encodeURIComponent(JSON.stringify({ since: from, until: to }));
  const fields = 'spend,impressions,clicks,ctr,cpc,actions,action_values';

  try {
          const campRes = await fetch(
      `https://graph.facebook.com/v19.0/${accountId}/campaigns?fields=id,name,status,daily_budget,lifetime_budget,insights.time_range({"since":"${from}","until":"${to}"}){${fields}}&limit=50&access_token=${token}`
    );
    const campData = await campRes.json();
    if (campData.error) return res.status(500).json({ error: campData.error });

    const fixThumb = url => url ? url.replace('p64x64', 'p320x320') : null;

    const campaigns = await Promise.all((campData.data || []).map(async (camp) => {
      const ins = camp.insights?.data?.[0] || {};
      const getAction = (actions, type) =>
        parseFloat(actions?.find(a => a.action_type === type)?.value || 0);
      const conv = getAction(ins.actions, 'lead') ||
                   getAction(ins.actions, 'complete_registration') ||
                   getAction(ins.actions, 'purchase');
      const spend = parseFloat(ins.spend || 0);

      const adsetRes = await fetch(
        `https://graph.facebook.com/v19.0/${camp.id}/adsets?fields=id,name,status,daily_budget,insights.time_range({"since":"${from}","until":"${to}"}){${fields}}&limit=20&access_token=${token}`
      );
      const adsetData = await adsetRes.json();

      const adsets = await Promise.all((adsetData.data || []).map(async (adset) => {
        const ai = adset.insights?.data?.[0] || {};
        const aConv = getAction(ai.actions, 'lead') ||
                      getAction(ai.actions, 'complete_registration') ||
                      getAction(ai.actions, 'purchase');
        const aSpend = parseFloat(ai.spend || 0);

        const adsRes = await fetch(
          `https://graph.facebook.com/v19.0/${adset.id}/ads?fields=id,name,status,creative{id,thumbnail_url,title,body}&insights.time_range({"since":"${from}","until":"${to}"}){${fields}}&limit=10&access_token=${token}`
        );
        const adsData = await adsRes.json();

        const ads = (adsData.data || []).map(ad => {
          const di = ad.insights?.data?.[0] || {};
          const dConv = getAction(di.actions, 'lead') ||
                        getAction(di.actions, 'complete_registration') ||
                        getAction(di.actions, 'purchase');
          return {
            id:           ad.id,
            name:         ad.name,
            status:       ad.status,
            thumbnail:    ad.creative?.thumbnail_url ? fixThumb(ad.creative.thumbnail_url) : null,
            title:        ad.creative?.title || null,
            body:         ad.creative?.body || null,
            spend:        Math.round(parseFloat(di.spend || 0) * 100) / 100,
            impressions:  parseInt(di.impressions || 0),
            clicks:       parseInt(di.clicks || 0),
            ctr:          Math.round(parseFloat(di.ctr || 0) * 100) / 100,
            conversions:  Math.round(dConv * 10) / 10,
          };
        });

        return {
          id:          adset.id,
          name:        adset.name,
          status:      adset.status,
          budget:      parseInt(adset.daily_budget || 0) / 100,
          spend:       Math.round(aSpend * 100) / 100,
          impressions: parseInt(ai.impressions || 0),
          clicks:      parseInt(ai.clicks || 0),
          ctr:         Math.round(parseFloat(ai.ctr || 0) * 100) / 100,
          conversions: Math.round(aConv * 10) / 10,
          ads,
        };
      }));

      return {
        id:          camp.id,
        name:        camp.name,
        status:      camp.status,
        budget:      parseInt(camp.daily_budget || camp.lifetime_budget || 0) / 100,
        spend:       Math.round(spend * 100) / 100,
        impressions: parseInt(ins.impressions || 0),
        clicks:      parseInt(ins.clicks || 0),
        ctr:         Math.round(parseFloat(ins.ctr || 0) * 100) / 100,
        conversions: Math.round(conv * 10) / 10,
        adsets,
      };
    }));

    campaigns.sort((a, b) => b.spend - a.spend);
    res.status(200).json({ campaigns });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
