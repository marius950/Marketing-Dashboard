'use client';
import { KpiCard, WowBadge } from '@/components/KpiCard';
import SpendChart from '@/components/SpendChart';
import { Lang, MetaData, MetaCampaignsData } from '@/lib/types';
import { t } from '@/lib/i18n';
import { fmtEur, fmt } from '@/lib/utils';

interface MetaTabProps {
  lang: Lang;
  data: MetaData | null;
  campaigns: MetaCampaignsData | null;
  loading: boolean;
}

export default function MetaTab({ lang, data, campaigns, loading }: MetaTabProps) {
  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 12, marginBottom: 20 }}>
        <KpiCard label={t(lang, 'spend')} value={fmtEur(data?.summary.spend ?? 0)} loading={loading} variant="meta"
          sub={<WowBadge value={data?.wow.spend ?? null} />} />
        <KpiCard label={t(lang, 'impressions')} value={fmt(data?.summary.impressions ?? 0)} loading={loading} variant="meta" />
        <KpiCard label={t(lang, 'reach')} value={fmt(data?.summary.reach ?? 0)} loading={loading} variant="meta" />
        <KpiCard label={t(lang, 'frequency')} value={fmt(data?.summary.frequency ?? 0, 2)} loading={loading} variant="meta" />
        <KpiCard label={t(lang, 'app-installs')} value={fmt(data?.summary.installs ?? 0, 0)} loading={loading} variant="meta"
          sub={<WowBadge value={data?.wow.installs ?? null} />} />
        <KpiCard label="CPI" value={fmtEur(data?.summary.cpi ?? 0, 2)} loading={loading} variant="meta" />
        <KpiCard label={t(lang, 'install-rate')} value={fmt(data?.summary.installRate ?? 0, 2) + '%'} loading={loading} variant="meta" />
        <KpiCard label="CPM" value={fmtEur(data?.summary.cpm ?? 0, 2)} loading={loading} variant="meta"
          sub={<WowBadge value={data?.wow.cpm ?? null} isPositiveGood={false} />} />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <SpendChart data={data?.daily ?? []} dataKey="spend" color="var(--meta)"
          title={`${t(lang, 'ct-m-spend')} – Meta Ads`} />
        <SpendChart data={data?.daily ?? []} dataKey="cpm" color="#a855f7"
          title={t(lang, 'ct-m-cpm')} />
      </div>

      {/* Campaigns table */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--effi-border)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--effi-border)', fontSize: 13, fontWeight: 600 }}>
          {t(lang, 'campaigns-count')} ({campaigns?.campaigns.length ?? 0})
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--effi-surface)' }}>
                {['Kampagne', 'Status', 'Spend', 'Impressionen', 'Klicks', 'Installs', 'CTR', 'CPM'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Kampagne' ? 'left' : 'right', fontWeight: 600, color: 'var(--effi-text-sec)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: 'var(--effi-neutral)' }}>{t(lang, 'campaigns-loading')}</td></tr>
              ) : (campaigns?.campaigns ?? []).map(c => (
                <tr key={c.id} style={{ borderTop: '1px solid var(--effi-border)' }}>
                  <td style={{ padding: '10px 12px', maxWidth: 280 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: c.status === 'ACTIVE' ? '#16a34a' : '#d97706' }}>
                      {c.status === 'ACTIVE' ? t(lang, 'active') : t(lang, 'paused')}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>{fmtEur(c.spend)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>{fmt(c.impressions)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>{fmt(c.clicks)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>{fmt(c.conversions ?? 0, 0)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>{fmt(c.ctr, 2)}%</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>{fmtEur(c.cpm, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
