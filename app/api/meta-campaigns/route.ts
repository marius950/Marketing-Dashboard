import { NextRequest, NextResponse } from 'next/server';

// In-Memory Cache
let cache: { key: string; data: any } | null = null;
let cacheTime = 0;
const CACHE_TTL = 30 * 60 * 1000;

async function handleProxy(url: string) {
  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  try {
    const decoded = decodeURIComponent(url);
    const response = await fetch(decoded, {
      headers: {
        'Referer': 'https://www.facebook.com/',
        'User-Agent': 'Mozilla/5.0 (compatible; effi-dashboard/1.0)',
      },
    });
    if (!response.ok) {
      return new NextResponse(null, { status: response.status });
    }
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  // Proxy route
  const proxyUrl = searchParams.get('url');
  if (searchParams.get('proxy') === '1' && proxyUrl) {
    return handleProxy(proxyUrl);
  }

  const from = searchParams.get('from');
  const to = searchParams.get('to');
  if (!from || !to) return NextResponse.json({ error: 'Missing from/to' }, { status: 400 });

  const now = Date.now();
  const cacheKey = `${from}_${to}`;
  if (cache && cache.key === cacheKey && now - cacheTime < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  const TOKEN = process.env.META_ACCESS_TOKEN;
  const RAW_ACCOUNT = process.env.META_AD_ACCOUNT_ID || '';
  const ACCOUNT = RAW_ACCOUNT.replace(/^act_/, '');
  const BASE = 'https://graph.facebook.com/v25.0';

  if (!TOKEN || !ACCOUNT) return NextResponse.json({ error: 'Missing META env vars' }, { status: 500 });

  try {
    const campUrl =
      `${BASE}/act_${ACCOUNT}/campaigns` +
      `?fields=id,name,status,daily_budget,insights.date_preset(last_30d){spend,impressions,clicks,actions,ctr,cpm}` +
      `&time_range={"since":"${from}","until":"${to}"}` +
      `&limit=50` +
      `&access_token=${TOKEN}`;

    const campRes = await fetch(campUrl);
    const campJson = await campRes.json();
    if (campJson.error) return NextResponse.json({ error: campJson.error.message }, { status: 400 });

    const campaigns = campJson.data || [];

    const enriched = await Promise.all(
      campaigns.map(async (camp: any) => {
        const ins = camp.insights?.data?.[0] || {};
        const spend = parseFloat(ins.spend || 0);
        const impressions = parseInt(ins.impressions || 0);
        const clicks = parseInt(ins.clicks || 0);
        const ctr = parseFloat(ins.ctr || 0);
        const cpm = parseFloat(ins.cpm || 0);
        const conversions = (ins.actions || [])
          .filter((a: any) => a.action_type === 'mobile_app_install' || a.action_type === 'app_install')
          .reduce((s: number, a: any) => s + parseInt(a.value || 0), 0);

        let adsets: any[] = [];
        try {
          const adsetUrl =
            `${BASE}/${camp.id}/adsets` +
            `?fields=id,name,status,daily_budget,insights.date_preset(last_30d){spend,impressions,clicks,ctr}` +
            `&time_range={"since":"${from}","until":"${to}"}` +
            `&limit=20` +
            `&access_token=${TOKEN}`;
          const adsetRes = await fetch(adsetUrl);
          const adsetJson = await adsetRes.json();

          adsets = await Promise.all(
            (adsetJson.data || []).map(async (adset: any) => {
              const ai = adset.insights?.data?.[0] || {};
              let ads: any[] = [];
              try {
                const adUrl =
                  `${BASE}/${adset.id}/ads` +
                  `?fields=id,name,status,creative{thumbnail_url,object_story_spec},insights.date_preset(last_30d){spend,impressions,clicks,ctr,cpm}` +
                  `&time_range={"since":"${from}","until":"${to}"}` +
                  `&limit=20` +
                  `&access_token=${TOKEN}`;
                const adRes = await fetch(adUrl);
                const adJson = await adRes.json();
                ads = (adJson.data || []).map((ad: any) => {
                  const adi = ad.insights?.data?.[0] || {};
                  return {
                    id: ad.id,
                    name: ad.name,
                    status: ad.status,
                    thumbnail: ad.creative?.thumbnail_url || null,
                    spend: parseFloat(adi.spend || 0),
                    impressions: parseInt(adi.impressions || 0),
                    clicks: parseInt(adi.clicks || 0),
                    ctr: parseFloat(adi.ctr || 0),
                    cpm: parseFloat(adi.cpm || 0),
                  };
                });
              } catch (e) { /* Ads optional */ }

              return {
                id: adset.id,
                name: adset.name,
                status: adset.status,
                spend: parseFloat(ai.spend || 0),
                impressions: parseInt(ai.impressions || 0),
                clicks: parseInt(ai.clicks || 0),
                ctr: parseFloat(ai.ctr || 0),
                ads,
              };
            })
          );
        } catch (e) { /* Adsets optional */ }

        return { id: camp.id, name: camp.name, status: camp.status, spend, impressions, clicks, ctr, cpm, conversions, adsets };
      })
    );

    let activeDailyBudget = 0;
    for (const camp of enriched) {
      if (camp.status !== 'ACTIVE') continue;
      const rawCamp = campaigns.find((c: any) => c.id === camp.id);
      if (rawCamp?.daily_budget && parseFloat(rawCamp.daily_budget) > 0) {
        activeDailyBudget += parseFloat(rawCamp.daily_budget) / 100;
      } else {
        try {
          const budgetUrl = `${BASE}/${camp.id}/adsets?fields=daily_budget,status&access_token=${TOKEN}`;
          const budgetRes = await fetch(budgetUrl);
          const budgetJson = await budgetRes.json();
          (budgetJson.data || []).forEach((adset: any) => {
            if (adset.status === 'ACTIVE' && adset.daily_budget) {
              activeDailyBudget += parseFloat(adset.daily_budget) / 100;
            }
          });
        } catch (e) { /* Budget optional */ }
      }
    }

    const result = { campaigns: enriched, activeDailyBudget };
    cache = { key: cacheKey, data: result };
    cacheTime = now;

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
