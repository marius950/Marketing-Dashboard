'use client';
import { useState, useEffect } from 'react';
import { KpiCard } from '@/components/KpiCard';
import { Lang } from '@/lib/types';
import { fmtEur, fmt } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────
interface FunnelStage {
  stageId: number; label: string; category: string;
  count: number; avgVolume: number; avgDays: number; conversionToNext: number;
}
interface OverviewStage { stage: string; label: string; category: string; count: number; avgVolume: number; avgDays: number; }
interface Note { id: number; content: string; createdAt: string; author: string; }
interface NotesEntry { purposeId: number; customerId: number; stageId: number; stageName: string; state: string; stateReason: string | null; createdAt: string; financialDemand: number | null; source: string; quality: string | null; tags: string[]; notes: Note[]; }
interface NeedsAttention { purposeId: number; stageName: string; daysSince: number; lastNote: string; lastNoteDate: string; }
interface Source { source: string; count: number; wonCount: number; rate: number; }
interface MonthData { month: string; count: number; }
interface WeekData { week: string; count: number; }

interface BaufiData {
  kpis: {
    totalLeads: number; activePipeline: number; wonCount: number; lostCount: number;
    conversionRate: number; revenuePerDeal: number; totalVolume: number; avgVolume: number;
    pipelineValue: number; avgResponseHours: number | null; needsAttentionCount: number;
  };
  funnelStages: FunnelStage[];
  funnel: OverviewStage[];
  lossReasons: { reason: string; count: number }[];
  notesList: NotesEntry[];
  needsAttention: NeedsAttention[];
  sources: Source[];
  allNotesList?: NotesEntry[];  // alle Pipeline-Leads für Analyse
  qualities: { quality: string; count: number }[];
  monthly: MonthData[];
  weeklyLeads: WeekData[];
  meta: { totalPurposes: number; filtered: number };
}

// ── Helpers ───────────────────────────────────────────────────
const CAT_COLOR: Record<string, string> = {
  active: '#2563eb', won: '#16a34a', lost: '#dc2626', inactive: '#9ca3af',
};
const CAT_BG: Record<string, string> = {
  active: '#eff6ff', won: '#dcfce7', lost: '#fee2e2', inactive: '#f3f4f6',
};
function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
function fmtDate(iso: string) {
  if (!iso) return '–';
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
}
function fmtMio(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} Mio.`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

const TABS = ['Funnel', 'Pipeline', 'Quellen', 'Provision', 'Beratungsqualität', 'Aktivitäten'] as const;
type SubTab = typeof TABS[number];

// Provision-Daten aus Google Sheet
const PROVISION_DATA = [
  { datum: '12.06.2025', quelle: 'effi',          volumen: 360000, provision: 4140.00,  natascha: 331.20,  zahlungseingang: '01.08.2025', ausgezahlt: '15.09.2025' },
  { datum: '19.06.2025', quelle: 'effi',          volumen: 131200, provision: 2099.20,  natascha: 167.94,  zahlungseingang: '17.07.2025', ausgezahlt: '15.09.2025' },
  { datum: '14.07.2025', quelle: 'ImmoScout',     volumen: 170000, provision: 1717.00,  natascha: 137.36,  zahlungseingang: '02.09.2025', ausgezahlt: '15.09.2025' },
  { datum: '18.07.2025', quelle: 'effi',          volumen: 338200, provision: 3382.00,  natascha: 270.56,  zahlungseingang: '08.09.2025', ausgezahlt: '15.10.2025' },
  { datum: '24.10.2025', quelle: 'ImmoScout',     volumen: 105000, provision: 1155.00,  natascha: 92.40,   zahlungseingang: '14.11.2025', ausgezahlt: '15.12.2025' },
  { datum: '28.10.2025', quelle: 'effi',          volumen: 218000, provision: 2333.40,  natascha: 186.67,  zahlungseingang: '09.12.2025', ausgezahlt: '15.01.2026' },
  { datum: '24.11.2025', quelle: 'ImmoScout/Jona', volumen: 366870, provision: 5503.05, natascha: 440.24,  zahlungseingang: '08.01.2026', ausgezahlt: '15.02.2026' },
];

// Abbruchgründe-Kategorien
const ABBRUCH_KATEGORIEN: { label: string; color: string; keywords: string[] }[] = [
  { label: 'Nicht erreicht', color: '#ef4444',
    keywords: ['nicht erreicht','kein kontakt','mailbox','geht nicht ran','antwortet nicht',
               'meldet sich nicht','keine antwort','nicht erreichbar','falsche telefonnummer',
               'falsche nr','nummer falsch','nicht zurückgerufen','kein rückruf'] },
  { label: 'Versetzt / Kein Erscheinen', color: '#f97316',
    keywords: ['versetzt','nicht erschienen','termin abgesagt','abgesagt',
               'nicht zum termin','no show','termin vergessen'] },
  { label: 'Hat schon Finanzierung', color: '#8b5cf6',
    keywords: ['hat schon','bereits finanzierung','finanzierung gefunden','andere bank',
               'woanders','andere finanzierung','schon bank','hat bereits','anderweitig',
               'hat angebot'] },
  { label: 'Sucht noch / Erst Besichtigung', color: '#3b82f6',
    keywords: ['besichtigung','makler','erst besichtigung','sucht noch','noch kein objekt',
               'kein objekt','noch am suchen','möchte erst','zuerst besichtigen'] },
  { label: 'Nicht finanzierbar', color: '#dc2626',
    keywords: ['nicht finanzierbar','schufa','bonitätsprüfung','kein eigenkapital',
               'eigenkapital fehlt','zu wenig einkommen','ablehnung','nicht qualifiziert'] },
  { label: 'Kein Interesse mehr', color: '#6b7280',
    keywords: ['kein interesse','möchte nicht mehr','hat sich entschieden',
               'will nicht mehr','projekt gestoppt','pausiert','kauf abgebrochen'] },
  { label: 'Reaktionszeit / Anderer schneller', color: '#f59e0b',
    keywords: ['zu spät','zu lange gewartet','war zu langsam','schneller','anderer berater'] },
];

function analyzeNotes(notesList: any[]): { label: string; color: string; count: number; examples: string[] }[] {
  const counts: Record<string, { count: number; examples: string[] }> = {};
  ABBRUCH_KATEGORIEN.forEach(k => { counts[k.label] = { count: 0, examples: [] }; });
  notesList.forEach((entry: any) => {
    (entry.notes ?? []).forEach((note: any) => {
      const text = (note.content ?? '').toLowerCase();
      if (!text.trim()) return;
      ABBRUCH_KATEGORIEN.forEach(cat => {
        if (cat.keywords.some((kw: string) => text.includes(kw))) {
          counts[cat.label].count++;
          if (counts[cat.label].examples.length < 3) {
            const snippet = (note.content ?? '').replace(/<[^>]+>/g, '').trim().slice(0, 80);
            if (snippet && !counts[cat.label].examples.includes(snippet)) {
              counts[cat.label].examples.push(snippet);
            }
          }
        }
      });
    });
  });
  return ABBRUCH_KATEGORIEN.map(k => ({
    label: k.label, color: k.color,
    count: counts[k.label].count, examples: counts[k.label].examples,
  })).sort((a, b) => b.count - a.count);
}

// ── Component ─────────────────────────────────────────────────
export default function BaufiTab({ lang, from, to }: { lang: Lang; from: string; to: string }) {
  const [data, setData]       = useState<BaufiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [subTab, setSubTab]   = useState<SubTab>('Funnel');
  const [sourceFilter, setSourceFilter] = useState<string>('Alle');
  const [revenuePerDeal, setRevenuePerDeal] = useState(3000);

  useEffect(() => {
    const CACHE_KEY = 'baufi_data_cache';
    // Session-Cache prüfen
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        setData(parsed);
        setLoading(false);
        return;
      }
    } catch { /* sessionStorage nicht verfügbar */ }

    setLoading(true); setError(null);
    const effectiveFrom = '2025-01-01';
    const effectiveTo   = to && to > '2025-01-01' ? to : new Date().toISOString().slice(0, 10);
    fetch(`/api/fincrm?from=${effectiveFrom}&to=${effectiveTo}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) {
          setError(d.error);
        } else {
          setData(d);
          try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(d)); } catch { /* ignore */ }
        }
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []); // leeres Array = nur einmal laden, unabhängig von from/to

  const card = (extra?: React.CSSProperties): React.CSSProperties => ({
    background: '#fff', borderRadius: 12, padding: '18px 20px',
    border: '1px solid var(--effi-border)', boxShadow: '0 1px 4px rgba(0,0,0,.05)', ...extra,
  });

  if (error) return (
    <div style={{ ...card(), background: '#fff5f5', borderColor: '#fca5a5' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#dc2626', marginBottom: 8 }}>⚠️ Fehler beim Laden der finCRM Daten</div>
      <pre style={{ fontSize: 11, color: '#7f1d1d', whiteSpace: 'pre-wrap' }}>{error}</pre>
    </div>
  );

  const kpi = data?.kpis;
  const effectiveRevenue = (kpi?.wonCount ?? 0) * revenuePerDeal;

  return (
    <div>
      {/* Meta */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        {data?.meta && (
          <div style={{ fontSize: 11, color: 'var(--effi-neutral)' }}>
            {data.meta.filtered} Vorgänge · {data.meta.totalPurposes} gesamt
            {!loading && <span style={{ marginLeft: 8, color: '#16a34a' }}>✓ aus Session-Cache</span>}
          </div>
        )}
        {loading && <div style={{ fontSize: 11, color: 'var(--effi-neutral)' }}>⏳ Lade Daten (einmalig)…</div>}
        <button
          onClick={() => {
            try { sessionStorage.removeItem('baufi_data_cache'); } catch { /* ignore */ }
            setData(null); setLoading(true); setError(null);
            const effectiveFrom = '2025-01-01';
            const effectiveTo = new Date().toISOString().slice(0, 10);
            fetch(`/api/fincrm?from=${effectiveFrom}&to=${effectiveTo}`)
              .then(r => r.json())
              .then(d => {
                if (d.error) setError(d.error);
                else {
                  setData(d);
                  try { sessionStorage.setItem('baufi_data_cache', JSON.stringify(d)); } catch { /* ignore */ }
                }
                setLoading(false);
              })
              .catch(e => { setError(e.message); setLoading(false); });
          }}
          style={{
            fontSize: 11, padding: '4px 10px', borderRadius: 8, cursor: 'pointer',
            border: '1px solid var(--effi-border)', background: 'var(--effi-surface)',
            color: 'var(--effi-text-sec)', display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          🔄 Neu laden
        </button>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 16 }}>
        <KpiCard label="Leads gesamt"     value={loading ? '–' : fmt(kpi?.totalLeads ?? 0)}    loading={loading} />
        <KpiCard label="Aktive Pipeline"  value={loading ? '–' : fmt(kpi?.activePipeline ?? 0)} loading={loading} variant="google" />
        <KpiCard label="Abschlüsse ✅"    value={loading ? '–' : fmt(kpi?.wonCount ?? 0)}       loading={loading} variant="san" />
        <KpiCard label="Abschlussquote"   value={loading ? '–' : `${kpi?.conversionRate ?? 0}%`} loading={loading} />
        <KpiCard label="Ø Finanzierung"   value={loading ? '–' : fmtEur(kpi?.avgVolume ?? 0)}  loading={loading} variant="budget" />
        <KpiCard label="Pipeline-Volumen"  value={loading ? '–' : fmtMio((kpi as any)?.activePipelineVolume ?? 0)} loading={loading} variant="budget" />
      </div>

      {/* Second KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
        {/* Pipeline-Wert */}
        <div style={{ ...card(), borderTop: '3px solid #2563eb' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--effi-text-sec)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Pipeline-Wert (est.)</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#2563eb' }}>{loading ? '–' : fmtEur(kpi?.pipelineValue ?? 0)}</div>
          <div style={{ fontSize: 10, color: 'var(--effi-neutral)', marginTop: 2 }}>Gewichtetes Volumen nach Abschlusswahrsch.</div>
        </div>
        {/* Gesamtvolumen */}
        <div style={{ ...card(), borderTop: '3px solid #7c3aed' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--effi-text-sec)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Aktive Pipeline-Volumen</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#7c3aed' }}>{loading ? '–' : fmtMio((kpi as any)?.activePipelineVolume ?? 0)}</div>
          <div style={{ fontSize: 10, color: 'var(--effi-neutral)', marginTop: 2 }}>Stages: Wiedervorlage bis Bank</div>
        </div>
        {/* Revenue */}
        <div style={{ ...card(), borderTop: '3px solid #16a34a' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--effi-text-sec)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Provision Gesamt (Sheet)</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#16a34a' }}>{fmtEur(PROVISION_DATA.reduce((s, p) => s + p.provision, 0))}</div>
          <div style={{ fontSize: 10, color: 'var(--effi-neutral)', marginTop: 2 }}>{fmt(PROVISION_DATA.length)} Abschlüsse · Natascha: {fmtEur(PROVISION_DATA.reduce((s, p) => s + p.natascha, 0))}</div>
        </div>
        {/* Reaktionszeit */}
        <div style={{ ...card(), borderTop: '3px solid #f59e0b' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--effi-text-sec)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Ø Reaktionszeit</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#f59e0b' }}>
            {loading ? '–' : kpi?.avgResponseHours != null ? `${kpi.avgResponseHours}h` : 'k.A.'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--effi-neutral)', marginTop: 2 }}>Lead-Eingang bis erste Antwort</div>
        </div>
      </div>

      {/* Sub-Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setSubTab(t)} style={{
            padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            border: 'none',
            background: subTab === t ? '#2563eb' : 'var(--effi-surface)',
            color: subTab === t ? '#fff' : 'var(--effi-text-sec)',
          }}>{t}</button>
        ))}
      </div>

      {/* ── FUNNEL TAB ── */}
      {subTab === 'Funnel' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
          {/* Conversion Funnel */}
          <div style={card()}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 18 }}>Conversion Funnel</div>
            {loading ? <div style={{ color: 'var(--effi-neutral)', fontSize: 13 }}>Lade...</div> : (
              (data?.funnelStages ?? []).map((stage, i) => {
                const maxCount = Math.max(...(data?.funnelStages ?? []).map(s => s.count), 1);
                const pct = Math.round((stage.count / maxCount) * 100);
                const color = CAT_COLOR[stage.category] ?? '#2563eb';
                const bg    = CAT_BG[stage.category]    ?? '#eff6ff';
                return (
                  <div key={stage.stageId} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ width: 18, fontSize: 10, color: 'var(--effi-neutral)', flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ width: 170, fontSize: 12, fontWeight: 500, flexShrink: 0 }}>{stage.label}</span>
                      <div style={{ flex: 1, background: 'var(--effi-surface2)', borderRadius: 6, height: 16, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 6, background: color, width: `${pct}%`, transition: 'width .5s', minWidth: stage.count > 0 ? 4 : 0 }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, background: bg, color, borderRadius: 20, padding: '1px 8px', minWidth: 32, textAlign: 'center' }}>{stage.count}</span>
                    </div>
                    {/* Details */}
                    <div style={{ display: 'flex', gap: 16, paddingLeft: 28, marginBottom: 2 }}>
                      {stage.avgVolume > 0 && <span style={{ fontSize: 10, color: 'var(--effi-neutral)' }}>Ø {fmtEur(stage.avgVolume)}</span>}
                      {stage.avgDays > 0 && <span style={{ fontSize: 10, color: 'var(--effi-neutral)' }}>Ø {stage.avgDays} Tage</span>}
                      {i < (data?.funnelStages ?? []).length - 1 && stage.conversionToNext > 0 && (
                        <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600 }}>→ {stage.conversionToNext}% weiter</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Alle Stages + Loss Reasons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={card()}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Alle Stages</div>
              {loading ? <div style={{ fontSize: 13, color: 'var(--effi-neutral)' }}>Lade...</div> : (
                (data?.funnel ?? []).map(s => (
                  <div key={s.stage} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--effi-surface)' }}>
                    <span style={{ fontSize: 12 }}>{s.label}</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {s.avgVolume > 0 && <span style={{ fontSize: 10, color: 'var(--effi-neutral)' }}>{fmtEur(s.avgVolume)}</span>}
                      <span style={{ fontSize: 12, fontWeight: 700, background: CAT_BG[s.category] ?? '#f3f4f6', color: CAT_COLOR[s.category] ?? '#374151', borderRadius: 20, padding: '1px 8px' }}>{s.count}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div style={card()}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Nicht-Abschluss Gründe</div>
              {(data?.lossReasons ?? []).length === 0
                ? <div style={{ fontSize: 12, color: 'var(--effi-neutral)' }}>Keine Verlust-Gründe erfasst</div>
                : (data?.lossReasons ?? []).map(lr => (
                  <div key={lr.reason} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--effi-surface)' }}>
                    <span style={{ fontSize: 12 }}>{lr.reason}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, background: '#fee2e2', color: '#dc2626', borderRadius: 20, padding: '1px 7px' }}>{lr.count}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ── PIPELINE TAB ── */}
      {subTab === 'Pipeline' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Monats-Chart */}
          <div style={card()}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Leads pro Monat</div>
            {loading ? <div style={{ fontSize: 13, color: 'var(--effi-neutral)' }}>Lade...</div> : (() => {
              const monthly = data?.monthly ?? [];
              const maxC = Math.max(...monthly.map(m => m.count), 1);
              return (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120, overflowX: 'auto' }}>
                  {monthly.map(m => {
                    const h = Math.round((m.count / maxC) * 100);
                    const isRecent = m.month >= new Date(Date.now() - 90*86400000).toISOString().slice(0,7);
                    return (
                      <div key={m.month} title={`${m.month}: ${m.count} Leads`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flexShrink: 0, minWidth: 28 }}>
                        <span style={{ fontSize: 9, color: 'var(--effi-neutral)' }}>{m.count}</span>
                        <div style={{ width: 22, height: h, background: isRecent ? '#2563eb' : '#93c5fd', borderRadius: '3px 3px 0 0', minHeight: 2 }} />
                        <span style={{ fontSize: 8, color: 'var(--effi-neutral)', transform: 'rotate(-45deg)', marginTop: 4, whiteSpace: 'nowrap' }}>{m.month.slice(5)}/{m.month.slice(2,4)}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Pipeline-Wert nach Stage */}
          <div style={card()}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Pipeline-Wert nach Stage</div>
            {loading ? <div style={{ fontSize: 13, color: 'var(--effi-neutral)' }}>Lade...</div> : (
              (data?.funnelStages ?? []).filter(s => s.avgVolume > 0).map(s => {
                const prob: Record<number, number> = { 1: 0.05, 9: 0.08, 10: 0.10, 16: 0.15, 2: 0.25, 15: 0.35, 22: 0.45, 24: 0.60, 4: 0.75, 5: 1.0 };
                const val = Math.round(s.count * s.avgVolume * (prob[s.stageId] ?? 0) * 0.01);
                return (
                  <div key={s.stageId} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--effi-surface)' }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{s.label}</div>
                      <div style={{ fontSize: 10, color: 'var(--effi-neutral)' }}>{s.count} Leads · Ø {fmtEur(s.avgVolume)} · {Math.round((prob[s.stageId] ?? 0) * 100)}% Wahrsch.</div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed' }}>{fmtEur(val)}</span>
                  </div>
                );
              })
            )}
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '2px solid var(--effi-border)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Gesamt Pipeline-Wert</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#7c3aed' }}>{loading ? '–' : fmtEur(kpi?.pipelineValue ?? 0)}</span>
            </div>
          </div>

          {/* Provision Rechner */}
          <div style={{ ...card(), borderTop: '3px solid #16a34a', gridColumn: 'span 2' }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Revenue-Rechner</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto 1fr auto', gap: 16, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--effi-text-sec)' }}>Abschlüsse</span>
              <span style={{ fontSize: 20, fontWeight: 800 }}>{fmt(kpi?.wonCount ?? 0)}</span>
              <span style={{ fontSize: 12, color: 'var(--effi-text-sec)' }}>× Provision / Deal</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontWeight: 600 }}>€</span>
                <input type="number" value={revenuePerDeal} onChange={e => setRevenuePerDeal(Number(e.target.value))}
                  style={{ width: 80, fontSize: 18, fontWeight: 700, border: '1px solid var(--effi-border)', borderRadius: 6, padding: '2px 6px', outline: 'none' }}
                  min={0} step={100} />
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: 'var(--effi-neutral)' }}>= Revenue</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#16a34a' }}>{fmtEur(effectiveRevenue)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── QUELLEN TAB ── */}
      {subTab === 'Quellen' && (
        <div>
          {/* Quellen Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
            {(data?.sources ?? []).slice(0, 4).map(s => (
              <div key={s.source}
                onClick={() => setSourceFilter(sourceFilter === s.source ? 'Alle' : s.source)}
                style={{ ...card({ borderTop: `3px solid ${s.source === 'ImmoScout' ? '#2563eb' : s.source === 'effi' ? '#156949' : s.source === 'Abakus' ? '#7c3aed' : '#9ca3af'}` }), cursor: 'pointer', outline: sourceFilter === s.source ? '2px solid #2563eb' : 'none' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--effi-text-sec)', textTransform: 'uppercase', marginBottom: 4 }}>{s.source}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#374151' }}>{fmt(s.count)}</div>
                <div style={{ fontSize: 10, color: 'var(--effi-neutral)' }}>Leads · {s.wonCount} Abschlüsse</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Quellen Balken */}
            <div style={card()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Lead-Quellen (Gesamtzahl)</div>
                <div style={{ fontSize: 11, color: 'var(--effi-neutral)' }}>Alle {loading ? '...' : (data?.meta as any)?.filtered ?? 0} Leads</div>
              </div>
              {loading ? <div style={{ color: 'var(--effi-neutral)', fontSize: 13 }}>Lade...</div> :
                (data?.sources ?? []).map(s => {
                  const maxC = Math.max(...(data?.sources ?? []).map((x: any) => x.count), 1);
                  const pct  = Math.round((s.count / maxC) * 100);
                  const isSelected = sourceFilter === s.source;
                  return (
                    <div key={s.source} style={{ marginBottom: 12, cursor: 'pointer', opacity: sourceFilter !== 'Alle' && !isSelected ? 0.4 : 1 }}
                      onClick={() => setSourceFilter(isSelected ? 'Alle' : s.source)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: isSelected ? 700 : 400 }}>{s.source}</span>
                        <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
                          <span style={{ color: 'var(--effi-neutral)' }}>{s.count} Leads</span>
                          {s.wonCount > 0 && <span style={{ color: '#16a34a', fontWeight: 600 }}>{s.wonCount} ✅</span>}
                          {s.rate > 0 && <span style={{ color: '#f59e0b', fontWeight: 600 }}>{s.rate}%</span>}
                        </div>
                      </div>
                      <div style={{ background: 'var(--effi-surface2)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: isSelected ? '#2563eb' : '#93c5fd', borderRadius: 4, width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Pipeline nach Quelle */}
            <div style={card()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Pipeline nach Quelle</div>
                {sourceFilter !== 'Alle' && (
                  <button onClick={() => setSourceFilter('Alle')} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 12, border: '1px solid #2563eb', background: '#eff6ff', color: '#2563eb', cursor: 'pointer' }}>
                    ✕ {sourceFilter}
                  </button>
                )}
              </div>
              {(() => {
                const filtered = (data?.allNotesList ?? data?.notesList ?? []).filter((e: any) =>
                  sourceFilter === 'Alle' || e.source === sourceFilter
                );
                const stageCount: Record<string, number> = {};
                filtered.forEach((e: any) => {
                  const name = e.stageName;
                  stageCount[name] = (stageCount[name] ?? 0) + 1;
                });
                const entries = Object.entries(stageCount).sort((a, b) => b[1] - a[1]);
                if (!entries.length) return <div style={{ fontSize: 12, color: 'var(--effi-neutral)' }}>Keine Leads für diese Quelle</div>;
                return entries.map(([stage, count]) => {
                  const maxC = Math.max(...entries.map(e => e[1]), 1);
                  return (
                    <div key={stage} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 12 }}>{stage}</span>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>{count}</span>
                      </div>
                      <div style={{ background: 'var(--effi-surface2)', borderRadius: 4, height: 6 }}>
                        <div style={{ height: '100%', background: '#2563eb', borderRadius: 4, width: `${Math.round((count / maxC) * 100)}%` }} />
                      </div>
                    </div>
                  );
                });
              })()}
              <div style={{ marginTop: 14, fontSize: 10, color: 'var(--effi-neutral)', fontStyle: 'italic' }}>
                Basiert auf allen Pipeline-Leads. Klicke eine Quelle an um zu filtern.
              </div>
            </div>
          </div>

          {/* Tag Cloud */}
          <div style={{ ...card({ marginTop: 16 }) }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Alle Tags — alle Pipeline-Leads</div>
            {loading ? null : (() => {
              const allTags = (data?.allNotesList ?? data?.notesList ?? []).flatMap((e: any) => e.tags ?? []);
              const tagCounts: Record<string, number> = {};
              allTags.forEach((t: string) => { tagCounts[t] = (tagCounts[t] ?? 0) + 1; });
              const sorted = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
              return (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {sorted.length === 0
                    ? <span style={{ fontSize: 12, color: 'var(--effi-neutral)' }}>Keine Tags vorhanden</span>
                    : sorted.map(([tag, count]) => (
                      <span key={tag} style={{
                        fontSize: 11, padding: '3px 10px', borderRadius: 20,
                        background: count >= 5 ? '#2563eb' : count >= 2 ? '#eff6ff' : '#f3f4f6',
                        color: count >= 5 ? '#fff' : count >= 2 ? '#2563eb' : '#374151',
                        fontWeight: count >= 5 ? 700 : 400,
                      }}>
                        {tag} {count > 1 ? `(${count})` : ''}
                      </span>
                    ))
                  }
                </div>
              );
            })()}
          </div>
        </div>
      )}

            {subTab === 'Provision' && (
        <div>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Abschlüsse gesamt',   value: fmt(PROVISION_DATA.length),                                                   color: '#16a34a' },
              { label: 'Provision gesamt',    value: fmtEur(PROVISION_DATA.reduce((s, p) => s + p.provision, 0)),                  color: '#2563eb' },
              { label: 'Provision Natascha',  value: fmtEur(PROVISION_DATA.reduce((s, p) => s + p.natascha, 0)),                   color: '#7c3aed' },
              { label: 'Ø Finanzierungsvolumen', value: fmtEur(PROVISION_DATA.reduce((s, p) => s + p.volumen, 0) / PROVISION_DATA.length), color: '#f59e0b' },
            ].map(k => (
              <div key={k.label} style={{ ...card(), borderTop: `3px solid ${k.color}` }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--effi-text-sec)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{k.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: k.color }}>{k.value}</div>
              </div>
            ))}
          </div>
          {/* Provision Tabelle */}
          <div style={card()}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Provisionszahlungen (Natascha)</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--effi-surface)', borderBottom: '2px solid var(--effi-border)' }}>
                    {['Datum', 'Quelle', 'Finanzierungsvolumen', 'Provision (gesamt)', 'Provision (Natascha)', 'Zahlungseingang', 'Ausgezahlt'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--effi-text-sec)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PROVISION_DATA.map((p, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--effi-surface)', background: i % 2 === 0 ? '#fff' : 'var(--effi-surface)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 500 }}>{p.datum}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ fontSize: 10, background: p.quelle.includes('Immo') ? '#eff6ff' : '#f0fdf4', color: p.quelle.includes('Immo') ? '#2563eb' : '#16a34a', borderRadius: 12, padding: '2px 8px', fontWeight: 600 }}>{p.quelle}</span>
                      </td>
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>{fmtEur(p.volumen)}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 700, color: '#2563eb' }}>{fmtEur(p.provision)}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 700, color: '#7c3aed' }}>{fmtEur(p.natascha)}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--effi-text-sec)' }}>{p.zahlungseingang}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ fontSize: 10, background: '#f0fdf4', color: '#16a34a', borderRadius: 12, padding: '2px 8px', fontWeight: 600 }}>✅ {p.ausgezahlt}</span>
                      </td>
                    </tr>
                  ))}
                  {/* Summenzeile */}
                  <tr style={{ borderTop: '2px solid var(--effi-border)', background: 'var(--effi-surface)', fontWeight: 700 }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700 }}>Gesamt</td>
                    <td style={{ padding: '10px 12px' }}></td>
                    <td style={{ padding: '10px 12px', fontWeight: 700 }}>{fmtEur(PROVISION_DATA.reduce((s, p) => s + p.volumen, 0))}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#2563eb' }}>{fmtEur(PROVISION_DATA.reduce((s, p) => s + p.provision, 0))}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#7c3aed' }}>{fmtEur(PROVISION_DATA.reduce((s, p) => s + p.natascha, 0))}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 12, fontSize: 11, color: 'var(--effi-neutral)' }}>
              Quelle: Provisionszahlungen_Natascha · Daten werden manuell aktualisiert. Neue Abschlüsse hier direkt eintragen.
            </div>
          </div>
        </div>
      )}

            {subTab === 'Beratungsqualität' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Wöchentliche Leads */}
          <div style={card()}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Leads pro Woche (letzte 12)</div>
            {loading ? <div style={{ fontSize: 13, color: 'var(--effi-neutral)' }}>Lade...</div> : (() => {
              const weeks = data?.weeklyLeads ?? [];
              const maxC  = Math.max(...weeks.map(w => w.count), 1);
              const avgC  = weeks.length > 0 ? Math.round(weeks.reduce((s, w) => s + w.count, 0) / weeks.length) : 0;
              return (
                <>
                  <div style={{ fontSize: 12, color: 'var(--effi-neutral)', marginBottom: 12 }}>Ø {avgC} Leads / Woche</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100 }}>
                    {weeks.map(w => {
                      const h = Math.round((w.count / maxC) * 88);
                      return (
                        <div key={w.week} title={`KW ${w.week}: ${w.count} Leads`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flex: 1 }}>
                          <span style={{ fontSize: 9, color: 'var(--effi-neutral)' }}>{w.count}</span>
                          <div style={{ width: '100%', height: h, background: w.count >= avgC ? '#2563eb' : '#93c5fd', borderRadius: '3px 3px 0 0', minHeight: 2 }} />
                          <span style={{ fontSize: 8, color: 'var(--effi-neutral)', whiteSpace: 'nowrap' }}>{w.week.slice(5)}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>

          {/* BaufiExpertin KPIs */}
          <div style={card()}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Beratungsqualität</div>
            {loading ? <div style={{ fontSize: 13, color: 'var(--effi-neutral)' }}>Lade...</div> : (() => {
              const weeks = data?.weeklyLeads ?? [];
              const avgPerWeek = weeks.length > 0 ? Math.round(weeks.reduce((s, w) => s + w.count, 0) / weeks.length) : 0;
              const items = [
                ['Ø Leads / Woche',     `${avgPerWeek}`,                         '#2563eb'],
                ['Ø Reaktionszeit',     kpi?.avgResponseHours != null ? `${kpi.avgResponseHours}h` : 'k.A.', '#f59e0b'],
                ['Abschlüsse',          fmt(kpi?.wonCount ?? 0),                  '#16a34a'],
                ['Abschlussquote',      `${kpi?.conversionRate ?? 0}%`,           '#16a34a'],
                ['Aktive Leads',        fmt(kpi?.activePipeline ?? 0),            '#2563eb'],
              ];
              return (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {items.map(([label, val, color]) => (
                    <div key={String(label)} style={{ background: 'var(--effi-surface)', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontSize: 10, color: 'var(--effi-neutral)', marginBottom: 2 }}>{label}</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: String(color) }}>{val}</div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Durchlaufzeiten */}
          <div style={{ ...card(), gridColumn: 'span 2' }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Ø Verweildauer nach Stage</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {loading ? <div style={{ fontSize: 13, color: 'var(--effi-neutral)' }}>Lade...</div> :
                (data?.funnelStages ?? []).filter(s => s.avgDays > 0).map(s => (
                  <div key={s.stageId} style={{ background: 'var(--effi-surface)', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: 'var(--effi-neutral)', marginBottom: 2 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: s.avgDays > 60 ? '#dc2626' : s.avgDays > 30 ? '#f59e0b' : '#2563eb' }}>
                      {s.avgDays}d
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* ── Abbruchgründe-Analyse ── */}
          <div style={{ ...card({ gridColumn: 'span 2', marginTop: 0 }) }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Abbruchgründe-Analyse</div>
            <div style={{ fontSize: 11, color: 'var(--effi-neutral)', marginBottom: 16 }}>
              Automatische Auswertung der Kommentare nach Schlagwörtern · {(data?.allNotesList ?? data?.notesList ?? []).length} analysierte Leads
            </div>
            {(() => {
              const results = analyzeNotes(data?.allNotesList ?? data?.notesList ?? []);
              const total   = results.reduce((s, r) => s + r.count, 0);
              const hasData = total > 0;
              return (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
                    {results.slice(0, 4).map(r => (
                      <div key={r.label} style={{ background: 'var(--effi-surface)', borderRadius: 10, padding: '12px 14px', borderLeft: `3px solid ${r.color}` }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--effi-text-sec)', marginBottom: 4 }}>{r.label}</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: r.color }}>{r.count}</div>
                        {hasData && total > 0 && (
                          <div style={{ fontSize: 10, color: 'var(--effi-neutral)' }}>{Math.round((r.count / total) * 100)}% aller Abbrüche</div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {/* Balkendiagramm */}
                    <div>
                      {results.map(r => {
                        const max = Math.max(...results.map(x => x.count), 1);
                        const pct = Math.round((r.count / max) * 100);
                        return (
                          <div key={r.label} style={{ marginBottom: 10, opacity: r.count === 0 ? 0.3 : 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                              <span style={{ fontSize: 12 }}>{r.label}</span>
                              <span style={{ fontSize: 12, fontWeight: 700, color: r.color }}>{r.count}</span>
                            </div>
                            <div style={{ background: 'var(--effi-surface2)', borderRadius: 4, height: 8 }}>
                              <div style={{ height: '100%', background: r.color, borderRadius: 4, width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                      {!hasData && (
                        <div style={{ fontSize: 12, color: 'var(--effi-neutral)', fontStyle: 'italic' }}>
                          Noch keine Abbruch-Schlagwörter in den Kommentaren gefunden.<br />
                          Lade mehr Daten oder prüfe ob Kommentare vorhanden sind.
                        </div>
                      )}
                    </div>
                    {/* Beispiel-Kommentare */}
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Beispiel-Kommentare</div>
                      {results.filter(r => r.examples.length > 0).slice(0, 4).map(r => (
                        <div key={r.label} style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: r.color, marginBottom: 4 }}>{r.label}</div>
                          {r.examples.map((ex, i) => (
                            <div key={i} style={{ fontSize: 11, color: 'var(--effi-text-sec)', background: 'var(--effi-surface)', borderRadius: 6, padding: '4px 8px', marginBottom: 3, borderLeft: `2px solid ${r.color}` }}>
                              "{ex}{ex.length >= 80 ? '…' : ''}"
                            </div>
                          ))}
                        </div>
                      ))}
                      {!hasData && (
                        <div style={{ fontSize: 11, color: 'var(--effi-neutral)', fontStyle: 'italic' }}>
                          Sobald Natascha Kommentare einträgt werden diese hier automatisch ausgewertet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── AKTIVITÄTEN TAB ── */}
      {subTab === 'Aktivitäten' && (
        <div style={card()}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Letzte Aktivitäten — {data?.notesList.length ?? 0} neueste Leads</div>
          {loading ? <div style={{ fontSize: 13, color: 'var(--effi-neutral)' }}>Lade...</div> :
            (data?.notesList ?? []).map(entry => {
              const catKey = STAGE_CONFIG_CLIENT[entry.stageId]?.cat ?? 'active';
              return (
                <div key={entry.purposeId} style={{
                  borderLeft: `3px solid ${entry.state === 'LOST' ? '#dc2626' : CAT_COLOR[catKey]}`,
                  paddingLeft: 12, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--effi-surface)',
                }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: CAT_BG[catKey], color: CAT_COLOR[catKey] }}>
                      {entry.stageName}
                    </span>
                    {/* Tags anzeigen */}
                    {(entry.tags ?? []).filter((t: string) => t).slice(0, 4).map((tag: string) => (
                      <span key={tag} style={{ fontSize: 10, background: '#f3f4f6', color: '#374151', borderRadius: 12, padding: '1px 7px' }}>{tag}</span>
                    ))}
                    {entry.financialDemand && Number(entry.financialDemand) > 0 && (
                      <span style={{ fontSize: 10, background: '#ede9fe', color: '#7c3aed', borderRadius: 12, padding: '1px 7px', fontWeight: 600 }}>
                        {fmtEur(Number(entry.financialDemand))}
                      </span>
                    )}
                    <span style={{ fontSize: 10, color: 'var(--effi-neutral)', marginLeft: 'auto' }}>Lead: {fmtDate(entry.createdAt)}</span>
                  </div>
                  {entry.notes.map((note: any) => (
                    <div key={note.id} style={{ background: 'var(--effi-surface)', borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
                      <div style={{ fontSize: 10, color: 'var(--effi-neutral)', marginBottom: 3 }}>
                        👤 {note.author} · {fmtDate(note.createdAt)}
                      </div>
                      {note.content?.trim() ? (
                      <div style={{ fontSize: 12, color: 'var(--effi-black)', lineHeight: 1.5 }}
                        dangerouslySetInnerHTML={{ __html: note.content }} />
                    ) : (
                      <div style={{ fontSize: 11, color: 'var(--effi-neutral)', fontStyle: 'italic' }}>
                        Auto-Note (kein manueller Text)
                      </div>
                    )}
                    </div>
                  ))}
                  {entry.notes.filter((note: any) => note.content?.trim()).length === 0 && (
                    <div style={{ fontSize: 11, color: 'var(--effi-neutral)', fontStyle: 'italic' }}>
                      {entry.notes.length > 0 ? `${entry.notes.length} automatische Aktivität(en) ohne manuellen Kommentar` : 'Keine Aktivitäten vorhanden'}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

// Client-seitiges Stage-Config-Mapping
const STAGE_CONFIG_CLIENT: Record<number, { cat: string }> = {
  1: { cat: 'active' }, 9: { cat: 'active' }, 10: { cat: 'active' }, 16: { cat: 'active' },
  2: { cat: 'active' }, 15: { cat: 'active' }, 22: { cat: 'active' }, 24: { cat: 'active' },
  4: { cat: 'active' }, 5: { cat: 'won' }, 6: { cat: 'inactive' }, 21: { cat: 'lost' }, 26: { cat: 'inactive' },
};
