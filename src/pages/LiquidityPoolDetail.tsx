import { useMemo, useState } from 'react';
import { ArrowLeft, Star, RefreshCw, Repeat, LineChart, Plus, Minus, Info, ChevronDown } from 'lucide-react';
import { LiquidityPool } from './LiquidityPools';

interface LiquidityPoolDetailProps {
  pool: LiquidityPool;
  onBack: () => void;
}

export const LiquidityPoolDetail: React.FC<LiquidityPoolDetailProps> = ({ pool, onBack }) => {
  const [minPrice, setMinPrice] = useState((pool.currentPrice * 0.999).toFixed(4));
  const [maxPrice, setMaxPrice] = useState((pool.currentPrice * 1.001).toFixed(4));
  const [baseAmount, setBaseAmount] = useState('');
  const [quoteAmount, setQuoteAmount] = useState('');

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
      <div className="flex items-center justify-between rounded-2xl border border-gray-800 bg-[#070b15] px-3 py-2">
        <button
          onClick={onDecrement}
          className="w-10 h-10 rounded-full border border-gray-700 text-white text-xl flex items-center justify-center"
        >
          –
        </button>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-transparent text-2xl font-semibold text-white focus:outline-none text-center w-24"
        />
        <button
          onClick={onIncrement}
          className="w-10 h-10 rounded-full border border-gray-700 text-white text-xl flex items-center justify-center"
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

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="rounded-3xl border border-gray-800 bg-[#05080f] p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Select Range</p>
                  <p className="text-2xl font-semibold text-white mt-2">{pool.baseSymbol} / {pool.quoteSymbol}</p>
                </div>
              </div>

              <div className="bg-[#080d1b] rounded-2xl border border-gray-900 p-4 space-y-4">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Current Pool Price</span>
                  <span>{pool.currentPrice.toFixed(4)} {pool.quoteSymbol}/{pool.baseSymbol}</span>
                </div>
                <div className="relative h-48 bg-gradient-to-b from-[#0b1424] to-[#02050b] rounded-2xl overflow-hidden">
                  <div className="absolute inset-6 flex items-end space-x-1">
                    {[80, 120, 150, 140, 110, 90, 70, 60, 55, 50, 48, 40].map((height, index) => (
                      <div
                        key={`hist-${index}`}
                        className="flex-1 rounded-full bg-[#1E4FC2]/70"
                        style={{ height: `${height * 0.5}%` }}
                      />
                    ))}
                  </div>
                  <div className="absolute inset-y-6 left-[18%] w-1 bg-[#32E2C1] rounded-full">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 px-2 py-0.5 rounded-full bg-[#24bba2] text-[10px] text-white">
                      ||
                    </div>
                  </div>
                  <div className="absolute inset-y-6 left-[78%] w-1 bg-[#5FA0FF] rounded-full">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 px-2 py-0.5 rounded-full bg-[#4d7ddf] text-[10px] text-white">
                      ||
                    </div>
                  </div>
                  <div className="absolute inset-y-6 left-[48%] w-1 bg-white rounded-full">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-3 w-2 h-2 rounded-full bg-white" />
                  </div>
                  <div className="absolute inset-y-8 left-[32%] w-px bg-white/30 border-dashed" />
                  <div className="absolute inset-y-8 left-[64%] w-px bg-white/30 border-dashed" />
                  <div className="absolute bottom-4 left-0 right-0 flex justify-between text-xs text-gray-500 px-6">
                    <span>50,000</span>
                    <span>100,000</span>
                    <span>150,000</span>
                    <span>200,000</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>3D Price Range</span>
                  <span>0.9855 – 1.0008 {pool.quoteSymbol}/{pool.baseSymbol}</span>
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

            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-gray-800 bg-gradient-to-b from-[#0c111f] to-[#05070d] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">Deposit Amounts</h2>
                </div>
                <div className="flex items-center space-x-3">
                  <button className="px-3 py-1.5 rounded-full border border-gray-700 text-gray-400 text-xs flex items-center space-x-1">
                    <span>0.5%</span>
                    <Info size={14} />
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
    </div>
  );
};
