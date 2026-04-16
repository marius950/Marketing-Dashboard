'use client';
import { Lang, DateRange } from '@/lib/types';
import { t } from '@/lib/i18n';

const LOGO = (
  <svg width="66" height="40" viewBox="0 0 198 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M0 60C0 26.863 26.863 0 60 0h138v120H60C26.863 120 0 93.137 0 60Z" fill="#C6F35F"/>
    <path d="M44.5 38h45v12h-31v8h28v11h-28v9h32v12h-46V38Z" fill="#010D0A"/>
    <path d="M100 38h14v54h-14V38ZM124 38h14v54h-14V38Z" fill="#010D0A"/>
    <path d="M148 38h14v22h22v12h-22v20h-14V38Z" fill="#010D0A"/>
  </svg>
);

interface HeaderProps {
  lang: Lang;
  setLang: (l: Lang) => void;
  dateRange: DateRange;
  setDateRange: (d: DateRange) => void;
  customFrom: string;
  customTo: string;
  setCustomFrom: (s: string) => void;
  setCustomTo: (s: string) => void;
  onLoad: () => void;
}

const PRESETS: { key: DateRange; label_de: string; label_en: string }[] = [
  { key: 'last_7d',    label_de: '7T',   label_en: '7D' },
  { key: 'last_30d',   label_de: '30T',  label_en: '30D' },
  { key: 'last_90d',   label_de: '90T',  label_en: '90D' },
  { key: 'last_180d',  label_de: '180T', label_en: '180D' },
  { key: 'last_year',  label_de: '1J',   label_en: '1Y' },
];

export default function Header({
  lang, setLang, dateRange, setDateRange,
  customFrom, customTo, setCustomFrom, setCustomTo, onLoad,
}: HeaderProps) {
  return (
    <header style={{
      background: 'var(--effi-black)', padding: '0 32px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      height: 64, gap: 12, boxShadow: '0 2px 12px rgba(0,0,0,.25)',
      flexWrap: 'wrap',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        {LOGO}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {/* Quick Presets */}
        <div style={{ display: 'flex', gap: 4 }}>
          {PRESETS.map(p => (
            <button
              key={p.key}
              onClick={() => { setDateRange(p.key); onLoad(); }}
              style={{
                padding: '5px 10px',
                border: '1px solid rgba(255,255,255,.2)',
                borderRadius: 6, fontSize: 12, cursor: 'pointer',
                background: dateRange === p.key ? 'var(--effi-accent)' : 'rgba(255,255,255,.08)',
                color: dateRange === p.key ? 'var(--effi-black)' : 'rgba(255,255,255,.7)',
                fontWeight: dateRange === p.key ? 700 : 400,
              }}
            >
              {lang === 'de' ? p.label_de : p.label_en}
            </button>
          ))}
        </div>

        {/* Custom date range */}
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,.6)' }}>{t(lang, 'from')}</span>
        <input
          type="date"
          value={customFrom}
          onChange={e => { setCustomFrom(e.target.value); setDateRange('custom'); }}
          style={{
            padding: '6px 10px', border: '1px solid rgba(255,255,255,.2)',
            borderRadius: 8, fontSize: 13, background: 'rgba(255,255,255,.08)', color: '#fff',
          }}
        />
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,.6)' }}>{t(lang, 'to')}</span>
        <input
          type="date"
          value={customTo}
          onChange={e => { setCustomTo(e.target.value); setDateRange('custom'); }}
          style={{
            padding: '6px 10px', border: '1px solid rgba(255,255,255,.2)',
            borderRadius: 8, fontSize: 13, background: 'rgba(255,255,255,.08)', color: '#fff',
          }}
        />
        <button
          onClick={onLoad}
          style={{
            padding: '7px 16px', background: 'var(--effi-accent)',
            color: 'var(--effi-black)', border: 'none', borderRadius: 8,
            fontSize: 13, cursor: 'pointer', fontWeight: 700,
          }}
        >
          {t(lang, 'apply')}
        </button>
      </div>

      {/* Lang toggle */}
      <div style={{
        display: 'flex', background: 'rgba(255,255,255,.1)',
        borderRadius: 8, padding: 2, gap: 2, flexShrink: 0,
      }}>
        {(['de', 'en'] as Lang[]).map(l => (
          <button
            key={l}
            onClick={() => setLang(l)}
            style={{
              padding: '4px 10px', border: 'none', borderRadius: 6,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: lang === l ? 'var(--effi-accent)' : 'transparent',
              color: lang === l ? 'var(--effi-black)' : 'rgba(255,255,255,.6)',
              transition: 'all .15s',
            }}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>
    </header>
  );
}
