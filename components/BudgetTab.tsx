'use client';
import { useState, useEffect } from 'react';
import { Lang, MetaData, GoogleData } from '@/lib/types';
import { t } from '@/lib/i18n';
import { fmtEur, fmt } from '@/lib/utils';

interface BudgetTabProps { lang: Lang; meta: MetaData | null; google: GoogleData | null; }

function BudgetInput({ label, id, value, onChange, step = 100, min = 0, max }: any) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--effi-neutral)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
        {label}
      </label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        min={min} max={max} step={step}
        style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--effi-border)', borderRadius: 8, fontSize: 14, fontWeight: 600, color: 'var(--effi-black)', background: 'var(--effi-surface)' }}
      />
    </div>
  );
}

function BudgetBar({ label, spent, budget, color }: { label: string; spent: number; budget: number; color: string }) {
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const over = spent > budget;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 500, width: 140, flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, background: 'var(--effi-surface2)', borderRadius: 6, height: 12, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 6, transition: 'width .4s', width: `${pct}%`, background: over ? '#dc2626' : color }} />
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, width: 80, textAlign: 'right' }}>{fmtEur(spent)}</div>
      <div style={{ fontSize: 11, color: 'var(--effi-neutral)', width: 38, textAlign: 'right' }}>{pct.toFixed(0)}%</div>
    </div>
  );
}

function StatCard({ label, value, sub, colorClass }: { label: string; value: string; sub?: string; colorClass?: string }) {
  return (
    <div style={{ background: 'var(--effi-surface)', borderRadius: 8, padding: '12px 14px', border: '1px solid var(--effi-border)' }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--effi-neutral)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: colorClass === 'over' ? '#dc2626' : colorClass === 'warn' ? '#d97706' : colorClass === 'ok' ? '#16a34a' : 'var(--effi-black)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--effi-text-sec)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function BudgetTab({ lang, meta, google }: BudgetTabProps) {
  const [total,     setTotal]     = useState(15000);
  const [metaBudget, setMetaBudget] = useState(10000);
  const [gBudget,  setGBudget]   = useState(5000);
  const [sanPct,   setSanPct]    = useState(40);
  const [cplSan,   setCplSan]    = useState(22.5);
  const [cplBaufi, setCplBaufi]  = useState(70);
  const [wvq,      setWvq]       = useState(45);
  const [vkPrice,  setVkPrice]   = useState(75);
  const [abschluss, setAbschluss] = useState(2.4);
  const [provision, setProvision] = useState(3000);

  // Persist to localStorage
  useEffect(() => {
    const saved = localStorage.getItem('effi_budget');
    if (saved) {
      try {
        const v = JSON.parse(saved);
        if (v.total)     setTotal(v.total);
        if (v.metaBudget) setMetaBudget(v.metaBudget);
        if (v.gBudget)   setGBudget(v.gBudget);
        if (v.sanPct)    setSanPct(v.sanPct);
        if (v.cplSan)    setCplSan(v.cplSan);
        if (v.cplBaufi)  setCplBaufi(v.cplBaufi);
        if (v.wvq)       setWvq(v.wvq);
        if (v.vkPrice)   setVkPrice(v.vkPrice);
        if (v.abschluss) setAbschluss(v.abschluss);
        if (v.provision) setProvision(v.provision);
      } catch {}
    }
  }, []);

  const save = (updates: Record<string, number>) => {
    const current = { total, metaBudget, gBudget, sanPct, cplSan, cplBaufi, wvq, vkPrice, abschluss, provision };
    localStorage.setItem('effi_budget', JSON.stringify({ ...current, ...updates }));
  };

  const metaSpend   = meta?.summary.spend ?? 0;
  const googleSpend = google?.summary.spend ?? 0;
  const totalSpend  = metaSpend + googleSpend;
  const sanSpend    = totalSpend * (sanPct / 100);
  const baufiSpend  = totalSpend * (1 - sanPct / 100);

  const days = meta?.daily.length ?? google?.daily.length ?? 30;
  const dailyAvg   = days > 0 ? totalSpend / days : 0;
  const forecast   = dailyAvg * 30;
  const remaining  = total - totalSpend;
  const spentPct   = total > 0 ? (totalSpend / total) * 100 : 0;

  // Revenue calc
  const metaInstalls    = meta?.summary.installs ?? 0;
  const googleConversions = google?.summary.conversions ?? 0;
  const sanLeads   = metaInstalls * (sanPct / 100) + googleConversions * (sanPct / 100);
  const baufiLeads = metaInstalls * (1 - sanPct / 100) + googleConversions * (1 - sanPct / 100);
  const sanRevenue   = sanLeads * (wvq / 100) * vkPrice;
  const baufiRevenue = baufiLeads * (abschluss / 100) * provision;
  const totalRevenue = sanRevenue + baufiRevenue;

  // CPL actual
  const actualCplSan   = sanLeads   > 0 ? sanSpend   / sanLeads   : 0;
  const actualCplBaufi = baufiLeads > 0 ? baufiSpend / baufiLeads : 0;

  const section = (title: string, children: React.ReactNode) => (
    <div style={{ background: '#fff', borderRadius: 12, padding: 24, border: '1px solid var(--effi-border)', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  );

  return (
    <div>
      {section(
        `📋 ${t(lang, 'budget-plan-title')}`,
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
            <BudgetInput label={t(lang, 'budget-total-label')}  value={total}      onChange={(v: number) => { setTotal(v);      save({ total: v }); }} />
            <BudgetInput label={t(lang, 'budget-meta-label')}   value={metaBudget} onChange={(v: number) => { setMetaBudget(v); save({ metaBudget: v }); }} />
            <BudgetInput label={t(lang, 'budget-google-label')} value={gBudget}    onChange={(v: number) => { setGBudget(v);    save({ gBudget: v }); }} />
            <BudgetInput label={t(lang, 'budget-san-label')} value={sanPct} onChange={(v: number) => { setSanPct(v); save({ sanPct: v }); }} step={5} max={100} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
            <BudgetInput label="CPL-Ziel Sanierung (€)"    value={cplSan}    onChange={(v: number) => { setCplSan(v);    save({ cplSan: v }); }} step={0.5} />
            <BudgetInput label="CPL-Ziel Baufi (€)"        value={cplBaufi}  onChange={(v: number) => { setCplBaufi(v);  save({ cplBaufi: v }); }} step={5} />
            <BudgetInput label="WVQ Sanierung (%)"         value={wvq}       onChange={(v: number) => { setWvq(v);       save({ wvq: v }); }} step={5} max={100} />
            <BudgetInput label="VK-Leadpreis Sanierung (€)" value={vkPrice}  onChange={(v: number) => { setVkPrice(v);  save({ vkPrice: v }); }} step={5} />
            <BudgetInput label="Abschlussquote Baufi (%)"  value={abschluss} onChange={(v: number) => { setAbschluss(v); save({ abschluss: v }); }} step={0.1} />
            <BudgetInput label="Provision Baufi (€)"       value={provision} onChange={(v: number) => { setProvision(v); save({ provision: v }); }} />
          </div>
          <p style={{ fontSize: 11, color: 'var(--effi-neutral)', marginBottom: 16 }}>{t(lang, 'budget-edit-hint')}</p>

          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{t(lang, 'budget-actual-title')}</div>
          <BudgetBar label={t(lang, 'b-total-bar')}  spent={totalSpend}  budget={total}      color="var(--effi-primary)" />
          <BudgetBar label={t(lang, 'b-meta-bar')}   spent={metaSpend}   budget={metaBudget} color="var(--meta)" />
          <BudgetBar label={t(lang, 'b-google-bar')} spent={googleSpend} budget={gBudget}    color="var(--google)" />
          <BudgetBar label={t(lang, 'b-san-bar')}    spent={sanSpend}    budget={total * sanPct / 100} color="var(--san)" />
          <BudgetBar label={t(lang, 'b-baufi-bar')}  spent={baufiSpend}  budget={total * (1 - sanPct / 100)} color="var(--baufi)" />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginTop: 16 }}>
            <StatCard label={t(lang, 'b-spent-pct')}  value={`${spentPct.toFixed(0)}%`} sub={fmtEur(totalSpend)} colorClass={spentPct > 100 ? 'over' : spentPct > 85 ? 'warn' : 'ok'} />
            <StatCard label={t(lang, 'b-remaining')}  value={fmtEur(remaining)} colorClass={remaining < 0 ? 'over' : 'ok'} />
            <StatCard label={t(lang, 'b-daily-avg')}  value={fmtEur(dailyAvg)} sub={t(lang, 'per-day')} />
          </div>
        </>
      )}

      {section(
        `📈 ${t(lang, 'budget-forecast-title')}`,
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            <StatCard label="Hochrechnung Gesamt" value={fmtEur(forecast)} sub="/ Monat" colorClass={forecast > total ? 'over' : 'ok'} />
            <StatCard label="Hochrechnung Meta"   value={fmtEur(dailyAvg * (metaSpend / (totalSpend || 1)) * 30)} />
            <StatCard label="Hochrechnung Google" value={fmtEur(dailyAvg * (googleSpend / (totalSpend || 1)) * 30)} />
          </div>
          <p style={{ fontSize: 11, color: 'var(--effi-neutral)', marginTop: 12 }}>{t(lang, 'budget-forecast-hint')}</p>
        </>
      )}

      {section(
        '💰 Revenue-Prognose',
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            <StatCard label="Leads Sanierung"   value={fmt(sanLeads, 0)}   sub="App Installs + Conv." />
            <StatCard label="Revenue Sanierung" value={fmtEur(sanRevenue)} sub={`WVQ ${wvq}% × €${vkPrice}`} colorClass="ok" />
            <StatCard label="Leads Baufi"       value={fmt(baufiLeads, 0)} />
            <StatCard label="Revenue Baufi"     value={fmtEur(baufiRevenue)} sub={`${abschluss}% × €${provision}`} colorClass="ok" />
            <StatCard label="Revenue Gesamt"    value={fmtEur(totalRevenue)} colorClass="ok" />
          </div>
          <p style={{ fontSize: 11, color: 'var(--effi-neutral)', marginTop: 12 }}>Sanierung: Leads × WVQ% × VK-Preis · Baufi: Leads × Abschlussquote% × Provision</p>
        </>
      )}

      {section(
        '🎯 CPL-Ziele vs. Ist',
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          <StatCard label="CPL Sanierung – Ist"   value={fmtEur(actualCplSan, 2)}   colorClass={actualCplSan <= cplSan ? 'ok' : 'over'} />
          <StatCard label="CPL Sanierung – Ziel"  value={fmtEur(cplSan, 2)} />
          <StatCard label="Delta San"             value={`${((actualCplSan - cplSan) / (cplSan || 1) * 100).toFixed(0)}%`} colorClass={actualCplSan <= cplSan ? 'ok' : 'over'} />
          <StatCard label="CPL Baufi – Ist"       value={fmtEur(actualCplBaufi, 2)} colorClass={actualCplBaufi <= cplBaufi ? 'ok' : 'over'} />
          <StatCard label="CPL Baufi – Ziel"      value={fmtEur(cplBaufi, 2)} />
          <StatCard label="Delta Baufi"           value={`${((actualCplBaufi - cplBaufi) / (cplBaufi || 1) * 100).toFixed(0)}%`} colorClass={actualCplBaufi <= cplBaufi ? 'ok' : 'over'} />
        </div>
      )}
    </div>
  );
}
