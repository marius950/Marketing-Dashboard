'use client';
import { useState } from 'react';
import { Lang } from '@/lib/types';
import { fmt, fmtEur } from '@/lib/utils';

interface WhitelabelTabProps { lang: Lang; from: string; to: string; }

const CARD = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: '#fff', borderRadius: 12, padding: '20px 22px',
  border: '1px solid var(--effi-border)', boxShadow: '0 1px 4px rgba(0,0,0,.05)', ...extra,
});

const TABS = ['Übersicht', 'Anruf-Funnel', 'Lizenzen'] as const;
type SubTab = typeof TABS[number];

// Placeholder-Daten — werden durch echte API ersetzt sobald Quelle verfügbar
const PLACEHOLDER = {
  calls:           { total: 0, entscheider: 0, wiedervorlage: 0, termine: 0, qualifiziert: 0 },
  licenses:        { sold: 0, active: 0, mrr: 0 },
  conversionRates: { entscheider: 0, wiedervorlage: 0, termin: 0, qualifiziert: 0 },
};

function FunnelStep({ label, count, pct, color, prev }: { label: string; count: number; pct: number; color: string; prev?: number }) {
  const width = Math.max(20, pct);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 500 }}>{label}</span>
        <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
          <span style={{ fontWeight: 700, color }}>{fmt(count)}</span>
          {prev != null && prev > 0 && (
            <span style={{ color: '#f59e0b' }}>→ {Math.round((count / prev) * 100)}%</span>
          )}
        </div>
      </div>
      <div style={{ background: 'var(--effi-surface2)', borderRadius: 6, height: 12, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: color, borderRadius: 6, width: `${width}%`, transition: 'width .5s' }} />
      </div>
    </div>
  );
}

export default function WhitelabelTab({ lang, from, to }: WhitelabelTabProps) {
  const [subTab, setSubTab] = useState<SubTab>('Übersicht');
  const d = PLACEHOLDER;

  // Manuelle Eingabe State (bis echte Datenquelle verfügbar)
  const [calls, setCalls]         = useState({ total: 0, entscheider: 0, wiedervorlage: 0, termine: 0, qualifiziert: 0 });
  const [licenses, setLicenses]   = useState({ sold: 0, active: 0, mrr: 0 });

  const convE = calls.total > 0 ? Math.round((calls.entscheider / calls.total) * 100) : 0;
  const convW = calls.entscheider > 0 ? Math.round((calls.wiedervorlage / calls.entscheider) * 100) : 0;
  const convT = calls.total > 0 ? Math.round((calls.termine / calls.total) * 100) : 0;
  const convQ = calls.termine > 0 ? Math.round((calls.qualifiziert / calls.termine) * 100) : 0;

  function NumberInput({ label, value, onChange, color = '#156949' }: { label: string; value: number; onChange: (v: number) => void; color?: string }) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--effi-text-sec)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</label>
        <input
          type="number" min={0} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{ fontSize: 18, fontWeight: 800, color, border: '1px solid var(--effi-border)', borderRadius: 8, padding: '6px 10px', width: '100%', outline: 'none' }}
        />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ background: '#7c3aed', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 18 }}>🧮</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#7c3aed' }}>Whitelabel Dashboard</div>
          <div style={{ fontSize: 12, color: 'var(--effi-neutral)' }}>Anrufstatistiken · Lizenzen · Sales-Funnel</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ background: '#faf5ff', border: '1px solid #ddd6fe', borderRadius: 10, padding: '8px 14px', fontSize: 11, color: '#7c3aed', fontWeight: 600 }}>
          Datenquelle: Manuelle Eingabe · API-Anbindung ausstehend
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Anrufe gesamt',    value: fmt(calls.total),          color: '#7c3aed' },
          { label: 'Entscheider',      value: `${fmt(calls.entscheider)} (${convE}%)`, color: '#6366f1' },
          { label: 'Wiedervorlage',    value: `${fmt(calls.wiedervorlage)} (${convW}%)`, color: '#f59e0b' },
          { label: 'Termine gebucht',  value: `${fmt(calls.termine)} (${convT}%)`, color: '#16a34a' },
          { label: 'Vorqualifiziert',  value: `${fmt(calls.qualifiziert)} (${convQ}%)`, color: '#E83434' },
        ].map(k => (
          <div key={k.label} style={{ ...CARD({ borderTop: `3px solid ${k.color}` }) }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--effi-text-sec)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Sub-Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setSubTab(t)} style={{
            padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            cursor: 'pointer', border: 'none',
            background: subTab === t ? '#7c3aed' : 'var(--effi-surface)',
            color: subTab === t ? '#fff' : 'var(--effi-text-sec)',
          }}>{t}</button>
        ))}
      </div>

      {/* ÜBERSICHT — Dateneingabe */}
      {subTab === 'Übersicht' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={CARD()}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Anruf-Daten erfassen</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <NumberInput label="Anrufe gesamt"   value={calls.total}         onChange={v => setCalls(p => ({...p, total: v}))}         color="#7c3aed" />
              <NumberInput label="Entscheider"     value={calls.entscheider}   onChange={v => setCalls(p => ({...p, entscheider: v}))}   color="#6366f1" />
              <NumberInput label="Wiedervorlage"   value={calls.wiedervorlage} onChange={v => setCalls(p => ({...p, wiedervorlage: v}))} color="#f59e0b" />
              <NumberInput label="Termine gebucht" value={calls.termine}       onChange={v => setCalls(p => ({...p, termine: v}))}       color="#16a34a" />
              <NumberInput label="Vorqualifiziert" value={calls.qualifiziert}  onChange={v => setCalls(p => ({...p, qualifiziert: v}))}  color="#E83434" />
            </div>
          </div>
          <div style={CARD()}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Lizenzen</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <NumberInput label="Verkauft gesamt"  value={licenses.sold}   onChange={v => setLicenses(p => ({...p, sold: v}))}   color="#7c3aed" />
              <NumberInput label="Aktive Lizenzen"  value={licenses.active} onChange={v => setLicenses(p => ({...p, active: v}))} color="#16a34a" />
              <NumberInput label="MRR (€)"          value={licenses.mrr}    onChange={v => setLicenses(p => ({...p, mrr: v}))}    color="#156949" />
            </div>
            <div style={{ marginTop: 16, padding: '12px', background: 'var(--effi-surface)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--effi-neutral)', marginBottom: 4 }}>ARR (Hochrechnung)</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#156949' }}>{fmtEur(licenses.mrr * 12)}</div>
            </div>
          </div>
        </div>
      )}

      {/* ANRUF-FUNNEL */}
      {subTab === 'Anruf-Funnel' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={CARD()}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 20 }}>Sales-Funnel Anrufe</div>
            <FunnelStep label="Anrufe gesamt"   count={calls.total}         pct={100} color="#7c3aed" />
            <FunnelStep label="Entscheider"     count={calls.entscheider}   pct={convE}  color="#6366f1" prev={calls.total} />
            <FunnelStep label="Wiedervorlage"   count={calls.wiedervorlage} pct={Math.round(calls.wiedervorlage / Math.max(calls.total, 1) * 100)} color="#f59e0b" prev={calls.entscheider} />
            <FunnelStep label="Termin gebucht"  count={calls.termine}       pct={convT}  color="#16a34a" prev={calls.total} />
            <FunnelStep label="Vorqualifiziert" count={calls.qualifiziert}  pct={convQ}  color="#E83434" prev={calls.termine} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={CARD()}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Conversion-Raten</div>
              {[
                { label: 'Anruf → Entscheider',    rate: convE, target: 30, color: '#6366f1' },
                { label: 'Entscheider → Wiedervorlage', rate: convW, target: 40, color: '#f59e0b' },
                { label: 'Anruf → Termin',         rate: convT, target: 15, color: '#16a34a' },
                { label: 'Termin → Qualifiziert',  rate: convQ, target: 60, color: '#E83434' },
              ].map(r => (
                <div key={r.label} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 12 }}>{r.label}</span>
                    <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
                      <span style={{ fontWeight: 700, color: r.color }}>{r.rate}%</span>
                      <span style={{ color: 'var(--effi-neutral)' }}>Ziel: {r.target}%</span>
                    </div>
                  </div>
                  <div style={{ background: 'var(--effi-surface2)', borderRadius: 4, height: 6, position: 'relative' }}>
                    <div style={{ height: '100%', background: r.color, borderRadius: 4, width: `${Math.min(r.rate, 100)}%` }} />
                    <div style={{ position: 'absolute', top: 0, left: `${r.target}%`, width: 2, height: '100%', background: '#374151', borderRadius: 1 }} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ ...CARD({ borderTop: '3px solid #7c3aed' }) }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Hinweis</div>
              <div style={{ fontSize: 12, color: 'var(--effi-text-sec)', lineHeight: 1.7 }}>
                Daten werden manuell erfasst bis eine automatische Datenquelle (HubSpot o.ä.) angebunden ist. Bitte Zahlen oben im Übersicht-Tab eintragen.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LIZENZEN */}
      {subTab === 'Lizenzen' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={CARD({ borderTop: '3px solid #7c3aed' })}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Lizenz-Übersicht</div>
            {[
              ['Verkaufte Lizenzen', fmt(licenses.sold),   '#7c3aed'],
              ['Aktive Lizenzen',    fmt(licenses.active), '#16a34a'],
              ['MRR',                fmtEur(licenses.mrr), '#156949'],
              ['ARR (Hochrechnung)', fmtEur(licenses.mrr * 12), '#156949'],
              ['Ø Lizenzpreis',      licenses.active > 0 ? fmtEur(licenses.mrr / licenses.active) : '–', '#6366f1'],
            ].map(([k, v, c]) => (
              <div key={String(k)} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--effi-surface)' }}>
                <span style={{ fontSize: 13, color: 'var(--effi-text-sec)' }}>{k}</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: String(c) }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={CARD()}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Lizenz-Roadmap</div>
            {[
              { q: 'Q2 2026', target: 2,  mrr: 5000,  desc: 'Erste 2 Lizenzen (Förderrechner Beta)' },
              { q: 'Q3 2026', target: 5,  mrr: 12500, desc: 'Gewerksrechner + Förderrechner' },
              { q: 'Q4 2026', target: 10, mrr: 25000, desc: 'Alle Gewerksrechner live' },
              { q: '2027',    target: 20, mrr: 50000, desc: 'Scaling auf weitere Sparkassen' },
            ].map(r => (
              <div key={r.q} style={{ padding: '8px 0', borderBottom: '1px solid var(--effi-surface)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{r.q}</span>
                  <span style={{ fontSize: 12, color: '#7c3aed', fontWeight: 700 }}>{r.target} Lizenzen · {fmtEur(r.mrr)}/Monat</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--effi-neutral)' }}>{r.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
