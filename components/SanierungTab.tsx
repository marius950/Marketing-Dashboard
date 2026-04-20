'use client';
import { useState, useEffect } from 'react';
import { KpiCard } from '@/components/KpiCard';
import SpendChart from '@/components/SpendChart';
import { Lang } from '@/lib/types';
import { fmtEur, fmt } from '@/lib/utils';

interface LeadKpis {
  totalLeads: number;
  totalSanierung: number;
  totalForwarded: number;
  totalRevenue: number;
  revenuePerLead: number;
  conversionRate: number;
}

interface ProductBreakdown {
  key: string;
  label: string;
  count: number;
}

interface DailyLead {
  date: string;
  total: number;
  sanierung: number;
  forwarded: number;
}

interface RecentLead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  postCode: string;
  createdAt: string;
  forwarded: boolean;
  products: string[];
}

interface LeadsData {
  kpis: LeadKpis;
  productBreakdown: ProductBreakdown[];
  daily: DailyLead[];
  recentLeads: RecentLead[];
}

interface SanierungTabProps {
  lang: Lang;
  from: string;
  to: string;
}

const GREEN = '#156949';

export default function SanierungTab({ lang, from, to }: SanierungTabProps) {
  const [data, setData]       = useState<LeadsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [revenuePerLead, setRevenuePerLead] = useState(25);

  useEffect(() => {
    if (!from || !to) return;
    setLoading(true);
    setError(null);
    fetch(`/api/leads?from=${from}&to=${to}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error + (d.detail ? ` — ${d.detail}` : '') + (d.hint ? `\n${d.hint}` : ''));
        else setData(d);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [from, to]);

  const card = (extra?: React.CSSProperties) => ({
    background: '#fff', borderRadius: 12, padding: '20px 24px',
    border: '1px solid var(--effi-border)', boxShadow: '0 1px 4px rgba(0,0,0,.06)',
    ...extra,
  });

  const effectiveRevenue = data
    ? data.kpis.totalForwarded * revenuePerLead
    : 0;

  if (error) return (
    <div style={{ ...card(), background: '#fff5f5', borderColor: '#fca5a5' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#dc2626', marginBottom: 8 }}>
        ⚠️ Fehler beim Laden der Lead-Daten
      </div>
      <pre style={{ fontSize: 11, color: '#7f1d1d', whiteSpace: 'pre-wrap' }}>{error}</pre>
      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--effi-neutral)' }}>
        Prüfe ob RETOOL_API_KEY in Vercel korrekt hinterlegt ist.
      </div>
    </div>
  );

  return (
    <div>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 20 }}>
        <KpiCard
          label="Leads gesamt"
          value={loading ? '–' : fmt(data?.kpis.totalLeads ?? 0)}
          loading={loading}
        />
        <KpiCard
          label="Sanierungsleads"
          value={loading ? '–' : fmt(data?.kpis.totalSanierung ?? 0)}
          loading={loading}
          variant="san"
        />
        <KpiCard
          label="Weitervermittelt"
          value={loading ? '–' : fmt(data?.kpis.totalForwarded ?? 0)}
          loading={loading}
          variant="san"
        />
        <KpiCard
          label="Vermittlungsquote"
          value={loading ? '–' : `${data?.kpis.conversionRate ?? 0}%`}
          loading={loading}
        />
        <KpiCard
          label="Revenue (est.)"
          value={loading ? '–' : fmtEur(effectiveRevenue)}
          loading={loading}
          variant="budget"
          sub={`${fmt(data?.kpis.totalForwarded ?? 0)} × €${revenuePerLead}`}
        />
        <div style={{ ...card(), borderTop: '3px solid #f59e0b', background: '#fffbeb' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--effi-text-sec)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
            Revenue / Lead (€)
          </div>
          <input
            type="number"
            value={revenuePerLead}
            onChange={e => setRevenuePerLead(Number(e.target.value))}
            style={{
              width: '100%', fontSize: 20, fontWeight: 700, border: 'none',
              background: 'transparent', color: 'var(--effi-black)', outline: 'none',
            }}
            min={0} step={5}
          />
          <div style={{ fontSize: 11, color: 'var(--effi-neutral)', marginTop: 4 }}>editierbar</div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <SpendChart
          data={(data?.daily ?? []).map(d => ({ date: d.date, spend: d.total, impressions: 0, clicks: 0 }))}
          dataKey="spend"
          color={GREEN}
          title="Leads pro Tag"
          yLabel=" Leads"
        />
        <SpendChart
          data={(data?.daily ?? []).map(d => ({ date: d.date, spend: d.forwarded, impressions: 0, clicks: 0 }))}
          dataKey="spend"
          color="#f59e0b"
          title="Weitervermittlungen pro Tag"
          yLabel=" WV"
        />
      </div>

      {/* Produkt-Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={card()}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>🏷️ Produkt-Breakdown</div>
          {loading ? (
            <div style={{ color: 'var(--effi-neutral)', fontSize: 13 }}>Lade...</div>
          ) : (
            (data?.productBreakdown ?? []).map(p => {
              const max = Math.max(...(data?.productBreakdown ?? []).map(x => x.count), 1);
              const pct = Math.round((p.count / max) * 100);
              return (
                <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <div style={{ fontSize: 12, width: 120, flexShrink: 0 }}>{p.label}</div>
                  <div style={{ flex: 1, background: 'var(--effi-surface2)', borderRadius: 6, height: 10, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 6, background: GREEN, width: `${pct}%`, transition: 'width .4s' }} />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, width: 40, textAlign: 'right' }}>{fmt(p.count)}</div>
                </div>
              );
            })
          )}
        </div>

        {/* Revenue-Rechner */}
        <div style={card()}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Revenue-Prognose</div>
          {[
            ['Weitervermittelte Leads', fmt(data?.kpis.totalForwarded ?? 0)],
            ['Revenue / Lead', fmtEur(revenuePerLead)],
            ['Geschätzter Revenue', fmtEur(effectiveRevenue), true],
            ['Vermittlungsquote', `${data?.kpis.conversionRate ?? 0}%`],
          ].map(([label, val, highlight]) => (
            <div key={String(label)} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 0', borderBottom: '1px solid var(--effi-surface)',
            }}>
              <div style={{ fontSize: 12, color: 'var(--effi-text-sec)' }}>{label}</div>
              <div style={{
                fontSize: highlight ? 18 : 14, fontWeight: 700,
                color: highlight ? '#16a34a' : 'var(--effi-black)',
              }}>{val}</div>
            </div>
          ))}
          <div style={{ fontSize: 11, color: 'var(--effi-neutral)', marginTop: 12 }}>
            Basierend auf tatsächlichen Weitervermittlungen aus der Ühub Lead-Datenbank
          </div>
        </div>
      </div>

      {/* Lead-Tabelle */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--effi-border)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--effi-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            🟢 Sanierungsleads ({loading ? '…' : fmt(data?.kpis.totalSanierung ?? 0)})
          </div>
          <div style={{ fontSize: 11, color: 'var(--effi-neutral)' }}>
            Neueste 50 Einträge
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--effi-surface)' }}>
                {['Name', 'PLZ', 'Produkte', 'Erstellt', 'Weitervermittelt'].map(h => (
                  <th key={h} style={{
                    padding: '8px 12px', textAlign: h === 'Weitervermittelt' ? 'center' : 'left',
                    fontWeight: 600, color: 'var(--effi-text-sec)',
                    fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em',
                    whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'var(--effi-neutral)' }}>
                    Leads werden geladen…
                  </td>
                </tr>
              ) : (data?.recentLeads ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'var(--effi-neutral)' }}>
                    Keine Leads im gewählten Zeitraum
                  </td>
                </tr>
              ) : (data?.recentLeads ?? []).map(lead => (
                <tr key={lead.id} style={{ borderTop: '1px solid var(--effi-border)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 500 }}>
                    {lead.firstName} {lead.lastName}
                    <div style={{ fontSize: 10, color: 'var(--effi-neutral)' }}>{lead.email}</div>
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--effi-text-sec)' }}>
                    {lead.postCode || '–'}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {lead.products.map(p => (
                        <span key={p} style={{
                          fontSize: 10, fontWeight: 600, padding: '1px 6px',
                          borderRadius: 20, background: 'var(--san-light)', color: GREEN,
                        }}>{p}</span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--effi-text-sec)', whiteSpace: 'nowrap' }}>
                    {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('de-DE') : '–'}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    {lead.forwarded ? (
                      <span style={{ fontSize: 16 }}>✅</span>
                    ) : (
                      <span style={{ fontSize: 16 }}>–</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
