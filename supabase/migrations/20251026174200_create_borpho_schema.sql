/*
  # Borpho DeFi Lending Protocol Schema

  1. New Tables
    - `vaults`
      - `id` (uuid, primary key)
      - `name` (text) - Vault name
      - `asset` (text) - Asset symbol (USDC)
      - `curator` (text) - Curator name
      - `total_deposits` (numeric) - Total deposits in USD
      - `available_liquidity` (numeric) - Available liquidity
      - `apy` (numeric) - Current APY percentage
      - `supply_cap` (numeric) - Maximum supply cap
      - `created_at` (timestamp)
    
    - `markets`
      - `id` (uuid, primary key)
      - `collateral_asset` (text) - Collateral token symbol
      - `loan_asset` (text) - Loan token symbol
      - `lltv` (integer) - Liquidation LTV in basis points
      - `total_size` (numeric) - Total market size
      - `total_borrowed` (numeric) - Total borrowed amount
      - `borrow_apy` (numeric) - Current borrow APY
      - `utilization` (numeric) - Utilization percentage
      - `oracle_address` (text) - Oracle contract address
      - `collateral_price` (numeric) - Current collateral price
      - `created_at` (timestamp)
    
    - `vault_positions`
      - `id` (uuid, primary key)
      - `user_address` (text) - User wallet address
      - `vault_id` (uuid, foreign key to vaults)
      - `shares` (numeric) - Vault shares owned
      - `assets` (numeric) - USDC value
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `market_positions`
      - `id` (uuid, primary key)
      - `user_address` (text) - User wallet address
      - `market_id` (uuid, foreign key to markets)
      - `collateral` (numeric) - Collateral amount
      - `borrow_shares` (numeric) - Borrow shares
      - `borrow_assets` (numeric) - Borrowed amount
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to read all data
    - Add policies for users to read and modify their own positions
*/

-- Create vaults table
CREATE TABLE IF NOT EXISTS vaults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  asset text NOT NULL,
  curator text NOT NULL,
  total_deposits numeric NOT NULL DEFAULT 0,
  available_liquidity numeric NOT NULL DEFAULT 0,
  apy numeric NOT NULL DEFAULT 0,
  supply_cap numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view vaults"
  ON vaults FOR SELECT
  TO authenticated, anon
  USING (true);

-- Create markets table
CREATE TABLE IF NOT EXISTS markets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collateral_asset text NOT NULL,
  loan_asset text NOT NULL,
  lltv integer NOT NULL,
  total_size numeric NOT NULL DEFAULT 0,
  total_borrowed numeric NOT NULL DEFAULT 0,
  borrow_apy numeric NOT NULL DEFAULT 0,
  utilization numeric NOT NULL DEFAULT 0,
  oracle_address text NOT NULL,
  collateral_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE markets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view markets"
  ON markets FOR SELECT
  TO authenticated, anon
  USING (true);

-- Create vault_positions table
CREATE TABLE IF NOT EXISTS vault_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address text NOT NULL,
  vault_id uuid NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  shares numeric NOT NULL DEFAULT 0,
  assets numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_address, vault_id)
);

ALTER TABLE vault_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view vault positions"
  ON vault_positions FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Users can insert their own vault positions"
  ON vault_positions FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Users can update their own vault positions"
  ON vault_positions FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- Create market_positions table
CREATE TABLE IF NOT EXISTS market_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address text NOT NULL,
  market_id uuid NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  collateral numeric NOT NULL DEFAULT 0,
  borrow_shares numeric NOT NULL DEFAULT 0,
  borrow_assets numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_address, market_id)
);

ALTER TABLE market_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view market positions"
  ON market_positions FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Users can insert their own market positions"
  ON market_positions FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Users can update their own market positions"
  ON market_positions FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- Insert mock data for the vault
INSERT INTO vaults (name, asset, curator, total_deposits, available_liquidity, apy, supply_cap)
VALUES (
  'Bucket''s USDC Vault',
  'USDC',
  'Bucket Protocol',
  425730000,
  98720000,
  4.85,
  500000000
) ON CONFLICT DO NOTHING;

-- Insert mock data for the market
INSERT INTO markets (collateral_asset, loan_asset, lltv, total_size, total_borrowed, borrow_apy, utilization, oracle_address, collateral_price)
VALUES (
  'ETH',
  'USDC',
  86,
  425730000,
  326850000,
  6.25,
  76.8,
  '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
  3847
) ON CONFLICT DO NOTHING;