'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header, { Product } from '@/components/Header';
import ZinsbidTab from '@/components/ZinsbidTab';
import DigitalPracticesTab from '@/components/DigitalPracticesTab';
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
  const { data: session, status } = useSession();
  const router = useRouter();
  const [lang, setLangState]      = useState<Lang>('de');
  const [tab, setTab]             = useState<Tab>('overview');
  const [product, setProduct]     = useState<Product>('effi');

  // Bei Produkt-Wechsel: Tab auf ersten setzen
  function handleSetProduct(p: Product) {
    setProduct(p);
    if (p === 'effi')    setTab('overview');
    if (p === 'zinsbid') setTab('zinsbid');
    if (p === 'uhub')    setTab('dp_board');
  }

  function handleApplyDates(from: string, to: string) {
    setCustomFrom(from);
    setCustomTo(to);
    setDateRange('custom');
    // Re-fetch Google + Meta with new dates
    setLoadingMeta(true);
    setLoadingGoogle(true);
    fetch(`/api/meta?dateRange=custom&from=${from}&to=${to}`)
      .then(r => r.json()).then(d => { setMetaData(d); setLoadingMeta(false); }).catch(() => setLoadingMeta(false));
    fetch(`/api/meta-campaigns?from=${from}&to=${to}`)
      .then(r => r.json()).then(d => setMetaCampaigns(d)).catch(() => {});
    fetch(`/api/google?from=${from}&to=${to}`)
      .then(r => r.json()).then(d => { setGoogleData(d); setLoadingGoogle(false); }).catch(() => setLoadingGoogle(false));
  }
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
      // auth handled by NextAuth session
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
    if (status === 'authenticated') loadData();
  }, [status, loadData]);



  const EFFI_TABS: { key: Tab; label: string }[] = [
    { key: 'overview',   label: t(lang, 'overview') },
    { key: 'google',     label: 'Google Ads' },
    { key: 'meta',       label: 'Meta Ads' },
    { key: 'budget',     label: 'Budget' },
    { key: 'sanierung',  label: 'Sanierung' },
    { key: 'baufi',      label: 'Baufi Sales' },
  ];
  const ZINSBID_TABS: { key: Tab; label: string }[] = [
    { key: 'zinsbid',   label: 'Zinsbid Dashboard' },
  ];
  const UHUB_TABS: { key: Tab; label: string }[] = [
    { key: 'dp_board',  label: 'Digital Practices' },
  ];

  const TAB_CONFIG: { key: Tab; label: string; color?: string }[] = [
    { key: 'overview', label: t(lang, 'tab-overview') },
    { key: 'google',   label: t(lang, 'tab-google'),   color: 'var(--google)' },
    { key: 'meta',     label: t(lang, 'tab-meta'),     color: 'var(--meta)' },
    { key: 'budget',   label: t(lang, 'tab-budget') },
    { key: 'sanierung', label: 'Sanierung' },
    { key: 'baufi',     label: 'Baufi Sales' },
  ];

  return (
    <>
      <Header
        lang={lang}
        setLang={setLangState}
        tab={tab}
        setTab={setTab}
        from={customFrom}
        to={customTo}
        setFrom={setCustomFrom}
        setTo={setCustomTo}
        onApply={handleApplyDates}
        tabs={product === 'effi' ? EFFI_TABS : product === 'zinsbid' ? ZINSBID_TABS : UHUB_TABS}
        product={product}
        setProduct={handleSetProduct}
      />

      <main style={{ padding: '28px 32px', maxWidth: 1400, margin: '0 auto' }}>
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
        {tab === 'zinsbid' && (
          <ZinsbidTab lang={lang} from={customFrom} to={customTo} />
        )}
        {tab === 'dp_board' && (
          <DigitalPracticesTab lang={lang} from={customFrom} to={customTo} />
        )}
      </main>
    </>
  );
}
