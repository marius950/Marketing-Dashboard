'use client';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') router.replace('/');
    // URL-Param ?error= von NextAuth
    if (typeof window !== 'undefined' && window.location.search.includes('error')) {
      setError(true);
    }
  }, [status, router]);

  if (status === 'loading') return null;

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f5ee 100%)',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: '48px 40px', width: 380,
        boxShadow: '0 8px 40px rgba(0,0,0,.10)', textAlign: 'center',
      }}>
        {/* Überseehub Logo */}
        <img src="/uhub-logo.svg" alt="Überseehub" style={{ width: 180, marginBottom: 28 }} />

        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#011640', marginBottom: 6 }}>
          Business Dashboard
        </h1>
        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 32, lineHeight: 1.5 }}>
          Melde dich mit deinem<br />
          <strong>@ueberseehub.de</strong> Google-Account an
        </p>

        {error && (
          <div style={{
            background: '#fee2e2', color: '#dc2626', borderRadius: 10,
            padding: '10px 14px', fontSize: 13, marginBottom: 20,
          }}>
            ❌ Kein Zugriff. Nur @ueberseehub.de Accounts erlaubt.
          </div>
        )}

        <button
          onClick={() => signIn('google', { callbackUrl: '/' })}
          style={{
            width: '100%', padding: '14px 20px', borderRadius: 12,
            border: '1.5px solid #e5e7eb', background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            fontSize: 15, fontWeight: 600, color: '#111', cursor: 'pointer',
            transition: 'all .15s', boxShadow: '0 1px 4px rgba(0,0,0,.06)',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
          onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
        >
          {/* Google Logo */}
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
            <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
            <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
          </svg>
          Mit Google anmelden
        </button>

        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 24 }}>
          Nur für effi GmbH Mitarbeiter
        </p>
      </div>
    </div>
  );
}
