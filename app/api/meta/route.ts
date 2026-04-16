import { NextRequest, NextResponse } from 'next/server';

const getAction = (actions: any[], type: string) =>
  parseFloat(actions?.find((a) => a.action_type === type)?.value || 0);

const extractInstalls = (actions: any[]) =>
  getAction(actions, 'mobile_app_install') ||
  getAction(actions, 'app_install') ||
  getAction(actions, 'omni_app_install');

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const dateRange = searchParams.get('dateRange') || 'last_30d';
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const token = process.env.META_ACCESS_TOKEN;
  const accountId = process.env.META_AD_ACCOUNT_ID;
  const fields = 'spend,impressions,reach,frequency,clicks,actions,action_values,ctr,cpc';

  let since: string, until: string;
  if (dateRange === 'custom' && from && to) {
    since = from;
    until = to;
  } else {
    const toDate = new Date();
    toDate.setDate(toDate.getDate() - 1);
    until = toDate.toISOString().slice(0, 10);
    const days =
      dateRange === 'last_7d' ? 7
      : dateRange === 'last_90d' ? 90
      : dateRange === 'last_180d' ? 180
      : dateRange === 'last_year' ? 365
      : 30;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    since = fromDate.toISOString().slice(0, 10);
  }

  try {
    const sinceDate = new Date(since);
    const untilDate = new Date(until);
    const chunks: { since: string; until: string }[] = [];
    let cur = new Date(sinceDate);
    while (cur <= untilDate) {
      const chunkStart = cur.toISOString().slice(0, 10);
      const chunkEnd = new Date(cur);
      chunkEnd.setDate(chunkEnd.getDate() + 24);
      if (chunkEnd > untilDate) chunkEnd.setTime(untilDate.getTime());
      chunks.push({ since: chunkStart, until: chunkEnd.toISOString().slice(0, 10) });
      cur = new Date(chunkEnd);
      cur.setDate(cur.getDate() + 1);
    }

    const fetchChunk = async (chunk: { since: string; until: string }) => {
      const tr = encodeURIComponent(JSON.stringify(chunk));
      const url = `https://graph.facebook.com/v19.0/${accountId}/insights?fields=${fields}&time_range=${tr}&time_increment=1&access_token=${token}`;
      const r = await fetch(url);
      const d = await r.json();
      return d.data || [];
    };

    const summaryTR = encodeURIComponent(JSON.stringify({ since, until }));
    const [summaryRes, ...chunkResults] = await Promise.all([
      fetch(`https://graph.facebook.com/v19.0/${accountId}/insights?fields=${fields}&time_range=${summaryTR}&access_token=${token}`).then((r) => r.json()),
      ...chunks.map(fetchChunk),
    ]);

    if (summaryRes.error) return NextResponse.json({ error: summaryRes.error }, { status: 500 });

    const s = summaryRes.data?.[0] || {};
    const spend = parseFloat(s.spend || 0);
    const impressions = parseInt(s.impressions || 0);
    const clicks = parseInt(s.clicks || 0);
    const reach = parseInt(s.reach || 0);
    const frequency = parseFloat(s.frequency || 0);
    const installs = extractInstalls(s.actions || []);
    const cpi = installs > 0 ? spend / installs : 0;
    const installRate = clicks > 0 ? (installs / clicks) * 100 : 0;
    const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;

    const allDaily = (chunkResults.flat() as any[])
      .map((d: any) => ({
        date: d.date_start,
        spend: parseFloat(d.spend || 0),
        impressions: parseInt(d.impressions || 0),
        clicks: parseInt(d.clicks || 0),
        reach: parseInt(d.reach || 0),
        frequency: parseFloat(d.frequency || 0),
        installs: extractInstalls(d.actions || []),
        cpm: parseInt(d.impressions || 0) > 0 ? (parseFloat(d.spend || 0) / parseInt(d.impressions)) * 1000 : 0,
      }))
      .sort((a: any, b: any) => (a.date > b.date ? 1 : -1));

    const sorted = [...allDaily].sort((a, b) => (b.date > a.date ? 1 : -1));
    const last7 = sorted.slice(0, 7);
    const prev7 = sorted.slice(7, 14);
    const wow = (metric: string) => {
      const cur = last7.reduce((s: number, d: any) => s + (d[metric] || 0), 0);
      const prev = prev7.reduce((s: number, d: any) => s + (d[metric] || 0), 0);
      if (prev === 0) return null;
      return Math.round(((cur - prev) / prev) * 1000) / 10;
    };

    return NextResponse.json({
      summary: {
        spend: Math.round(spend * 100) / 100,
        impressions,
        clicks,
        reach,
        frequency: Math.round(frequency * 100) / 100,
        installs: Math.round(installs * 10) / 10,
        cpi: Math.round(cpi * 100) / 100,
        installRate: Math.round(installRate * 100) / 100,
        cpm: Math.round(cpm * 100) / 100,
        ctr: Math.round(parseFloat(s.ctr || 0) * 100) / 100,
        conversions: Math.round(installs * 10) / 10,
        cpl: Math.round(cpi * 100) / 100,
        roas: 0,
      },
      daily: allDaily,
      wow: {
        spend: wow('spend'),
        installs: wow('installs'),
        cpm: wow('cpm'),
        clicks: wow('clicks'),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
