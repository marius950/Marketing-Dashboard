'use client';
import { useState, useEffect } from 'react';
import { Lang } from '@/lib/types';
import { fmtEur, fmt } from '@/lib/utils';

interface ZinsbidTabProps {
  lang: Lang;
  from: string;
  to:   string;
}

// KPI Card mini
function KCard({ label, value, sub, color = '#2563eb' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '16px 18px',
      border: '1px solid var(--effi-border)', borderTop: `3px solid ${color}`,
      boxShadow: '0 1px 4px rgba(0,0,0,.05)',
    }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--effi-text-sec)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--effi-neutral)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

const FUNNEL_STAGES = [
  { id: 1,  label: 'Neuer Lead',            color: '#2563eb' },
  { id: 9,  label: 'Kontaktversuch / Mail',  color: '#3b82f6' },
  { id: 10, label: 'Wiedervorlage',          color: '#6366f1' },
  { id: 16, label: 'Immobiliensuche',        color: '#8b5cf6' },
  { id: 2,  label: 'Beratung',               color: '#a855f7' },
  { id: 15, label: 'Beratung Phase 2',       color: '#d946ef' },
  { id: 22, label: 'Warten auf RM',          color: '#f59e0b' },
  { id: 24, label: 'Voranfrage',             color: '#f97316' },
  { id: 4,  label: 'Bank',                   color: '#ef4444' },
  { id: 5,  label: 'Vertrag ✅',             color: '#16a34a' },
];

const CARD = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: '#fff', borderRadius: 12, padding: '18px 20px',
  border: '1px solid var(--effi-border)', boxShadow: '0 1px 4px rgba(0,0,0,.05)', ...extra,
});

const TABS = ['Übersicht', 'Funnel', 'Quellen', 'Revenue'] as const;
type SubTab = typeof TABS[number];

export default function ZinsbidTab({ lang, from, to }: ZinsbidTabProps) {
  const [subTab, setSubTab] = useState<SubTab>('Übersicht');
  const [data, setData]     = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const CACHE = 'zinsbid_fincrm_cache';
    try {
      const cached = sessionStorage.getItem(CACHE);
      if (cached) { setData(JSON.parse(cached)); setLoading(false); return; }
    } catch {}

    setLoading(true);
    fetch(`/api/fincrm?from=2025-01-01&to=${new Date().toISOString().slice(0,10)}`)
      .then(r => r.json())
      .then(d => {
        if (!d.error) {
          setData(d);
          try { sessionStorage.setItem(CACHE, JSON.stringify(d)); } catch {}
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const kpi = data?.kpis;
  const funnel: any[] = data?.funnelStages ?? [];
  const monthly: any[] = data?.monthly ?? [];
  const maxMonth = Math.max(...monthly.map((m: any) => m.count), 1);

  return (
    <div>
      {/* Zinsbid Logo + Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ background: '#000010', borderRadius: 10, padding: '8px 16px' }}>
          <img src="/zinsbid-logo.png" alt="Zinsbid" style={{ height: 28 }} />
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#00008B' }}>Zinsbid Dashboard</div>
          <div style={{ fontSize: 12, color: 'var(--effi-neutral)' }}>Baufinanzierungs-Leads aus finCRM · {loading ? '…' : `${data?.meta?.filtered ?? 0} Vorgänge`}</div>
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => {
            try { sessionStorage.removeItem('zinsbid_fincrm_cache'); } catch {}
            setData(null); setLoading(true);
            fetch(`/api/fincrm?from=2025-01-01&to=${new Date().toISOString().slice(0,10)}`)
              .then(r => r.json()).then(d => { if (!d.error) setData(d); setLoading(false); })
              .catch(() => setLoading(false));
          }}
          style={{ fontSize: 11, padding: '5px 12px', borderRadius: 8, cursor: 'pointer', border: '1px solid var(--effi-border)', background: 'var(--effi-surface)', color: 'var(--effi-text-sec)' }}
        >
          🔄 Neu laden
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 16 }}>
        <KCard label="Leads gesamt"    value={loading ? '–' : fmt(kpi?.totalLeads ?? 0)}        color="#00008B" />
        <KCard label="Aktive Pipeline" value={loading ? '–' : fmt(kpi?.activePipeline ?? 0)}    color="#3b82f6" />
        <KCard label="Abschlüsse ✅"   value={loading ? '–' : fmt(kpi?.wonCount ?? 0)}          color="#16a34a" />
        <KCard label="Abschlussquote"  value={loading ? '–' : `${kpi?.conversionRate ?? 0}%`}   color="#f59e0b" />
        <KCard label="Ø Finanzierung"  value={loading ? '–' : fmtEur(kpi?.avgVolume ?? 0)}      color="#7c3aed"
               sub={`Gesamt: ${fmtEur(kpi?.totalVolume ?? 0)}`} />
      </div>

      {/* Sub-Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setSubTab(t)} style={{
            padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            border: 'none',
            background: subTab === t ? '#00008B' : 'var(--effi-surface)',
            color: subTab === t ? '#fff' : 'var(--effi-text-sec)',
          }}>{t}</button>
        ))}
      </div>

      {/* ÜBERSICHT */}
      {subTab === 'Übersicht' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Monats-Chart */}
          <div style={CARD()}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>📅 Leads pro Monat</div>
            {loading ? <div style={{ color: 'var(--effi-neutral)', fontSize: 13 }}>Lade…</div> : (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 120, overflowX: 'auto' }}>
                {monthly.map((m: any) => {
                  const h = Math.round((m.count / maxMonth) * 100);
                  const recent = m.month >= new Date(Date.now() - 90*86400000).toISOString().slice(0,7);
                  return (
                    <div key={m.month} title={`${m.month}: ${m.count}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flexShrink: 0, minWidth: 30 }}>
                      <span style={{ fontSize: 9, color: 'var(--effi-neutral)' }}>{m.count}</span>
                      <div style={{ width: 22, height: h, background: recent ? '#00008B' : '#93c5fd', borderRadius: '3px 3px 0 0', minHeight: 2 }} />
                      <span style={{ fontSize: 8, color: 'var(--effi-neutral)', transform: 'rotate(-45deg)', marginTop: 4, whiteSpace: 'nowrap' }}>{m.month.slice(5)}/{m.month.slice(2,4)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pipeline-Wert */}
          <div style={CARD()}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>💰 Pipeline-Wert</div>
            {[
              ['Gesamtvolumen',    fmtEur(kpi?.totalVolume ?? 0),    '#00008B'],
              ['Pipeline-Wert',   fmtEur(kpi?.pipelineValue ?? 0),  '#7c3aed'],
              ['Ø Volumen / Lead', fmtEur(kpi?.avgVolume ?? 0),     '#2563eb'],
              ['Abschlüsse',      fmt(kpi?.wonCount ?? 0),           '#16a34a'],
              ['Reaktionszeit',   kpi?.avgResponseHours != null ? `${kpi.avgResponseHours}h` : 'k.A.', '#f59e0b'],
            ].map(([label, val, color]) => (
              <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--effi-surface)' }}>
                <span style={{ fontSize: 12, color: 'var(--effi-text-sec)' }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: String(color) }}>{loading ? '–' : val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FUNNEL */}
      {subTab === 'Funnel' && (
        <div style={CARD()}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 20 }}>🏗️ Lead Funnel — Conversion zwischen Stages</div>
          {loading ? <div style={{ color: 'var(--effi-neutral)', fontSize: 13 }}>Lade…</div> :
            funnel.map((stage: any, i: number) => {
              const maxC = Math.max(...funnel.map((s: any) => s.count), 1);
              const pct  = Math.round((stage.count / maxC) * 100);
              const stageColor = FUNNEL_STAGES[i]?.color ?? '#2563eb';
              return (
                <div key={stage.stageId} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
                    <span style={{ width: 18, fontSize: 10, color: 'var(--effi-neutral)', flexShrink: 0 }}>{i + 1}</span>
                    <span style={{ width: 180, fontSize: 12, fontWeight: 500, flexShrink: 0 }}>{stage.label}</span>
                    <div style={{ flex: 1, background: 'var(--effi-surface2)', borderRadius: 6, height: 16, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 6, background: stageColor, width: `${pct}%`, transition: 'width .5s', minWidth: stage.count > 0 ? 4 : 0 }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, minWidth: 36, textAlign: 'center', background: '#f0f4ff', color: stageColor, borderRadius: 20, padding: '1px 8px' }}>{stage.count}</span>
                    {stage.conversionToNext > 0 && i < funnel.length - 1 && (
                      <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600, minWidth: 60 }}>→ {stage.conversionToNext}%</span>
                    )}
                  </div>
                  {stage.avgVolume > 0 && (
                    <div style={{ paddingLeft: 28, fontSize: 10, color: 'var(--effi-neutral)' }}>
                      Ø {fmtEur(stage.avgVolume)} · Ø {stage.avgDays} Tage
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* QUELLEN */}
      {subTab === 'Quellen' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={CARD()}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>📡 Lead-Quellen</div>
            <div style={{ fontSize: 12, color: 'var(--effi-neutral)', marginBottom: 12 }}>
              Quellen werden aus den Tags der neuesten Leads erkannt.
            </div>
            {(data?.sources ?? []).map((s: any) => (
              <div key={s.source} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--effi-surface)' }}>
                <span style={{ fontSize: 12 }}>{s.source}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#00008B' }}>{s.count}</span>
              </div>
            ))}
            {/* Tag Cloud */}
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Alle Tags:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {([...new Set((data?.notesList ?? []).flatMap((e: any) => e.tags ?? []))] as string[]).map((tag: string) => (
                  <span key={tag} style={{ fontSize: 10, background: '#eff6ff', color: '#00008B', borderRadius: 12, padding: '2px 8px' }}>{tag}</span>
                ))}
              </div>
            </div>
          </div>
          <div style={CARD()}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>⭐ Lead-Qualität</div>
            {(data?.qualities ?? []).length === 0
              ? <div style={{ fontSize: 12, color: 'var(--effi-neutral)' }}>Keine Qualitäts-Tags gefunden</div>
              : (data?.qualities ?? []).map((q: any) => {
                const max = Math.max(...(data?.qualities ?? []).map((x: any) => x.count), 1);
                const pct = Math.round((q.count / max) * 100);
                return (
                  <div key={q.quality} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{q.quality}</span>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{q.count}</span>
                    </div>
                    <div style={{ background: 'var(--effi-surface2)', borderRadius: 4, height: 8 }}>
                      <div style={{ height: '100%', background: '#00008B', borderRadius: 4, width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* REVENUE */}
      {subTab === 'Revenue' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={CARD({ borderTop: '3px solid #16a34a' })}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>💰 Revenue-Analyse</div>
            <div style={{ fontSize: 11, color: 'var(--effi-neutral)', marginBottom: 16 }}>
              Zinsbid-Provision basiert auf Finanzierungsvolumen
            </div>
            {[
              ['Abschlüsse',         fmt(kpi?.wonCount ?? 0)],
              ['Ø Finanzierungsvolumen', fmtEur(kpi?.avgVolume ?? 0)],
              ['Gesamt-Pipeline-Volumen', fmtEur(kpi?.totalVolume ?? 0)],
              ['Pipeline-Wert (est.)', fmtEur(kpi?.pipelineValue ?? 0)],
            ].map(([label, val]) => (
              <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--effi-surface)' }}>
                <span style={{ fontSize: 12, color: 'var(--effi-text-sec)' }}>{label}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#16a34a' }}>{loading ? '–' : val}</span>
              </div>
            ))}
          </div>
          <div style={CARD()}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>📊 Nicht-Abschluss Gründe</div>
            {(data?.lossReasons ?? []).length === 0
              ? <div style={{ fontSize: 12, color: 'var(--effi-neutral)' }}>Keine Verlust-Gründe erfasst</div>
              : (data?.lossReasons ?? []).map((lr: any) => (
                <div key={lr.reason} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--effi-surface)' }}>
                  <span style={{ fontSize: 12 }}>{lr.reason}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, background: '#fee2e2', color: '#dc2626', borderRadius: 20, padding: '1px 7px' }}>{lr.count}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
