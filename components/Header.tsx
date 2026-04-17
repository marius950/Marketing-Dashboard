'use client';
import { signOut, useSession } from 'next-auth/react';
import { useState } from 'react';
import { Lang, Tab } from '@/lib/types';
import { t } from '@/lib/i18n';

export type Product = 'effi' | 'zinsbid' | 'uhub';

interface HeaderProps {
  lang:        Lang;
  setLang:     (l: Lang) => void;
  tab:         Tab;
  setTab:      (t: Tab) => void;
  from:        string;
  to:          string;
  setFrom:     (v: string) => void;
  setTo:       (v: string) => void;
  tabs:        { key: Tab; label: string }[];
  product:     Product;
  setProduct:  (p: Product) => void;
}

const PRODUCTS: { key: Product; label: string; color: string }[] = [
  { key: 'effi',    label: 'effi',    color: '#156949' },
  { key: 'zinsbid', label: 'Zinsbid', color: '#00008B' },
  { key: 'uhub',    label: '⚡ Digital Practices', color: '#E83434' },
];

export default function Header({ lang, setLang, tab, setTab, from, to, setFrom, setTo, tabs, product, setProduct }: HeaderProps) {
  const [localFrom, setLocalFrom] = useState(from);
  const [localTo,   setLocalTo]   = useState(to);
  const { data: session } = useSession();

  function apply() {
    if (localFrom && localTo && localFrom <= localTo) {
      setFrom(localFrom);
      setTo(localTo);
    }
  }

  const activeProduct = PRODUCTS.find(p => p.key === product) ?? PRODUCTS[0];

  return (
    <header style={{
      background: `linear-gradient(135deg, ${activeProduct.color} 0%, ${activeProduct.color}dd 100%)`,
      padding: '0 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 0,
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 2px 12px rgba(0,0,0,.15)',
      transition: 'background .3s',
    }}>

      {/* Top bar: Logo + Product Switcher + User */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0 8px', borderBottom: '1px solid rgba(255,255,255,.15)' }}>

        {/* ÜHub Logo */}
        <img src="/uhub-logo.svg" alt="Überseehub" style={{ height: 22, filter: 'brightness(0) invert(1)', flexShrink: 0 }} />

        <span style={{ color: 'rgba(255,255,255,.3)', fontSize: 16 }}>|</span>

        {/* Product Switcher */}
        <div style={{ display: 'flex', gap: 4 }}>
          {PRODUCTS.map(p => (
            <button
              key={p.key}
              onClick={() => setProduct(p.key)}
              style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', border: 'none', transition: 'all .15s',
                background: product === p.key ? 'rgba(255,255,255,.25)' : 'transparent',
                color: product === p.key ? '#fff' : 'rgba(255,255,255,.55)',
              }}
            >
              {p.key === 'zinsbid' ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <img src="/zinsbid-logo.png" alt="" style={{ height: 14, filter: product === p.key ? 'brightness(0) invert(1)' : 'brightness(0) invert(.6)' }} />
                </span>
              ) : p.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* User + Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {session?.user?.image && (
            <img src={session.user.image} alt="" style={{ width: 26, height: 26, borderRadius: '50%', border: '2px solid rgba(255,255,255,.3)' }} />
          )}
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.7)' }}>{session?.user?.email?.split('@')[0]}</span>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            style={{
              fontSize: 11, padding: '3px 9px', borderRadius: 8, cursor: 'pointer',
              border: '1px solid rgba(255,255,255,.2)', background: 'rgba(255,255,255,.1)',
              color: 'rgba(255,255,255,.7)', fontWeight: 500,
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Bottom bar: Tabs + Date + Lang */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 0', overflowX: 'auto' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, flex: 1, overflowX: 'auto' }}>
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                padding: '6px 14px', border: 'none', borderRadius: 8, whiteSpace: 'nowrap',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: tab === key ? 'rgba(255,255,255,.22)' : 'transparent',
                color: tab === key ? '#fff' : 'rgba(255,255,255,.6)',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Date range */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <input type="date" value={localFrom} onChange={e => setLocalFrom(e.target.value)}
            style={{ fontSize: 11, padding: '3px 6px', borderRadius: 6, border: '1px solid rgba(255,255,255,.2)', background: 'rgba(255,255,255,.1)', color: '#fff', colorScheme: 'dark' }} />
          <span style={{ color: 'rgba(255,255,255,.5)', fontSize: 11 }}>–</span>
          <input type="date" value={localTo} onChange={e => setLocalTo(e.target.value)}
            style={{ fontSize: 11, padding: '3px 6px', borderRadius: 6, border: '1px solid rgba(255,255,255,.2)', background: 'rgba(255,255,255,.1)', color: '#fff', colorScheme: 'dark' }} />
          <button onClick={apply}
            style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: 'rgba(255,255,255,.2)', color: '#fff', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>
            {t(lang, 'apply')}
          </button>
        </div>

        {/* Lang */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,.1)', borderRadius: 8, padding: 2, gap: 2, flexShrink: 0 }}>
          {(['de', 'en'] as Lang[]).map(l => (
            <button key={l} onClick={() => setLang(l)}
              style={{ padding: '4px 10px', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: lang === l ? 'var(--effi-accent)' : 'transparent',
                color: lang === l ? 'var(--effi-black)' : 'rgba(255,255,255,.6)' }}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
