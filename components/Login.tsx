'use client';
import { useState } from 'react';
import { Lang } from '@/lib/types';
import { t } from '@/lib/i18n';

const EFFI_LOGO = (
  <svg width="132" height="80" viewBox="0 0 198 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M197 24.7019C197 32.731 190.489 39.2399 182.456 39.2399C174.424 39.2399 167.913 32.731 167.913 24.7019C167.913 16.6729 174.424 10.164 182.456 10.164C190.489 10.164 197 16.6729 197 24.7019Z" fill="#C6F35F"/>
    <path d="M155.917 0C161.143 1.18041e-06 166.078 1.00223 169.853 2.14746C172.869 3.06289 175.31 4.73375 176.854 6.54785C171.106 9.0408 166.767 14.1087 165.341 20.2715C163.652 20.0233 162.045 19.8985 160.562 19.8984C154.059 19.8984 149.029 22.6422 149.304 31.3887V43.0771H195.461V120H170.836V61.5391H149.289V120H126.159V61.5391H110.812V120H87.2725V62.1289H78.2725V43.5186H87.2725V40.9424C87.2725 17.4652 102.659 10.5938 115.578 10.5938C119.933 10.5938 122.944 11.1984 125.434 12.168C127.441 12.9498 128.603 13.3899 129.759 13.9922C135.153 3.6283 145.787 0 155.917 0ZM39.6279 41.5391C62.8532 41.5391 80.4171 56.2839 79.2559 87.9209H24.2412C25.1123 94.9353 32.2256 100.231 41.0801 100.231C48.483 100.231 54.1438 97.2253 57.0469 91.9287L78.0947 94.0762C74.0303 109.107 58.6438 119.844 40.9346 119.844C16.9835 119.844 0 104.24 0 81.0488C0.000160767 58.2876 16.4029 41.5392 39.6279 41.5391ZM39.6279 60.5781C31.0639 60.5782 24.5324 65.0159 24.0967 72.3164H55.1602C54.5793 65.3021 48.1921 60.5781 39.6279 60.5781ZM125.434 30.7783C117.885 28.4879 109.917 29.6208 111.224 43.0771H126.159V30.957L125.434 30.7783Z" fill="white"/>
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
        borderRadius: 16, padding: '40px 36px', width: 380,
        boxShadow: '0 24px 60px rgba(0,0,0,.4)'
      }}>
        <div style={{ marginBottom: 28 }}>{EFFI_LOGO}</div>
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
            fontWeight: 700,
          }}
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
