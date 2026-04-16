'use client';
import { useState, useEffect, useCallback } from 'react';
import Login from '@/components/Login';
import Header from '@/components/Header';
import OverviewTab from '@/components/OverviewTab';
import GoogleTab from '@/components/GoogleTab';
import MetaTab from '@/components/MetaTab';
import BudgetTab from '@/components/BudgetTab';
import SanierungTab from '@/components/SanierungTab';
import BaufiTab from '@/components/BaufiTab';
import { Lang, Tab, DateRange, MetaData, GoogleData, MetaCampaignsData } from '@/lib/types';
import { t } from '@/lib/i18n';

function getDefaultDates() {
  const to = new Date();
  to.setDate(to.getDate() - 1);
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export default function Page() {
  const [authed, setAuthed]       = useState(false);
  const [lang, setLangState]      = useState<Lang>('de');
  const [tab, setTab]             = useState<Tab>('overview');
  const [dateRange, setDateRange] = useState<DateRange>('last_30d');
  const defaults = getDefaultDates();
  const [customFrom, setCustomFrom] = useState(defaults.from);
  const [customTo, setCustomTo]     = useState(defaults.to);

  const [metaData, setMetaData]           = useState<MetaData | null>(null);
  const [googleData, setGoogleData]       = useState<GoogleData | null>(null);
  const [metaCampaigns, setMetaCampaigns] = useState<MetaCampaignsData | null>(null);

  const [loadingMeta, setLoadingMeta]     = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  // Auth check on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const auth = sessionStorage.getItem('effi_auth');
      setAuthed(auth === '1');
      const savedLang = (sessionStorage.getItem('effi_lang') || 'de') as Lang;
      setLangState(savedLang);
    }
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    sessionStorage.setItem('effi_lang', l);
  };

  const buildParams = useCallback(() => {
    if (dateRange === 'custom') {
      return { dateRange: 'custom', from: customFrom, to: customTo };
    }
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const to = d.toISOString().slice(0, 10);
    const days = dateRange === 'last_7d' ? 7 : dateRange === 'last_90d' ? 90 : dateRange === 'last_180d' ? 180 : dateRange === 'last_year' ? 365 : 30;
    const from = new Date();
    from.setDate(from.getDate() - days);
    return { dateRange, from: from.toISOString().slice(0, 10), to };
  }, [dateRange, customFrom, customTo]);

  const loadData = useCallback(async () => {
    const { dateRange: dr, from, to } = buildParams();

    setLoadingMeta(true);
    setLoadingGoogle(true);

    // Meta summary
    fetch(`/api/meta?dateRange=${dr}&from=${from}&to=${to}`)
      .then(r => r.json())
      .then(d => { setMetaData(d); setLoadingMeta(false); })
      .catch(() => setLoadingMeta(false));

    // Meta campaigns
    fetch(`/api/meta-campaigns?from=${from}&to=${to}`)
      .then(r => r.json())
      .then(d => setMetaCampaigns(d))
      .catch(() => {});

    // Google
    fetch(`/api/google?from=${from}&to=${to}`)
      .then(r => r.json())
      .then(d => { setGoogleData(d); setLoadingGoogle(false); })
      .catch(() => setLoadingGoogle(false));
  }, [buildParams]);

  // Load on auth
  useEffect(() => {
    if (authed) loadData();
  }, [authed, loadData]);

  if (!authed) return <Login lang={lang} onLogin={() => setAuthed(true)} />;

  const TAB_CONFIG: { key: Tab; label: string; color?: string }[] = [
    { key: 'overview', label: t(lang, 'tab-overview') },
    { key: 'google',   label: t(lang, 'tab-google'),   color: 'var(--google)' },
    { key: 'meta',     label: t(lang, 'tab-meta'),     color: 'var(--meta)' },
    { key: 'budget',   label: t(lang, 'tab-budget') },
    { key: 'sanierung', label: '🟢 Sanierung' },
    { key: 'baufi',     label: '🔵 Baufi Sales' },
  ];

  return (
    <>
      <Header
        lang={lang}
        setLang={setLang}
        dateRange={dateRange}
        setDateRange={setDateRange}
        customFrom={customFrom}
        customTo={customTo}
        setCustomFrom={setCustomFrom}
        setCustomTo={setCustomTo}
        onLoad={loadData}
      />

      <main style={{ padding: '28px 32px', maxWidth: 1400, margin: '0 auto' }}>
        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 4, marginBottom: 24,
          background: '#fff', padding: 4, borderRadius: 10,
          width: 'fit-content', border: '1px solid var(--effi-border)',
          boxShadow: '0 1px 4px rgba(0,0,0,.06)',
        }}>
          {TAB_CONFIG.map(tc => {
            const isActive = tab === tc.key;
            const activeBg = tc.color ?? 'var(--effi-primary)';
            return (
              <button
                key={tc.key}
                onClick={() => setTab(tc.key)}
                style={{
                  padding: '7px 18px', borderRadius: 7, fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer', border: 'none',
                  background: isActive ? activeBg : 'transparent',
                  color: isActive ? (tc.color ? '#fff' : 'var(--effi-accent)') : 'var(--effi-text-sec)',
                  transition: 'all .15s',
                  letterSpacing: isActive ? '0.01em' : 'normal',
                }}
              >
                {tc.label}
              </button>
            );
          })}
        </div>

        {/* Tab panels */}
        {tab === 'overview' && (
          <OverviewTab lang={lang} meta={metaData} google={googleData} loading={loadingMeta || loadingGoogle} />
        )}
        {tab === 'google' && (
          <GoogleTab lang={lang} data={googleData} loading={loadingGoogle} />
        )}
        {tab === 'meta' && (
          <MetaTab lang={lang} data={metaData} campaigns={metaCampaigns} loading={loadingMeta} />
        )}
        {tab === 'budget' && (
          <BudgetTab lang={lang} meta={metaData} google={googleData} />
        )}
        {tab === 'sanierung' && (
          <SanierungTab lang={lang} from={customFrom} to={customTo} />
        )}
        {tab === 'baufi' && (
          <BaufiTab lang={lang} from={customFrom} to={customTo} />
        )}
      </main>
    </>
  );
}
