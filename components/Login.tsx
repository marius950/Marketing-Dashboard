'use client';
import { useState } from 'react';
import { Lang } from '@/lib/types';
import { t } from '@/lib/i18n';

const EFFI_LOGO = (
  <svg width="88" height="54" viewBox="0 0 198 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M0 60C0 26.863 26.863 0 60 0h138v120H60C26.863 120 0 93.137 0 60Z" fill="#C6F35F"/>
    <path d="M44.5 38h45v12h-31v8h28v11h-28v9h32v12h-46V38Z" fill="#010D0A"/>
    <path d="M100 38h14v54h-14V38ZM124 38h14v54h-14V38Z" fill="#010D0A"/>
    <path d="M148 38h14v22h22v12h-22v20h-14V38Z" fill="#010D0A"/>
  </svg>
);

interface LoginProps {
  lang: Lang;
  onLogin: () => void;
}

export default function Login({ lang, onLogin }: LoginProps) {
  const [pw, setPw] = useState('');
  const [error, setError] = useState(false);

  const check = () => {
    if (pw === 'Ueberseehub') {
      sessionStorage.setItem('effi_auth', '1');
      onLogin();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--effi-black)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999
    }}>
      <div style={{
        background: '#0d1f14', border: '1px solid rgba(198,243,95,.15)',
        borderRadius: 16, padding: '40px 36px', width: 360,
        boxShadow: '0 24px 60px rgba(0,0,0,.4)'
      }}>
        <div style={{ marginBottom: 24 }}>{EFFI_LOGO}</div>
        <p style={{ fontSize: 13, color: 'var(--effi-neutral)', marginBottom: 24 }}>
          {t(lang, 'login-subtitle')}
        </p>
        <input
          type="password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && check()}
          placeholder={t(lang, 'login-pw')}
          style={{
            width: '100%', padding: '10px 12px', border: '1px solid rgba(255,255,255,.15)',
            borderRadius: 8, fontSize: 14, marginBottom: 12,
            background: 'rgba(255,255,255,.07)', color: '#fff',
          }}
          autoFocus
        />
        <button
          onClick={check}
          style={{
            width: '100%', padding: 11, background: '#aad048', color: 'var(--effi-black)',
            border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer',
            fontWeight: 700, transition: 'background .15s'
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--effi-accent)')}
          onMouseLeave={e => (e.currentTarget.style.background = '#aad048')}
        >
          {t(lang, 'login-btn')}
        </button>
        {error && (
          <div style={{ fontSize: 12, color: '#ff8080', marginTop: 8 }}>
            {t(lang, 'login-error')}
          </div>
        )}
      </div>
    </div>
  );
}
