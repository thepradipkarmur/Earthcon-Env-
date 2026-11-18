// Public project values. The publishable key is designed to be exposed in the browser;
// all data access is enforced by Row-Level Security. Environment variables override these.
const DEFAULT_URL = "https://cxdaalwdpvgszljvffdt.supabase.co";
const DEFAULT_KEY = "sb_publishable_6eFrn4g0g1hf_lND_aYvfA_Ob_rxbVh";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL;
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  DEFAULT_KEY;

export const isConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);
