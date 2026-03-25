// In-Memory Cache – 30 Minuten TTL
const cache = new Map();
const CACHE_TTL = 30 * 60 * 1000;

function getCacheKey(from, to) { return `campaigns_${from}_${to}`; }

function getFromCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
}

function setCache(key, data) { cache.set(key, { data, timestamp: Date.now() }); }

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { from, to, refresh } = req.query;
  const token     = process.env.META_ACCESS_TOKEN;
  const accountId = process.env.META_AD_ACCOUNT_ID;

  if (!from || !to) return res.status(400).json({ error: 'from and to required' });

  const cacheKey = getCacheKey(from, to);
  if (refresh !== '1') {
    const cached = getFromCache(cacheKey);
    if (cached) { res.setHeader('X-Cache', 'HIT'); return res.status(200).json(cached); }
  }

  const fields = 'spend,impressions,clicks,ctr,cpc,actions,action_values';
  const timeRange = `{"since":"${from}","until":"${to}"}`;

  // Thumbnail-URL sicher machen – p64x64 auf p320x320 nur wenn vorhanden
  const fixThumb = url => {
    if (!url) return null;
    if (url.includes('p64x64')) return url.replace('p64x64', 'p320x320');
    return url;
  };

  const getAction = (actions, type) =>
    parseFloat(actions?.find(a => a.action_type === type)?.value || 0);

  try {
    // Alle Kampagnen laden – Filterung nach Spend > 0 machen wir selbst
    const campRes = await fetch(
      `https://graph.facebook.com/v19.0/${accountId}/campaigns?fields=id,name,status,daily_budget,lifetime_budget,insights.time_range(${timeRange}){${fields}}&limit=50&access_token=${token}`
    );
    const campData = await campRes.json();
    if (campData.error) return res.status(500).json({ error: campData.error });

    const allCampaigns = await Promise.all((campData.data || []).map(async (camp) => {
      const ins = camp.insights?.data?.[0] || {};
      const conv = getAction(ins.actions, 'lead') ||
                   getAction(ins.actions, 'complete_registration') ||
                   getAction(ins.actions, 'purchase');
      const spend = parseFloat(ins.spend || 0);

      // Kein Spend → keine weiteren API-Calls
      if (spend === 0) {
        return {
          id: camp.id, name: camp.name, status: camp.status,
          budget: parseInt(camp.daily_budget || camp.lifetime_budget || 0) / 100,
          spend: 0, impressions: 0, clicks: 0, ctr: 0, conversions: 0, adsets: [],
        };
      }

      const adsetRes = await fetch(
        `https://graph.facebook.com/v19.0/${camp.id}/adsets?fields=id,name,status,daily_budget,insights.time_range(${timeRange}){${fields}}&limit=10&access_token=${token}`
      );
      const adsetData = await adsetRes.json();

      const adsets = await Promise.all((adsetData.data || []).map(async (adset) => {
        const ai = adset.insights?.data?.[0] || {};
        const aConv = getAction(ai.actions, 'lead') ||
                      getAction(ai.actions, 'complete_registration') ||
                      getAction(ai.actions, 'purchase');
        const aSpend = parseFloat(ai.spend || 0);

        const adsRes = await fetch(
          `https://graph.facebook.com/v19.0/${adset.id}/ads?fields=id,name,status,creative{id,thumbnail_url,image_url,object_story_spec{video_data{image_url}}}&insights.time_range(${timeRange}){${fields}}&limit=5&access_token=${token}`
        );
        const adsData = await adsRes.json();

        const ads = (adsData.data || []).map(ad => {
          const di = ad.insights?.data?.[0] || {};
          const dConv = getAction(di.actions, 'lead') ||
                        getAction(di.actions, 'complete_registration') ||
                        getAction(di.actions, 'purchase');
          const thumb =
            ad.creative?.image_url ||
            ad.creative?.object_story_spec?.video_data?.image_url ||
            fixThumb(ad.creative?.thumbnail_url);
          return {
            id:          ad.id,
            name:        ad.name,
            status:      ad.status,
            thumbnail:   thumb,
            spend:       Math.round(parseFloat(di.spend || 0) * 100) / 100,
            impressions: parseInt(di.impressions || 0),
            clicks:      parseInt(di.clicks || 0),
            ctr:         Math.round(parseFloat(di.ctr || 0) * 100) / 100,
            conversions: Math.round(dConv * 10) / 10,
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

    // Nur Kampagnen mit Spend > 0, sortiert nach Spend
    const campaigns = allCampaigns
      .filter(c => c.spend > 0)
      .sort((a, b) => b.spend - a.spend);

    const result = { campaigns, cachedAt: new Date().toISOString() };
    setCache(cacheKey, result);

    res.setHeader('X-Cache', 'MISS');
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
