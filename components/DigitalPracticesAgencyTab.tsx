'use client';
import { useState } from 'react';
import { Lang } from '@/lib/types';
import { fmtEur, fmt } from '@/lib/utils';

interface DigitalPracticesAgencyTabProps { lang: Lang; from: string; to: string; }

const CARD = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: '#fff', borderRadius: 12, padding: '20px 22px',
  border: '1px solid var(--effi-border)', boxShadow: '0 1px 4px rgba(0,0,0,.05)', ...extra,
});

// Leistungsarten aus dem Digital Practices Kontext
const SERVICE_TYPES = [
  { id: 'strategy',    label: 'Strategie & Consulting',    color: '#E83434', icon: '🎯', unit: 'Projekt', defaultRate: 5000 },
  { id: 'product',     label: 'Produktentwicklung',        color: '#2563eb', icon: '🛠️', unit: 'Sprint',  defaultRate: 8000 },
  { id: 'whitelabel',  label: 'Whitelabel / Lizenz',       color: '#7c3aed', icon: '🧮', unit: 'Lizenz',  defaultRate: 2500 },
  { id: 'marketing',   label: 'Performance Marketing',     color: '#f59e0b', icon: '📊', unit: 'Monat',   defaultRate: 3000 },
  { id: 'data',        label: 'Data & Analytics',          color: '#10b981', icon: '📈', unit: 'Projekt', defaultRate: 4000 },
  { id: 'workshop',    label: 'Workshops & Training',      color: '#6366f1', icon: '🎓', unit: 'Tag',     defaultRate: 1500 },
];

// Beispiel-Clients (Sparkassen-Töchter / Partner)
const EXAMPLE_CLIENTS = [
  { name: 'Sparkasse Bremen', status: 'active',  services: ['product', 'whitelabel'], revenue: 0, since: '2025' },
  { name: 'Überseehub GmbH',  status: 'internal', services: ['strategy', 'product'],  revenue: 0, since: '2024' },
];

const TABS = ['Übersicht', 'Leistungen', 'Projekte', 'Roadmap'] as const;
type SubTab = typeof TABS[number];

// Editierbare Revenue-Zeile
function ServiceRow({ service, onChange }: { service: typeof SERVICE_TYPES[0]; onChange: (id: string, count: number) => void }) {
  const [count, setCount] = useState(0);
  function update(v: number) {
    setCount(v);
    onChange(service.id, v);
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--effi-surface)' }}>
      <span style={{ fontSize: 18, width: 28 }}>{service.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{service.label}</div>
        <div style={{ fontSize: 10, color: 'var(--effi-neutral)' }}>
          {fmtEur(service.defaultRate)} / {service.unit}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={() => update(Math.max(0, count - 1))}
          style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid var(--effi-border)', background: '#fff', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
        <span style={{ fontSize: 15, fontWeight: 700, minWidth: 24, textAlign: 'center' }}>{count}</span>
        <button onClick={() => update(count + 1)}
          style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid var(--effi-border)', background: '#fff', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
      </div>
      <div style={{ minWidth: 80, textAlign: 'right', fontSize: 14, fontWeight: 700, color: count > 0 ? '#16a34a' : '#9ca3af' }}>
        {fmtEur(count * service.defaultRate)}
      </div>
    </div>
  );
}

export default function DigitalPracticesAgencyTab({ lang, from, to }: DigitalPracticesAgencyTabProps) {
  const [subTab, setSubTab] = useState<SubTab>('Übersicht');
  const [serviceCounts, setServiceCounts] = useState<Record<string, number>>({});

  function handleServiceChange(id: string, count: number) {
    setServiceCounts(prev => ({ ...prev, [id]: count }));
  }

  const totalRevenue = SERVICE_TYPES.reduce((sum, s) => sum + (serviceCounts[s.id] ?? 0) * s.defaultRate, 0);
  const activeServices = Object.values(serviceCounts).filter(v => v > 0).length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <div style={{ background: '#E83434', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>⚡</span>
          <img src="/uhub-logo.svg" alt="ÜHub" style={{ height: 20, filter: 'brightness(0) invert(1)' }} />
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#E83434' }}>Digital Practices</div>
          <div style={{ fontSize: 12, color: 'var(--effi-neutral)' }}>Agentur-Leistungen für Sparkassen-Töchter & Partner</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 10, padding: '8px 14px', textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: '#dc2626' }}>Pipeline Revenue</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#dc2626' }}>{fmtEur(totalRevenue)}</div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Aktive Dienste (konfiguriert)', value: fmt(activeServices),   color: '#E83434' },
          { label: 'Pipeline Revenue',               value: fmtEur(totalRevenue), color: '#16a34a' },
          { label: 'Partner / Clients',              value: fmt(EXAMPLE_CLIENTS.filter(c => c.status === 'active').length), color: '#2563eb' },
          { label: 'Leistungsarten',                 value: fmt(SERVICE_TYPES.length), color: '#7c3aed' },
        ].map(k => (
          <div key={k.label} style={{ ...CARD({ borderTop: `3px solid ${k.color}` }) }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--effi-text-sec)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Sub-Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setSubTab(t)} style={{
            padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            border: 'none',
            background: subTab === t ? '#E83434' : 'var(--effi-surface)',
            color: subTab === t ? '#fff' : 'var(--effi-text-sec)',
          }}>{t}</button>
        ))}
      </div>

      {/* ÜBERSICHT */}
      {subTab === 'Übersicht' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Was wir machen */}
          <div style={CARD()}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Was ist Digital Practices?</div>
            <div style={{ fontSize: 12, color: 'var(--effi-text-sec)', lineHeight: 1.8, marginBottom: 16 }}>
              Überseehub baut nicht nur eigene Produkte — wir bieten auch <strong>Agentur-ähnliche Dienstleistungen</strong> für andere Sparkassen-Töchter an. Basierend auf unserem Know-how in Digitalisierung, Performance Marketing und Produktentwicklung.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SERVICE_TYPES.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--effi-surface)', borderRadius: 8 }}>
                  <span style={{ fontSize: 16 }}>{s.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{s.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--effi-neutral)' }}>{fmtEur(s.defaultRate)} / {s.unit}</div>
                  </div>
                  <span style={{ fontSize: 10, background: `${s.color}22`, color: s.color, borderRadius: 12, padding: '2px 8px', fontWeight: 600 }}>
                    {s.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Clients */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={CARD()}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Partner & Clients</div>
              {EXAMPLE_CLIENTS.map(c => (
                <div key={c.name} style={{ padding: '10px 0', borderBottom: '1px solid var(--effi-surface)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                      background: c.status === 'active' ? '#dcfce7' : '#eff6ff',
                      color: c.status === 'active' ? '#16a34a' : '#2563eb',
                    }}>
                      {c.status === 'active' ? 'Aktiv' : 'Intern'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {c.services.map(sid => {
                      const svc = SERVICE_TYPES.find(s => s.id === sid);
                      return svc ? (
                        <span key={sid} style={{ fontSize: 10, background: `${svc.color}18`, color: svc.color, borderRadius: 12, padding: '2px 8px' }}>
                          {svc.icon} {svc.label}
                        </span>
                      ) : null;
                    })}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--effi-neutral)', marginTop: 4 }}>Partner seit {c.since}</div>
                </div>
              ))}
              <div style={{ marginTop: 12, fontSize: 11, color: 'var(--effi-neutral)', fontStyle: 'italic' }}>
                + neue Sparkassen-Töchter in Pipeline
              </div>
            </div>

            <div style={CARD({ borderTop: '3px solid #E83434' })}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Revenue-Potential</div>
              {[
                ['1 Strategie-Projekt', fmtEur(5000)],
                ['1 Whitelabel-Lizenz / Monat', fmtEur(2500)],
                ['1 Entwicklungs-Sprint', fmtEur(8000)],
                ['5 Lizenzen (Ziel 2027)', fmtEur(12500)],
                ['Gesamt-Pipeline (konfiguriert)', fmtEur(totalRevenue), true],
              ].map(([label, val, bold]) => (
                <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--effi-surface)' }}>
                  <span style={{ fontSize: 12, color: 'var(--effi-text-sec)', fontWeight: bold ? 700 : 400 }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: bold ? '#E83434' : '#374151' }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* LEISTUNGEN — Revenue Kalkulator */}
      {subTab === 'Leistungen' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={CARD()}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Revenue-Kalkulator</div>
            <div style={{ fontSize: 11, color: 'var(--effi-neutral)', marginBottom: 16 }}>
              Konfiguriere Anzahl gebuchter Leistungen um den erwarteten Revenue zu berechnen
            </div>
            {SERVICE_TYPES.map(s => (
              <ServiceRow key={s.id} service={s} onChange={handleServiceChange} />
            ))}
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '2px solid var(--effi-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Gesamt Revenue</span>
              <span style={{ fontSize: 24, fontWeight: 800, color: '#16a34a' }}>{fmtEur(totalRevenue)}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {totalRevenue > 0 && (
              <div style={CARD({ borderTop: '3px solid #16a34a' })}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Revenue-Mix</div>
                {SERVICE_TYPES.filter(s => (serviceCounts[s.id] ?? 0) > 0).map(s => {
                  const rev = (serviceCounts[s.id] ?? 0) * s.defaultRate;
                  const pct = Math.round((rev / totalRevenue) * 100);
                  return (
                    <div key={s.id} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 12 }}>{s.icon} {s.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>{fmtEur(rev)} ({pct}%)</span>
                      </div>
                      <div style={{ background: 'var(--effi-surface2)', borderRadius: 4, height: 8 }}>
                        <div style={{ height: '100%', background: s.color, borderRadius: 4, width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={CARD()}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Leistungskatalog</div>
              <div style={{ fontSize: 11, color: 'var(--effi-text-sec)', lineHeight: 1.8 }}>
                <strong>Strategie & Consulting</strong><br />
                Digitalisierungsberatung, Produktstrategie, Marktanalyse für Sparkassen-Töchter<br /><br />
                <strong>Produktentwicklung</strong><br />
                Web-Apps, Rechner, Portale — auf Basis bestehender effi-Technologie<br /><br />
                <strong>Whitelabel / Lizenz</strong><br />
                Förderrechner, Sanierungsrechner, Baufi-Portal als White-Label<br /><br />
                <strong>Performance Marketing</strong><br />
                Google/Meta Kampagnensteuerung, Lead-Gen, Reporting<br /><br />
                <strong>Data & Analytics</strong><br />
                KPI-Dashboards (wie dieses), Datenanalyse, Reporting-Setups<br /><br />
                <strong>Workshops & Training</strong><br />
                Digital-Workshops, Team-Schulungen, Best-Practice-Sharing
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PROJEKTE */}
      {subTab === 'Projekte' && (
        <div style={CARD()}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Aktive & Geplante Projekte</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { name: 'Sparkasse Bremen — Baufi Portal', status: 'active', type: 'product', desc: 'Web-Portal für Baufinanzierungs-Leads, Integration in bestehende Sparkassen-Infrastruktur', revenue: 0 },
              { name: 'ÜHub — KPI Dashboard', status: 'active', type: 'data', desc: 'Internes Marketing & Sales Dashboard (dieses Tool) als Vorlage für externe Kunden', revenue: 0 },
              { name: 'Förderrechner Whitelabel', status: 'planned', type: 'whitelabel', desc: 'Förderrechner als White-Label für Sparkassen — Launch Q3/2026', revenue: 30000 },
              { name: 'PV-Rechner Whitelabel', status: 'planned', type: 'whitelabel', desc: 'PV-Anlage Rechner für Sparkassen-Kunden', revenue: 0 },
              { name: 'Digital Strategy Workshop', status: 'planned', type: 'workshop', desc: 'Digitalisierungs-Workshop für neue Sparkassen-Töchter-Partner', revenue: 3000 },
              { name: 'Performance Marketing Setup', status: 'planned', type: 'marketing', desc: 'Google/Meta Kampagnen-Setup und Reporting für Partner', revenue: 6000 },
            ].map(p => {
              const svc = SERVICE_TYPES.find(s => s.id === p.type);
              return (
                <div key={p.name} style={{ background: 'var(--effi-surface)', borderRadius: 10, padding: '14px', border: p.status === 'active' ? '1px solid #86efac' : '1px solid var(--effi-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: svc?.color ?? '#374151' }}>{svc?.icon} {svc?.label}</span>
                    <span style={{ fontSize: 9, background: p.status === 'active' ? '#dcfce7' : '#f3f4f6', color: p.status === 'active' ? '#16a34a' : '#9ca3af', borderRadius: 12, padding: '2px 7px', fontWeight: 600 }}>
                      {p.status === 'active' ? 'Aktiv' : 'Geplant'}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--effi-text-sec)', lineHeight: 1.5, marginBottom: 8 }}>{p.desc}</div>
                  {p.revenue > 0 && (
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#16a34a' }}>Revenue: {fmtEur(p.revenue)}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ROADMAP */}
      {subTab === 'Roadmap' && (
        <div style={CARD()}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Digital Practices Roadmap 2026</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { q: 'Q1 2026', done: true,  items: ['Sparkasse Bremen Baufi-Portal (laufend)', 'KPI-Dashboard intern aufgebaut'] },
              { q: 'Q2 2026', done: false, items: ['2 neue Partner-Gespräche führen', 'Förderrechner Beta-Launch', 'Whitelabel-Preismodell finalisieren'] },
              { q: 'Q3 2026', done: false, items: ['Förderrechner: 2 Lizenzen verkauft (€30K)', 'Agentur-Profil für Sparkassen-Akquise', 'Digital Strategy Workshops starten'] },
              { q: 'Q4 2026', done: false, items: ['Förderrechner: 5 Lizenzen (€20K/Q4)', 'Zinsbid: Banken onboarden', 'Performance Marketing als Service anbieten'] },
              { q: '2027+',   done: false, items: ['10 aktive Whitelabel-Lizenzen', 'Dedicated Digital Practices Team', '€100K+ Revenue aus Agentur-Leistungen'] },
            ].map(r => (
              <div key={r.q} style={{ display: 'flex', gap: 16, padding: '12px', background: r.done ? '#f0fdf4' : 'var(--effi-surface)', borderRadius: 10, border: r.done ? '1px solid #86efac' : '1px solid var(--effi-border)' }}>
                <div style={{ minWidth: 80, fontSize: 12, fontWeight: 700, color: r.done ? '#16a34a' : '#E83434' }}>
                  {r.done ? '✅' : '○'} {r.q}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {r.items.map(item => (
                    <div key={item} style={{ fontSize: 12, color: 'var(--effi-text-sec)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: r.done ? '#16a34a' : '#E83434', fontSize: 10 }}>▸</span>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
