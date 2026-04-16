export type DateRange = 'last_7d' | 'last_30d' | 'last_90d' | 'last_180d' | 'last_year' | 'custom';
export type Lang = 'de' | 'en';
export type Tab = 'overview' | 'google' | 'meta' | 'budget';

export interface MetaSummary {
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  frequency: number;
  installs: number;
  cpi: number;
  installRate: number;
  cpm: number;
  ctr: number;
  conversions: number;
  cpl: number;
  roas: number;
}

export interface GoogleSummary {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  cpl: number;
  roas: number;
  ctr: number;
  cpm: number;
}

export interface DailyData {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions?: number;
  installs?: number;
  cpm?: number;
}

export interface Campaign {
  id: string;
  name: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions?: number;
  ctr: number;
  cpm: number;
  dailyBudget?: number;
  adsets?: AdSet[];
}

export interface AdSet {
  id: string;
  name: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  ads?: Ad[];
}

export interface Ad {
  id: string;
  name: string;
  status: string;
  thumbnail: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpm: number;
}

export interface WoW {
  spend: number | null;
  installs?: number | null;
  conversions?: number | null;
  cpm?: number | null;
  clicks?: number | null;
}

export interface MetaData {
  summary: MetaSummary;
  daily: DailyData[];
  wow: WoW;
}

export interface GoogleData {
  summary: GoogleSummary;
  daily: DailyData[];
  campaigns: Campaign[];
  activeDailyBudget: number;
  wow: WoW;
  cachedAt: string;
}

export interface MetaCampaignsData {
  campaigns: Campaign[];
  activeDailyBudget: number;
}

export interface BudgetConfig {
  months: Record<string, number>; // "2025-01" -> budget in €
  cplTarget: number;
  wvq: number;         // Weiterverarbeitungsquote %
  vkLeadpreis: number; // VK-Leadpreis €
  abschlussquote: number; // %
  provision: number;   // €
}
