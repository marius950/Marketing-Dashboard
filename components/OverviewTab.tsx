'use client';
import { KpiCard, WowBadge } from '@/components/KpiCard';
import SpendChart from '@/components/SpendChart';
import { Lang } from '@/lib/types';
import { t } from '@/lib/i18n';
import { fmtEur, fmt } from '@/lib/utils';
import type { MetaData, GoogleData, DailyData } from '@/lib/types';

interface OverviewTabProps {
  lang: Lang;
  meta: MetaData | null;
  google: GoogleData | null;
  loading: boolean;
}

function mergeDailyData(google: DailyData[], meta: DailyData[]): DailyData[] {
  const map = new Map<string, { date: string; google: number; meta: number }>();
  google.forEach(d => { map.set(d.date, { date: d.date, google: d.spend, meta: 0 }); });
  meta.forEach(d => {
    const e = map.get(d.date) ?? { date: d.date, google: 0, meta: 0 };
    e.meta = d.spend;
    map.set(d.date, e);
  });
  return Array.from(map.values()).sort((a, b) => a.date > b.date ? 1 : -1) as any;
}

export default function OverviewTab({ lang, meta, google, loading }: OverviewTabProps) {
  const totalSpend = (meta?.summary.spend ?? 0) + (google?.summary.spend ?? 0);
  const totalClicks = (meta?.summary.clicks ?? 0) + (google?.summary.clicks ?? 0);
  const totalImpressions = (meta?.summary.impressions ?? 0) + (google?.summary.impressions ?? 0);
  const googleSpend = google?.summary.spend ?? 0;
  const metaSpend = meta?.summary.spend ?? 0;
  const metaInstalls = meta?.summary.installs ?? 0;
  const googleConversions = google?.summary.conversions ?? 0;
  const googleDailyBudget = google?.activeDailyBudget ?? 0;

  const combinedDaily = (google?.daily && meta?.daily)
    ? mergeDailyData(google.daily, meta.daily)
    : google?.daily ?? meta?.daily ?? [];

  return (
    <div>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 20 }}>
        <KpiCard
          label={t(lang, 'total-spend')}
          value={fmtEur(totalSpend)}
          loading={loading}
          sub={<>
            <span style={{ color: 'var(--google)' }}>G {fmtEur(googleSpend)}</span>
            {' · '}
            <span style={{ color: 'var(--meta)' }}>M {fmtEur(metaSpend)}</span>
          </>}
        />
        <KpiCard
          label={t(lang, 'impressions')}
          value={fmt(totalImpressions)}
          loading={loading}
        />
        <KpiCard
          label={t(lang, 'clicks')}
          value={fmt(totalClicks)}
          loading={loading}
        />
        <KpiCard
          label={t(lang, 'app-installs')}
          value={fmt(metaInstalls, 0)}
          loading={loading}
          variant="meta"
          sub={<WowBadge value={meta?.wow.installs ?? null} />}
        />
        <KpiCard
          label={t(lang, 'conversions')}
          value={fmt(googleConversions, 0)}
          loading={loading}
          variant="google"
          sub={<WowBadge value={google?.wow.conversions ?? null} />}
        />
        <KpiCard
          label={t(lang, 'daily-budget')}
          value={fmtEur(googleDailyBudget)}
          loading={loading}
          variant="budget"
          sub="Google Ads"
        />
      </div>

      {/* Combined Spend Chart */}
      {combinedDaily.length > 0 && (
        <div style={{
          background: '#fff', borderRadius: 12, padding: '20px 24px',
          border: '1px solid var(--effi-border)', marginBottom: 16,
          boxShadow: '0 1px 4px rgba(0,0,0,.06)',
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
            {lang === 'de' ? 'Täglicher Spend – Gesamt' : 'Daily Spend – Total'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, height: 220 }}>
            <SpendChart
              data={google?.daily ?? []}
              dataKey="spend"
              color="var(--google)"
              title={t(lang, 'google-label')}
            />
            <SpendChart
              data={meta?.daily ?? []}
              dataKey="spend"
              color="var(--meta)"
              title={t(lang, 'meta-label')}
            />
          </div>
        </div>
      )}

      {/* Google + Meta side-by-side summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Google summary */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '16px 18px', border: '1px solid var(--effi-border)', borderTop: '3px solid var(--google)', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--google)' }}>Google Ads</div>
          {google && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'Spend', val: fmtEur(google.summary.spend) },
                { label: 'CPL', val: fmtEur(google.summary.cpl, 2) },
                { label: 'Conversions', val: fmt(google.summary.conversions, 0) },
                { label: 'CTR', val: fmt(google.summary.ctr, 2) + '%' },
                { label: 'CPM', val: fmtEur(google.summary.cpm, 2) },
                { label: 'ROAS', val: google.summary.roas.toFixed(2) + 'x' },
              ].map(({ label, val }) => (
                <div key={label} style={{ padding: '8px 0', borderBottom: '1px solid var(--effi-surface)' }}>
                  <div style={{ fontSize: 10, color: 'var(--effi-text-sec)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{val}</div>
                </div>
              ))}
            </div>
          )}
          {loading && <div style={{ color: 'rgba(0,0,0,0.2)', fontSize: 20, fontWeight: 700 }}>–</div>}
        </div>

        {/* Meta summary */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '16px 18px', border: '1px solid var(--effi-border)', borderTop: '3px solid var(--meta)', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--meta)' }}>Meta Ads</div>
          {meta && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'Spend', val: fmtEur(meta.summary.spend) },
                { label: 'CPI', val: fmtEur(meta.summary.cpi, 2) },
                { label: 'App Installs', val: fmt(meta.summary.installs, 0) },
                { label: 'CTR', val: fmt(meta.summary.ctr, 2) + '%' },
                { label: 'CPM', val: fmtEur(meta.summary.cpm, 2) },
                { label: 'Reach', val: fmt(meta.summary.reach) },
              ].map(({ label, val }) => (
                <div key={label} style={{ padding: '8px 0', borderBottom: '1px solid var(--effi-surface)' }}>
                  <div style={{ fontSize: 10, color: 'var(--effi-text-sec)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{val}</div>
                </div>
              ))}
            </div>
          )}
          {loading && <div style={{ color: 'rgba(0,0,0,0.2)', fontSize: 20, fontWeight: 700 }}>–</div>}
        </div>
      </div>
    </div>
  );
}
