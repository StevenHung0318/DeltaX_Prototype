import React, { useState } from 'react';
import { useProtocol } from '../context/ProtocolContext';
import { formatUSD, formatPercent, calculateProjectedEarnings } from '../utils/format';
import { TrendingUp, CheckCircle, ArrowLeft } from 'lucide-react';

interface VaultsProps {
  selectedVaultId: string | null;
  onSelectVault: (vaultId: string | null) => void;
}

export const Vaults: React.FC<VaultsProps> = ({ selectedVaultId, onSelectVault }) => {
  const { vaults, markets, userVaultPositions, connectedAddress, supplyToVault, withdrawFromVault } = useProtocol();
  const [supplyAmount, setSupplyAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [activeTab, setActiveTab] = useState<'supply' | 'withdraw'>('supply');

  const selectedVault = selectedVaultId ? vaults.find(v => v.id === selectedVaultId) : null;
  const userPosition = selectedVaultId
    ? userVaultPositions.find(p => p.vault_id === selectedVaultId)
    : null;
  const market = markets[0];

  const mockBalance = 10000;

  const handleSupply = async () => {
    if (!selectedVaultId || !supplyAmount || !connectedAddress) return;
    const amount = parseFloat(supplyAmount);
    if (amount <= 0 || amount > mockBalance) return;

    await supplyToVault(selectedVaultId, amount);
    setSupplyAmount('');
  };

  const handleWithdraw = async () => {
    if (!selectedVaultId || !withdrawAmount || !userPosition) return;
    const amount = parseFloat(withdrawAmount);
    if (amount <= 0 || amount > userPosition.assets) return;

    await withdrawFromVault(selectedVaultId, amount);
    setWithdrawAmount('');
  };

  if (selectedVault) {
    const projectedEarnings = calculateProjectedEarnings(
      parseFloat(supplyAmount) || 0,
      selectedVault.apy
    );

    return (
      <div className="space-y-8">
        <button
          onClick={() => onSelectVault(null)}
          className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back to Vaults</span>
        </button>

        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{selectedVault.name}</h1>
          <div className="flex items-center space-x-3 text-gray-400">
            <span>Curated by {selectedVault.curator}</span>
            <CheckCircle className="text-[#00D395]" size={16} />
            <span>|</span>
            <span>Asset: {selectedVault.asset}</span>
          </div>
          <p className="text-gray-400 mt-2">
            Optimized lending to ETH borrowers with institutional-grade risk management
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#161921] rounded-xl p-6 border border-gray-800">
            <div className="text-gray-400 text-sm mb-2">Total Deposits</div>
            <div className="text-3xl font-bold text-white font-mono">
              {formatUSD(selectedVault.total_deposits)}
            </div>
          </div>

          <div className="bg-[#161921] rounded-xl p-6 border border-gray-800">
            <div className="text-gray-400 text-sm mb-2">Available Liquidity</div>
            <div className="text-3xl font-bold text-white font-mono">
              {formatUSD(selectedVault.available_liquidity)}
            </div>
          </div>

          <div className="bg-[#161921] rounded-xl p-6 border border-gray-800">
            <div className="text-gray-400 text-sm mb-2">APY</div>
            <div className="text-3xl font-bold text-[#00D395] flex items-center space-x-2">
              <span>{formatPercent(selectedVault.apy)}</span>
              <TrendingUp size={24} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-[#161921] rounded-xl p-6 border border-gray-800">
              <h3 className="text-xl font-semibold text-white mb-4">Market Allocation</h3>
              <p className="text-gray-400 mb-4">This vault allocates 100% to:</p>

              {market && (
                <div className="bg-[#0A0B0F] rounded-lg p-4 border border-gray-800">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-lg font-semibold text-white">
                      {market.collateral_asset}/{market.loan_asset} Market
                    </div>
                    <div className="text-[#00D395] font-semibold">100%</div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500">Allocation</div>
                      <div className="text-white font-mono">{formatUSD(selectedVault.total_deposits)}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Utilization</div>
                      <div className="text-white">{formatPercent(market.utilization)}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Borrow APY</div>
                      <div className="text-white">{formatPercent(market.borrow_apy)}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {userPosition && (
              <div className="bg-[#161921] rounded-xl p-6 border border-gray-800 mt-6">
                <h3 className="text-xl font-semibold text-white mb-4">Your Position</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-gray-400 text-sm mb-1">Supplied</div>
                    <div className="text-2xl font-bold text-white font-mono">
                      {formatUSD(userPosition.assets)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm mb-1">Shares</div>
                    <div className="text-2xl font-bold text-white font-mono">
                      {userPosition.shares.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-[#161921] rounded-xl p-6 border border-gray-800">
            <div className="flex space-x-4 mb-6">
              <button
                onClick={() => setActiveTab('supply')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'supply'
                    ? 'text-[#0052FF] border-b-2 border-[#0052FF]'
                    : 'text-gray-400'
                }`}
              >
                Supply
              </button>
              <button
                onClick={() => setActiveTab('withdraw')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'withdraw'
                    ? 'text-[#0052FF] border-b-2 border-[#0052FF]'
                    : 'text-gray-400'
                }`}
              >
                Withdraw
              </button>
            </div>

            {activeTab === 'supply' ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 block mb-2">Amount</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={supplyAmount}
                      onChange={(e) => setSupplyAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-[#0A0B0F] border border-gray-700 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-[#0052FF]"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      USDC
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-sm">
                    <span className="text-gray-400">Balance: {mockBalance.toLocaleString()} USDC</span>
                    <button
                      onClick={() => setSupplyAmount(mockBalance.toString())}
                      className="text-[#0052FF] hover:text-[#0046DD] font-medium"
                    >
                      MAX
                    </button>
                  </div>
                </div>

                <div className="bg-[#0A0B0F] rounded-lg p-4 space-y-2">
                  <div className="text-sm font-semibold text-white mb-2">Projected Earnings</div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Daily</span>
                    <span className="text-white font-mono">${projectedEarnings.daily.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Monthly</span>
                    <span className="text-white font-mono">${projectedEarnings.monthly.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Yearly</span>
                    <span className="text-white font-mono">${projectedEarnings.yearly.toFixed(2)}</span>
                  </div>
                </div>

                {connectedAddress ? (
                  <button
                    onClick={handleSupply}
                    disabled={!supplyAmount || parseFloat(supplyAmount) <= 0 || parseFloat(supplyAmount) > mockBalance}
                    className="w-full py-3 bg-[#0052FF] hover:bg-[#0046DD] disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors"
                  >
                    Supply USDC
                  </button>
                ) : (
                  <div className="text-center text-gray-400 text-sm py-3">
                    Connect wallet to supply
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 block mb-2">Amount</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-[#0A0B0F] border border-gray-700 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-[#0052FF]"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      USDC
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-sm">
                    <span className="text-gray-400">
                      Available: {userPosition ? userPosition.assets.toFixed(2) : '0.00'} USDC
                    </span>
                    {userPosition && (
                      <button
                        onClick={() => setWithdrawAmount(userPosition.assets.toString())}
                        className="text-[#0052FF] hover:text-[#0046DD] font-medium"
                      >
                        MAX
                      </button>
                    )}
                  </div>
                </div>

                {connectedAddress ? (
                  <button
                    onClick={handleWithdraw}
                    disabled={!withdrawAmount || !userPosition || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > userPosition.assets}
                    className="w-full py-3 bg-[#0052FF] hover:bg-[#0046DD] disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors"
                  >
                    Withdraw USDC
                  </button>
                ) : (
                  <div className="text-center text-gray-400 text-sm py-3">
                    Connect wallet to withdraw
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Vaults</h1>
        <p className="text-gray-400">Supply assets to earn yield from borrowers</p>
      </div>

      <div className="bg-[#161921] rounded-xl border border-gray-800 overflow-hidden">
        <div className="grid grid-cols-4 gap-4 px-6 py-4 border-b border-gray-800 text-sm font-medium text-gray-400">
          <div>Vault</div>
          <div>Deposits</div>
          <div>Curator</div>
          <div>APY</div>
        </div>

        {vaults.map((vault) => (
          <button
            key={vault.id}
            onClick={() => onSelectVault(vault.id)}
            className="w-full grid grid-cols-4 gap-4 px-6 py-6 hover:bg-[#0A0B0F] transition-colors text-left border-b border-gray-800 last:border-b-0"
          >
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-2xl">🪣</span>
                <span className="font-semibold text-white">{vault.name}</span>
              </div>
              <div className="text-sm text-gray-400">Collateral accepted: ETH</div>
            </div>
            <div>
              <div className="text-lg font-bold text-white font-mono">
                {formatUSD(vault.total_deposits)}
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-white">{vault.curator}</span>
                <CheckCircle className="text-[#00D395]" size={16} />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2 text-lg font-bold text-[#00D395]">
                <span>{formatPercent(vault.apy)}</span>
                <TrendingUp size={20} />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
