import { useMemo, useState } from 'react';
import { ArrowLeft, Star, RefreshCw, Repeat, LineChart, Zap, Plus, Minus, Info, ChevronDown } from 'lucide-react';
import { LiquidityPool } from './LiquidityPools';

interface LiquidityPoolDetailProps {
  pool: LiquidityPool;
  onBack: () => void;
}

type RangeMode = 'stable' | 'full' | 'custom';

export const LiquidityPoolDetail: React.FC<LiquidityPoolDetailProps> = ({ pool, onBack }) => {
  const [activeTab, setActiveTab] = useState<'provide' | 'positions' | 'analytics'>('provide');
  const [rangeMode, setRangeMode] = useState<RangeMode>('stable');
  const [minPrice, setMinPrice] = useState((pool.currentPrice * 0.999).toFixed(4));
  const [maxPrice, setMaxPrice] = useState((pool.currentPrice * 1.001).toFixed(4));
  const [baseAmount, setBaseAmount] = useState('');
  const [quoteAmount, setQuoteAmount] = useState('');
  const [zapEnabled, setZapEnabled] = useState(false);

  const parseAmount = (value: string) => {
    const amount = Number(value);
    return Number.isFinite(amount) ? amount : 0;
  };

  const baseValue = parseAmount(baseAmount);
  const quoteValue = parseAmount(quoteAmount);
  const depositRatio = useMemo(() => {
    const total = baseValue + quoteValue;
    if (!total) return null;
    return {
      base: (baseValue / total) * 100,
      quote: (quoteValue / total) * 100
    };
  }, [baseValue, quoteValue]);

  const formatCurrency = (value: number) =>
    `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  const handleRangeAdjust = (type: 'min' | 'max', delta: number) => {
    if (type === 'min') {
      const next = Math.max(0, parseFloat(minPrice) + delta);
      setMinPrice(next.toFixed(4));
    } else {
      const next = Math.max(0, parseFloat(maxPrice) + delta);
      setMaxPrice(next.toFixed(4));
    }
  };

  const PriceRangeInput = ({
    label,
    value,
    onChange,
    onIncrement,
    onDecrement
  }: {
    label: string;
    value: string;
    onChange: (val: string) => void;
    onIncrement: () => void;
    onDecrement: () => void;
  }) => (
    <div className="flex flex-col rounded-2xl border border-gray-800 p-4 space-y-3">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{label}</span>
        <span>
          {pool.quoteSymbol} per {pool.baseSymbol}
        </span>
      </div>
      <div className="flex items-center justify-between rounded-2xl border border-gray-800 bg-[#070b15] px-4 py-3">
        <button
          onClick={onDecrement}
          className="w-12 h-12 rounded-full border border-gray-700 text-white text-2xl flex items-center justify-center"
        >
          –
        </button>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-transparent text-4xl font-semibold text-white focus:outline-none text-center w-28"
        />
        <button
          onClick={onIncrement}
          className="w-12 h-12 rounded-full border border-gray-700 text-white text-2xl flex items-center justify-center"
        >
          +
        </button>
      </div>
    </div>
  );

  const DepositInput = ({
    label,
    token,
    value,
    onChange,
    balance
  }: {
    label: string;
    token: string;
    value: string;
    onChange: (val: string) => void;
    balance: number;
  }) => (
    <div className="bg-[#0F121E] rounded-2xl border border-gray-800 p-5 space-y-4">
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{label}</span>
        <div className="flex items-center space-x-2">
          <span className="text-gray-500">{balance.toFixed(3)}</span>
          <button onClick={() => onChange((balance / 2).toString())} className="px-2 py-0.5 rounded-full bg-[#1B1F2E]">
            HALF
          </button>
          <button onClick={() => onChange(balance.toString())} className="px-2 py-0.5 rounded-full bg-[#1B1F2E]">
            MAX
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-transparent text-3xl font-semibold text-white focus:outline-none flex-1"
          placeholder="0.0"
        />
        <div className="flex items-center space-x-2 font-semibold text-white text-lg">
          <img src={token === pool.baseSymbol ? pool.baseLogo : pool.quoteLogo} className="w-8 h-8 rounded-full" />
          <span>{token}</span>
        </div>
      </div>
    </div>
  );

  const detailStats = [
    { label: 'Pool APR', value: `${pool.apr.toFixed(2)}%` },
    { label: 'TVL', value: formatCurrency(pool.tvl) },
    { label: 'Volume (24H)', value: formatCurrency(pool.volume24h) },
    { label: 'Fees (24H)', value: formatCurrency(pool.fees24h) }
  ];

  return (
    <div className="space-y-8">
      <button
        onClick={onBack}
        className="flex items-center space-x-2 text-sm text-gray-400 hover:text-white"
      >
        <ArrowLeft size={16} />
        <span>Back</span>
      </button>

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="flex items-start space-x-4">
          <div className="flex -space-x-4">
            <img src={pool.baseLogo} className="w-14 h-14 rounded-full border-2 border-[#0A0F1C]" />
            <img src={pool.quoteLogo} className="w-14 h-14 rounded-full border-2 border-[#0A0F1C]" />
          </div>
          <div>
            <div className="flex items-center flex-wrap gap-3">
              <h1 className="text-2xl font-semibold text-white">{pool.baseSymbol} · {pool.quoteSymbol}</h1>
              <span className="px-3 py-1 rounded-full bg-[#102040] text-[#00C2FF] text-xs font-semibold">
                {pool.poolType}
              </span>
              <button className="flex items-center space-x-1 px-3 py-1 rounded-full border border-gray-700 text-xs text-gray-200">
                <span>Fee Tier {pool.feeTier}</span>
                <ChevronDown size={12} />
              </button>
            </div>
            <p className="text-sm text-gray-400 mt-2">
              Current pool price · {pool.currentPrice.toFixed(4)} {pool.quoteSymbol}/{pool.baseSymbol}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3 text-gray-400 self-start">
          <button className="p-2 rounded-full border border-gray-700 hover:text-white">
            <Star size={18} />
          </button>
          <button className="p-2 rounded-full border border-gray-700 hover:text-white">
            <RefreshCw size={18} />
          </button>
          <button className="p-2 rounded-full border border-gray-700 hover:text-white">
            <Repeat size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {detailStats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-gray-800 bg-[#0E1320] p-4">
            <p className="text-xs uppercase tracking-widest text-gray-500">{stat.label}</p>
            <p className="text-xl font-semibold text-white mt-2">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center space-x-6 border-b border-gray-900">
        {(['provide', 'positions', 'analytics'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 text-sm ${
              activeTab === tab ? 'text-white border-b-2 border-[#0052FF]' : 'text-gray-500'
            }`}
          >
            {tab === 'provide' ? 'Provide Liquidity' : tab === 'positions' ? 'My Positions' : 'Analytics'}
          </button>
        ))}
      </div>

      {activeTab !== 'provide' ? (
        <div className="rounded-2xl border border-dashed border-gray-800 p-10 text-center text-gray-500">
          {activeTab === 'positions'
            ? 'Positions tracking coming soon.'
            : 'Analytics dashboard coming soon.'}
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="rounded-3xl border border-gray-800 bg-[#05080f] p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Select Range</p>
                  <p className="text-2xl font-semibold text-white mt-2">{pool.baseSymbol} / {pool.quoteSymbol}</p>
                </div>
                <div className="flex items-center space-x-2 text-gray-400">
                  <button className="px-3 py-1.5 rounded-full border border-gray-700 text-xs flex items-center space-x-1">
                    <span>{pool.baseSymbol}</span>
                  </button>
                  <button className="px-3 py-1.5 rounded-full border border-gray-700 text-xs flex items-center space-x-1">
                    <span>{pool.quoteSymbol}</span>
                  </button>
                  <button className="p-2 rounded-full border border-gray-700 hover:text-white">
                    <LineChart size={16} />
                  </button>
                </div>
              </div>

              <div className="flex space-x-4">
                <div className="flex flex-col space-y-2">
                  {([
                    { key: 'stable', label: 'Stable', desc: 'Tight range' },
                    { key: 'full', label: 'Full Range', desc: 'Min to max' },
                    { key: 'custom', label: 'Custom', desc: 'Manual inputs' }
                  ] as { key: RangeMode; label: string; desc: string }[]).map((option) => (
                    <button
                      key={option.key}
                      onClick={() => setRangeMode(option.key)}
                      className={`w-32 text-left px-4 py-3 rounded-2xl border ${
                        rangeMode === option.key ? 'border-[#00C2FF] text-white bg-[#0F1E33]' : 'border-gray-800 text-gray-400'
                      }`}
                    >
                      <p className="text-sm font-semibold">{option.label}</p>
                      <p className="text-xs text-gray-500">{option.desc}</p>
                    </button>
                  ))}
                </div>

                <div className="flex-1 bg-[#080d1b] rounded-2xl border border-gray-900 p-4 space-y-4">
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>Current Pool Price</span>
                    <span>{pool.currentPrice.toFixed(4)} {pool.quoteSymbol}/{pool.baseSymbol}</span>
                  </div>
                  <div className="relative h-44 bg-gradient-to-br from-[#0D1B2E] via-[#112240] to-[#05070c] rounded-2xl overflow-hidden">
                    <div className="absolute inset-4 grid grid-cols-12 gap-2">
                      {[...Array(12)].map((_, index) => (
                        <div
                          key={index}
                          className="bg-[#1C63FF]/40 rounded-full"
                          style={{ height: `${40 + (index % 4) * 12}%` }}
                        />
                      ))}
                    </div>
                    <div className="absolute inset-y-6 left-1/4 w-1 bg-[#2AF0FF] rounded-full" />
                    <div className="absolute inset-y-4 left-1/2 w-1 bg-white rounded-full" />
                    <div className="absolute inset-y-8 left-3/4 w-1 bg-[#2AF0FF] rounded-full" />
                    <span className="absolute text-xs text-white -top-3 left-1/4">-0.07%</span>
                    <span className="absolute text-xs text-white -top-3 left-3/4">0.06%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>3D Price Range</span>
                    <span>0.9855 – 1.0008 {pool.quoteSymbol}/{pool.baseSymbol}</span>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <PriceRangeInput
                  label="Min Price"
                  value={minPrice}
                  onChange={setMinPrice}
                  onIncrement={() => handleRangeAdjust('min', 0.0005)}
                  onDecrement={() => handleRangeAdjust('min', -0.0005)}
                />
                <PriceRangeInput
                  label="Max Price"
                  value={maxPrice}
                  onChange={setMaxPrice}
                  onIncrement={() => handleRangeAdjust('max', 0.0005)}
                  onDecrement={() => handleRangeAdjust('max', -0.0005)}
                />
              </div>

              <div className="flex items-center justify-between text-sm text-gray-400">
                <div>
                  <span className="text-xs text-gray-500">Leverage</span>
                  <p className="text-white font-semibold text-lg mt-1">3,077.58x</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500">Estimated APR</span>
                  <div className="flex items-center space-x-2 mt-1">
                    <p className="text-white font-semibold text-lg">{(pool.apr * 1.44).toFixed(2)}%</p>
                    <div className="flex space-x-1 text-xs">
                      {['24H', '7D', '30D'].map((label) => (
                        <button
                          key={label}
                          className={`px-3 py-1 rounded-full border ${
                            label === '30D' ? 'border-[#0052FF] text-white' : 'border-gray-800 text-gray-400'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-gray-800 bg-gradient-to-b from-[#0c111f] to-[#05070d] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">Deposit Amounts</h2>
                  <p className="text-xs text-gray-500 mt-1">Provide balanced liquidity to the pool</p>
                </div>
                <div className="flex items-center space-x-3">
                  <button className="px-3 py-1.5 rounded-full border border-gray-700 text-gray-400 text-xs flex items-center space-x-1">
                    <span>0.5%</span>
                    <Info size={14} />
                  </button>
                  <button
                    onClick={() => setZapEnabled((prev) => !prev)}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border ${
                      zapEnabled ? 'border-[#00C2FF] text-white' : 'border-gray-700 text-gray-400'
                    }`}
                  >
                    <Zap size={16} />
                    <span>Zap In</span>
                  </button>
                </div>
              </div>
              <DepositInput
                label="Token A"
                token={pool.baseSymbol}
                value={baseAmount}
                onChange={setBaseAmount}
                balance={pool.userBaseBalance}
              />
              <DepositInput
                label="Token B"
                token={pool.quoteSymbol}
                value={quoteAmount}
                onChange={setQuoteAmount}
                balance={pool.userQuoteBalance}
              />
              <div className="flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-[#101421] border border-gray-700 text-gray-400 flex items-center justify-center">
                  +
                </div>
              </div>
              <DepositInput
                label="Token B"
                token={pool.quoteSymbol}
                value={quoteAmount}
                onChange={setQuoteAmount}
                balance={pool.userQuoteBalance}
              />
              <button className="w-full py-3 rounded-2xl bg-[#111628] text-gray-400 text-sm">
                Enter an amount
              </button>
              <div className="text-sm text-gray-400">
                <div className="flex items-center justify-between">
                  <span>Total Amount</span>
                  <span className="text-white">{formatCurrency(baseValue + quoteValue)}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="flex items-center space-x-1">
                    <span>Deposit Ratio</span>
                    <Info size={14} className="text-gray-500" />
                  </span>
                  {depositRatio ? (
                    <div className="flex items-center space-x-4 text-white">
                      <span>
                        {pool.baseSymbol} {depositRatio.base.toFixed(2)}%
                      </span>
                      <span>
                        {pool.quoteSymbol} {depositRatio.quote.toFixed(2)}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-500">--</span>
                  )}
                </div>
              </div>
              <button className="w-full py-4 rounded-2xl bg-[#0052FF] text-white font-semibold hover:bg-[#0046DD]">
                Review Deposit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
