interface WowBadgeProps { value: number | null; isPositiveGood?: boolean; suffix?: string; }

export function WowBadge({ value, isPositiveGood = true, suffix = '% WoW' }: WowBadgeProps) {
  if (value === null || value === undefined) return null;
  const isGood = isPositiveGood ? value >= 0 : value <= 0;
  const arrow = value >= 0 ? '▲' : '▼';
  return (
    <span style={{
      display: 'inline-block', fontSize: 10, fontWeight: 600,
      padding: '1px 5px', borderRadius: 4, marginTop: 4,
      background: isGood ? 'var(--san-light)' : '#fee2e2',
      color: isGood ? 'var(--effi-primary)' : '#dc2626',
    }}>
      {arrow} {Math.abs(value).toFixed(1)}{suffix}
    </span>
  );
}

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: React.ReactNode;
  variant?: 'default' | 'google' | 'meta' | 'budget' | 'san' | 'baufi';
  loading?: boolean;
}

export function KpiCard({ label, value, sub, variant = 'default', loading }: KpiCardProps) {
  const borderTopColor: Record<string, string> = {
    google: 'var(--google)',
    meta:   'var(--meta)',
    budget: '#f59e0b',
    san:    'var(--san)',
    baufi:  'var(--baufi)',
    default: 'transparent',
  };
  const bg: Record<string, string> = {
    budget: '#fffbeb',
    san:    'var(--san-light)',
    baufi:  'var(--baufi-light)',
    default: '#fff',
  };

  return (
    <div style={{
      background: bg[variant] ?? '#fff',
      borderRadius: 12,
      padding: '16px 14px',
      border: '1px solid var(--effi-border)',
      borderTop: variant !== 'default' ? `3px solid ${borderTopColor[variant]}` : '1px solid var(--effi-border)',
      boxShadow: '0 1px 4px rgba(0,0,0,.06)',
    }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--effi-text-sec)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{
        fontSize: 20, fontWeight: 700, lineHeight: 1.2,
        color: loading ? 'rgba(0,0,0,0.12)' : 'var(--effi-black)',
      }}>
        {loading ? '–' : value}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--effi-neutral)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}
