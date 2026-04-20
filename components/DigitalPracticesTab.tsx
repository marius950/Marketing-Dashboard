'use client';
import { Lang } from '@/lib/types';

interface DigitalPracticesTabProps {
  lang: Lang;
  from: string;
  to:   string;
}

const CARD = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: '#fff', borderRadius: 12, padding: '20px 22px',
  border: '1px solid var(--effi-border)', boxShadow: '0 1px 4px rgba(0,0,0,.05)', ...extra,
});

const PRACTICES = [
  {
    name: 'effi',
    desc: 'Sanierungsberatung & Lead-Vermittlung',
    color: '#156949',
    kpis: ['Sanierungsleads', 'Weitervermittlungen', 'Partner', 'Revenue'],
    status: 'active',
  },
  {
    name: 'Zinsbid',
    desc: 'Baufinanzierungs-Leads & Vermittlung',
    color: '#00008B',
    kpis: ['Baufi-Leads', 'Abschlüsse', 'Pipeline-Wert', 'Provision'],
    status: 'active',
  },
  {
    name: 'Whitelabel',
    desc: 'White-Label-Dashboard für Partner',
    color: '#7c3aed',
    kpis: ['Anrufe', 'Entscheider', 'Termine', 'Whitelabels verkauft'],
    status: 'planned',
  },
  {
    name: 'Professional Services',
    desc: 'Einnahmen aus Digital Practices',
    color: '#f59e0b',
    kpis: ['Projekte', 'Stundenvolumen', 'Einnahmen', 'Marge'],
    status: 'planned',
  },
  {
    name: 'HubSpot Sales',
    desc: 'Sales Sanierung via HubSpot CRM',
    color: '#FF7A59',
    kpis: ['Anrufe', 'Entscheider', 'Wiedervorlage', 'Termine gebucht'],
    status: 'planned',
  },
  {
    name: 'Lexware',
    desc: 'Rechnungen & Finanzen',
    color: '#374151',
    kpis: ['Rechnungen', 'Offene Posten', 'Umsatz', 'Marge'],
    status: 'planned',
  },
];

export default function DigitalPracticesTab({ lang, from, to }: DigitalPracticesTabProps) {
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <img src="/uhub-logo.svg" alt="ÜHub" style={{ height: 28 }} />
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#E83434' }}>Digital Practices Board</div>
          <div style={{ fontSize: 12, color: 'var(--effi-neutral)' }}>Überblick aller Überseehub Geschäftsbereiche</div>
        </div>
      </div>

      {/* Business Units Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {PRACTICES.map(p => (
          <div key={p.name} style={{
            ...CARD({ borderTop: `3px solid ${p.color}`, opacity: p.status === 'planned' ? 0.7 : 1 }),
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: p.color }}>{p.name}</div>
              <span style={{
                fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 20,
                background: p.status === 'active' ? '#dcfce7' : '#f3f4f6',
                color: p.status === 'active' ? '#16a34a' : '#9ca3af',
                textTransform: 'uppercase', letterSpacing: '.05em',
              }}>
                {p.status === 'active' ? '● Live' : '○ Geplant'}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--effi-text-sec)', marginBottom: 14 }}>{p.desc}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {p.kpis.map(kpi => (
                <div key={kpi} style={{ background: 'var(--effi-surface)', borderRadius: 8, padding: '6px 8px' }}>
                  <div style={{ fontSize: 9, color: 'var(--effi-neutral)', marginBottom: 1 }}>{kpi}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: p.status === 'active' ? p.color : '#d1d5db' }}>
                    {p.status === 'active' ? '→' : '–'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Business Plan Ziele */}
      <div style={CARD({ borderTop: '3px solid #E83434' })}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Business Plan — Ziele vs. Ist-Zustand</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { label: 'Jahresumsatz Ziel',    ziel: '500.000 €', ist: '–', pct: 0 },
            { label: 'Leads gesamt Ziel',    ziel: '2.000',     ist: '–', pct: 0 },
            { label: 'Abschlussquote Ziel',  ziel: '5%',        ist: '–', pct: 0 },
            { label: 'Partner Ziel',         ziel: '50',        ist: '–', pct: 0 },
          ].map(item => (
            <div key={item.label} style={{ background: 'var(--effi-surface)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, color: 'var(--effi-neutral)', marginBottom: 6 }}>{item.label}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 9, color: 'var(--effi-neutral)' }}>Ziel</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#E83434' }}>{item.ziel}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 9, color: 'var(--effi-neutral)' }}>Ist</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#374151' }}>{item.ist}</div>
                </div>
              </div>
              <div style={{ background: '#e5e7eb', borderRadius: 4, height: 6 }}>
                <div style={{ height: '100%', background: '#E83434', borderRadius: 4, width: `${item.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, fontSize: 11, color: 'var(--effi-neutral)', textAlign: 'center' }}>
          💡 Business-Plan-Ziele können in der Budget-Tab-Ansicht gepflegt werden. Schnittstellen zu HubSpot, Lexware und weiteren Tools folgen.
        </div>
      </div>

      {/* Roadmap */}
      <div style={{ ...CARD({ marginTop: 16 }) }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Dashboard-Roadmap</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { done: true,  label: 'effi Marketing Dashboard (Google Ads, Meta)',    detail: 'Live ✅' },
            { done: true,  label: 'effi Baufi Sales Dashboard (finCRM)',             detail: 'Live ✅' },
            { done: true,  label: 'Zinsbid Dashboard (finCRM)',                     detail: 'Live ✅' },
            { done: false, label: 'HubSpot Sales Sanierung Dashboard',              detail: 'API-Zugang benötigt' },
            { done: false, label: 'Whitelabel-Dashboard (Anrufstatistiken)',        detail: 'Datenquelle ausstehend' },
            { done: false, label: 'Professional Services (Einnahmen)',              detail: 'Datenquelle ausstehend' },
            { done: false, label: 'Lexware Rechnungs-Schnittstelle',               detail: 'API-Zugang benötigt' },
            { done: false, label: 'Business Plan Ist-Zustand Vergleich',           detail: 'Ziele eintragen' },
            { done: false, label: 'Sanierung Sales Dashboard (AWS DynamoDB)',      detail: 'AWS Access ausstehend' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', background: 'var(--effi-surface)', borderRadius: 8 }}>
              <span style={{ fontSize: 16 }}>{item.done ? '✅' : '○'}</span>
              <span style={{ fontSize: 12, fontWeight: item.done ? 500 : 400, color: item.done ? '#374151' : '#9ca3af', flex: 1 }}>{item.label}</span>
              <span style={{ fontSize: 10, color: item.done ? '#16a34a' : '#f59e0b', fontWeight: 600 }}>{item.detail}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
