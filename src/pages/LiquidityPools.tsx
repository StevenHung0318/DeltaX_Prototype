import { useMemo, useState } from 'react';
import { Search, Plus, Filter, SlidersHorizontal, MoreHorizontal } from 'lucide-react';

export interface LiquidityPool {
  id: string;
  baseSymbol: string;
  quoteSymbol: string;
  baseName: string;
  quoteName: string;
  baseLogo: string;
  quoteLogo: string;
  feeTier: string;
  poolType: 'CLMM';
  liquidity: number;
  volume24h: number;
  fees24h: number;
  rewards: string[];
  apr: number;
  incentivized?: boolean;
  tvl: number;
  cumulativeVolume: number;
  currentPrice: number;
  volumeHistory: number[];
  userBaseBalance: number;
  userQuoteBalance: number;
}

const MOCK_POOLS: LiquidityPool[] = [
  {
    id: 'sui-usdc-05',
    baseSymbol: 'SUI',
    quoteSymbol: 'USDC',
    baseName: 'Sui',
    quoteName: 'USD Coin',
    baseLogo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/20947.png',
    quoteLogo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png',
    feeTier: '0.05%',
    poolType: 'CLMM',
    liquidity: 3249955.15,
    volume24h: 7584090.74,
    fees24h: 3792.04,
    rewards: ['SUI'],
    apr: 49.31,
    incentivized: true,
    tvl: 3249955.15,
    cumulativeVolume: 51232187612.45,
    currentPrice: 1.018,
    volumeHistory: [12, 18, 16, 22, 21, 24, 26, 22, 28, 31, 29, 27, 32, 30, 28],
    userBaseBalance: 120.54,
    userQuoteBalance: 220.12
  },
  {
    id: 'eth-usdc-025',
    baseSymbol: 'ETH',
    quoteSymbol: 'USDC',
    baseName: 'Ethereum',
    quoteName: 'USD Coin',
    baseLogo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png',
    quoteLogo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png',
    feeTier: '0.25%',
    poolType: 'CLMM',
    liquidity: 1338414.14,
    volume24h: 1302526.36,
    fees24h: 3256.31,
    rewards: ['ETH'],
    apr: 109.49,
    tvl: 1338414.14,
    cumulativeVolume: 12935422163.92,
    currentPrice: 3095.22,
    volumeHistory: [9, 12, 15, 14, 13, 16, 15, 18, 22, 19, 21, 23, 20, 18, 16],
    userBaseBalance: 1.25,
    userQuoteBalance: 4000,
    incentivized: false
  },
  {
    id: 'suig-usdc',
    baseSymbol: 'SUIG',
    quoteSymbol: 'USDC',
    baseName: 'Sui Group Holdings Ltd',
    quoteName: 'USD Coin',
    baseLogo: 'https://universal.hellopublic.com/companyLogos/SUIG@2x.png',
    quoteLogo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png',
    feeTier: '0.1%',
    poolType: 'CLMM',
    liquidity: 2450000,
    volume24h: 8450000,
    fees24h: 4200,
    rewards: ['SUIG'],
    apr: 28.45,
    tvl: 2450000,
    cumulativeVolume: 4120000000,
    currentPrice: 12.45,
    volumeHistory: [10, 14, 16, 15, 12, 18, 22, 19, 21, 23, 20, 18, 16, 15, 14],
    userBaseBalance: 250,
    userQuoteBalance: 5000,
    incentivized: true
  },
  {
    id: 'aapl-usdc',
    baseSymbol: 'AAPL',
    quoteSymbol: 'USDC',
    baseName: 'Apple Inc.',
    quoteName: 'USD Coin',
    baseLogo: 'https://logo.clearbit.com/apple.com',
    quoteLogo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png',
    feeTier: '0.05%',
    poolType: 'CLMM',
    liquidity: 5620000,
    volume24h: 16300000,
    fees24h: 8200,
    rewards: ['AAPL'],
    apr: 32.8,
    tvl: 5620000,
    cumulativeVolume: 12500000000,
    currentPrice: 189.87,
    volumeHistory: [15, 18, 22, 20, 24, 27, 25, 30, 28, 32, 35, 31, 29, 27, 24],
    userBaseBalance: 32.5,
    userQuoteBalance: 6500,
    incentivized: false
  },
  {
    id: 'tsla-usdc',
    baseSymbol: 'TSLA',
    quoteSymbol: 'USDC',
    baseName: 'Tesla Inc.',
    quoteName: 'USD Coin',
    baseLogo: 'https://logo.clearbit.com/tesla.com',
    quoteLogo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png',
    feeTier: '0.25%',
    poolType: 'CLMM',
    liquidity: 3120000,
    volume24h: 11000000,
    fees24h: 6200,
    rewards: ['TSLA'],
    apr: 45.91,
    tvl: 3120000,
    cumulativeVolume: 8200000000,
    currentPrice: 255.12,
    volumeHistory: [11, 16, 18, 20, 17, 21, 24, 23, 27, 29, 26, 24, 22, 20, 19],
    userBaseBalance: 15.3,
    userQuoteBalance: 3800,
    incentivized: true
  }
];

interface LiquidityPoolsProps {
  onSelectPool: (pool: LiquidityPool) => void;
}

export const LiquidityPools: React.FC<LiquidityPoolsProps> = ({ onSelectPool }) => {
  const [activeStrategy, setActiveStrategy] = useState<'CLMM' | 'positions'>('CLMM');
  const [filterValue, setFilterValue] = useState('');
  const [watchlistOnly, setWatchlistOnly] = useState(false);
  const [incentivizedOnly, setIncentivizedOnly] = useState(false);

  const filteredPools = useMemo(() => {
    return MOCK_POOLS.filter((pool) => {
      const matchesType = activeStrategy === 'positions' ? true : pool.poolType === 'CLMM';
      const matchesFilter =
        pool.baseSymbol.toLowerCase().includes(filterValue.toLowerCase()) ||
        pool.quoteSymbol.toLowerCase().includes(filterValue.toLowerCase());
      const matchesIncentive = incentivizedOnly ? pool.incentivized : true;

      return matchesType && matchesFilter && matchesIncentive;
    });
  }, [activeStrategy, filterValue, incentivizedOnly]);

  const totalValueLocked = MOCK_POOLS.reduce((acc, pool) => acc + pool.tvl, 0);
  const cumulativeVolume = MOCK_POOLS.reduce((acc, pool) => acc + pool.cumulativeVolume, 0);
  const tradingVolume24h = MOCK_POOLS.reduce((acc, pool) => acc + pool.volume24h, 0);

  const formatCurrency = (value: number, fractionDigits = 2) =>
    `$${value.toLocaleString(undefined, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })}`;

  const chartMax = Math.max(...MOCK_POOLS[0].volumeHistory);

  const handleAddLiquidity = () => {
    const pool = filteredPools[0] ?? MOCK_POOLS[0];
    onSelectPool(pool);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 bg-gradient-to-br from-[#141a2f] to-[#06080f] rounded-3xl p-6 border border-white/5 shadow-lg">
          <div className="text-sm text-gray-400">Total Value Locked</div>
          <div className="text-3xl font-bold text-white mt-2">{formatCurrency(totalValueLocked, 2)}</div>
          <div className="text-sm text-gray-400 mt-6">Cumulative Volume</div>
          <div className="text-2xl font-semibold text-white mt-1">{formatCurrency(cumulativeVolume, 2)}</div>
        </div>
        <div className="flex-1 rounded-3xl border border-gray-800 bg-[#0D111C] p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-gray-400">Trading Volume (24H)</div>
              <div className="text-2xl font-semibold text-white">{formatCurrency(tradingVolume24h, 2)}</div>
            </div>
            <div className="flex space-x-2 text-xs text-gray-400">
              {['D', 'W', 'M'].map((label) => (
                <button
                  key={label}
                  className={`px-3 py-1 rounded-full border border-gray-700 ${
                    label === 'D' ? 'text-white border-[#0052FF]' : 'hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-end h-32 space-x-2">
            {MOCK_POOLS[0].volumeHistory.map((value, index) => (
              <div
                key={`${value}-${index}`}
                className="bg-[#1C63FF]/60 rounded-full flex-1"
                style={{ height: `${(value / chartMax) * 100}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          {([
            { key: 'CLMM', label: 'CLMM' },
            { key: 'positions', label: 'My Positions' }
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveStrategy(tab.key)}
              className={`px-4 py-2 rounded-full border ${
                activeStrategy === tab.key
                  ? 'border-[#0052FF] text-white'
                  : 'border-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center space-x-3 w-full lg:w-auto">
          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-800 rounded-full text-gray-300 hover:text-white text-sm">
            <Plus size={16} />
            <span>Create a new pool</span>
          </button>
          <button
            onClick={handleAddLiquidity}
            className="px-4 py-2 rounded-full bg-[#0052FF] text-white text-sm font-semibold hover:bg-[#0046DD]"
          >
            Add Liquidity
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center space-x-3 w-full lg:w-auto">
          <div className="flex items-center space-x-2 bg-[#0F1424] border border-gray-800 rounded-2xl px-3 py-2 w-full lg:w-72">
            <Search size={16} className="text-gray-500" />
            <input
              type="text"
              placeholder="Filter by token"
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              className="bg-transparent text-sm text-white focus:outline-none flex-1"
            />
          </div>
          <button className="p-2 rounded-full border border-gray-800 text-gray-400 hover:text-white">
            <Filter size={16} />
          </button>
        </div>
        <div className="flex items-center space-x-2 text-xs text-gray-400">
          <button
            onClick={() => setWatchlistOnly((prev) => !prev)}
            className={`px-3 py-1.5 rounded-full border ${
              watchlistOnly ? 'border-[#0052FF] text-white' : 'border-gray-800 hover:text-white'
            }`}
          >
            Watchlist
          </button>
          <button
            onClick={() => setIncentivizedOnly((prev) => !prev)}
            className={`px-3 py-1.5 rounded-full border ${
              incentivizedOnly ? 'border-[#0052FF] text-white' : 'border-gray-800 hover:text-white'
            }`}
          >
            Incentivized Only
          </button>
          <button className="px-3 py-1.5 rounded-full border border-gray-800 hover:text-white">All pools</button>
          <button className="p-2 rounded-full border border-gray-800 hover:text-white">
            <SlidersHorizontal size={16} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-gray-900 bg-[#080C16]">
        <table className="w-full min-w-[680px]">
          <thead>
            <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
              <th className="px-6 py-4 font-medium">Pools</th>
              <th className="px-6 py-4 font-medium">Liquidity</th>
              <th className="px-6 py-4 font-medium">Volume (24H)</th>
              <th className="px-6 py-4 font-medium">Fees (24H)</th>
              <th className="px-6 py-4 font-medium">APR</th>
              <th className="px-6 py-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPools.map((pool) => (
              <tr key={pool.id} className="border-t border-gray-900/70 hover:bg-white/5 transition">
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex -space-x-3">
                      {[pool.baseLogo, pool.quoteLogo].map((logo, index) => (
                        <img
                          key={`${logo}-${index}`}
                          src={logo}
                          className="w-9 h-9 rounded-full border-2 border-[#080C16]"
                        />
                      ))}
                    </div>
                    <div>
                      <div className="text-white font-semibold">{`${pool.baseSymbol} - ${pool.quoteSymbol}`}</div>
                      <div className="text-xs text-gray-500 flex items-center space-x-2">
                        <span>{pool.poolType}</span>
                        <span className="text-[#00C2FF]">{pool.feeTier}</span>
                        {pool.incentivized && (
                          <span className="px-2 py-0.5 rounded-full bg-[#1E2233] text-[#00C2FF]">Rewards</span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-200">{formatCurrency(pool.liquidity)}</td>
                <td className="px-6 py-4 text-gray-200">{formatCurrency(pool.volume24h)}</td>
                <td className="px-6 py-4 text-gray-200">{formatCurrency(pool.fees24h)}</td>
                <td className="px-6 py-4 text-[#00FFA3] font-semibold">{pool.apr.toFixed(2)}%</td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => onSelectPool(pool)}
                    className="px-4 py-2 rounded-full bg-[#0F4CFF] text-white text-sm hover:bg-[#003CDF]"
                  >
                    Deposit
                  </button>
                </td>
              </tr>
            ))}
            {filteredPools.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  No pools match your filters yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
