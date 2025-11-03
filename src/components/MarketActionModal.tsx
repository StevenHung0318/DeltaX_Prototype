import React, { useEffect, useMemo, useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { useProtocol } from '../context/ProtocolContext';
import {
  formatPercent,
  formatUSD,
  calculateHealthFactor,
  calculateLiquidationPrice
} from '../utils/format';
import type { Market, Vault } from '../lib/supabase';

type BorrowTab = 'borrow' | 'repay' | 'withdraw';
type SupplyTab = 'supply' | 'withdraw';

interface MarketActionModalProps {
  type: 'supply' | 'borrow';
  market?: Market | null;
  vault?: Vault | null;
  isOpen: boolean;
  onClose: () => void;
  initialTab?: BorrowTab | SupplyTab;
}

export const MarketActionModal: React.FC<MarketActionModalProps> = ({
  type,
  market,
  vault,
  isOpen,
  onClose,
  initialTab
}) => {
  const {
    connectedAddress,
    borrow,
    repay,
    withdrawCollateral,
    supplyToVault,
    withdrawFromVault,
    userMarketPositions,
    userVaultPositions
  } = useProtocol();

  const [borrowTab, setBorrowTab] = useState<BorrowTab>('borrow');
  const [supplyTab, setSupplyTab] = useState<SupplyTab>('supply');
  const [collateralAmount, setCollateralAmount] = useState('');
  const [borrowAmount, setBorrowAmount] = useState('');
  const [repayAmount, setRepayAmount] = useState('');
  const [withdrawCollateralAmount, setWithdrawCollateralAmount] = useState('');
  const [supplyAmount, setSupplyAmount] = useState('');
  const [vaultWithdrawAmount, setVaultWithdrawAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (type === 'borrow') {
        setBorrowTab((initialTab as BorrowTab) || 'borrow');
      } else {
        setSupplyTab((initialTab as SupplyTab) || 'supply');
      }
      setCollateralAmount('');
      setBorrowAmount('');
      setRepayAmount('');
      setWithdrawCollateralAmount('');
      setSupplyAmount('');
      setVaultWithdrawAmount('');
      setIsSubmitting(false);
    }
  }, [isOpen, type, initialTab]);

  const userMarketPosition = useMemo(() => {
    if (!market) return null;
    return userMarketPositions.find((pos) => pos.market_id === market.id) ?? null;
  }, [userMarketPositions, market]);

  const userVaultPosition = useMemo(() => {
    if (!vault) return null;
    return userVaultPositions.find((pos) => pos.vault_id === vault.id) ?? null;
  }, [userVaultPositions, vault]);

  const mockEthBalance = 5.25;
  const mockUsdcBalance = 10000;

  const collateralValue = userMarketPosition && market ? userMarketPosition.collateral * market.collateral_price : 0;
  const borrowedValue = userMarketPosition ? userMarketPosition.borrow_assets : 0;
  const maxBorrow = market
    ? (collateralValue + (parseFloat(collateralAmount || '0') * (market.collateral_price || 0))) *
      (market.lltv / 100)
    : 0;
  const availableToBorrow = maxBorrow - borrowedValue;

  const projectedCollateralValue =
    (userMarketPosition?.collateral || 0) * (market?.collateral_price || 0) +
    parseFloat(collateralAmount || '0') * (market?.collateral_price || 0);
  const projectedBorrowed = borrowedValue + parseFloat(borrowAmount || '0');
  const projectedLtv =
    projectedCollateralValue > 0 ? (projectedBorrowed / projectedCollateralValue) * 100 : 0;

  const healthFactor = market
    ? calculateHealthFactor(projectedCollateralValue, projectedBorrowed, market.lltv)
    : Infinity;

  const liquidationPrice = market && userMarketPosition
    ? calculateLiquidationPrice(
        userMarketPosition.collateral + parseFloat(collateralAmount || '0'),
        projectedBorrowed,
        market.lltv
      )
    : 0;

  const closeIfNotSubmitting = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div
        className="absolute inset-0"
        onClick={closeIfNotSubmitting}
        role="presentation"
      />
      <div className="relative z-10 w-full max-w-3xl overflow-hidden rounded-2xl border border-[#2A3042] bg-[#0B0E15] shadow-xl">
        <header className="flex items-start justify-between border-b border-gray-800 px-6 py-5">
          <div>
            <div className="text-sm uppercase tracking-wide text-gray-500">
              {type === 'borrow' ? 'Borrow market' : 'Supply vault'}
            </div>
            <h2 className="text-2xl font-semibold text-white">
              {market ? `${market.collateral_asset} / ${market.loan_asset}` : 'Market unavailable'}
            </h2>
          </div>
          <button
            onClick={closeIfNotSubmitting}
            className="rounded-full border border-gray-700 p-2 text-gray-400 hover:text-white"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </header>

        {!market ? (
          <div className="px-6 py-12 text-center text-gray-400">
            Unable to load market data. Please try again later.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-5">
            <div className="space-y-6 lg:col-span-3">
              {type === 'borrow' ? (
                <>
                  <div className="flex space-x-6 border-b border-gray-800">
                    {(['borrow', 'repay', 'withdraw'] as BorrowTab[]).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setBorrowTab(tab)}
                        className={`pb-3 text-sm font-medium uppercase tracking-wide ${
                          borrowTab === tab
                            ? 'text-white'
                            : 'text-gray-500 hover:text-white'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  {borrowTab === 'borrow' && (
                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-sm text-gray-400">Collateral ({market.collateral_asset})</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={collateralAmount}
                            onChange={(e) => setCollateralAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full rounded-lg border border-gray-700 bg-[#0A0B0F] px-4 py-3 text-white focus:border-[#0052FF] focus:outline-none"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                            Balance: {mockEthBalance.toFixed(4)} {market.collateral_asset}
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="mb-2 block text-sm text-gray-400">Borrow Amount ({market.loan_asset})</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={borrowAmount}
                            onChange={(e) => setBorrowAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full rounded-lg border border-gray-700 bg-[#0A0B0F] px-4 py-3 text-white focus:border-[#0052FF] focus:outline-none"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                            Max: {formatUSD(Math.max(availableToBorrow, 0))}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          if (!market || !connectedAddress) return;
                          const colAmount = parseFloat(collateralAmount || '0');
                          const borAmount = parseFloat(borrowAmount || '0');
                          if (colAmount <= 0 || borAmount <= 0) return;
                          if (colAmount > mockEthBalance) return;
                          if (borAmount > availableToBorrow) return;
                          setIsSubmitting(true);
                          try {
                            await borrow(market.id, colAmount, borAmount);
                            setCollateralAmount('');
                            setBorrowAmount('');
                            onClose();
                          } finally {
                            setIsSubmitting(false);
                          }
                        }}
                        disabled={
                          !connectedAddress ||
                          !borrowAmount ||
                          parseFloat(borrowAmount) <= 0 ||
                          parseFloat(borrowAmount) > availableToBorrow ||
                          isSubmitting
                        }
                        className="w-full rounded-lg bg-[#0052FF] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0046DD] disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-gray-500"
                      >
                        Confirm Borrow
                      </button>
                    </div>
                  )}

                  {borrowTab === 'repay' && (
                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-sm text-gray-400">Repay Amount ({market.loan_asset})</label>
                        <input
                          type="number"
                          value={repayAmount}
                          onChange={(e) => setRepayAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full rounded-lg border border-gray-700 bg-[#0A0B0F] px-4 py-3 text-white focus:border-[#0052FF] focus:outline-none"
                        />
                        <div className="mt-2 text-xs text-gray-500">
                          Outstanding: {formatUSD(borrowedValue)}
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          if (!market || !userMarketPosition || !repayAmount) return;
                          const amount = parseFloat(repayAmount);
                          if (amount <= 0 || amount > userMarketPosition.borrow_assets) return;
                          setIsSubmitting(true);
                          try {
                            await repay(market.id, amount);
                            setRepayAmount('');
                            onClose();
                          } finally {
                            setIsSubmitting(false);
                          }
                        }}
                        disabled={
                          !connectedAddress ||
                          !repayAmount ||
                          parseFloat(repayAmount) <= 0 ||
                          (userMarketPosition && parseFloat(repayAmount) > userMarketPosition.borrow_assets) ||
                          isSubmitting
                        }
                        className="w-full rounded-lg bg-[#0052FF] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0046DD] disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-gray-500"
                      >
                        Confirm Repay
                      </button>
                    </div>
                  )}

                  {borrowTab === 'withdraw' && (
                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-sm text-gray-400">Withdraw Collateral ({market.collateral_asset})</label>
                        <input
                          type="number"
                          value={withdrawCollateralAmount}
                          onChange={(e) => setWithdrawCollateralAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full rounded-lg border border-gray-700 bg-[#0A0B0F] px-4 py-3 text-white focus:border-[#0052FF] focus:outline-none"
                        />
                        <div className="mt-2 text-xs text-gray-500">
                          Available: {userMarketPosition ? userMarketPosition.collateral.toFixed(4) : '0.00'} {market.collateral_asset}
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          if (!market || !userMarketPosition || !withdrawCollateralAmount) return;
                          const amount = parseFloat(withdrawCollateralAmount);
                          if (amount <= 0 || amount > userMarketPosition.collateral) return;
                          setIsSubmitting(true);
                          try {
                            await withdrawCollateral(market.id, amount);
                            setWithdrawCollateralAmount('');
                            onClose();
                          } finally {
                            setIsSubmitting(false);
                          }
                        }}
                        disabled={
                          !connectedAddress ||
                          !withdrawCollateralAmount ||
                          parseFloat(withdrawCollateralAmount) <= 0 ||
                          (userMarketPosition && parseFloat(withdrawCollateralAmount) > userMarketPosition.collateral) ||
                          isSubmitting
                        }
                        className="w-full rounded-lg bg-[#0052FF] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0046DD] disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-gray-500"
                      >
                        Confirm Withdraw
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex space-x-6 border-b border-gray-800">
                    {(['supply', 'withdraw'] as SupplyTab[]).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setSupplyTab(tab)}
                        className={`pb-3 text-sm font-medium uppercase tracking-wide ${
                          supplyTab === tab ? 'text-white' : 'text-gray-500 hover:text-white'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  {supplyTab === 'supply' && (
                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-sm text-gray-400">Supply Amount (USDC)</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={supplyAmount}
                            onChange={(e) => setSupplyAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full rounded-lg border border-gray-700 bg-[#0A0B0F] px-4 py-3 text-white focus:border-[#0052FF] focus:outline-none"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                            Balance: {mockUsdcBalance.toLocaleString()} USDC
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          if (!vault || !supplyAmount || !connectedAddress) return;
                          const amount = parseFloat(supplyAmount);
                          if (amount <= 0 || amount > mockUsdcBalance) return;
                          setIsSubmitting(true);
                          try {
                            await supplyToVault(vault.id, amount);
                            setSupplyAmount('');
                            onClose();
                          } finally {
                            setIsSubmitting(false);
                          }
                        }}
                        disabled={
                          !connectedAddress || !vault || !supplyAmount || parseFloat(supplyAmount) <= 0 || isSubmitting
                        }
                        className="w-full rounded-lg bg-[#0052FF] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0046DD] disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-gray-500"
                      >
                        Confirm Supply
                      </button>
                    </div>
                  )}

                  {supplyTab === 'withdraw' && (
                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-sm text-gray-400">Withdraw Amount (USDC)</label>
                        <input
                          type="number"
                          value={vaultWithdrawAmount}
                          onChange={(e) => setVaultWithdrawAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full rounded-lg border border-gray-700 bg-[#0A0B0F] px-4 py-3 text-white focus:border-[#0052FF] focus:outline-none"
                        />
                        <div className="mt-2 text-xs text-gray-500">
                          Available: {userVaultPosition ? formatUSD(userVaultPosition.assets) : '$0.00'}
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          if (!vault || !userVaultPosition || !vaultWithdrawAmount) return;
                          const amount = parseFloat(vaultWithdrawAmount);
                          if (amount <= 0 || amount > userVaultPosition.assets) return;
                          setIsSubmitting(true);
                          try {
                            await withdrawFromVault(vault.id, amount);
                            setVaultWithdrawAmount('');
                            onClose();
                          } finally {
                            setIsSubmitting(false);
                          }
                        }}
                        disabled={
                          !connectedAddress ||
                          !vault ||
                          !userVaultPosition ||
                          !vaultWithdrawAmount ||
                          parseFloat(vaultWithdrawAmount) <= 0 ||
                          parseFloat(vaultWithdrawAmount) > (userVaultPosition?.assets ?? 0) ||
                          isSubmitting
                        }
                        className="w-full rounded-lg bg-[#0052FF] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0046DD] disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-gray-500"
                      >
                        Confirm Withdraw
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            <aside className="space-y-4 rounded-xl border border-gray-800 bg-[#10131C] p-5 lg:col-span-2">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Overview</h4>
              <div className="space-y-3 text-sm text-gray-300">
                <div className="flex justify-between">
                  <span>Collateral Asset</span>
                  <span className="font-mono text-white">{market.collateral_asset}</span>
                </div>
                <div className="flex justify-between">
                  <span>Loan Asset</span>
                  <span className="font-mono text-white">{market.loan_asset}</span>
                </div>
                <div className="flex justify-between">
                  <span>LLTV</span>
                  <span className="font-mono text-white">{market.lltv}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Borrow APY</span>
                  <span className="font-mono text-[#FFB237]">{formatPercent(market.borrow_apy)}</span>
                </div>
                {market.supply_apy !== undefined && (
                  <div className="flex justify-between">
                    <span>Supply APY</span>
                    <span className="font-mono text-[#00D395]">{formatPercent(market.supply_apy)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Utilization</span>
                  <span className="font-mono text-white">{formatPercent(market.utilization)}</span>
                </div>
              </div>

              {type === 'borrow' && (
                <div className="rounded-lg border border-gray-800 bg-[#0A0D15] p-4 text-xs text-gray-400">
                  <div className="mb-2 text-sm font-semibold text-white">Position Preview</div>
                  <div className="flex justify-between">
                    <span>Projected LTV</span>
                    <span className="font-mono text-white">{formatPercent(projectedLtv)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Health Factor</span>
                    <span
                      className={`font-mono ${
                        healthFactor > 2 ? 'text-[#00D395]' : healthFactor > 1.2 ? 'text-[#FFB237]' : 'text-[#FF5252]'
                      }`}
                    >
                      {healthFactor === Infinity ? '--' : healthFactor.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Liquidation Price</span>
                    <span className="font-mono text-white">{formatUSD(liquidationPrice)}</span>
                  </div>
                  {projectedLtv > market.lltv && (
                    <div className="mt-3 flex items-start gap-2 rounded-lg bg-[#33110F] p-2 text-[#FF7571]">
                      <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                      Borrow amount exceeds safe limits. Reduce borrow or add collateral.
                    </div>
                  )}
                </div>
              )}

              {type === 'supply' && (
                <div className="rounded-lg border border-gray-800 bg-[#0A0D15] p-4 text-xs text-gray-400">
                  <div className="mb-2 text-sm font-semibold text-white">Vault Details</div>
                  {vault ? (
                    <>
                      <div className="flex justify-between">
                        <span>Vault</span>
                        <span className="font-mono text-white">{vault.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Asset</span>
                        <span className="font-mono text-white">{vault.asset}</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-[#FFB237]">
                      Vault information unavailable. Actions are disabled.
                    </div>
                  )}
                </div>
              )}
            </aside>
          </div>
        )}
      </div>
    </div>
  );
};
