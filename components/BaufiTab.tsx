'use client';
import { useState, useEffect } from 'react';
import { KpiCard } from '@/components/KpiCard';
import { Lang } from '@/lib/types';
import { fmtEur, fmt } from '@/lib/utils';

interface FunnelStage {
  stage: string;
  label: string;
  category: 'active' | 'won' | 'lost' | 'inactive';
  count: number;
}

interface LossReason {
  reason: string;
  count: number;
}

interface DailyLead {
  date: string;
  count: number;
}

interface Note {
  id: number;
  content: string;
  createdAt: string;
  author: string;
}

interface NotesEntry {
  purposeId: number;
  customerId: number;
  stageName: string;
  state: string;
  stateReason: string | null;
  notes: Note[];
}

interface BaufiData {
  kpis: {
    totalLeads: number;
    activePipeline: number;
    wonCount: number;
    lostCount: number;
    totalRevenue: number;
    revenuePerDeal: number;
    conversionRate: number;
  };
  funnel: FunnelStage[];
  lossReasons: LossReason[];
  notesList: NotesEntry[];
  daily: DailyLead[];
  meta: { totalPurposes: number; filtered: number };
}

interface BaufiTabProps {
  lang: Lang;
  from: string;
  to: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  active:   '#156949',
  won:      '#16a34a',
  lost:     '#dc2626',
  inactive: '#9ca3af',
};

const CATEGORY_BG: Record<string, string> = {
  active:   '#e8f5ee',
  won:      '#dcfce7',
  lost:     '#fee2e2',
  inactive: '#f3f4f6',
};

export default function BaufiTab({ lang, from, to }: BaufiTabProps) {
  const [data, setData]         = useState<BaufiData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [revenuePerDeal, setRevenuePerDeal] = useState(3000);

  useEffect(() => {
    if (!from || !to) return;
    setLoading(true);
    setError(null);
    fetch(`/api/fincrm?from=${from}&to=${to}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else { setData(d); setRevenuePerDeal(d.kpis.revenuePerDeal ?? 3000); }
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [from, to]);

  const card = (extra?: React.CSSProperties) => ({
    background: '#fff', borderRadius: 12, padding: '20px 24px',
    border: '1px solid var(--effi-border)', boxShadow: '0 1px 4px rgba(0,0,0,.06)',
    ...extra,
  });

  const effectiveRevenue = data ? data.kpis.wonCount * revenuePerDeal : 0;
  const maxFunnelCount   = Math.max(...(data?.funnel ?? []).map(s => s.count), 1);

  if (error) return (
    <div style={{ ...card(), background: '#fff5f5', borderColor: '#fca5a5' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#dc2626', marginBottom: 8 }}>
        ⚠️ Fehler beim Laden der finCRM Daten
      </div>
      <pre style={{ fontSize: 11, color: '#7f1d1d', whiteSpace: 'pre-wrap' }}>{error}</pre>
    </div>
  );

  return (
    <div>
      {/* Meta Info */}
      {data?.meta && (
        <div style={{ fontSize: 11, color: 'var(--effi-neutral)', marginBottom: 12 }}>
          {data.meta.filtered} von {data.meta.totalPurposes} Vorgängen im gewählten Zeitraum
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 20 }}>
        <KpiCard label="Leads gesamt"   value={loading ? '–' : fmt(data?.kpis.totalLeads ?? 0)}   loading={loading} />
        <KpiCard label="Aktive Pipeline" value={loading ? '–' : fmt(data?.kpis.activePipeline ?? 0)} loading={loading} variant="google" />
        <KpiCard label="Abgeschlossen ✅" value={loading ? '–' : fmt(data?.kpis.wonCount ?? 0)}   loading={loading} variant="san" />
        <KpiCard label="Abschlussquote"  value={loading ? '–' : `${data?.kpis.conversionRate ?? 0}%`} loading={loading} />
        <KpiCard
          label="Revenue (est.)"
          value={loading ? '–' : fmtEur(effectiveRevenue)}
          loading={loading}
          variant="budget"
          sub={`${fmt(data?.kpis.wonCount ?? 0)} × ${fmtEur(revenuePerDeal)}`}
        />
        {/* Revenue per Deal — editierbar */}
        <div style={{ ...card(), borderTop: '3px solid #f59e0b', background: '#fffbeb', padding: '16px 14px' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--effi-text-sec)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
            Provision / Deal (€)
          </div>
          <input
            type="number"
            value={revenuePerDeal}
            onChange={e => setRevenuePerDeal(Number(e.target.value))}
            style={{ width: '100%', fontSize: 20, fontWeight: 700, border: 'none', background: 'transparent', color: 'var(--effi-black)', outline: 'none' }}
            min={0} step={100}
          />
          <div style={{ fontSize: 11, color: 'var(--effi-neutral)', marginTop: 4 }}>editierbar</div>
        </div>
      </div>

      {/* Funnel + Loss Reasons */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Lead Funnel */}
        <div style={card()}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 20 }}>🏗️ Lead Funnel</div>
          {loading ? (
            <div style={{ color: 'var(--effi-neutral)', fontSize: 13 }}>Lade...</div>
          ) : (data?.funnel ?? []).map((stage, i) => {
            const pct = Math.round((stage.count / maxFunnelCount) * 100);
            const color = CATEGORY_COLORS[stage.category];
            const bg    = CATEGORY_BG[stage.category];
            return (
              <div key={stage.stage} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                {/* Stage-Label */}
                <div style={{ width: 160, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, color: 'var(--effi-neutral)', width: 14 }}>{i + 1}</span>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{stage.label}</span>
                </div>
                {/* Bar */}
                <div style={{ flex: 1, background: 'var(--effi-surface2)', borderRadius: 6, height: 14, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 6, background: color,
                    width: `${pct}%`, transition: 'width .5s',
                    minWidth: stage.count > 0 ? 4 : 0,
                  }} />
                </div>
                {/* Count badge */}
                <div style={{
                  minWidth: 36, textAlign: 'center', fontSize: 12, fontWeight: 700,
                  background: bg, color, borderRadius: 20, padding: '1px 8px',
                }}>
                  {stage.count}
                </div>
              </div>
            );
          })}
        </div>

        {/* Loss Reasons + Revenue */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Revenue Rechner */}
          <div style={card()}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>💰 Revenue-Prognose</div>
            {[
              ['Abschlüsse',     fmt(data?.kpis.wonCount ?? 0)],
              ['Provision / Deal', fmtEur(revenuePerDeal)],
              ['Revenue gesamt', fmtEur(effectiveRevenue), true],
              ['Abschlussquote', `${data?.kpis.conversionRate ?? 0}%`],
            ].map(([label, val, highlight]) => (
              <div key={String(label)} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '7px 0', borderBottom: '1px solid var(--effi-surface)',
              }}>
                <div style={{ fontSize: 12, color: 'var(--effi-text-sec)' }}>{label}</div>
                <div style={{ fontSize: highlight ? 16 : 13, fontWeight: 700, color: highlight ? '#16a34a' : 'var(--effi-black)' }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Loss Reasons */}
          <div style={card()}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>❌ Gründe Nicht-Abschluss</div>
            {loading ? (
              <div style={{ color: 'var(--effi-neutral)', fontSize: 13 }}>Lade...</div>
            ) : (data?.lossReasons ?? []).length === 0 ? (
              <div style={{ color: 'var(--effi-neutral)', fontSize: 12 }}>Keine Verlust-Gründe im Zeitraum</div>
            ) : (data?.lossReasons ?? []).map(lr => (
              <div key={lr.reason} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--effi-surface)' }}>
                <div style={{ fontSize: 12 }}>{lr.reason}</div>
                <span style={{
                  fontSize: 11, fontWeight: 700, background: '#fee2e2',
                  color: '#dc2626', borderRadius: 20, padding: '1px 7px',
                }}>{lr.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Kommentare der BaufiExpertin */}
      {(data?.notesList ?? []).length > 0 && (
        <div style={card({ marginBottom: 16 })}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
            💬 Kommentare BaufiExpertin — Nicht-Abschlüsse ({data?.notesList.length})
          </div>
          {(data?.notesList ?? []).map(entry => (
            <div key={entry.purposeId} style={{
              borderLeft: '3px solid #dc2626', paddingLeft: 12, marginBottom: 16,
              paddingBottom: 12, borderBottom: '1px solid var(--effi-surface)',
            }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                  background: '#fee2e2', color: '#dc2626',
                }}>{entry.stageName}</span>
                {entry.stateReason && (
                  <span style={{ fontSize: 11, color: 'var(--effi-neutral)' }}>
                    Grund: {entry.stateReason}
                  </span>
                )}
              </div>
              {entry.notes.map(note => (
                <div key={note.id} style={{
                  background: 'var(--effi-surface)', borderRadius: 8,
                  padding: '10px 12px', marginBottom: 6,
                }}>
                  <div style={{ fontSize: 11, color: 'var(--effi-neutral)', marginBottom: 4 }}>
                    👤 {note.author} · {note.createdAt ? new Date(note.createdAt).toLocaleDateString('de-DE') : '–'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--effi-black)', lineHeight: 1.5 }}>
                    {note.content}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Tägliche Leads Chart */}
      {(data?.daily ?? []).length > 0 && (
        <div style={card()}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>📅 Neue Leads pro Tag</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80, overflowX: 'auto' }}>
            {(data?.daily ?? []).map(d => {
              const maxCount = Math.max(...(data?.daily ?? []).map(x => x.count), 1);
              const h = Math.round((d.count / maxCount) * 72);
              return (
                <div key={d.date} title={`${d.date}: ${d.count} Leads`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                  <div style={{ fontSize: 9, color: 'var(--effi-neutral)' }}>{d.count}</div>
                  <div style={{ width: 18, height: h, background: '#2563eb', borderRadius: '3px 3px 0 0', minHeight: 2 }} />
                  <div style={{ fontSize: 8, color: 'var(--effi-neutral)', transform: 'rotate(-45deg)', marginTop: 4, whiteSpace: 'nowrap' }}>
                    {d.date.slice(5)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
