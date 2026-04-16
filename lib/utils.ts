export function fmt(n: number, digits = 0): string {
  return n.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function fmtEur(n: number, digits = 0): string {
  return '\u20ac' + fmt(n, digits);
}

export function fmtPct(n: number): string {
  return fmt(n, 1) + '%';
}

export function getDateRange(preset: string): { from: string; until: string } {
  const until = new Date();
  until.setDate(until.getDate() - 1);
  const from = new Date();
  const days = preset === 'last_7d' ? 7 : preset === 'last_90d' ? 90 : preset === 'last_180d' ? 180 : preset === 'last_year' ? 365 : 30;
  from.setDate(from.getDate() - days);
  return {
    from: from.toISOString().slice(0, 10),
    until: until.toISOString().slice(0, 10),
  };
}

export function isSanierung(name: string): boolean {
  return name.toLowerCase().includes('sanierung') || name.toLowerCase().includes('san');
}
