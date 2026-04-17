'use client';
import { signOut, useSession } from 'next-auth/react';
import { Lang, DateRange } from '@/lib/types';
import { t } from '@/lib/i18n';

const LOGO = (
  <svg width="99" height="60" viewBox="0 0 198 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M197 24.7019C197 32.731 190.489 39.2399 182.456 39.2399C174.424 39.2399 167.913 32.731 167.913 24.7019C167.913 16.6729 174.424 10.164 182.456 10.164C190.489 10.164 197 16.6729 197 24.7019Z" fill="#C6F35F"/>
    <path d="M155.917 0C161.143 1.18041e-06 166.078 1.00223 169.853 2.14746C172.869 3.06289 175.31 4.73375 176.854 6.54785C171.106 9.0408 166.767 14.1087 165.341 20.2715C163.652 20.0233 162.045 19.8985 160.562 19.8984C154.059 19.8984 149.029 22.6422 149.304 31.3887V43.0771H195.461V120H170.836V61.5391H149.289V120H126.159V61.5391H110.812V120H87.2725V62.1289H78.2725V43.5186H87.2725V40.9424C87.2725 17.4652 102.659 10.5938 115.578 10.5938C119.933 10.5938 122.944 11.1984 125.434 12.168C127.441 12.9498 128.603 13.3899 129.759 13.9922C135.153 3.6283 145.787 0 155.917 0ZM39.6279 41.5391C62.8532 41.5391 80.4171 56.2839 79.2559 87.9209H24.2412C25.1123 94.9353 32.2256 100.231 41.0801 100.231C48.483 100.231 54.1438 97.2253 57.0469 91.9287L78.0947 94.0762C74.0303 109.107 58.6438 119.844 40.9346 119.844C16.9835 119.844 0 104.24 0 81.0488C0.000160767 58.2876 16.4029 41.5392 39.6279 41.5391ZM39.6279 60.5781C31.0639 60.5782 24.5324 65.0159 24.0967 72.3164H55.1602C54.5793 65.3021 48.1921 60.5781 39.6279 60.5781ZM125.434 30.7783C117.885 28.4879 109.917 29.6208 111.224 43.0771H126.159V30.957L125.434 30.7783Z" fill="white"/>
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
  { key: 'last_7d',   label_de: '7T',   label_en: '7D' },
  { key: 'last_30d',  label_de: '30T',  label_en: '30D' },
  { key: 'last_90d',  label_de: '90T',  label_en: '90D' },
  { key: 'last_180d', label_de: '180T', label_en: '180D' },
  { key: 'last_year', label_de: '1J',   label_en: '1Y' },
];

export default function Header({
  lang, setLang, dateRange, setDateRange,
  customFrom, customTo, setCustomFrom, setCustomTo, onLoad,
}: HeaderProps) {
  return (
    <header style={{
      background: 'var(--effi-black)', padding: '0 28px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      height: 64, gap: 12, boxShadow: '0 2px 12px rgba(0,0,0,.25)',
      flexWrap: 'wrap', minHeight: 64,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        {LOGO}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1, justifyContent: 'center' }}>
        {/* Quick Presets */}
        <div style={{ display: 'flex', gap: 3 }}>
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
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,.5)' }}>{t(lang, 'from')}</span>
        <input
          type="date"
          value={customFrom}
          onChange={e => { setCustomFrom(e.target.value); setDateRange('custom'); }}
          style={{
            padding: '5px 8px', border: '1px solid rgba(255,255,255,.2)',
            borderRadius: 7, fontSize: 12, background: 'rgba(255,255,255,.08)', color: '#fff',
          }}
        />
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,.5)' }}>{t(lang, 'to')}</span>
        <input
          type="date"
          value={customTo}
          onChange={e => { setCustomTo(e.target.value); setDateRange('custom'); }}
          style={{
            padding: '5px 8px', border: '1px solid rgba(255,255,255,.2)',
            borderRadius: 7, fontSize: 12, background: 'rgba(255,255,255,.08)', color: '#fff',
          }}
        />
        <button
          onClick={onLoad}
          style={{
            padding: '6px 14px', background: 'var(--effi-accent)',
            color: 'var(--effi-black)', border: 'none', borderRadius: 7,
            fontSize: 12, cursor: 'pointer', fontWeight: 700,
          }}
        >
          {t(lang, 'apply')}
        </button>
      </div>

      {/* User + Logout */}
      {(() => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const { data: session } = useSession();
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {session?.user?.image && (
              <img src={session.user.image} alt="" style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid rgba(255,255,255,.3)' }} />
            )}
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,.7)' }}>{session?.user?.email?.split('@')[0]}</span>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              style={{
                fontSize: 11, padding: '4px 10px', borderRadius: 8, cursor: 'pointer',
                border: '1px solid rgba(255,255,255,.2)', background: 'rgba(255,255,255,.1)',
                color: 'rgba(255,255,255,.7)', fontWeight: 500,
              }}
            >
              Logout
            </button>
          </div>
        );
      })()}

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
            }}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>
    </header>
  );
}
