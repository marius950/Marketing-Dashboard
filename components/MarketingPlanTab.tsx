'use client';
import { useState } from 'react';
import { Lang } from '@/lib/types';
import { fmtEur } from '@/lib/utils';

interface MarketingPlanTabProps { lang: Lang; from: string; to: string; }

const CARD = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: '#fff', borderRadius: 12, padding: '20px 22px',
  border: '1px solid var(--effi-border)', boxShadow: '0 1px 4px rgba(0,0,0,.05)', ...extra,
});

const TABS = ['Kampagnen', 'Baufi Webplattform', 'Sanierung', 'Budget-Plan'] as const;
type SubTab = typeof TABS[number];

// Baufi Webplattform Kampagnenplanung (ab 13.5.)
const BAUFI_CAMPAIGNS = [
  { name: 'Baufi Webplattform — Brand Awareness', channel: 'Meta', start: '2026-05-13', budget_monthly: 5000, target: 'App-Installs → Webplattform', status: 'planned', segment: 'Baufi' },
  { name: 'Baufi Webplattform — Performance', channel: 'Google', start: '2026-05-13', budget_monthly: 8000, target: 'Kaufbereite Nutzer, CPL < €100', status: 'planned', segment: 'Baufi' },
  { name: 'Baufi Retargeting', channel: 'Meta', start: '2026-05-20', budget_monthly: 2000, target: 'Webplattform-Besucher', status: 'planned', segment: 'Baufi' },
  { name: 'Baufi Lead Gen Form', channel: 'Meta', start: '2026-06-01', budget_monthly: 3000, target: 'Lead Gen Ads, Formulare', status: 'planned', segment: 'Baufi' },
];

// Sanierung Kampagnenplanung — Umstellung nach Sanierungsrechner Live
const SANIERUNG_CAMPAIGNS = [
  { name: 'Sanierung — Nördliche PLZ', channel: 'Meta', start: '2026-05-01', budget_monthly: 15000, target: 'PLZ 20xxx-26xxx (Hamburg/Bremen/Niedersachsen)', status: 'active', segment: 'Sanierung' },
  { name: 'Sanierung — PV Gewerksrechner', channel: 'Meta', start: '2026-05-01', budget_monthly: 5000, target: 'PV-Leads nach Gewerksrechner-Launch', status: 'planned', segment: 'Sanierung' },
  { name: 'Sanierung — Süd (Bestand)', channel: 'Meta', start: '2026-04-01', budget_monthly: 12000, target: 'Bestehende Kampagnen südliche PLZ', status: 'active', segment: 'Sanierung' },
  { name: 'Sanierung — Förderrechner Retargeting', channel: 'Google', start: '2026-05-15', budget_monthly: 3000, target: 'Förderrechner-Besucher → Lead', status: 'planned', segment: 'Sanierung' },
];

const CHANNEL_COLOR: Record<string, string> = {
  Meta:   '#1877F2',
  Google: '#4285F4',
};

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  active:  { bg: '#dcfce7', text: '#16a34a' },
  planned: { bg: '#eff6ff', text: '#2563eb' },
  paused:  { bg: '#fef3c7', text: '#f59e0b' },
};

function CampaignRow({ c }: { c: typeof BAUFI_CAMPAIGNS[0] }) {
  const sc = STATUS_COLOR[c.status] ?? STATUS_COLOR.planned;
  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid var(--effi-surface)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: `${CHANNEL_COLOR[c.channel]}22`, color: CHANNEL_COLOR[c.channel] }}>{c.channel}</span>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: sc.bg, color: sc.text }}>
          {c.status === 'active' ? '● Live' : c.status === 'planned' ? '○ Geplant' : '⏸ Pausiert'}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--effi-neutral)' }}>
        <span>Start: <strong>{c.start}</strong></span>
        <span>Budget: <strong style={{ color: '#156949' }}>{fmtEur(c.budget_monthly)}/Monat</strong></span>
        <span>Ziel: {c.target}</span>
      </div>
    </div>
  );
}

// Budget Plan aus Business Plan
const QUARTERLY_BUDGET = [
  { q: 'Q1 2026', spend: 40000, roas: 24.7, revenue: 9897,   actual: true },
  { q: 'Q2 2026', spend: 55000, roas: 73.2, revenue: 40250,  actual: false },
  { q: 'Q3 2026', spend: 77500, roas: 141.4, revenue: 109567, actual: false },
  { q: 'Q4 2026', spend: 92500, roas: 199.2, revenue: 184250, actual: false },
];

export default function MarketingPlanTab({ lang, from, to }: MarketingPlanTabProps) {
  const [subTab, setSubTab] = useState<SubTab>('Kampagnen');

  const allCampaigns  = [...BAUFI_CAMPAIGNS, ...SANIERUNG_CAMPAIGNS];
  const totalPlanned  = allCampaigns.filter(c => c.status === 'planned').reduce((s, c) => s + c.budget_monthly, 0);
  const totalActive   = allCampaigns.filter(c => c.status === 'active').reduce((s, c)  => s + c.budget_monthly, 0);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ background: '#156949', borderRadius: 10, padding: '8px 14px', color: '#C6F35F', fontSize: 18, fontWeight: 800 }}>Plan</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#156949' }}>Marketing Planung effi</div>
          <div style={{ fontSize: 12, color: 'var(--effi-neutral)' }}>Kampagnen & Budget-Plan 2026</div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Aktive Kampagnen',   value: String(allCampaigns.filter(c => c.status === 'active').length),   color: '#16a34a' },
          { label: 'Geplante Kampagnen', value: String(allCampaigns.filter(c => c.status === 'planned').length),  color: '#2563eb' },
          { label: 'Budget aktiv/Monat', value: fmtEur(totalActive),    color: '#156949' },
          { label: 'Budget geplant/Monat', value: fmtEur(totalPlanned), color: '#f59e0b' },
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
            padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            cursor: 'pointer', border: 'none',
            background: subTab === t ? '#156949' : 'var(--effi-surface)',
            color: subTab === t ? '#fff' : 'var(--effi-text-sec)',
          }}>{t}</button>
        ))}
      </div>

      {/* Alle Kampagnen */}
      {subTab === 'Kampagnen' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={CARD()}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Baufi Kampagnen (ab 13.5.)</div>
            {BAUFI_CAMPAIGNS.map(c => <CampaignRow key={c.name} c={c} />)}
          </div>
          <div style={CARD()}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Sanierung Kampagnen</div>
            {SANIERUNG_CAMPAIGNS.map(c => <CampaignRow key={c.name} c={c} />)}
          </div>
        </div>
      )}

      {/* Baufi Webplattform */}
      {subTab === 'Baufi Webplattform' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={CARD({ borderTop: '3px solid #00008B' })}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Baufi Webplattform — Start 13.5.2026</div>
            <div style={{ fontSize: 12, color: 'var(--effi-text-sec)', marginBottom: 16, lineHeight: 1.7 }}>
              Mit Launch der Webplattform starten neue Kampagnen die direkt auf das Portal führen. Ziel: CPL von €533 → €150 senken.
            </div>
            {BAUFI_CAMPAIGNS.map(c => <CampaignRow key={c.name} c={c} />)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={CARD()}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Ziele Q2/Q3</div>
              {[
                ['CPL Ziel',         '€150 (vorher €533)'],
                ['Leads/Monat',      '≥ 70 (200/Q2)'],
                ['Budget Meta',      '€5.000/Monat'],
                ['Budget Google',    '€8.000/Monat'],
                ['Abschlüsse Q2',    '3 (€9K Revenue)'],
                ['Webplattform Live', '13.5.2026'],
              ].map(([k, v]) => (
                <div key={String(k)} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--effi-surface)' }}>
                  <span style={{ fontSize: 12, color: 'var(--effi-text-sec)' }}>{k}</span>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={CARD({ borderTop: '3px solid #f59e0b' })}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Kanalstrategie</div>
              <div style={{ fontSize: 12, color: 'var(--effi-text-sec)', lineHeight: 1.8 }}>
                <strong>Meta:</strong> Brand Awareness + Retargeting · Zielgruppe 28-45 Jahre, Hauskauf-Intent<br />
                <strong>Google:</strong> Search auf Keywords wie "Baufinanzierung berechnen", "Hypothek vergleichen"<br />
                <strong>Tracking:</strong> Webplattform-Events → Meta Pixel + Google Tag
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sanierung */}
      {subTab === 'Sanierung' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={CARD({ borderTop: '3px solid #156949' })}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Sanierung — Umstellung nach Rechner-Launch</div>
            <div style={{ fontSize: 12, color: 'var(--effi-text-sec)', marginBottom: 16, lineHeight: 1.7 }}>
              Nach dem Sanierungsrechner-Launch: Ausweitung auf nördliche PLZ + neue PV/Gewerksrechner-Kampagnen.
            </div>
            {SANIERUNG_CAMPAIGNS.map(c => <CampaignRow key={c.name} c={c} />)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={CARD()}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>PLZ-Targeting Norden</div>
              {[
                ['Hamburg',           '20xxx-21xxx'],
                ['Bremen',            '27xxx-28xxx'],
                ['Schleswig-Holstein', '22xxx-25xxx'],
                ['Niedersachsen Nord', '26xxx-27xxx'],
                ['Mecklenburg-VP',    '17xxx-19xxx'],
              ].map(([region, plz]) => (
                <div key={String(region)} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--effi-surface)' }}>
                  <span style={{ fontSize: 12, color: 'var(--effi-text-sec)' }}>{region}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#156949' }}>{plz}</span>
                </div>
              ))}
            </div>
            <div style={CARD({ borderTop: '3px solid #C6F35F' })}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Neue Gewerksrechner</div>
              <div style={{ fontSize: 12, color: 'var(--effi-text-sec)', lineHeight: 1.8 }}>
                <strong>PV-Rechner:</strong> Nach Live → PV-Leads als neues Segment<br />
                <strong>Förderrechner:</strong> BAFA/KfW → Lead-Gen Retargeting<br />
                <strong>WVQ-Ziel Q2:</strong> 45% · Q3: 65% · Q4: 70%<br />
                <strong>Partner-Ziel Q2:</strong> 40 aktive Partner
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Budget-Plan */}
      {subTab === 'Budget-Plan' && (
        <div style={CARD()}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Ad Spend Plan 2026 (aus Business Plan)</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {QUARTERLY_BUDGET.map(q => (
              <div key={q.q} style={{ background: q.actual ? '#f0fdf4' : 'var(--effi-surface)', borderRadius: 10, padding: '14px', border: q.actual ? '1px solid #86efac' : '1px solid var(--effi-border)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: q.actual ? '#16a34a' : '#374151', marginBottom: 10 }}>
                  {q.actual ? '✅ ' : ''}{q.q}
                </div>
                {[
                  ['Ad Spend',   fmtEur(q.spend),   '#6366f1'],
                  ['Rev-Ziel',   fmtEur(q.revenue), '#156949'],
                  ['ROAS-Ziel',  `${q.roas}%`,      '#f59e0b'],
                ].map(([k, v, c]) => (
                  <div key={String(k)} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span style={{ fontSize: 11, color: 'var(--effi-text-sec)' }}>{k}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: String(c) }}>{v}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20, fontSize: 12, color: 'var(--effi-text-sec)', lineHeight: 1.8 }}>
            <strong>Jahresgesamt Ad Spend:</strong> {fmtEur(265000)} · <strong>Jahres-Revenue-Ziel:</strong> {fmtEur(343963)} · <strong>Ziel-ROAS:</strong> 129,8%
          </div>
        </div>
      )}
    </div>
  );
}
