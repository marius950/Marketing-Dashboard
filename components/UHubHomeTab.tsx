'use client';
import { Lang } from '@/lib/types';
import { fmtEur } from '@/lib/utils';

interface UHubHomeTabProps { lang: Lang; from: string; to: string; }

const CARD = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: '#fff', borderRadius: 12, padding: '20px 22px',
  border: '1px solid var(--effi-border)', boxShadow: '0 1px 4px rgba(0,0,0,.05)', ...extra,
});

// Business Plan 2026 Daten aus Notion
const BUSINESS_PLAN = {
  q1: { actual: true, revenue: 9897,   target: 0,      adSpend: 40000, roas: 24.7  },
  q2: { actual: false, revenue: 0,     target: 40250,  adSpend: 55000, roas: 0     },
  q3: { actual: false, revenue: 0,     target: 109567, adSpend: 77500, roas: 0     },
  q4: { actual: false, revenue: 0,     target: 184250, adSpend: 92500, roas: 0     },
};

const STREAMS = [
  { name: 'Baufi (Zinsbid)',         color: '#00008B', target2026: 84000,  target2027: 282000,  icon: '🏦' },
  { name: 'Sanierung (effi)',        color: '#156949', target2026: 230000, target2027: 734000,  icon: '🏠' },
  { name: 'Förderrechner/Whitelabel', color: '#7c3aed', target2026: 30000,  target2027: 75000,   icon: '🧮' },
  { name: 'Digital Practices',       color: '#E83434', target2026: 0,      target2027: 0,       icon: '⚡' },
];

const PRODUCTS = [
  {
    name: 'effi',
    desc: 'Sanierungsberatung & Lead-Vermittlung',
    color: '#156949',
    kpis: [
      { label: 'Sani-Leads Q1', value: '–', target: '231' },
      { label: 'Weitervermittlungen', value: '–', target: '45%' },
      { label: 'Revenue Q1', value: '€6.897', target: '€6.897', done: true },
      { label: 'Ad Spend Q1', value: '–', target: '€40K' },
    ],
  },
  {
    name: 'Zinsbid',
    desc: 'Baufinanzierungs-Leads & Vermittlung',
    color: '#00008B',
    kpis: [
      { label: 'Baufi Leads (seit Launch)', value: '840', target: '200/Q2' },
      { label: 'Abschlüsse', value: '7', target: '3/Q2' },
      { label: 'Revenue Q1', value: '€3.000', target: '€3.000', done: true },
      { label: 'Ø Finanzierungsvolumen', value: '€197K', target: '–' },
    ],
  },
  {
    name: 'Förderrechner',
    desc: 'Whitelabel & Lizenzen für Sparkassen',
    color: '#7c3aed',
    kpis: [
      { label: 'Aktive Lizenzen', value: '0', target: '2 (Q3)' },
      { label: 'Revenue 2026', value: '€0', target: '€30K' },
      { label: 'Launch', value: 'Q3/26', target: 'Q3/26' },
      { label: 'Status', value: 'In Entwicklung', target: '–' },
    ],
  },
  {
    name: 'Digital Practices',
    desc: 'Agentur-Leistungen für Sparkassen-Töchter',
    color: '#E83434',
    kpis: [
      { label: 'Aktive Projekte', value: '–', target: '–' },
      { label: 'Revenue 2026', value: '–', target: '–' },
      { label: 'Status', value: 'Aufbau', target: '–' },
      { label: 'Pipeline', value: '–', target: '–' },
    ],
  },
];

const YEARLY = [
  { year: '2026', target: 440000,  streams: [84000, 230000, 30000, 0] },
  { year: '2027', target: 2312000, streams: [282000, 734000, 75000, 100000] },
  { year: '2028', target: 6674000, streams: [749000, 1404000, 114000, 300000] },
  { year: '2029', target: 10578000, streams: [1155000, 2400000, 159000, 500000] },
];

function ProgressBar({ value, target, color }: { value: number; target: number; color: string }) {
  const pct = Math.min(Math.round((value / target) * 100), 100);
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 10, color: 'var(--effi-neutral)' }}>
        <span>Ist: {fmtEur(value)}</span>
        <span>Ziel: {fmtEur(target)} ({pct}%)</span>
      </div>
      <div style={{ background: '#e5e7eb', borderRadius: 4, height: 6 }}>
        <div style={{ height: '100%', background: color, borderRadius: 4, width: `${pct}%`, transition: 'width .5s' }} />
      </div>
    </div>
  );
}

export default function UHubHomeTab({ lang, from, to }: UHubHomeTabProps) {
  // Q1 actual revenue
  const q1Revenue = 9897;
  const yearTarget = 343963;
  const yearTargetFull = 440000;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <img src="/uhub-logo.svg" alt="ÜHub" style={{ height: 32 }} />
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#011640' }}>Revenue Übersicht 2026</div>
          <div style={{ fontSize: 12, color: 'var(--effi-neutral)' }}>Überseehub GmbH · Business Plan vs. Ist-Zustand</div>
        </div>
      </div>

      {/* Jahres-KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Revenue Gesamt 2026 Ziel', value: fmtEur(yearTargetFull), sub: 'Business Plan', color: '#E83434' },
          { label: 'Revenue Q1 Actual', value: fmtEur(q1Revenue), sub: '2,2% des Jahresziels erreicht', color: '#156949' },
          { label: 'Revenue-Ziel Q2', value: fmtEur(BUSINESS_PLAN.q2.target), sub: 'Apr – Jun 2026', color: '#f59e0b' },
          { label: 'Ad Spend Q1', value: fmtEur(BUSINESS_PLAN.q1.adSpend), sub: `ROAS: ${BUSINESS_PLAN.q1.roas}%`, color: '#2563eb' },
        ].map(k => (
          <div key={k.label} style={{ ...CARD({ borderTop: `3px solid ${k.color}` }) }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--effi-text-sec)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 10, color: 'var(--effi-neutral)', marginTop: 2 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Revenue-Jahresplan Progress */}
      <div style={{ ...CARD({ marginBottom: 16, borderTop: '3px solid #E83434' }) }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Jahresplan 2026 — Ist vs. Ziel nach Revenue Stream</div>
        <ProgressBar value={q1Revenue} target={yearTargetFull} color="#E83434" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 20 }}>
          {STREAMS.map(s => (
            <div key={s.name} style={{ background: 'var(--effi-surface)', borderRadius: 10, padding: '12px 14px', borderLeft: `3px solid ${s.color}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: s.color, marginBottom: 6 }}>{s.icon} {s.name}</div>
              <div style={{ fontSize: 10, color: 'var(--effi-neutral)', marginBottom: 4 }}>Ziel 2026</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{fmtEur(s.target2026)}</div>
              <div style={{ fontSize: 10, color: 'var(--effi-neutral)', marginTop: 4 }}>Ziel 2027: {fmtEur(s.target2027)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Produkte im Detail */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 16 }}>
        {PRODUCTS.map(p => (
          <div key={p.name} style={{ ...CARD({ borderTop: `3px solid ${p.color}` }) }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: p.color }}>{p.name}</div>
                <div style={{ fontSize: 11, color: 'var(--effi-text-sec)', marginTop: 2 }}>{p.desc}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {p.kpis.map(k => (
                <div key={k.label} style={{ background: 'var(--effi-surface)', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ fontSize: 9, color: 'var(--effi-neutral)', marginBottom: 2 }}>{k.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: k.done ? '#16a34a' : 'var(--effi-black)' }}>{k.value}</div>
                  <div style={{ fontSize: 9, color: 'var(--effi-neutral)' }}>Ziel: {k.target}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Quartalsziele */}
      <div style={CARD({ marginBottom: 16 })}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Quartalsziele 2026</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { q: 'Q1 (Jan–Mär)', target: 9897, actual: q1Revenue, adSpend: 40000, roas: 24.7, done: true,
              kpis: 'Baufi: 200 Leads, 3 Abs.\nSanierung: 926 Leads, 45% WVQ' },
            { q: 'Q2 (Apr–Jun)', target: 40250, actual: 0, adSpend: 55000, roas: 0, done: false,
              kpis: 'Baufi: CPL 150€\nSanierung: 40 Partner' },
            { q: 'Q3 (Jul–Sep)', target: 109567, actual: 0, adSpend: 77500, roas: 0, done: false,
              kpis: 'Förderrechner: 2 Lizenzen\nSanierung: 1.400 Leads' },
            { q: 'Q4 (Okt–Dez)', target: 184250, actual: 0, adSpend: 92500, roas: 0, done: false,
              kpis: 'Förderrechner: 5 Lizenzen\nSanierung: 70% WVQ' },
          ].map(q => (
            <div key={q.q} style={{ background: q.done ? '#f0fdf4' : 'var(--effi-surface)', borderRadius: 10, padding: '12px 14px', border: q.done ? '1px solid #86efac' : '1px solid var(--effi-border)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: q.done ? '#16a34a' : '#374151', marginBottom: 8 }}>
                {q.done ? '✅ ' : ''}{q.q}
              </div>
              <div style={{ fontSize: 10, color: 'var(--effi-neutral)', marginBottom: 4 }}>Revenue-Ziel</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: q.done ? '#16a34a' : '#E83434' }}>
                {fmtEur(q.target)}
              </div>
              {q.done && (
                <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>Erreicht: {fmtEur(q.actual)}</div>
              )}
              <div style={{ fontSize: 9, color: 'var(--effi-neutral)', marginTop: 8, lineHeight: 1.6 }}>
                {q.kpis.split('\n').map(k => <div key={k}>{k}</div>)}
              </div>
              <div style={{ fontSize: 9, color: 'var(--effi-neutral)', marginTop: 6 }}>
                Ad Spend: {fmtEur(q.adSpend)} · ROAS: {q.done ? `${q.roas}%` : '–'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mehrjahres-Forecast */}
      <div style={CARD()}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Revenue-Forecast 2026–2029</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20 }}>
          {YEARLY.map(y => {
            const maxTarget = Math.max(...YEARLY.map(x => x.target));
            const h = Math.round((y.target / maxTarget) * 160);
            const colors = ['#00008B', '#156949', '#7c3aed', '#E83434'];
            const isCurrent = y.year === '2026';
            return (
              <div key={y.year} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: isCurrent ? '#E83434' : '#374151', marginBottom: 8 }}>
                  {fmtEur(y.target)}
                </div>
                <div style={{ width: '100%', height: h, display: 'flex', flexDirection: 'column', borderRadius: '6px 6px 0 0', overflow: 'hidden' }}>
                  {y.streams.map((s, i) => {
                    const sh = Math.round((s / y.target) * h);
                    return sh > 0 ? (
                      <div key={i} title={`${STREAMS[i].name}: ${fmtEur(s)}`}
                        style={{ width: '100%', height: sh, background: colors[i], flexShrink: 0 }} />
                    ) : null;
                  })}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: isCurrent ? '#E83434' : '#374151', marginTop: 6 }}>{y.year}</div>
                {isCurrent && <div style={{ fontSize: 9, color: '#E83434' }}>aktuell</div>}
              </div>
            );
          })}
        </div>
        {/* Legende */}
        <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
          {STREAMS.map(s => (
            <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, background: s.color, borderRadius: 2 }} />
              <span style={{ fontSize: 11, color: 'var(--effi-text-sec)' }}>{s.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
