import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, Vault, Market, VaultPosition, MarketPosition } from '../lib/supabase';

const STOCK_MARKETS = [
  {
    ticker: 'SUIG',
    name: 'Sui Group Holdings Ltd',
    logo: 'https://universal.hellopublic.com/companyLogos/SUIG@2x.png',
    price: 12.45,
    totalSize: 180_000_000,
    totalBorrowed: 98_500_000,
    borrowApy: 5.2,
    supplyApy: 3.1,
    utilization: 54.7,
    lltv: 65
  },
  {
    ticker: 'AAPL',
    name: 'Apple Inc.',
    logo: 'https://logo.clearbit.com/apple.com',
    price: 189.87,
    totalSize: 245_000_000,
    totalBorrowed: 138_500_000,
    borrowApy: 5.1,
    supplyApy: 2.8,
    utilization: 56.5,
    lltv: 70
  },
  {
    ticker: 'GOOGL',
    name: 'Alphabet Inc.',
    logo: 'https://logo.clearbit.com/abc.xyz',
    price: 172.34,
    totalSize: 230_000_000,
    totalBorrowed: 129_800_000,
    borrowApy: 5.4,
    supplyApy: 3.2,
    utilization: 56.4,
    lltv: 68
  },
  {
    ticker: 'TSLA',
    name: 'Tesla Inc.',
    logo: 'https://logo.clearbit.com/tesla.com',
    price: 255.12,
    totalSize: 210_000_000,
    totalBorrowed: 120_700_000,
    borrowApy: 6.3,
    supplyApy: 3.9,
    utilization: 57.5,
    lltv: 65
  },
  {
    ticker: 'MSFT',
    name: 'Microsoft Corp.',
    logo: 'https://logo.clearbit.com/microsoft.com',
    price: 312.45,
    totalSize: 260_000_000,
    totalBorrowed: 150_200_000,
    borrowApy: 4.9,
    supplyApy: 2.6,
    utilization: 57.8,
    lltv: 72
  },
  {
    ticker: 'AMZN',
    name: 'Amazon.com Inc.',
    logo: 'https://logo.clearbit.com/amazon.com',
    price: 144.22,
    totalSize: 225_000_000,
    totalBorrowed: 123_600_000,
    borrowApy: 5.6,
    supplyApy: 3.1,
    utilization: 54.9,
    lltv: 69
  },
  {
    ticker: 'NVDA',
    name: 'NVIDIA Corp.',
    logo: 'https://logo.clearbit.com/nvidia.com',
    price: 420.16,
    totalSize: 205_000_000,
    totalBorrowed: 118_300_000,
    borrowApy: 6.8,
    supplyApy: 4.2,
    utilization: 57.7,
    lltv: 64
  },
  {
    ticker: 'META',
    name: 'Meta Platforms Inc.',
    logo: 'https://logo.clearbit.com/meta.com',
    price: 312.58,
    totalSize: 215_000_000,
    totalBorrowed: 121_900_000,
    borrowApy: 5.7,
    supplyApy: 3.3,
    utilization: 56.7,
    lltv: 67
  }
];

interface ProtocolContextType {
  vaults: Vault[];
  markets: Market[];
  userVaultPositions: VaultPosition[];
  userMarketPositions: MarketPosition[];
  connectedAddress: string | null;
  connectWallet: () => void;
  disconnectWallet: () => void;
  supplyToVault: (vaultId: string, amount: number) => Promise<void>;
  withdrawFromVault: (vaultId: string, amount: number) => Promise<void>;
  supplyCollateral: (marketId: string, amount: number) => Promise<void>;
  borrow: (marketId: string, collateralAmount: number, borrowAmount: number) => Promise<void>;
  repay: (marketId: string, amount: number) => Promise<void>;
  withdrawCollateral: (marketId: string, amount: number) => Promise<void>;
  loading: boolean;
}

const ProtocolContext = createContext<ProtocolContextType | undefined>(undefined);

export const useProtocol = () => {
  const context = useContext(ProtocolContext);
  if (!context) {
    throw new Error('useProtocol must be used within ProtocolProvider');
  }
  return context;
};

export const ProtocolProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [userVaultPositions, setUserVaultPositions] = useState<VaultPosition[]>([]);
  const [userMarketPositions, setUserMarketPositions] = useState<MarketPosition[]>([]);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProtocolData();
    const savedAddress = localStorage.getItem('connectedAddress');
    if (savedAddress) {
      setConnectedAddress(savedAddress);
      loadUserPositions(savedAddress);
    }
  }, []);

  useEffect(() => {
    if (connectedAddress) {
      loadUserPositions(connectedAddress);
    }
  }, [connectedAddress]);

  const loadProtocolData = async () => {
    try {
      const [vaultsRes, marketsRes] = await Promise.all([
        supabase.from('vaults').select('*'),
        supabase.from('markets').select('*')
      ]);

      if (vaultsRes.error) {
        console.error('Error loading vaults:', vaultsRes.error);
      }
      if (marketsRes.error) {
        console.error('Error loading markets:', marketsRes.error);
      }

      if (vaultsRes.data) setVaults(vaultsRes.data);

      const baseMarkets =
        marketsRes.data && marketsRes.data.length > 0
          ? marketsRes.data
          : STOCK_MARKETS.map((stock, index) => ({
              id: `mock-base-${stock.ticker}-${index}`,
              collateral_asset: stock.ticker,
              display_name: stock.name,
              loan_asset: 'USDC',
              lltv: stock.lltv,
              total_size: stock.totalSize,
              total_borrowed: stock.totalBorrowed,
              borrow_apy: stock.borrowApy,
              supply_apy: stock.supplyApy ?? 0,
              utilization: stock.utilization,
              oracle_address: '',
              collateral_price: stock.price,
              created_at: new Date().toISOString(),
              logo: stock.logo
            }));

      const transformedMarkets = STOCK_MARKETS.map((stock, index) => {
        const template = baseMarkets[index % baseMarkets.length];
        return {
          ...template,
          id: `mock-${stock.ticker}`,
          collateral_asset: stock.ticker,
          display_name: stock.name,
          loan_asset: 'USDC',
          collateral_price: stock.price,
          total_size: stock.totalSize,
          total_borrowed: stock.totalBorrowed,
          borrow_apy: stock.borrowApy,
          supply_apy: stock.supplyApy,
          utilization: stock.utilization,
          lltv: stock.lltv,
          logo: stock.logo
        };
      });

      setMarkets(transformedMarkets);
    } catch (error) {
      console.error('Error loading protocol data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserPositions = async (address: string) => {
    try {
      const [vaultPositionsRes, marketPositionsRes] = await Promise.all([
        supabase.from('vault_positions').select('*').eq('user_address', address),
        supabase.from('market_positions').select('*').eq('user_address', address)
      ]);

      if (vaultPositionsRes.data) setUserVaultPositions(vaultPositionsRes.data);
      if (marketPositionsRes.data) setUserMarketPositions(marketPositionsRes.data);
    } catch (error) {
      console.error('Error loading user positions:', error);
    }
  };

  const connectWallet = () => {
    const mockAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f38963';
    setConnectedAddress(mockAddress);
    localStorage.setItem('connectedAddress', mockAddress);
  };

  const disconnectWallet = () => {
    setConnectedAddress(null);
    localStorage.removeItem('connectedAddress');
    setUserVaultPositions([]);
    setUserMarketPositions([]);
  };

  const supplyToVault = async (vaultId: string, amount: number) => {
    if (!connectedAddress) return;

    const existingPosition = userVaultPositions.find(p => p.vault_id === vaultId);
    const shares = amount;

    if (existingPosition) {
      await supabase
        .from('vault_positions')
        .update({
          shares: existingPosition.shares + shares,
          assets: existingPosition.assets + amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingPosition.id);
    } else {
      await supabase
        .from('vault_positions')
        .insert({
          user_address: connectedAddress,
          vault_id: vaultId,
          shares,
          assets: amount
        });
    }

    const vault = vaults.find(v => v.id === vaultId);
    if (vault) {
      await supabase
        .from('vaults')
        .update({
          total_deposits: vault.total_deposits + amount,
          available_liquidity: vault.available_liquidity + amount
        })
        .eq('id', vaultId);
    }

    await loadProtocolData();
    await loadUserPositions(connectedAddress);
  };

  const withdrawFromVault = async (vaultId: string, amount: number) => {
    if (!connectedAddress) return;

    const existingPosition = userVaultPositions.find(p => p.vault_id === vaultId);
    if (!existingPosition || existingPosition.assets < amount) return;

    const shares = amount;

    await supabase
      .from('vault_positions')
      .update({
        shares: existingPosition.shares - shares,
        assets: existingPosition.assets - amount,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingPosition.id);

    const vault = vaults.find(v => v.id === vaultId);
    if (vault) {
      await supabase
        .from('vaults')
        .update({
          total_deposits: vault.total_deposits - amount,
          available_liquidity: vault.available_liquidity - amount
        })
        .eq('id', vaultId);
    }

    await loadProtocolData();
    await loadUserPositions(connectedAddress);
  };

  const supplyCollateral = async (marketId: string, amount: number) => {
    if (!connectedAddress) return;

    const existingPosition = userMarketPositions.find(p => p.market_id === marketId);

    if (existingPosition) {
      await supabase
        .from('market_positions')
        .update({
          collateral: existingPosition.collateral + amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingPosition.id);
    } else {
      await supabase
        .from('market_positions')
        .insert({
          user_address: connectedAddress,
          market_id: marketId,
          collateral: amount,
          borrow_shares: 0,
          borrow_assets: 0
        });
    }

    await loadUserPositions(connectedAddress);
  };

  const borrow = async (marketId: string, collateralAmount: number, borrowAmount: number) => {
    if (!connectedAddress) return;

    const existingPosition = userMarketPositions.find(p => p.market_id === marketId);
    const borrowShares = borrowAmount;

    if (existingPosition) {
      await supabase
        .from('market_positions')
        .update({
          collateral: existingPosition.collateral + collateralAmount,
          borrow_shares: existingPosition.borrow_shares + borrowShares,
          borrow_assets: existingPosition.borrow_assets + borrowAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingPosition.id);
    } else {
      await supabase
        .from('market_positions')
        .insert({
          user_address: connectedAddress,
          market_id: marketId,
          collateral: collateralAmount,
          borrow_shares: borrowShares,
          borrow_assets: borrowAmount
        });
    }

    const market = markets.find(m => m.id === marketId);
    if (market) {
      const newTotalBorrowed = market.total_borrowed + borrowAmount;
      const newUtilization = (newTotalBorrowed / market.total_size) * 100;

      await supabase
        .from('markets')
        .update({
          total_borrowed: newTotalBorrowed,
          utilization: newUtilization
        })
        .eq('id', marketId);

      const vault = vaults[0];
      if (vault) {
        await supabase
          .from('vaults')
          .update({
            available_liquidity: vault.available_liquidity - borrowAmount
          })
          .eq('id', vault.id);
      }
    }

    await loadProtocolData();
    await loadUserPositions(connectedAddress);
  };

  const repay = async (marketId: string, amount: number) => {
    if (!connectedAddress) return;

    const existingPosition = userMarketPositions.find(p => p.market_id === marketId);
    if (!existingPosition || existingPosition.borrow_assets < amount) return;

    const sharesProportion = amount / existingPosition.borrow_assets;
    const sharesToRepay = existingPosition.borrow_shares * sharesProportion;

    await supabase
      .from('market_positions')
      .update({
        borrow_shares: existingPosition.borrow_shares - sharesToRepay,
        borrow_assets: existingPosition.borrow_assets - amount,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingPosition.id);

    const market = markets.find(m => m.id === marketId);
    if (market) {
      const newTotalBorrowed = market.total_borrowed - amount;
      const newUtilization = (newTotalBorrowed / market.total_size) * 100;

      await supabase
        .from('markets')
        .update({
          total_borrowed: newTotalBorrowed,
          utilization: newUtilization
        })
        .eq('id', marketId);

      const vault = vaults[0];
      if (vault) {
        await supabase
          .from('vaults')
          .update({
            available_liquidity: vault.available_liquidity + amount
          })
          .eq('id', vault.id);
      }
    }

    await loadProtocolData();
    await loadUserPositions(connectedAddress);
  };

  const withdrawCollateral = async (marketId: string, amount: number) => {
    if (!connectedAddress) return;

    const existingPosition = userMarketPositions.find(p => p.market_id === marketId);
    if (!existingPosition || existingPosition.collateral < amount) return;

    await supabase
      .from('market_positions')
      .update({
        collateral: existingPosition.collateral - amount,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingPosition.id);

    await loadUserPositions(connectedAddress);
  };

  return (
    <ProtocolContext.Provider
      value={{
        vaults,
        markets,
        userVaultPositions,
        userMarketPositions,
        connectedAddress,
        connectWallet,
        disconnectWallet,
        supplyToVault,
        withdrawFromVault,
        supplyCollateral,
        borrow,
        repay,
        withdrawCollateral,
        loading
      }}
    >
      {children}
    </ProtocolContext.Provider>
  );
};
