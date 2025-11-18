import React, { useMemo, useState } from 'react';
import { useProtocol } from '../context/ProtocolContext';
import { formatUSD, formatPercent, calculateHealthFactor, calculateLiquidationPrice } from '../utils/format';
import { TrendingUp, ArrowRight } from 'lucide-react';
import { MarketActionModal } from '../components/MarketActionModal';
import type { Market, Vault } from '../lib/supabase';

interface DashboardProps {
  onNavigateToMarket: (marketId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateToMarket }) => {
  const { markets, vaults, userMarketPositions, userVaultPositions, connectedAddress } = useProtocol();

  const fallbackVaultBlueprints: Array<Pick<Vault, 'id' | 'name' | 'asset' | 'apy'>> = [
    {
      id: 'mock-vault-1',
      name: 'Prime USDC Vault',
      asset: 'USDC',
      apy: 4.86
    }
  ];

  const fallbackMarketBlueprints: Array<
    Pick<Market, 'id' | 'collateral_asset' | 'loan_asset' | 'collateral_price' | 'borrow_apy' | 'lltv' | 'utilization' | 'supply_apy'>
  > = [
    {
      id: 'mock-market-1',
      collateral_asset: 'AAPL',
      loan_asset: 'USDC',
      collateral_price: 189.87,
      borrow_apy: 5.12,
      lltv: 70,
      utilization: 58.4,
      supply_apy: 3.45
    }
  ];

  const referenceMarkets = markets.length ? markets : fallbackMarketBlueprints;
const referenceVaults = vaults.length ? vaults : fallbackVaultBlueprints;
const [modalState, setModalState] = useState<{
  type: 'supply' | 'borrow';
  marketId: string;
  vaultId?: string | null;
  vaultName?: string;
  initialTab?: 'supply' | 'withdraw' | 'borrow' | 'repay';
} | null>(null);
const [showLiquidations, setShowLiquidations] = useState(false);

  const hasSupplyPositions = userVaultPositions.length > 0;
  const supplyRows = hasSupplyPositions
    ? userVaultPositions
        .map((position, index) => {
          const vault = vaults.find((v) => v.id === position.vault_id);
          if (!vault) return null;

          const assetSymbol = vault.asset || 'USDC';
          const suppliedAmount = position.assets;
          const vaultApy = Number(vault.apy ?? 0);
          const associatedMarket =
            referenceMarkets.find((m) => m.loan_asset === assetSymbol) ||
            referenceMarkets[index % referenceMarkets.length];
          const utilizationValue = associatedMarket?.utilization ?? 0;

          return {
            id: position.id,
            vaultName: vault.name,
            vaultId: vault.id,
            asset: assetSymbol,
            marketId: associatedMarket?.id ?? null,
            marketName: associatedMarket
              ? `${associatedMarket.collateral_asset} / ${associatedMarket.loan_asset}`
              : '—',
            marketSizeDisplay: associatedMarket ? formatUSD(associatedMarket.total_size) : '--',
            suppliedDisplay: `${suppliedAmount.toLocaleString(undefined, {
              maximumFractionDigits: 2
            })} ${assetSymbol}`,
            valueUSD: suppliedAmount,
            valueDisplay: formatUSD(suppliedAmount),
            apyDisplay: formatPercent(vaultApy),
            apyValue: vaultApy,
            utilizationDisplay: formatPercent(utilizationValue ?? 0)
          };
        })
        .filter((row): row is NonNullable<typeof row> => Boolean(row))
    : referenceVaults.slice(0, 2).map((vault, index) => {
        const baseAmount = 15_000 + index * 4_000;
        const assetSymbol = vault.asset || 'USDC';
        const vaultApy = Number(vault.apy ?? 4.8);
        const associatedMarket =
          referenceMarkets.find((m) => m.loan_asset === assetSymbol) ||
          referenceMarkets[index % referenceMarkets.length];
        return {
          id: `sample-supply-${index}`,
          vaultName: vault.name || 'Prime USDC Vault',
          vaultId: typeof vault.id === 'string' ? vault.id : null,
          asset: assetSymbol,
          marketId: associatedMarket?.id ?? null,
          marketName: associatedMarket
            ? `${associatedMarket.collateral_asset} / ${associatedMarket.loan_asset}`
            : 'USDC Market',
          marketSizeDisplay: associatedMarket ? formatUSD(associatedMarket.total_size) : formatUSD(250_000_000),
          suppliedDisplay: `${baseAmount.toLocaleString()} ${assetSymbol}`,
          valueUSD: baseAmount,
          valueDisplay: formatUSD(baseAmount),
          apyDisplay: formatPercent(vaultApy),
          apyValue: vaultApy,
          utilizationDisplay: formatPercent(associatedMarket?.utilization ?? 55)
        };
      });

const supplyTotalValue = supplyRows.reduce((sum, row) => sum + row.valueUSD, 0);
const supplyWeightedApy = supplyTotalValue > 0
  ? supplyRows.reduce((sum, row) => sum + row.valueUSD * (row.apyValue ?? 0), 0) / supplyTotalValue
  : 0;

const hasBorrowPositions = userMarketPositions.length > 0;
const borrowRows = hasBorrowPositions
    ? userMarketPositions
        .map((position, index) => {
          const market = markets.find((m) => m.id === position.market_id);
          if (!market) return null;

          const collateralPrice = market.collateral_price ?? 0;
          const collateralValue = position.collateral * collateralPrice;
          const borrowedValue = position.borrow_assets;
          const ltv = collateralValue > 0 ? (borrowedValue / collateralValue) * 100 : 0;
          const healthFactor = calculateHealthFactor(collateralValue, borrowedValue, market.lltv);
          const liquidationPrice = calculateLiquidationPrice(
            position.collateral,
            borrowedValue,
            market.lltv
          );
          const borrowApy = Number(market.borrow_apy ?? 0);

          const overrideStatus = index === 0 ? 'safe' : index === 1 ? 'risk' : index === 2 ? 'warn' : null;
          const overrideVariant = overrideStatus === 'safe' ? 'safe' : overrideStatus === 'risk' ? 'risk' : overrideStatus === 'warn' ? 'warn' : null;

          return {
            id: position.id,
            marketId: market.id,
            marketName: `${market.collateral_asset} / ${market.loan_asset}`,
            collateralDisplay: `${position.collateral.toFixed(4)} ${market.collateral_asset} · ${formatUSD(collateralValue)}`,
            borrowedDisplay: `${formatUSD(borrowedValue).replace('$', '')} ${market.loan_asset}`,
            borrowedValueUSD: borrowedValue,
            collateralValueUSD: collateralValue,
            ltvDisplay: formatPercent(ltv),
            healthDisplay: (() => {
              if (healthFactor === Infinity) return 'Safe';
              if (ltv <= market.lltv * 0.6) return 'Safe';
              if (ltv <= market.lltv * 0.85) return 'Risky';
              return 'At risk';
            })(),
            healthVariant: (() => {
              if (healthFactor === Infinity) return 'safe' as const;
              if (ltv <= market.lltv * 0.6) return 'safe' as const;
              if (ltv <= market.lltv * 0.85) return 'warn' as const;
              return 'risk' as const;
            })(),
            aprDisplay: formatPercent(borrowApy),
            aprValue: borrowApy,
            healthBreakdown: {
              lltv: market.lltv,
              ltv: formatPercent(ltv),
              liquidationPrice: formatUSD(liquidationPrice),
              collateralPrice: formatUSD(collateralPrice)
            },
            loanDisplay: `${formatUSD(borrowedValue).replace('$', '')} ${market.loan_asset}`,
            loanAsset: market.loan_asset
          };
        })
        .filter((row): row is NonNullable<typeof row> => Boolean(row))
    : referenceMarkets.slice(0, 3).map((market, index) => {
        const overrideStatus = index === 0 ? 'safe' : index === 1 ? 'risk' : 'warn';
        const overrideVariant = overrideStatus === 'safe' ? 'safe' : overrideStatus === 'risk' ? 'risk' : 'warn';
        const collateralAmount = index === 0 ? 62 : 38;
        const collateralPrice = market.collateral_price ?? 200;
        const collateralValue = collateralAmount * collateralPrice;
        const borrowedValue = collateralValue * 0.45;
        const ltv = (borrowedValue / collateralValue) * 100;
        const healthFactor = calculateHealthFactor(collateralValue, borrowedValue, market.lltv ?? 70);
        const liquidationPrice = calculateLiquidationPrice(
          collateralAmount,
          borrowedValue,
          market.lltv ?? 70
        );
        const borrowApy = Number(market.borrow_apy ?? 5.4);

        return {
          id: `sample-borrow-${index}`,
          marketId: typeof market.id === 'string' ? market.id : null,
          marketName: `${market.collateral_asset ?? 'AAPL'} / ${market.loan_asset ?? 'USDC'}`,
          collateralDisplay: `${collateralAmount.toLocaleString(undefined, {
            maximumFractionDigits: 2
          })} ${market.collateral_asset ?? 'AAPL'} · ${formatUSD(collateralValue)}`,
          borrowedDisplay: `${formatUSD(borrowedValue).replace('$', '')} ${market.loan_asset ?? 'USDC'}`,
          borrowedValueUSD: borrowedValue,
          collateralValueUSD: collateralValue,
          ltvDisplay: formatPercent(ltv),
          healthDisplay: (() => {
            if (overrideStatus === 'safe') return 'Safe';
            if (overrideStatus === 'risk') return 'At risk';
            if (healthFactor === Infinity) return 'Safe';
            if (ltv <= (market.lltv ?? 70) * 0.6) return 'Safe';
            if (ltv <= (market.lltv ?? 70) * 0.85) return 'Risky';
            return 'At risk';
          })(),
          healthVariant: (() => {
            if (overrideVariant) return overrideVariant;
            if (healthFactor === Infinity) return 'safe' as const;
            if (ltv <= (market.lltv ?? 70) * 0.6) return 'safe' as const;
            if (ltv <= (market.lltv ?? 70) * 0.85) return 'warn' as const;
            return 'risk' as const;
          })(),
          aprDisplay: formatPercent(borrowApy),
          aprValue: borrowApy,
          healthBreakdown: {
            lltv: market.lltv ?? 70,
            ltv: formatPercent(ltv),
            liquidationPrice: formatUSD(liquidationPrice),
            collateralPrice: formatUSD(collateralPrice)
          },
          loanDisplay: `${formatUSD(borrowedValue).replace('$', '')} ${market.loan_asset ?? 'USDC'}`,
          loanAsset: market.loan_asset ?? 'USDC'
        };
      });

const borrowTotalValue = borrowRows.reduce((sum, row) => sum + row.borrowedValueUSD, 0);
const borrowWeightedApr = borrowTotalValue > 0
  ? borrowRows.reduce((sum, row) => sum + row.borrowedValueUSD * (row.aprValue ?? 0), 0) / borrowTotalValue
  : 0;
const totalCollateralValue = borrowRows.reduce((sum, row) => sum + (row.collateralValueUSD ?? 0), 0);
const netBorrowValue = totalCollateralValue - borrowTotalValue;
const collateralCoverage = borrowTotalValue > 0 ? totalCollateralValue / borrowTotalValue : null;

const activeMarket = useMemo<Market | null>(() => {
  if (!modalState?.marketId) return null;
  const collection = referenceMarkets as Array<Market>;
  return collection.find((m) => m.id === modalState.marketId) ?? null;
}, [modalState?.marketId, referenceMarkets]);

const activeVault = useMemo<Vault | null>(() => {
  if (!modalState?.vaultId) return null;
  const combined: Array<Vault | Pick<Vault, 'id' | 'name' | 'asset' | 'apy'>> = [
    ...vaults,
    ...fallbackVaultBlueprints
  ];
  return (combined.find((v) => v.id === modalState.vaultId) as Vault | null) ?? null;
}, [modalState?.vaultId, vaults]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Position Overview</h1>
      </div>

      <div className="space-y-6">
        <section className="bg-[#0F1016] border border-gray-800 rounded-3xl overflow-hidden">
            <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <div>
                <div className="flex items-center gap-2 text-white font-semibold">
                  <TrendingUp size={18} className="text-[#00D395]" />
                  <span>Supply Positions</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Current lending deposits and vault exposure.</p>
              </div>
            </header>
            <div className="px-6 pt-4 pb-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[#080d1b] border border-gray-800 rounded-2xl p-4">
                <div className="text-xs uppercase tracking-wide text-gray-500">Total Supplied</div>
                <div className="mt-2 text-xl font-bold text-white font-mono">{formatUSD(supplyTotalValue)}</div>
              </div>
              <div className="bg-[#080d1b] border border-gray-800 rounded-2xl p-4">
                <div className="text-xs uppercase tracking-wide text-gray-500">Average Supply APY</div>
                <div className="mt-2 text-xl font-bold text-white font-mono">
                  {supplyTotalValue > 0 ? formatPercent(supplyWeightedApy) : '--'}
                </div>
              </div>
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full table-fixed text-sm">
                <thead className="bg-[#0A0B0F] text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium w-[24%]">Market</th>
                    <th className="px-6 py-3 text-left font-medium w-[20%]">Market Size</th>
                    <th className="px-6 py-3 text-left font-medium w-[20%]">Your Supplied</th>
                    <th className="px-6 py-3 text-left font-medium w-[18%]">Utilization</th>
                    <th className="px-6 py-3 text-left font-medium w-[12%]">Supply APY</th>
                    <th className="px-6 py-3 text-left font-medium w-[6%]">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {supplyRows.map((row) => (
                    <tr key={row.id} className="border-b border-gray-800 last:border-b-0">
                      <td className="px-6 py-4 w-[24%] align-top">
                        <div className="text-white font-medium">{row.marketName}</div>
                        <div className="text-xs text-gray-500">{row.vaultName}</div>
                      </td>
                      <td className="px-6 py-4 w-[20%] align-top text-left text-white font-mono">{row.marketSizeDisplay}</td>
                      <td className="px-6 py-4 w-[20%] align-top text-left">
                        <div className="text-white font-mono">{row.suppliedDisplay}</div>
                        <div className="text-xs text-gray-500">≈ {row.valueDisplay}</div>
                      </td>
                      <td className="px-6 py-4 w-[18%] align-top text-left text-gray-300">{row.utilizationDisplay}</td>
                      <td className="px-6 py-4 w-[12%] align-top text-left">
                        <span className="text-[#00D395] font-semibold">{row.apyDisplay}</span>
                      </td>
                      <td className="px-6 py-4 w-[6%] align-top">
                        <button
                          onClick={() =>
                            row.marketId &&
                            setModalState({
                              type: 'supply',
                              marketId: row.marketId,
                              vaultId: row.vaultId ?? null,
                              vaultName: row.vaultName,
                              initialTab: 'supply'
                            })
                          }
                          disabled={!row.marketId || !row.vaultId}
                          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium ${
                            !row.marketId || !row.vaultId
                              ? 'border-gray-700 text-gray-500 cursor-not-allowed'
                              : 'border-[#2A3042] text-white hover:bg-[#1F2330] transition-colors'
                          }`}
                        >
                          <span>Manage</span>
                          <ArrowRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-4 p-4">
              {supplyRows.map((row) => (
                <div key={row.id} className="rounded-2xl border border-gray-800 bg-[#080d1b] p-4 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-white font-semibold">{row.marketName}</div>
                      <div className="text-xs text-gray-500">{row.vaultName}</div>
                    </div>
                    <button
                      onClick={() =>
                        row.marketId &&
                        setModalState({
                          type: 'supply',
                          marketId: row.marketId,
                          vaultId: row.vaultId ?? null,
                          vaultName: row.vaultName,
                          initialTab: 'supply'
                        })
                      }
                      disabled={!row.marketId || !row.vaultId}
                      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${
                        !row.marketId || !row.vaultId
                          ? 'border-gray-700 text-gray-500 cursor-not-allowed'
                          : 'border-[#2A3042] text-white hover:bg-[#1F2330] transition-colors'
                      }`}
                    >
                      <span>Manage</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3 text-sm">
                    <div className="text-gray-400">Market Size</div>
                    <div className="text-white font-mono">{row.marketSizeDisplay}</div>
                    <div className="text-gray-400">Your Supplied</div>
                    <div>
                      <div className="text-white font-mono">{row.suppliedDisplay}</div>
                      <div className="text-xs text-gray-500">≈ {row.valueDisplay}</div>
                    </div>
                    <div className="text-gray-400">Utilization</div>
                    <div className="text-white">{row.utilizationDisplay}</div>
                    <div className="text-gray-400">Supply APY</div>
                    <div className="text-[#00D395] font-semibold">{row.apyDisplay}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

        <section className="bg-[#0F1016] border border-gray-800 rounded-3xl overflow-hidden">
          <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
            <div>
              <div className="flex items-center gap-2 text-white font-semibold">
                <TrendingUp size={18} className="text-[#FFB237]" />
                <span>Borrow Positions</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Loans backed by supplied collateral.</p>
            </div>
            <button
              onClick={() => setShowLiquidations(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-[#2A3042] px-3 py-2 text-xs font-medium text-white hover:bg-[#1F2330] transition-colors"
            >
              <span>Liquidation History</span>
              <ArrowRight size={14} />
            </button>
          </header>
          <div className="px-6 pt-4 pb-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#080d1b] border border-gray-800 rounded-2xl p-4">
              <div className="text-xs uppercase tracking-wide text-gray-500">Total Collateral Value</div>
              <div className="mt-2 text-xl font-bold text-white font-mono">{formatUSD(totalCollateralValue)}</div>
            </div>
            <div className="bg-[#080d1b] border border-gray-800 rounded-2xl p-4">
              <div className="text-xs uppercase tracking-wide text-gray-500">Total Borrowed</div>
              <div className="mt-2 text-xl font-bold text-white font-mono">{formatUSD(borrowTotalValue)}</div>
            </div>
            <div className="bg-[#080d1b] border border-gray-800 rounded-2xl p-4">
              <div className="text-xs uppercase tracking-wide text-gray-500">Average Borrow Rate</div>
              <div className="mt-2 text-xl font-bold text-white font-mono">
                {borrowTotalValue > 0 ? formatPercent(borrowWeightedApr) : '--'}
              </div>
            </div>
            <div className="bg-[#080d1b] border border-gray-800 rounded-2xl p-4">
              <div className="text-xs uppercase tracking-wide text-gray-500">Total Net Value</div>
              <div className="mt-2 text-xl font-bold text-white font-mono">{formatUSD(netBorrowValue)}</div>
            </div>
          </div>
          <div className="overflow-x-auto">
              <table className="min-w-full table-fixed text-sm">
                <thead className="bg-[#0A0B0F] text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium w-[24%]">Market</th>
                    <th className="px-6 py-3 text-left font-medium w-[20%]">Collateral</th>
                    <th className="px-6 py-3 text-left font-medium w-[20%]">Loan</th>
                    <th className="px-6 py-3 text-left font-medium w-[18%]">Status</th>
                    <th className="px-6 py-3 text-left font-medium w-[12%]">Borrow Rate</th>
                    <th className="px-6 py-3 text-left font-medium w-[6%]">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {borrowRows.map((row) => {
                    let healthColor = 'text-gray-400';
                    if (row.healthVariant === 'safe') healthColor = 'text-[#00D395]';
                    else if (row.healthVariant === 'warn') healthColor = 'text-[#FFB237]';
                    else if (row.healthVariant === 'risk') healthColor = 'text-[#FF5252]';

                    return (
                      <tr key={row.id} className="border-b border-gray-800 last:border-b-0">
                        <td className="px-6 py-4 w-[24%] align-top text-white font-medium">{row.marketName}</td>
                        <td className="px-6 py-4 w-[20%] align-top text-left text-gray-300">{row.collateralDisplay}</td>
                        <td className="px-6 py-4 w-[20%] align-top text-left text-white font-mono">{row.loanDisplay}</td>
                        <td className="px-6 py-4 w-[18%] align-top text-left">
                          <span
                            className={`relative font-medium ${healthColor} cursor-help group`}
                          >
                            {row.healthDisplay}
                            <span className="pointer-events-none absolute left-1/2 top-full z-20 hidden w-56 -translate-x-1/2 translate-y-2 rounded-lg border border-gray-700 bg-[#0B0E15] p-3 text-xs text-gray-200 shadow-lg group-hover:block">
                              <span className="block text-gray-400">LTV / LLTV: {row.healthBreakdown.ltv} / {row.healthBreakdown.lltv}%</span>
                              <span className="block text-gray-400">Col. Market Price: {row.healthBreakdown.collateralPrice}</span>
                              <span className="block text-gray-400">Col. Liquidation Price: {row.healthBreakdown.liquidationPrice}</span>
                            </span>
                          </span>
                        </td>
                        <td className="px-6 py-4 w-[12%] align-top text-left">
                          <span className="text-[#FFB237] font-semibold">{row.aprDisplay}</span>
                        </td>
                        <td className="px-6 py-4 w-[6%] align-top">
                          <button
                            onClick={() =>
                              row.marketId &&
                              setModalState({
                                type: 'borrow',
                                marketId: row.marketId,
                                initialTab: 'borrow'
                              })
                            }
                            disabled={!row.marketId}
                            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium ${
                              !row.marketId
                                ? 'border-gray-700 text-gray-500 cursor-not-allowed'
                                : 'border-[#2A3042] text-white hover:bg-[#1F2330] transition-colors'
                            }`}
                          >
                            <span>Manage</span>
                            <ArrowRight size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-4 p-4">
              {borrowRows.map((row) => {
                let healthColor = 'text-gray-400';
                if (row.healthVariant === 'safe') healthColor = 'text-[#00D395]';
                else if (row.healthVariant === 'warn') healthColor = 'text-[#FFB237]';
                else if (row.healthVariant === 'risk') healthColor = 'text-[#FF5252]';

                return (
                  <div key={row.id} className="rounded-2xl border border-gray-800 bg-[#080d1b] p-4 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-white font-semibold">{row.marketName}</div>
                        <div className="text-xs text-gray-500">{row.collateralDisplay}</div>
                      </div>
                      <button
                        onClick={() =>
                          row.marketId &&
                          setModalState({
                            type: 'borrow',
                            marketId: row.marketId,
                            initialTab: 'borrow'
                          })
                        }
                        disabled={!row.marketId}
                        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${
                          !row.marketId
                            ? 'border-gray-700 text-gray-500 cursor-not-allowed'
                            : 'border-[#2A3042] text-white hover:bg-[#1F2330] transition-colors'
                        }`}
                      >
                        <span>Manage</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-y-3 text-sm">
                      <div className="text-gray-400">Loan</div>
                      <div className="text-white font-mono">{row.loanDisplay}</div>
                      <div className="text-gray-400">Health</div>
                      <div className={`font-mono ${healthColor}`}>
                        {row.healthDisplay}
                        <div className="text-xs text-gray-500 mt-1 space-y-1">
                          <div>LLTV: {row.healthBreakdown.lltv}%</div>
                          <div>LTV: {row.healthBreakdown.ltv}</div>
                          <div>Liquidation: {row.healthBreakdown.liquidationPrice}</div>
                        </div>
                      </div>
                      <div className="text-gray-400">Borrow Rate</div>
                      <div className="text-[#FFB237] font-semibold">{row.aprDisplay}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
      </div>

      {showLiquidations && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="bg-[#161921] border border-gray-800 rounded-xl shadow-2xl max-w-3xl w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h3 className="text-lg font-semibold text-white">Liquidation History</h3>
              <button
                onClick={() => setShowLiquidations(false)}
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                Close
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[#0A0B0F] text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium w-[16%]">Date</th>
                    <th className="px-6 py-3 text-left font-medium w-[20%]">Market</th>
                    <th className="px-6 py-3 text-left font-medium w-[18%]">Liquidation Price</th>
                    <th className="px-6 py-3 text-left font-medium w-[18%]">Collateral Liquidated</th>
                    <th className="px-6 py-3 text-left font-medium w-[18%]">Loan Repaid</th>
                    <th className="px-6 py-3 text-left font-medium w-[10%]">Txn</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      date: '2025-07-18 14:32',
                      market: 'SUIG / USDC',
                      price: '$9.82',
                      collateral: '45.2 SUIG',
                      repaid: '410 USDC',
                      tx: '0xa91b...4e90'
                    },
                    {
                      date: '2025-05-02 09:11',
                      market: 'AAPL / USDC',
                      price: '$112.45',
                      collateral: '12.1 AAPL',
                      repaid: '1.4K USDC',
                      tx: '0xb42c...d112'
                    },
                    {
                      date: '2024-12-19 22:48',
                      market: 'NVDA / USDC',
                      price: '$312.88',
                      collateral: '3.4 NVDA',
                      repaid: '980 USDC',
                      tx: '0xc53d...7f34'
                    }
                  ].map((entry) => (
                    <tr key={entry.tx} className="border-b border-gray-800 last:border-b-0">
                      <td className="px-6 py-3 text-gray-300">{entry.date}</td>
                      <td className="px-6 py-3 text-white font-medium">{entry.market}</td>
                      <td className="px-6 py-3 text-white font-mono">{entry.price}</td>
                      <td className="px-6 py-3 text-white font-mono">{entry.collateral}</td>
                      <td className="px-6 py-3 text-white font-mono">{entry.repaid}</td>
                      <td className="px-6 py-3 text-[#4C8FFF] font-mono">
                        <button
                          className="hover:underline"
                          onClick={() => navigator.clipboard.writeText(entry.tx)}
                          title="Copy transaction hash"
                        >
                          {entry.tx}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <MarketActionModal
        type={modalState?.type ?? 'supply'}
        market={activeMarket}
        vault={modalState?.type === 'supply' ? activeVault : null}
        isOpen={Boolean(modalState)}
        onClose={() => setModalState(null)}
        initialTab={modalState?.initialTab}
      />

      {!connectedAddress && (
        <div className="bg-[#161921] rounded-xl p-8 border border-gray-800 text-center">
          <h3 className="text-xl font-semibold text-white mb-2">Connect Your Wallet</h3>
          <p className="text-gray-400">Connect your wallet to view and manage your positions</p>
        </div>
      )}
    </div>
  );
};
