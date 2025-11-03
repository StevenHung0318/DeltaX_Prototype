import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, TrendingUp, AlertTriangle } from 'lucide-react';
import { useProtocol } from '../context/ProtocolContext';
import type { Market } from '../lib/supabase';
import {
  formatUSD,
  formatPercent,
  calculateHealthFactor,
  calculateLiquidationPrice,
  formatAddress,
  calculateProjectedEarnings
} from '../utils/format';

const MarketLogo: React.FC<{ ticker: string; name?: string; logo?: string; size?: 'sm' | 'md' }> = ({ ticker, name, logo, size = 'md' }) => {
  const [failed, setFailed] = useState(false);
  const dimension = size === 'sm' ? 'h-8 w-8' : 'h-12 w-12';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  if (!logo || failed) {
    return (
      <div className={`${dimension} rounded-full bg-[#1F2330] flex items-center justify-center`}>
        <span className={`font-semibold uppercase text-white ${textSize}`}>{ticker.slice(0, 2)}</span>
      </div>
    );
  }

  return (
    <div className={`${dimension} rounded-full bg-[#1F2330] flex items-center justify-center overflow-hidden`}>
      <img
        src={logo}
        alt={name ? `${name} logo` : `${ticker} logo`}
        className="h-full w-full object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
};

interface MarketsProps {
  selectedMarketId: string | null;
  onSelectMarket: (marketId: string | null) => void;
}

type InteractionTab = 'borrow' | 'repay' | 'withdraw';
type OverviewTab = 'overview' | 'advanced';

export const Markets: React.FC<MarketsProps> = ({ selectedMarketId, onSelectMarket }) => {
  const {
    markets,
    vaults,
    userMarketPositions,
    userVaultPositions,
    connectedAddress,
    borrow,
    repay,
    withdrawCollateral,
    supplyToVault,
    withdrawFromVault
  } = useProtocol();
  const [collateralAmount, setCollateralAmount] = useState('');
  const [borrowAmount, setBorrowAmount] = useState('');
  const [repayAmount, setRepayAmount] = useState('');
  const [withdrawColAmount, setWithdrawColAmount] = useState('');
  const [activeTab, setActiveTab] = useState<InteractionTab>('borrow');
  const [overviewTab, setOverviewTab] = useState<OverviewTab>('overview');
  const [viewTab, setViewTab] = useState<'supply' | 'borrow'>('borrow');
  const [supplyActionTab, setSupplyActionTab] = useState<'supply' | 'withdraw'>('supply');
  const [vaultSupplyAmount, setVaultSupplyAmount] = useState('');
  const [vaultWithdrawAmount, setVaultWithdrawAmount] = useState('');

  const selectedMarket = selectedMarketId ? markets.find((m) => m.id === selectedMarketId) || null : null;
  const userPosition = selectedMarketId ? userMarketPositions.find((p) => p.market_id === selectedMarketId) : null;
  const primaryVault = vaults[0] ?? null;
  const userVaultPosition = primaryVault
    ? userVaultPositions.find((position) => position.vault_id === primaryVault.id)
    : null;

  const borrowedLiquidity = primaryVault ? Math.max(primaryVault.total_deposits - primaryVault.available_liquidity, 0) : 0;
  const vaultUtilization =
    primaryVault && primaryVault.total_deposits > 0 ? (borrowedLiquidity / primaryVault.total_deposits) * 100 : 0;
  const utilizationBarWidth = Math.min(Math.max(vaultUtilization, 0), 100);
  const userSupplyShare =
    primaryVault && userVaultPosition && primaryVault.total_deposits > 0
      ? (userVaultPosition.assets / primaryVault.total_deposits) * 100
      : 0;
  const projectedSupplyEarnings =
    primaryVault && userVaultPosition
      ? calculateProjectedEarnings(userVaultPosition.assets, primaryVault.apy)
      : null;

  const getSupplyApyForMarket = (market: Market) => {
    if (typeof market.supply_apy === 'number') {
      return market.supply_apy;
    }
    return primaryVault?.apy ?? 0;
  };

  const handleMarketSelect = (marketId: string) => {
    setViewTab('borrow');
    onSelectMarket(marketId);
  };

  const handleMarketSelectKey = (event: React.KeyboardEvent<HTMLDivElement>, marketId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleMarketSelect(marketId);
    }
  };

  const handleMarketAction = (marketId: string, tab: 'supply' | 'borrow', event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    setViewTab(tab);
    onSelectMarket(marketId);
  };

  const marketPageDescription = 'Browse markets to supply liquidity or borrow against collateral.';

  const mockEthBalance = 5.25;
  const mockUsdcBalance = 10000;

  const collateralValue = userPosition ? userPosition.collateral * (selectedMarket?.collateral_price || 0) : 0;
  const currentBorrowed = userPosition ? userPosition.borrow_assets : 0;
  const currentLtv = collateralValue > 0 ? (currentBorrowed / collateralValue) * 100 : 0;

  const maxBorrow = selectedMarket
    ? (collateralValue + parseFloat(collateralAmount || '0') * (selectedMarket.collateral_price || 0)) *
      (selectedMarket.lltv / 100)
    : 0;
  const availableToBorrow = maxBorrow - currentBorrowed;

  const projectedCollateralValue =
    (userPosition?.collateral || 0) * (selectedMarket?.collateral_price || 0) +
    parseFloat(collateralAmount || '0') * (selectedMarket?.collateral_price || 0);
  const projectedBorrowed = currentBorrowed + parseFloat(borrowAmount || '0');
  const projectedLtv = projectedCollateralValue > 0 ? (projectedBorrowed / projectedCollateralValue) * 100 : 0;

  const healthFactor = selectedMarket
    ? calculateHealthFactor(projectedCollateralValue, projectedBorrowed, selectedMarket.lltv)
    : Infinity;

  const liquidationPrice = selectedMarket && userPosition
    ? calculateLiquidationPrice(
        userPosition.collateral + parseFloat(collateralAmount || '0'),
        projectedBorrowed,
        selectedMarket.lltv
      )
    : 0;

  const formattedCreatedDate = selectedMarket?.created_at
    ? new Date(selectedMarket.created_at).toISOString().split('T')[0]
    : '--';
  const oraclePriceDisplay = selectedMarket
    ? `${selectedMarket.collateral_asset} / ${selectedMarket.loan_asset} = ${formatUSD(selectedMarket.collateral_price)}`
    : '--';

  const targetUtilization = 90;
  const interestRateModel = '0x870a00000000000000000000000000000000BC';
  const liquidationPenalty = 4.38;
  const realizedBadDebt = 4.48;
  const unrealizedBadDebt = 0;
  const formatUSDCAmount = (value: number) => `${formatUSD(value).replace('$', '')} USDC`;

  const borrowAmountToTarget = selectedMarket
    ? Math.max(0, ((targetUtilization - selectedMarket.utilization) / 100) * selectedMarket.total_size)
    : 0;

  const handleBorrow = async () => {
    if (!selectedMarketId || !connectedAddress) return;
    const colAmount = parseFloat(collateralAmount) || 0;
    const borAmount = parseFloat(borrowAmount) || 0;

    if (colAmount < 0 || borAmount <= 0) return;
    if (colAmount > mockEthBalance) return;
    if (borAmount > availableToBorrow) return;

    await borrow(selectedMarketId, colAmount, borAmount);
    setCollateralAmount('');
    setBorrowAmount('');
  };

  const handleRepay = async () => {
    if (!selectedMarketId || !repayAmount || !userPosition) return;
    const amount = parseFloat(repayAmount);
    if (amount <= 0 || amount > userPosition.borrow_assets) return;

    await repay(selectedMarketId, amount);
    setRepayAmount('');
  };

  const handleWithdrawCollateral = async () => {
    if (!selectedMarketId || !withdrawColAmount || !userPosition) return;
    const amount = parseFloat(withdrawColAmount);
    if (amount <= 0 || amount > userPosition.collateral) return;

    await withdrawCollateral(selectedMarketId, amount);
    setWithdrawColAmount('');
  };

  const handleVaultSupply = async () => {
    if (!primaryVault || !connectedAddress || !vaultSupplyAmount) return;
    const amount = parseFloat(vaultSupplyAmount);
    if (amount <= 0 || amount > mockUsdcBalance) return;

    await supplyToVault(primaryVault.id, amount);
    setVaultSupplyAmount('');
  };

  const defaultViewMode = markets.length <= 4 ? 'card' : 'table';
  const [marketListViewMode, setMarketListViewMode] = useState<'table' | 'card'>(defaultViewMode);
  const hasUserSelectedViewMode = useRef(false);

  useEffect(() => {
    if (!hasUserSelectedViewMode.current) {
      setMarketListViewMode(markets.length <= 4 ? 'card' : 'table');
    }
  }, [markets.length]);

  const handleViewModeToggle = (mode: 'table' | 'card') => {
    setMarketListViewMode(mode);
    hasUserSelectedViewMode.current = true;
  };

  const handleVaultWithdraw = async () => {
    if (!primaryVault || !userVaultPosition || !vaultWithdrawAmount) return;
    const amount = parseFloat(vaultWithdrawAmount);
    if (amount <= 0 || amount > userVaultPosition.assets) return;

    await withdrawFromVault(primaryVault.id, amount);
    setVaultWithdrawAmount('');
  };

  if (selectedMarket) {
    const collateralTicker = selectedMarket.collateral_asset;
    const collateralName = selectedMarket.display_name;
    const collateralLabel = collateralName ? `${collateralTicker} (${collateralName})` : collateralTicker;

    return (
      <div className="space-y-8">
        <button
          onClick={() => onSelectMarket(null)}
          className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back to Markets</span>
        </button>

        <header className="space-y-2 mb-6">
          <div className="flex items-center space-x-4">
            <MarketLogo ticker={collateralTicker} name={collateralName} logo={selectedMarket.logo} size="md" />
            <div>
              <h1 className="text-3xl font-bold text-white">
                {collateralLabel} / {selectedMarket.loan_asset} Market
              </h1>
              <div className="flex items-center space-x-3 text-gray-400">
                <span>LLTV: {selectedMarket.lltv}%</span>
                <span>|</span>
                <span>Oracle: Chainlink</span>
              </div>
            </div>
          </div>
        </header>

        <div className="flex space-x-4 mb-6">
          {(['supply', 'borrow'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setViewTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors rounded-lg ${
                viewTab === tab ? 'bg-[#161921] text-white border border-[#2A3042]' : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {viewTab === 'supply' &&
          (primaryVault ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              <div className="lg:col-span-2 space-y-8">
                <section className="bg-[#161921] rounded-xl p-6 border border-gray-800">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold text-white">Liquidity Overview</h3>
                      <p className="text-sm text-gray-400">
                        USDC supplied to the {collateralLabel} market powers borrower demand.
                      </p>
                    </div>
                    <div className="flex items-center gap-3 bg-[#0A0B0F] border border-[#1F2330] rounded-full px-4 py-2">
                      <TrendingUp size={18} className="text-[#00D395]" />
                      <div className="leading-tight">
                        <div className="text-xs uppercase tracking-wide text-gray-500">Supply APY</div>
                        <div className="text-sm font-semibold text-white">{formatPercent(primaryVault.apy)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6">
                    <div className="bg-[#0A0B0F] border border-[#1F2330] rounded-xl p-5">
                      <div className="text-xs uppercase tracking-wide text-gray-500">Total Deposits</div>
                      <div className="mt-2 text-3xl font-bold text-white font-mono">
                        {formatUSD(primaryVault.total_deposits)}
                      </div>
                      <div className="mt-2 text-xs text-gray-500">Across all suppliers</div>
                    </div>
                    <div className="bg-[#0A0B0F] border border-[#1F2330] rounded-xl p-5">
                      <div className="text-xs uppercase tracking-wide text-gray-500">Available Liquidity</div>
                      <div className="mt-2 text-3xl font-bold text-white font-mono">
                        {formatUSD(primaryVault.available_liquidity)}
                      </div>
                      <div className="mt-2 text-xs text-gray-500">Ready to be borrowed</div>
                    </div>
                    <div className="bg-[#0A0B0F] border border-[#1F2330] rounded-xl p-5">
                      <div className="text-xs uppercase tracking-wide text-gray-500">Borrowed Out</div>
                      <div className="mt-2 text-3xl font-bold text-white font-mono">
                        {formatUSD(borrowedLiquidity)}
                      </div>
                      <div className="mt-2 text-xs text-gray-500">Currently in use</div>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    <div className="flex items-center justify-between text-xs uppercase tracking-wide text-gray-500">
                      <span>Liquidity Mix</span>
                      <span>Utilized {formatPercent(vaultUtilization)}</span>
                    </div>
                    <div className="h-2 bg-[#0A0B0F] rounded-full overflow-hidden">
                      <div className="h-full bg-[#0052FF]" style={{ width: `${utilizationBarWidth}%` }} />
                    </div>
                    <div className="flex justify-between text-sm text-gray-400 font-mono">
                      <span>{formatUSD(primaryVault.available_liquidity)} liquid</span>
                      <span>{formatUSD(borrowedLiquidity)} borrowed</span>
                    </div>
                  </div>
                </section>

                <section className="bg-[#161921] rounded-xl p-6 border border-gray-800">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold text-white">Your Supply Position</h3>
                      <p className="text-sm text-gray-400">
                        Track how your supplied USDC is participating in the vault.
                      </p>
                    </div>
                    {connectedAddress && (
                      <div className="text-xs text-gray-500 uppercase tracking-wide">
                        {formatAddress(connectedAddress)}
                      </div>
                    )}
                  </div>

                  {userVaultPosition ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
                        <div>
                          <div className="text-xs uppercase tracking-wide text-gray-500">Supplied</div>
                          <div className="mt-2 text-2xl font-semibold text-white font-mono">
                            {formatUSD(userVaultPosition.assets)}
                          </div>
                          <div className="mt-2 text-xs text-gray-500">Currently earning yield</div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-wide text-gray-500">Vault Shares</div>
                          <div className="mt-2 text-2xl font-semibold text-white font-mono">
                            {userVaultPosition.shares.toFixed(2)}
                          </div>
                          <div className="mt-2 text-xs text-gray-500">Tokenized receipt of deposits</div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-wide text-gray-500">Share of Pool</div>
                          <div className="mt-2 text-2xl font-semibold text-white font-mono">
                            {formatPercent(userSupplyShare)}
                          </div>
                          <div className="mt-2 text-xs text-gray-500">Of total deposits</div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-wide text-gray-500">Est. Monthly Yield</div>
                          <div className="mt-2 text-2xl font-semibold text-white font-mono">
                            {projectedSupplyEarnings ? formatUSD(projectedSupplyEarnings.monthly) : '--'}
                          </div>
                          <div className="mt-2 text-xs text-gray-500">@ {formatPercent(primaryVault.apy)} APY</div>
                        </div>
                      </div>

                      {projectedSupplyEarnings && (
                        <div className="mt-6 bg-[#0A0B0F] border border-[#1F2330] rounded-lg p-4 text-sm text-gray-300">
                          Your position compounds automatically. That's roughly{' '}
                          <span className="font-mono text-white">{formatUSD(projectedSupplyEarnings.daily)} / day</span>{' '}
                          or{' '}
                          <span className="font-mono text-white">{formatUSD(projectedSupplyEarnings.yearly)} / year</span>{' '}
                          at the current APY.
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="mt-6 bg-[#0A0B0F] border border-dashed border-gray-700 rounded-lg p-6 text-center text-gray-400">
                      <div className="text-sm font-medium text-white">No supply position yet</div>
                      <p className="mt-2 text-xs text-gray-500">
                        Use the panel on the right to supply USDC and start earning {formatPercent(primaryVault.apy)}.
                      </p>
                    </div>
                  )}
                </section>
              </div>

              <div className="space-y-6">
                <section className="bg-[#161921] rounded-xl p-6 border border-gray-800">
                  <div className="flex space-x-4 mb-6">
                    {(['supply', 'withdraw'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setSupplyActionTab(tab)}
                        className={`flex-1 py-2 text-sm font-medium transition-colors ${
                          supplyActionTab === tab ? 'text-[#0052FF] border-b-2 border-[#0052FF]' : 'text-gray-400'
                        }`}
                      >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </button>
                    ))}
                  </div>

                  {supplyActionTab === 'supply' ? (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm text-gray-400 block mb-2">Amount (USDC)</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={vaultSupplyAmount}
                            onChange={(e) => setVaultSupplyAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-[#0A0B0F] border border-gray-700 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-[#0052FF]"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">USDC</div>
                        </div>
                        <div className="flex items-center justify-between mt-2 text-sm">
                          <span className="text-gray-400">Balance: {mockUsdcBalance.toLocaleString()} USDC</span>
                          <button
                            onClick={() => setVaultSupplyAmount(mockUsdcBalance.toString())}
                            className="text-[#0052FF] hover:text-[#0046DD] font-medium"
                          >
                            MAX
                          </button>
                        </div>
                      </div>

                      {connectedAddress ? (
                        <button
                          onClick={handleVaultSupply}
                          disabled={!vaultSupplyAmount || parseFloat(vaultSupplyAmount) <= 0}
                          className="w-full py-3 bg-[#0052FF] hover:bg-[#0046DD] disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors"
                        >
                          Supply USDC
                        </button>
                      ) : (
                        <div className="text-center text-gray-400 text-sm py-3">Connect wallet to supply</div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                          <label className="text-sm text-gray-400 block mb-2">Withdraw Amount (USDC)</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={vaultWithdrawAmount}
                            onChange={(e) => setVaultWithdrawAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-[#0A0B0F] border border-gray-700 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-[#0052FF]"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">USDC</div>
                        </div>
                        <div className="flex items-center justify-between mt-2 text-sm">
                          <span className="text-gray-400">
                            Available: {userVaultPosition ? formatUSD(userVaultPosition.assets) : '$0.00'}
                          </span>
                          {userVaultPosition && (
                            <button
                              onClick={() => setVaultWithdrawAmount(userVaultPosition.assets.toString())}
                              className="text-[#0052FF] hover:text-[#0046DD] font-medium"
                            >
                              MAX
                            </button>
                          )}
                        </div>
                      </div>

                      {connectedAddress ? (
                        <button
                          onClick={handleVaultWithdraw}
                          disabled={
                            !vaultWithdrawAmount ||
                            !userVaultPosition ||
                            parseFloat(vaultWithdrawAmount) <= 0 ||
                            parseFloat(vaultWithdrawAmount) > userVaultPosition.assets
                          }
                          className="w-full py-3 bg-[#0052FF] hover:bg-[#0046DD] disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors"
                        >
                          Withdraw
                        </button>
                      ) : (
                        <div className="text-center text-gray-400 text-sm py-3">Connect wallet to withdraw</div>
                      )}
                    </div>
                  )}
                </section>

                <section className="bg-[#161921] rounded-xl p-6 border border-gray-800 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Deposits</span>
                    <span className="text-white font-mono">{formatUSD(primaryVault.total_deposits)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Available Liquidity</span>
                    <span className="text-white font-mono">{formatUSD(primaryVault.available_liquidity)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Borrowed Out</span>
                    <span className="text-white font-mono">{formatUSD(borrowedLiquidity)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Utilization</span>
                    <span className="text-white font-mono">{formatPercent(vaultUtilization)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Supply APY</span>
                    <span className="text-white font-mono">{formatPercent(primaryVault.apy)}</span>
                  </div>
                </section>
              </div>
            </div>
          ) : (
            <div className="bg-[#161921] rounded-xl p-6 border border-gray-800 text-gray-400">
              Vault data is unavailable at the moment.
            </div>
          ))}

        {viewTab === 'borrow' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-8">
            <section>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#161921] rounded-xl p-6 border border-gray-800">
                  <div className="text-gray-400 text-sm mb-2">Total Market Size</div>
                  <div className="text-3xl font-bold text-white font-mono">{formatUSDCAmount(selectedMarket.total_size)}</div>
                </div>
                <div className="bg-[#161921] rounded-xl p-6 border border-gray-800">
                  <div className="text-gray-400 text-sm mb-2">Total Liquidity</div>
                  <div className="text-3xl font-bold text-white font-mono">
                    {formatUSDCAmount(selectedMarket.total_size - selectedMarket.total_borrowed)}
                  </div>
                </div>
                <div className="bg-[#161921] rounded-xl p-6 border border-gray-800">
                  <div className="text-gray-400 text-sm mb-2">Borrow Rate</div>
                  <div className="text-3xl font-bold text-[#FFB237] flex items-center space-x-2">
                    <span>{formatPercent(selectedMarket.borrow_apy)}</span>
                    <TrendingUp size={24} />
                  </div>
                </div>
              </div>
            </section>

            {userPosition && (
              <section className="bg-[#161921] rounded-xl p-6 border border-gray-800">
                <h3 className="text-xl font-semibold text-white mb-4">Your Position</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-gray-400 text-sm mb-1">Collateral</div>
                    <div className="text-2xl font-bold text-white font-mono">
                      {userPosition.collateral.toFixed(4)} {collateralTicker}
                    </div>
                    {collateralName && (
                      <div className="text-xs text-gray-500">{collateralName}</div>
                    )}
                    <div className="text-sm text-gray-400">{formatUSD(collateralValue)}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm mb-1">Borrowed</div>
                    <div className="text-2xl font-bold text-white font-mono">{formatUSD(userPosition.borrow_assets)}</div>
                    <div className="text-sm text-gray-400">{selectedMarket.loan_asset}</div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-800">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-gray-400 text-sm mb-1">LTV</div>
                      <div className="text-lg font-semibold text-white">{formatPercent(currentLtv)}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-sm mb-1">Health Factor</div>
                      <div
                        className={`text-lg font-semibold ${
                          healthFactor > 2 ? 'text-[#00D395]' : healthFactor > 1.2 ? 'text-[#FFB237]' : 'text-[#FF5252]'
                        }`}
                      >
                        {healthFactor === Infinity ? '--' : healthFactor.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-sm mb-1">Liquidation Price</div>
                      <div className="text-lg font-semibold text-white font-mono">
                        {liquidationPrice > 0 ? formatUSD(liquidationPrice) : '--'}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            <section className="bg-[#161921] rounded-xl p-6 border border-gray-800">
              <h3 className="text-xl font-semibold text-white mb-4">Market Information</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Borrowed</span>
                  <span className="text-white font-mono">{formatUSD(selectedMarket.total_borrowed)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Utilization Rate</span>
                  <span className="text-white">{formatPercent(selectedMarket.utilization)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Max LTV</span>
                  <span className="text-white">{selectedMarket.lltv}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Current {collateralTicker} Price</span>
                  <span className="text-white font-mono">{formatUSD(selectedMarket.collateral_price)}</span>
                </div>
              </div>
            </section>

            <section className="bg-[#161921] rounded-xl p-6 border border-gray-800">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">Overview</h3>
                <div className="flex space-x-6 text-xs uppercase tracking-wide text-gray-500">
                  <button
                    onClick={() => setOverviewTab('overview')}
                    className={`pb-1 transition-colors ${
                      overviewTab === 'overview'
                        ? 'text-white border-b-2 border-[#0052FF]'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setOverviewTab('advanced')}
                    className={`pb-1 transition-colors ${
                      overviewTab === 'advanced'
                        ? 'text-white border-b-2 border-[#0052FF]'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    Advanced
                  </button>
                </div>
              </div>

              {overviewTab === 'overview' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div>
                    <div className="text-sm font-semibold text-white mb-4">Market Attributes</div>
                    <div className="space-y-4 text-sm">
                      <div className="flex justify-between border-b border-gray-800 pb-3">
                        <span className="text-gray-400">Collateral</span>
                        <span className="text-white font-medium">{collateralTicker}</span>
                      </div>
                      {collateralName && (
                        <div className="flex justify-between border-b border-gray-800 pb-3">
                          <span className="text-gray-400">Company</span>
                          <span className="text-white font-medium">{collateralName}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-b border-gray-800 pb-3">
                        <span className="text-gray-400">Loan</span>
                        <span className="text-white font-medium">{selectedMarket.loan_asset}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Liquidation LTV</span>
                        <span className="text-white font-medium">{selectedMarket.lltv}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4 text-sm">
                    <div className="flex justify-between border-b border-gray-800 pb-3">
                      <span className="text-gray-400">Oracle price</span>
                      <span className="text-white font-medium">{oraclePriceDisplay}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-800 pb-3">
                      <span className="text-gray-400">Created on</span>
                      <span className="text-white font-medium">{formattedCreatedDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Utilization</span>
                      <span className="text-white font-medium">{formatPercent(selectedMarket.utilization)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-10">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="text-sm font-semibold text-white">IRM Breakdown</div>
                      <div className="space-y-4 text-sm">
                        <div className="flex justify-between border-b border-gray-800 pb-3">
                          <span className="text-gray-400">Target utilization</span>
                          <span className="text-white font-medium">{formatPercent(targetUtilization)}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-800 pb-3">
                          <span className="text-gray-400">Current utilization</span>
                          <span className="text-white font-medium">{formatPercent(selectedMarket.utilization)}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-800 pb-3">
                          <span className="text-gray-400">Borrow amount to target utilization</span>
                          <span className="text-white font-medium">{formatUSD(borrowAmountToTarget)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Interest rate model</span>
                          <span className="text-white font-medium font-mono">
                            {formatAddress(interestRateModel)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-[#0A0B0F] border border-gray-900 rounded-xl p-6 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-semibold text-white">Utilization Curve</span>
                        <span className="text-xs text-gray-500">Mock data</span>
                      </div>
                      <div className="relative h-40">
                        <div className="absolute inset-0 bg-gradient-to-r from-[#0052FF]/20 via-[#00D395]/10 to-[#FF5252]/20 rounded-lg" />
                        <div className="absolute bottom-6 left-6 right-6 h-1 bg-gray-800 rounded" />
                        <div className="absolute right-10 top-6 h-28 w-px bg-[#0052FF]/40" />
                        <div className="absolute right-10 top-4 text-xs text-[#00D395]">Current</div>
                        <div className="absolute right-10 bottom-12 text-xs text-gray-400">Target</div>
                      </div>
                      <div className="mt-4 text-xs text-gray-500">Curve illustration is for demo purposes only.</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <div className="text-sm font-semibold text-white mb-4">Liquidations</div>
                      <div className="space-y-4 text-sm">
                        <div className="flex justify-between border-b border-gray-800 pb-3">
                          <span className="text-gray-400">Liquidation Loan-To-Value (LLTV)</span>
                          <span className="text-white font-medium">{selectedMarket.lltv}%</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-800 pb-3">
                          <span className="text-gray-400">Realized Bad Debt</span>
                          <span className="text-white font-medium">{formatUSD(realizedBadDebt)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Unrealized Bad Debt</span>
                          <span className="text-white font-medium">{formatUSD(unrealizedBadDebt)}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white mb-4">Liquidation Penalty</div>
                      <div className="bg-[#0A0B0F] border border-gray-900 rounded-xl p-6">
                        <div className="text-3xl font-bold text-[#FF5252]">{formatPercent(liquidationPenalty)}</div>
                        <div className="text-sm text-gray-400 mt-2">Additional fee applied to liquidated positions.</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>

          <div className="space-y-6 lg:pt-0">
            <section className="bg-[#161921] rounded-xl p-6 border border-gray-800">
              <div className="flex space-x-2 mb-6">
                {(['borrow', 'repay', 'withdraw'] as InteractionTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2 text-xs font-medium transition-colors ${
                      activeTab === tab ? 'text-[#0052FF] border-b-2 border-[#0052FF]' : 'text-gray-400'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              {activeTab === 'borrow' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400 block mb-2">
                      Supply Collateral ({collateralTicker})
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={collateralAmount}
                        onChange={(e) => setCollateralAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-[#0A0B0F] border border-gray-700 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-[#0052FF]"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {collateralTicker}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-sm">
                      <span className="text-gray-400">Balance: {mockEthBalance.toFixed(2)} {collateralTicker}</span>
                      <button
                        onClick={() => setCollateralAmount(mockEthBalance.toString())}
                        className="text-[#0052FF] hover:text-[#0046DD] font-medium"
                      >
                        MAX
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-gray-400 block mb-2">
                      Borrow ({selectedMarket.loan_asset})
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={borrowAmount}
                        onChange={(e) => setBorrowAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-[#0A0B0F] border border-gray-700 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-[#0052FF]"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {selectedMarket.loan_asset}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-sm">
                      <span className="text-gray-400">Max: {formatUSD(availableToBorrow)}</span>
                      <button
                        onClick={() => setBorrowAmount(availableToBorrow.toString())}
                        className="text-[#0052FF] hover:text-[#0046DD] font-medium"
                      >
                        MAX
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#0A0B0F] rounded-lg p-4 space-y-2 text-sm">
                    <div className="font-semibold text-white mb-2">Position Info</div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Collateral Value</span>
                      <span className="text-white font-mono">{formatUSD(projectedCollateralValue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Borrowed</span>
                      <span className="text-white font-mono">{formatUSD(projectedBorrowed)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">LTV</span>
                      <span
                        className={`font-semibold ${
                          projectedLtv > 80 ? 'text-[#FF5252]' : projectedLtv > 70 ? 'text-[#FFB237]' : 'text-[#00D395]'
                        }`}
                      >
                        {formatPercent(projectedLtv)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Max LTV</span>
                      <span className="text-white">{selectedMarket.lltv}%</span>
                    </div>
                    {projectedLtv > 80 && (
                      <div className="flex items-start space-x-2 mt-3 p-2 bg-[#FF5252]/10 rounded">
                        <AlertTriangle className="text-[#FF5252] flex-shrink-0 mt-0.5" size={16} />
                        <span className="text-[#FF5252] text-xs">High risk of liquidation</span>
                      </div>
                    )}
                  </div>

                  {connectedAddress ? (
                    <button
                      onClick={handleBorrow}
                      disabled={
                        !borrowAmount ||
                        parseFloat(borrowAmount) <= 0 ||
                        parseFloat(borrowAmount) > availableToBorrow
                      }
                      className="w-full py-3 bg-[#0052FF] hover:bg-[#0046DD] disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors"
                    >
                      Supply & Borrow
                    </button>
                  ) : (
                    <div className="text-center text-gray-400 text-sm py-3">Connect wallet to borrow</div>
                  )}
                </div>
              )}

              {activeTab === 'repay' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400 block mb-2">Repay Amount</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={repayAmount}
                        onChange={(e) => setRepayAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-[#0A0B0F] border border-gray-700 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-[#0052FF]"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{selectedMarket.loan_asset}</div>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-sm">
                      <span className="text-gray-400">
                        Borrowed: {userPosition ? formatUSD(userPosition.borrow_assets) : '$0.00'}
                      </span>
                      {userPosition && (
                        <button
                          onClick={() => setRepayAmount(userPosition.borrow_assets.toString())}
                          className="text-[#0052FF] hover:text-[#0046DD] font-medium"
                        >
                          MAX
                        </button>
                      )}
                    </div>
                  </div>

                  {connectedAddress ? (
                    <button
                      onClick={handleRepay}
                      disabled={
                        !repayAmount ||
                        !userPosition ||
                        parseFloat(repayAmount) <= 0 ||
                        parseFloat(repayAmount) > userPosition.borrow_assets
                      }
                      className="w-full py-3 bg-[#0052FF] hover:bg-[#0046DD] disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors"
                    >
                      Repay
                    </button>
                  ) : (
                    <div className="text-center text-gray-400 text-sm py-3">Connect wallet to repay</div>
                  )}
                </div>
              )}

              {activeTab === 'withdraw' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400 block mb-2">Withdraw Collateral</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={withdrawColAmount}
                        onChange={(e) => setWithdrawColAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-[#0A0B0F] border border-gray-700 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-[#0052FF]"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {collateralTicker}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-sm">
                      <span className="text-gray-400">
                        Available: {userPosition ? userPosition.collateral.toFixed(4) : '0.00'} {collateralTicker}
                      </span>
                      {userPosition && (
                        <button
                          onClick={() => setWithdrawColAmount(userPosition.collateral.toString())}
                          className="text-[#0052FF] hover:text-[#0046DD] font-medium"
                        >
                          MAX
                        </button>
                      )}
                    </div>
                  </div>

                  {connectedAddress ? (
                    <button
                      onClick={handleWithdrawCollateral}
                      disabled={
                        !withdrawColAmount ||
                        !userPosition ||
                        parseFloat(withdrawColAmount) <= 0 ||
                        parseFloat(withdrawColAmount) > userPosition.collateral
                      }
                      className="w-full py-3 bg-[#0052FF] hover:bg-[#0046DD] disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors"
                    >
                      Withdraw Collateral
                    </button>
                  ) : (
                    <div className="text-center text-gray-400 text-sm py-3">Connect wallet to withdraw</div>
                  )}
                </div>
              )}
            </section>

            <section className="bg-[#161921] rounded-xl p-6 border border-gray-800 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Utilization</span>
                <span className="text-white font-mono">{formatPercent(selectedMarket.utilization)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Max LTV</span>
                <span className="text-white font-mono">{selectedMarket.lltv}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Oracle Price</span>
                <span className="text-white font-mono">{formatUSD(selectedMarket.collateral_price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Current LTV</span>
                <span className="text-white font-mono">{formatPercent(currentLtv)}</span>
              </div>
            </section>
          </div>
        </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Markets</h1>
          <p className="text-gray-400">{marketPageDescription}</p>
        </div>
        {markets.length > 0 && (
          <div className="flex items-center space-x-2 self-start">
            <span className="text-xs uppercase tracking-wide text-gray-500">View</span>
            <button
              onClick={() => handleViewModeToggle('card')}
              className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                marketListViewMode === 'card'
                  ? 'border-[#2A3042] bg-[#161921] text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => handleViewModeToggle('table')}
              className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                marketListViewMode === 'table'
                  ? 'border-[#2A3042] bg-[#161921] text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Table
            </button>
          </div>
        )}
      </div>

      {markets.length === 0 ? (
        <div className="bg-[#161921] rounded-xl border border-gray-800 p-6 text-center text-gray-400">
          No markets available.
        </div>
      ) : marketListViewMode === 'table' ? (
        <div className="bg-[#161921] rounded-xl border border-gray-800 overflow-hidden">
          <div className="grid grid-cols-7 gap-4 px-6 py-4 border-b border-gray-800 text-sm font-medium text-gray-400">
            <div>Collateral</div>
            <div>Loan</div>
            <div>Market Size</div>
            <div>Available Liquidity</div>
            <div>Supply APR</div>
            <div>Borrow APR</div>
            <div className="text-right">Actions</div>
          </div>

          {markets.map((market) => {
            const availableLiquidity = Math.max(market.total_size - market.total_borrowed, 0);
            const supplyApy = getSupplyApyForMarket(market);
            const utilization = market.total_size > 0 ? (market.total_borrowed / market.total_size) * 100 : 0;

            return (
              <div
                key={market.id}
                role="button"
                tabIndex={0}
                onClick={() => handleMarketSelect(market.id)}
                onKeyDown={(event) => handleMarketSelectKey(event, market.id)}
                className="w-full grid grid-cols-7 gap-4 px-6 py-6 hover:bg-[#0A0B0F] transition-colors text-left border-b border-gray-800 last:border-b-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0052FF]"
              >
                <div className="flex items-center space-x-3">
                  <MarketLogo ticker={market.collateral_asset} name={market.display_name} logo={market.logo} size="sm" />
                  <div>
                    <div className="font-semibold text-white">{market.collateral_asset}</div>
                    {market.display_name && <div className="text-xs text-gray-500">{market.display_name}</div>}
                    <div className="text-xs text-gray-500">Price: {formatUSD(market.collateral_price)}</div>
                  </div>
                </div>
                <div>
                  <div className="text-white font-mono">{market.loan_asset}</div>
                  <div className="text-xs text-gray-500">Loan currency</div>
                </div>
                <div>
                  <div className="text-white font-mono">{formatUSDCAmount(market.total_size)}</div>
                  <div className="text-xs text-gray-500">Total supplied</div>
                </div>
                <div>
                  <div className="text-white font-mono">{formatUSDCAmount(availableLiquidity)}</div>
                  <div className="text-xs text-gray-500">{formatPercent(utilization)} utilized</div>
                </div>
                <div className="flex flex-col">
                  <div className="text-[#00D395] font-semibold">{formatPercent(supplyApy)}</div>
                  <div className="text-xs text-gray-500">Current yield</div>
                </div>
                <div className="flex flex-col">
                  <div className="text-[#FFB237] font-semibold flex items-center space-x-2">
                    <span>{formatPercent(market.borrow_apy)}</span>
                    <TrendingUp size={16} />
                  </div>
                  <div className="text-xs text-gray-500">Borrow rate</div>
                </div>
                <div className="flex items-center justify-end space-x-2">
                  <button
                    onClick={(event) => handleMarketAction(market.id, 'borrow', event)}
                    className="px-3 py-2 rounded-lg border border-[#2A3042] text-sm font-medium text-white hover:bg-[#1F2330] transition-colors"
                  >
                    Borrow
                  </button>
                  <button
                    onClick={(event) => handleMarketAction(market.id, 'supply', event)}
                    className="px-3 py-2 rounded-lg bg-[#0052FF] hover:bg-[#0046DD] text-sm font-medium text-white transition-colors"
                  >
                    Supply
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {markets.map((market) => {
            const availableLiquidity = Math.max(market.total_size - market.total_borrowed, 0);
            const supplyApy = getSupplyApyForMarket(market);
            const utilization = market.total_size > 0 ? (market.total_borrowed / market.total_size) * 100 : 0;

            return (
              <div
                key={market.id}
                className="bg-[#161921] border border-gray-800 rounded-xl p-6 flex flex-col space-y-5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <MarketLogo ticker={market.collateral_asset} name={market.display_name} logo={market.logo} size="sm" />
                    <div>
                      <div className="text-lg font-semibold text-white">{market.collateral_asset}</div>
                      {market.display_name && <div className="text-xs text-gray-500">{market.display_name}</div>}
                      <div className="text-xs text-gray-500 mt-1">Price: {formatUSD(market.collateral_price)}</div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 font-medium">LLTV {market.lltv}%</span>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Loan Asset</span>
                    <span className="text-white font-mono">{market.loan_asset}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Total Market Size</span>
                    <span className="text-white font-mono">{formatUSDCAmount(market.total_size)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Available Liquidity</span>
                    <span className="text-white font-mono">{formatUSDCAmount(availableLiquidity)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Supply APR</span>
                    <span className="text-[#00D395] font-semibold">{formatPercent(supplyApy)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Borrow APR</span>
                    <span className="text-[#FFB237] font-semibold">{formatPercent(market.borrow_apy)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Utilization</span>
                    <span className="text-white font-mono">{formatPercent(utilization)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    onClick={(event) => handleMarketAction(market.id, 'borrow', event)}
                    className="flex-1 px-4 py-2 rounded-lg border border-[#2A3042] text-sm font-medium text-white hover:bg-[#1F2330] transition-colors"
                  >
                    Borrow
                  </button>
                  <button
                    onClick={(event) => handleMarketAction(market.id, 'supply', event)}
                    className="flex-1 px-4 py-2 rounded-lg bg-[#0052FF] hover:bg-[#0046DD] text-sm font-medium text-white transition-colors"
                  >
                    Supply
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
