import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Vault {
  id: string;
  name: string;
  asset: string;
  curator: string;
  total_deposits: number;
  available_liquidity: number;
  apy: number;
  supply_cap: number;
  created_at: string;
}

export interface Market {
  id: string;
  collateral_asset: string;
  display_name?: string;
  logo?: string;
  loan_asset: string;
  lltv: number;
  total_size: number;
  total_borrowed: number;
  borrow_apy: number;
  supply_apy?: number;
  utilization: number;
  oracle_address: string;
  collateral_price: number;
  created_at: string;
}

export interface VaultPosition {
  id: string;
  user_address: string;
  vault_id: string;
  shares: number;
  assets: number;
  created_at: string;
  updated_at: string;
}

export interface MarketPosition {
  id: string;
  user_address: string;
  market_id: string;
  collateral: number;
  borrow_shares: number;
  borrow_assets: number;
  created_at: string;
  updated_at: string;
}
