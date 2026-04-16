'use client';
import { KpiCard, WowBadge } from '@/components/KpiCard';
import SpendChart from '@/components/SpendChart';
import { Lang } from '@/lib/types';
import { t } from '@/lib/i18n';
import { fmtEur, fmt } from '@/lib/utils';
import type { MetaData, GoogleData } from '@/lib/types';

interface OverviewTabProps {
  lang: Lang;
  meta: MetaData | null;
  google: GoogleData | null;
  loading: boolean;
}

export default function OverviewTab({ lang, meta, google, loading }: OverviewTabProps) {
  const totalSpend       = (meta?.summary.spend ?? 0) + (google?.summary.spend ?? 0);
  const totalClicks      = (meta?.summary.clicks ?? 0) + (google?.summary.clicks ?? 0);
  const totalImpressions = (meta?.summary.impressions ?? 0) + (google?.summary.impressions ?? 0);
  const googleSpend      = google?.summary.spend ?? 0;
  const metaSpend        = meta?.summary.spend ?? 0;
  const metaInstalls     = meta?.summary.installs ?? 0;
  const googleConversions = google?.summary.conversions ?? 0;
  const googleDailyBudget = google?.activeDailyBudget ?? 0;

  const card = (style?: React.CSSProperties) => ({
    background: '#fff', borderRadius: 12, padding: '16px 18px',
    border: '1px solid var(--effi-border)', boxShadow: '0 1px 4px rgba(0,0,0,.06)',
    ...style,
  });

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
        <KpiCard label={t(lang, 'impressions')} value={fmt(totalImpressions)} loading={loading} />
        <KpiCard label={t(lang, 'clicks')}      value={fmt(totalClicks)}      loading={loading} />
        <KpiCard label={t(lang, 'app-installs')} value={fmt(metaInstalls, 0)} loading={loading} variant="meta"
          sub={<WowBadge value={meta?.wow.installs ?? null} />} />
        <KpiCard label={t(lang, 'conversions')} value={fmt(googleConversions, 0)} loading={loading} variant="google"
          sub={<WowBadge value={google?.wow.conversions ?? null} />} />
        <KpiCard label={t(lang, 'daily-budget')} value={fmtEur(googleDailyBudget)} loading={loading} variant="budget"
          sub="Google Ads" />
      </div>

      {/* Charts — each in its own card, side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <SpendChart
          data={google?.daily ?? []}
          dataKey="spend"
          color="var(--google)"
          title={`${t(lang, 'google-label')}`}
        />
        <SpendChart
          data={meta?.daily ?? []}
          dataKey="spend"
          color="var(--meta)"
          title={`${t(lang, 'meta-label')}`}
        />
      </div>

      {/* Google + Meta summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Google */}
        <div style={{ ...card(), borderTop: '3px solid var(--google)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: 'var(--google)' }}>Google Ads</div>
          {google ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
              {[
                ['Spend',        fmtEur(google.summary.spend)],
                ['CPL',          fmtEur(google.summary.cpl, 2)],
                ['Conversions',  fmt(google.summary.conversions, 0)],
                ['CTR',          fmt(google.summary.ctr, 2) + '%'],
                ['CPM',          fmtEur(google.summary.cpm, 2)],
                ['ROAS',         google.summary.roas.toFixed(2) + 'x'],
              ].map(([label, val]) => (
                <div key={label} style={{ padding: '8px 0', borderBottom: '1px solid var(--effi-surface)' }}>
                  <div style={{ fontSize: 10, color: 'var(--effi-text-sec)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{val}</div>
                </div>
              ))}
            </div>
          ) : <div style={{ color: 'rgba(0,0,0,0.15)', fontSize: 20, fontWeight: 700 }}>–</div>}
        </div>

        {/* Meta */}
        <div style={{ ...card(), borderTop: '3px solid var(--meta)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: 'var(--meta)' }}>Meta Ads</div>
          {meta ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
              {[
                ['Spend',       fmtEur(meta.summary.spend)],
                ['CPI',         fmtEur(meta.summary.cpi, 2)],
                ['App Installs', fmt(meta.summary.installs, 0)],
                ['CTR',          fmt(meta.summary.ctr, 2) + '%'],
                ['CPM',          fmtEur(meta.summary.cpm, 2)],
                ['Reach',        fmt(meta.summary.reach)],
              ].map(([label, val]) => (
                <div key={label} style={{ padding: '8px 0', borderBottom: '1px solid var(--effi-surface)' }}>
                  <div style={{ fontSize: 10, color: 'var(--effi-text-sec)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{val}</div>
                </div>
              ))}
            </div>
          ) : <div style={{ color: 'rgba(0,0,0,0.15)', fontSize: 20, fontWeight: 700 }}>–</div>}
        </div>
      </div>
    </div>
  );
}
