'use client';
import { KpiCard, WowBadge } from '@/components/KpiCard';
import SpendChart from '@/components/SpendChart';
import { Lang, GoogleData } from '@/lib/types';
import { t } from '@/lib/i18n';
import { fmtEur, fmt, isSanierung } from '@/lib/utils';

interface GoogleTabProps { lang: Lang; data: GoogleData | null; loading: boolean; }

const STATUS_COLORS: Record<string, string> = {
  ENABLED: '#16a34a', PAUSED: '#d97706', REMOVED: '#dc2626',
};

export default function GoogleTab({ lang, data, loading }: GoogleTabProps) {
  if (!data && !loading) return (
    <div style={{ textAlign: 'center', padding: 60, color: 'var(--effi-neutral)', fontSize: 14 }}>
      {t(lang, 'no-campaigns')}
    </div>
  );

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 12, marginBottom: 20 }}>
        <KpiCard label={t(lang, 'spend')} value={fmtEur(data?.summary.spend ?? 0)} loading={loading} variant="google"
          sub={<WowBadge value={data?.wow.spend ?? null} />} />
        <KpiCard label={t(lang, 'impressions')} value={fmt(data?.summary.impressions ?? 0)} loading={loading} variant="google" />
        <KpiCard label={t(lang, 'clicks')} value={fmt(data?.summary.clicks ?? 0)} loading={loading} variant="google"
          sub={<WowBadge value={data?.wow.clicks ?? null} />} />
        <KpiCard label={t(lang, 'conversions')} value={fmt(data?.summary.conversions ?? 0, 0)} loading={loading} variant="google"
          sub={<WowBadge value={data?.wow.conversions ?? null} />} />
        <KpiCard label={t(lang, 'cpl-google')} value={fmtEur(data?.summary.cpl ?? 0, 2)} loading={loading} variant="google" />
        <KpiCard label="CTR" value={fmt(data?.summary.ctr ?? 0, 2) + '%'} loading={loading} variant="google" />
        <KpiCard label="CPM" value={fmtEur(data?.summary.cpm ?? 0, 2)} loading={loading} variant="google" />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <SpendChart data={data?.daily ?? []} dataKey="spend" color="var(--google)"
          title={`${t(lang, 'ct-g-spend')} – Google Ads`} />
        <SpendChart data={data?.daily ?? []} dataKey="conversions" color="#f59e0b"
          title="Conversions" yLabel="" />
      </div>

      {/* Campaigns */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--effi-border)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--effi-border)', fontSize: 13, fontWeight: 600 }}>
          {t(lang, 'campaigns-count')} ({data?.campaigns.length ?? 0})
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--effi-surface)' }}>
                {['Kampagne', 'Status', 'Spend', 'Impressionen', 'Klicks', 'Conv.', 'CPL', 'CTR', 'CPM'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Kampagne' ? 'left' : 'right', fontWeight: 600, color: 'var(--effi-text-sec)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ padding: 32, textAlign: 'center', color: 'var(--effi-neutral)' }}>{t(lang, 'campaigns-loading')}</td></tr>
              ) : (data?.campaigns ?? []).map(c => {
                const san = isSanierung(c.name);
                return (
                  <tr key={c.id} style={{ borderTop: '1px solid var(--effi-border)' }}>
                    <td style={{ padding: '10px 12px', maxWidth: 280 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          display: 'inline-block', fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 20,
                          background: san ? 'var(--san-light)' : 'var(--baufi-light)',
                          color: san ? 'var(--effi-primary)' : '#1d4ed8',
                        }}>
                          {san ? '🟢 San' : '🔵 Baufi'}
                        </span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>{c.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: STATUS_COLORS[c.status] ?? 'var(--effi-neutral)' }}>
                        {c.status === 'ENABLED' ? t(lang, 'active') : t(lang, 'paused')}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>{fmtEur(c.spend)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{fmt(c.impressions)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{fmt(c.clicks)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{fmt(c.conversions ?? 0, 0)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{c.conversions ? fmtEur((c.spend / c.conversions), 2) : '–'}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{fmt(c.ctr, 2)}%</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{fmtEur(c.cpm, 2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
