'use client';
import { useEffect, useState } from 'react';
import { Lang, MetaData, GoogleData } from '@/lib/types';
import { fmtEur, fmt } from '@/lib/utils';

interface OverviewTabProps {
  lang:    Lang;
  meta:    MetaData | null;
  google:  GoogleData | null;
  loading: boolean;
  from:    string;
  to:      string;
}

const CARD = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: '#fff', borderRadius: 12, padding: '16px 20px',
  border: '1px solid var(--effi-border)', boxShadow: '0 1px 4px rgba(0,0,0,.05)', ...extra,
});

function KPI({ label, value, sub, color = '#156949', loading }: { label: string; value: string; sub?: string; color?: string; loading?: boolean }) {
  return (
    <div style={{ ...CARD({ borderTop: `3px solid ${color}` }) }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--effi-text-sec)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: loading ? '#e5e7eb' : color }}>{loading ? '...' : value}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--effi-neutral)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 36 }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, background: color, borderRadius: 2, height: `${Math.round((v / max) * 100)}%`, minHeight: 2, opacity: i === data.length - 1 ? 1 : 0.45 + (i / data.length) * 0.55 }} />
      ))}
    </div>
  );
}

export default function OverviewTab({ lang, meta, google, loading, from, to }: OverviewTabProps) {
  const [baufiData, setBaufiData]     = useState<any>(null);
  const [baufiLoading, setBaufiLoading] = useState(true);

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem('baufi_data_cache');
      if (cached) { setBaufiData(JSON.parse(cached)); setBaufiLoading(false); return; }
    } catch {}
    setBaufiLoading(true);
    fetch(`/api/fincrm?from=2025-01-01&to=${new Date().toISOString().slice(0,10)}`)
      .then(r => r.json())
      .then(d => {
        if (!d.error) { setBaufiData(d); try { sessionStorage.setItem('baufi_data_cache', JSON.stringify(d)); } catch {} }
        setBaufiLoading(false);
      })
      .catch(() => setBaufiLoading(false));
  }, []);

  const kpi          = baufiData?.kpis;
  const metaSpend    = meta?.summary?.spend    ?? 0;
  const googleSpend  = google?.summary?.spend  ?? 0;
  const totalSpend   = metaSpend + googleSpend;
  const metaInstalls = meta?.summary?.installs ?? 0;
  const googleClicks = google?.summary?.clicks ?? 0;
  const cpl          = metaInstalls > 0 ? metaSpend / metaInstalls : 0;

  const metaDaily      = (meta?.daily   ?? []).slice(-14).map((d: any) => d.spend as number);
  const baufiMonthly   = (baufiData?.monthly  ?? []).slice(-6).map((m: any) => m.count as number);
  const weeklyLeads    = (baufiData?.weeklyLeads ?? []).slice(-12);
  const maxWeekly      = Math.max(...weeklyLeads.map((w: any) => w.count), 1);
  const twoWeeksAgo    = new Date(Date.now() - 14*86400000).toISOString().slice(0,10);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ background: '#111', borderRadius: 8, padding: '5px 10px' }}>
          <img src="/effi-logo.png" alt="effi" style={{ height: 22 }} />
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#156949' }}>effi Übersicht</div>
          <div style={{ fontSize: 12, color: 'var(--effi-neutral)' }}>{from} – {to}</div>
        </div>
      </div>

      {/* Marketing KPIs */}
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--effi-neutral)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>Marketing</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        <KPI label="Ad Spend"          value={fmtEur(totalSpend)}              sub={`G: ${fmtEur(googleSpend)} · M: ${fmtEur(metaSpend)}`} color="#156949" loading={loading} />
        <KPI label="Meta Leads"        value={fmt(metaInstalls)}               sub={`CPL: ${fmtEur(cpl)}`}           color="#1877F2" loading={loading} />
        <KPI label="Google Klicks"     value={fmt(googleClicks)}               sub={`CPC: ${fmtEur(google?.summary?.cpl ?? 0)}`}          color="#4285F4" loading={loading} />
        <KPI label="Meta Impressionen" value={fmt(meta?.summary?.impressions ?? 0)} sub={`CPM: ${fmtEur(meta?.summary?.cpm ?? 0)}`}      color="#6366f1" loading={loading} />
        <KPI label="Meta CTR"          value={`${meta?.summary?.ctr ?? 0}%`}   sub={`Freq: ${meta?.summary?.frequency ?? 0}`}             color="#f59e0b" loading={loading} />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={CARD()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700 }}>Meta Spend — 14 Tage</span>
            {meta?.wow?.spend != null && (
              <span style={{ fontSize: 11, fontWeight: 700, color: meta.wow.spend >= 0 ? '#16a34a' : '#dc2626' }}>
                {meta.wow.spend >= 0 ? '▲' : '▼'} {Math.abs(meta.wow.spend)}% WoW
              </span>
            )}
          </div>
          {loading ? <div style={{ height: 36, background: '#f3f4f6', borderRadius: 4 }} /> : <Sparkline data={metaDaily} color="#1877F2" />}
          <div style={{ fontSize: 10, color: 'var(--effi-neutral)', marginTop: 4 }}>
            Letzter Tag: {fmtEur((meta?.daily ?? []).slice(-1)[0]?.spend ?? 0)}
            {metaSpend === 0 && <span style={{ color: '#dc2626', marginLeft: 8 }}>⚠ Kein Spend — Kampagnen aktiv?</span>}
          </div>
        </div>

        <div style={CARD()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700 }}>Baufi Leads — 6 Monate</span>
            <span style={{ fontSize: 11, color: 'var(--effi-neutral)' }}>{baufiLoading ? '...' : `${kpi?.totalLeads ?? 0} gesamt`}</span>
          </div>
          {baufiLoading ? <div style={{ height: 36, background: '#f3f4f6', borderRadius: 4 }} /> : <Sparkline data={baufiMonthly} color="#00008B" />}
          <div style={{ fontSize: 10, color: 'var(--effi-neutral)', marginTop: 4 }}>
            Reaktionszeit: {kpi?.avgResponseHours ?? '–'}h · Abschlüsse: {kpi?.wonCount ?? 0}
          </div>
        </div>

        <div style={{ ...CARD({ borderTop: '3px solid #156949' }) }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Revenue 2026</div>
          {[
            { q: 'Q1 Actual',   v: '€9.897',   c: '#16a34a', done: true },
            { q: 'Q2 Ziel',     v: '€40.250',  c: '#f59e0b', done: false },
            { q: 'Jahresziel',  v: '€343.963', c: '#156949', done: false },
            { q: 'Ad Spend Q1', v: '€40.000',  c: '#6366f1', done: true },
          ].map(r => (
            <div key={r.q} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--effi-surface)' }}>
              <span style={{ fontSize: 11, color: 'var(--effi-text-sec)' }}>{r.done ? '✅' : '○'} {r.q}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: r.c }}>{r.v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Baufi KPIs */}
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--effi-neutral)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>Baufi Sales (finCRM)</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        <KPI label="Leads gesamt"    value={fmt(kpi?.totalLeads ?? 0)}         color="#00008B" loading={baufiLoading} />
        <KPI label="Aktive Pipeline" value={fmt(kpi?.activePipeline ?? 0)}      color="#2563eb" loading={baufiLoading} />
        <KPI label="Abschlüsse"      value={fmt(kpi?.wonCount ?? 0)}            color="#16a34a" loading={baufiLoading} />
        <KPI label="Abschlussquote"  value={`${kpi?.conversionRate ?? 0}%`}     color="#f59e0b" loading={baufiLoading} />
        <KPI label="Ø Volumen"       value={fmtEur(kpi?.avgVolume ?? 0)}        color="#7c3aed" loading={baufiLoading} sub={`Gesamt: ${fmtEur(kpi?.totalVolume ?? 0)}`} />
      </div>

      {/* Pipeline + Attention + Weekly */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={CARD()}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12 }}>Pipeline nach Stage</div>
          {baufiLoading ? <div style={{ color: 'var(--effi-neutral)', fontSize: 12 }}>Lade...</div> :
            (baufiData?.funnelStages ?? [])
              .filter((s: any) => s.count > 0 && s.category === 'active')
              .sort((a: any, b: any) => b.count - a.count)
              .map((s: any) => {
                const maxC = Math.max(...(baufiData?.funnelStages ?? []).filter((x: any) => x.category === 'active').map((x: any) => x.count), 1);
                return (
                  <div key={s.stageId} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontSize: 11 }}>{s.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 700 }}>{s.count}{s.avgVolume > 0 ? ` · ${fmtEur(s.avgVolume)} Ø` : ''}</span>
                    </div>
                    <div style={{ background: 'var(--effi-surface2)', borderRadius: 3, height: 5 }}>
                      <div style={{ height: '100%', background: '#00008B', borderRadius: 3, width: `${Math.round((s.count / maxC) * 100)}%` }} />
                    </div>
                  </div>
                );
              })}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Needs Attention */}
          {(baufiData?.needsAttention ?? []).length > 0 && (
            <div style={{ ...CARD({ borderLeft: '3px solid #f59e0b' }) }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: '#f59e0b' }}>
                Needs Attention ({(baufiData?.needsAttention ?? []).length})
              </div>
              {(baufiData?.needsAttention ?? []).slice(0, 4).map((a: any) => (
                <div key={a.purposeId} style={{ fontSize: 11, color: 'var(--effi-text-sec)', padding: '3px 0', borderBottom: '1px solid var(--effi-surface)' }}>
                  #{a.purposeId} · {a.stageName} · <strong style={{ color: '#f59e0b' }}>{a.daysSince}d</strong>
                </div>
              ))}
            </div>
          )}

          {/* Weekly Leads Chart */}
          <div style={CARD({ flex: 1 })}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Leads pro Woche</div>
            {baufiLoading ? <div style={{ height: 60, background: '#f3f4f6', borderRadius: 4 }} /> : (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 60 }}>
                {weeklyLeads.map((w: any) => (
                  <div key={w.week} title={`${w.week}: ${w.count}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <span style={{ fontSize: 8, color: 'var(--effi-neutral)' }}>{w.count}</span>
                    <div style={{ width: '100%', height: Math.round((w.count / maxWeekly) * 50), background: w.week >= twoWeeksAgo ? '#156949' : '#86efac', borderRadius: '2px 2px 0 0', minHeight: 2 }} />
                    <span style={{ fontSize: 7, color: 'var(--effi-neutral)' }}>{w.week.slice(5)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
