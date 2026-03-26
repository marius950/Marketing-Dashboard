// ── Thumbnail Proxy ───────────────────────────────────────────────────────────
// Meta fbcdn URLs haben Hotlink-Schutz → Server muss das Bild serverseitig holen
async function handleProxy(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing url' });
  try {
    const decoded = decodeURIComponent(url);
    const response = await fetch(decoded, {
      headers: {
        // Referer auf facebook.com setzen – das ist was Meta erwartet
        'Referer': 'https://www.facebook.com/',
        'User-Agent': 'Mozilla/5.0 (compatible; effi-dashboard/1.0)',
      }
    });
    if (!response.ok) {
      return res.status(response.status).json({ error: `Upstream ${response.status}` });
    }
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.send(Buffer.from(buffer));
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

// ── In-Memory Cache ───────────────────────────────────────────────────────────
let cache = null;
let cacheTime = 0;
const CACHE_TTL = 30 * 60 * 1000; // 30 Minuten

export default async function handler(req, res) {
  // Proxy-Route zuerst prüfen
  if (req.query.proxy === '1') return handleProxy(req, res);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'Missing from/to' });

  const now = Date.now();
  const cacheKey = `${from}_${to}`;
  if (cache && cache.key === cacheKey && (now - cacheTime) < CACHE_TTL) {
    return res.status(200).json(cache.data);
  }

  const TOKEN    = process.env.META_ACCESS_TOKEN;
  const RAW_ACCOUNT = process.env.META_AD_ACCOUNT_ID || '';
  // Sicherstellen dass act_ nur einmal vorhanden ist
  const ACCOUNT  = RAW_ACCOUNT.replace(/^act_/, '');
  const BASE     = 'https://graph.facebook.com/v22.0';

  if (!TOKEN || !ACCOUNT) return res.status(500).json({ error: 'Missing META env vars' });

  try {
    // ── Kampagnen mit Insights ────────────────────────────────────────────────
    const campUrl = `${BASE}/act_${ACCOUNT}/campaigns`
      + `?fields=id,name,status,daily_budget,insights.date_preset(last_30d){spend,impressions,clicks,actions,ctr,cpm}`
      + `&time_range={"since":"${from}","until":"${to}"}`
      + `&limit=50`
      + `&access_token=${TOKEN}`;

    const campRes  = await fetch(campUrl);
    const campJson = await campRes.json();
    if (campJson.error) return res.status(400).json({ error: campJson.error.message });

    const campaigns = campJson.data || [];

    // ── Aktives Tagesbudget ───────────────────────────────────────────────────
    let activeDailyBudget = 0;
    campaigns.forEach(c => {
      if (c.status === 'ACTIVE' && c.daily_budget) {
        activeDailyBudget += parseFloat(c.daily_budget) / 100;
      }
    });

    // ── Für jede Kampagne: Adsets + Ads ──────────────────────────────────────
    const enriched = await Promise.all(campaigns.map(async (camp) => {
      const ins = camp.insights?.data?.[0] || {};
      const spend       = parseFloat(ins.spend || 0);
      const impressions = parseInt(ins.impressions || 0);
      const clicks      = parseInt(ins.clicks || 0);
      const ctr         = parseFloat(ins.ctr || 0);
      const cpm         = parseFloat(ins.cpm || 0);
      const conversions = (ins.actions || [])
        .filter(a => a.action_type === 'mobile_app_install' || a.action_type === 'app_install')
        .reduce((s, a) => s + parseInt(a.value || 0), 0);

      // Adsets laden
      let adsets = [];
      try {
        const adsetUrl = `${BASE}/${camp.id}/adsets`
          + `?fields=id,name,status,insights.date_preset(last_30d){spend,impressions,clicks,ctr}`
          + `&time_range={"since":"${from}","until":"${to}"}`
          + `&limit=20`
          + `&access_token=${TOKEN}`;
        const adsetRes  = await fetch(adsetUrl);
        const adsetJson = await adsetRes.json();

        adsets = await Promise.all((adsetJson.data || []).map(async (adset) => {
          const ai = adset.insights?.data?.[0] || {};

          // Ads laden
          let ads = [];
          try {
            const adUrl = `${BASE}/${adset.id}/ads`
              + `?fields=id,name,status,creative{thumbnail_url,object_story_spec},insights.date_preset(last_30d){spend,impressions,clicks,ctr,cpm}`
              + `&time_range={"since":"${from}","until":"${to}"}`
              + `&limit=20`
              + `&access_token=${TOKEN}`;
            const adRes  = await fetch(adUrl);
            const adJson = await adRes.json();

            ads = (adJson.data || []).map(ad => {
              const adi = ad.insights?.data?.[0] || {};
              // Thumbnail: bevorzuge object_story_spec image, fallback auf thumbnail_url
              const thumb = ad.creative?.thumbnail_url || null;
              return {
                id:          ad.id,
                name:        ad.name,
                status:      ad.status,
                thumbnail:   thumb,
                spend:       parseFloat(adi.spend || 0),
                impressions: parseInt(adi.impressions || 0),
                clicks:      parseInt(adi.clicks || 0),
                ctr:         parseFloat(adi.ctr || 0),
                cpm:         parseFloat(adi.cpm || 0),
              };
            });
          } catch (e) { /* Ads optional */ }

          return {
            id:          adset.id,
            name:        adset.name,
            status:      adset.status,
            spend:       parseFloat(ai.spend || 0),
            impressions: parseInt(ai.impressions || 0),
            clicks:      parseInt(ai.clicks || 0),
            ctr:         parseFloat(ai.ctr || 0),
            ads,
          };
        }));
      } catch (e) { /* Adsets optional */ }

      return {
        id:           camp.id,
        name:         camp.name,
        status:       camp.status,
        spend,
        impressions,
        clicks,
        ctr,
        cpm,
        conversions,
        adsets,
      };
    }));

    const result = { campaigns: enriched, activeDailyBudget };
    cache = { key: cacheKey, data: result };
    cacheTime = now;

    return res.status(200).json(result);

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
