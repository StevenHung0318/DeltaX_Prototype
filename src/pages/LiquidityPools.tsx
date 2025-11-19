import { useMemo, useState } from "react";
import { Search, Filter, Info, ArrowLeft, ChevronDown } from "lucide-react";

const createSparklinePoints = (
  data: number[],
  width = 100,
  height = 40
): { x: number; y: number }[] => {
  if (!data.length) return [];
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / Math.max(data.length - 1, 1);
  return data.map((value, index) => {
    const x = index * step;
    const normalized = (value - min) / range;
    const y = height - normalized * height;
    return { x, y };
  });
};

const createSparklinePath = (data: number[], width = 100, height = 40) => {
  const points = createSparklinePoints(data, width, height);
  if (!points.length) return "";
  return points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.y.toFixed(2)}`
    )
    .join(" ");
};

const createSparklineAreaPath = (data: number[], width = 100, height = 40) => {
  const points = createSparklinePoints(data, width, height);
  if (!points.length) return "";
  const linePath = createSparklinePath(data, width, height);
  return `${linePath} L${width},${height} L0,${height} Z`;
};

export interface LiquidityPool {
  id: string;
  baseSymbol: string;
  quoteSymbol: string;
  baseName: string;
  quoteName: string;
  baseLogo: string;
  quoteLogo: string;
  feeTier: string;
  poolType: "CLMM";
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

interface LiquidityPositionContext {
  position: LiquidityPosition;
  pool: LiquidityPool;
}

const MOCK_POOLS: LiquidityPool[] = [
  {
    id: "sui-usdc-05",
    baseSymbol: "SUI",
    quoteSymbol: "USDC",
    baseName: "Sui",
    quoteName: "USD Coin",
    baseLogo: "https://s2.coinmarketcap.com/static/img/coins/64x64/20947.png",
    quoteLogo: "https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png",
    feeTier: "0.05%",
    poolType: "CLMM",
    liquidity: 3249955.15,
    volume24h: 7584090.74,
    fees24h: 3792.04,
    rewards: ["SUI"],
    apr: 49.31,
    incentivized: true,
    tvl: 3249955.15,
    cumulativeVolume: 51232187612.45,
    currentPrice: 1.018,
    volumeHistory: [12, 18, 16, 22, 21, 24, 26, 22, 28, 31, 29, 27, 32, 30, 28],
    userBaseBalance: 120.54,
    userQuoteBalance: 220.12,
  },
  {
    id: "eth-usdc-025",
    baseSymbol: "ETH",
    quoteSymbol: "USDC",
    baseName: "Ethereum",
    quoteName: "USD Coin",
    baseLogo: "https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png",
    quoteLogo: "https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png",
    feeTier: "0.25%",
    poolType: "CLMM",
    liquidity: 1338414.14,
    volume24h: 1302526.36,
    fees24h: 3256.31,
    rewards: ["ETH"],
    apr: 109.49,
    tvl: 1338414.14,
    cumulativeVolume: 12935422163.92,
    currentPrice: 3095.22,
    volumeHistory: [9, 12, 15, 14, 13, 16, 15, 18, 22, 19, 21, 23, 20, 18, 16],
    userBaseBalance: 1.25,
    userQuoteBalance: 4000,
    incentivized: false,
  },
  {
    id: "btc-usdc-03",
    baseSymbol: "BTC",
    quoteSymbol: "USDC",
    baseName: "Bitcoin",
    quoteName: "USD Coin",
    baseLogo: "https://s2.coinmarketcap.com/static/img/coins/64x64/1.png",
    quoteLogo: "https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png",
    feeTier: "0.30%",
    poolType: "CLMM",
    liquidity: 4200000,
    volume24h: 15250000,
    fees24h: 9150,
    rewards: ["BTC"],
    apr: 38.76,
    tvl: 4200000,
    cumulativeVolume: 15800000000,
    currentPrice: 64750.12,
    volumeHistory: [18, 21, 25, 24, 23, 27, 29, 33, 30, 32, 35, 38, 34, 31, 28],
    userBaseBalance: 0.52,
    userQuoteBalance: 6500,
    incentivized: true,
  },
  {
    id: "suig-usdc",
    baseSymbol: "SUIG",
    quoteSymbol: "USDC",
    baseName: "Sui Group Holdings Ltd",
    quoteName: "USD Coin",
    baseLogo: "https://universal.hellopublic.com/companyLogos/SUIG@2x.png",
    quoteLogo: "https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png",
    feeTier: "0.1%",
    poolType: "CLMM",
    liquidity: 2450000,
    volume24h: 8450000,
    fees24h: 4200,
    rewards: ["SUIG"],
    apr: 28.45,
    tvl: 2450000,
    cumulativeVolume: 4120000000,
    currentPrice: 12.45,
    volumeHistory: [10, 14, 16, 15, 12, 18, 22, 19, 21, 23, 20, 18, 16, 15, 14],
    userBaseBalance: 250,
    userQuoteBalance: 5000,
    incentivized: true,
  },
  {
    id: "aapl-usdc",
    baseSymbol: "AAPL",
    quoteSymbol: "USDC",
    baseName: "Apple Inc.",
    quoteName: "USD Coin",
    baseLogo: "https://logo.clearbit.com/apple.com",
    quoteLogo: "https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png",
    feeTier: "0.05%",
    poolType: "CLMM",
    liquidity: 5620000,
    volume24h: 16300000,
    fees24h: 8200,
    rewards: ["AAPL"],
    apr: 32.8,
    tvl: 5620000,
    cumulativeVolume: 12500000000,
    currentPrice: 189.87,
    volumeHistory: [15, 18, 22, 20, 24, 27, 25, 30, 28, 32, 35, 31, 29, 27, 24],
    userBaseBalance: 32.5,
    userQuoteBalance: 6500,
    incentivized: false,
  },
  {
    id: "tsla-usdc",
    baseSymbol: "TSLA",
    quoteSymbol: "USDC",
    baseName: "Tesla Inc.",
    quoteName: "USD Coin",
    baseLogo: "https://logo.clearbit.com/tesla.com",
    quoteLogo: "https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png",
    feeTier: "0.25%",
    poolType: "CLMM",
    liquidity: 3120000,
    volume24h: 11000000,
    fees24h: 6200,
    rewards: ["TSLA"],
    apr: 45.91,
    tvl: 3120000,
    cumulativeVolume: 8200000000,
    currentPrice: 255.12,
    volumeHistory: [11, 16, 18, 20, 17, 21, 24, 23, 27, 29, 26, 24, 22, 20, 19],
    userBaseBalance: 15.3,
    userQuoteBalance: 3800,
    incentivized: true,
  },
];

interface LiquidityPosition {
  id: string;
  poolId: string;
  baseSymbol: string;
  quoteSymbol: string;
  baseLogo: string;
  quoteLogo: string;
  feeTier: string;
  poolType: "CLMM";
  apr: number;
  liquidityUSD: number;
  claimableYieldUSD: number;
  estDailyYieldUSD: number;
  currentPrice: number;
  priceRange: string;
  status: "Active" | "In range" | "Out of range";
}

const MOCK_POSITIONS: LiquidityPosition[] = [
  {
    id: "position-sui",
    poolId: "sui-usdc-05",
    baseSymbol: "SUI",
    quoteSymbol: "USDC",
    baseLogo: "https://s2.coinmarketcap.com/static/img/coins/64x64/20947.png",
    quoteLogo: "https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png",
    feeTier: "0.05%",
    poolType: "CLMM",
    apr: 190.6,
    liquidityUSD: 2.25,
    claimableYieldUSD: 0.03147171,
    estDailyYieldUSD: 0.01,
    currentPrice: 1.647,
    priceRange: "1.2511 - 3.6292",
    status: "Active",
  },
  {
    id: "position-eth",
    poolId: "eth-usdc-025",
    baseSymbol: "ETH",
    quoteSymbol: "USDC",
    baseLogo: "https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png",
    quoteLogo: "https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png",
    feeTier: "0.25%",
    poolType: "CLMM",
    apr: 32.3,
    liquidityUSD: 810.2,
    claimableYieldUSD: 1.32,
    estDailyYieldUSD: 0.52,
    currentPrice: 3180.25,
    priceRange: "3020 - 3350",
    status: "In range",
  },
];

interface LiquidityPoolsProps {
  onSelectPool: (pool: LiquidityPool) => void;
}

export const LiquidityPools: React.FC<LiquidityPoolsProps> = ({
  onSelectPool,
}) => {
  const [activeStrategy, setActiveStrategy] = useState<"CLMM" | "positions">(
    "CLMM"
  );
  const [filterValue, setFilterValue] = useState("");
  const [managingContext, setManagingContext] =
    useState<LiquidityPositionContext | null>(null);

  const filteredPools = useMemo(() => {
    return MOCK_POOLS.filter((pool) => {
      const matchesType =
        activeStrategy === "positions" ? true : pool.poolType === "CLMM";
      const matchesFilter =
        pool.baseSymbol.toLowerCase().includes(filterValue.toLowerCase()) ||
        pool.quoteSymbol.toLowerCase().includes(filterValue.toLowerCase());

      return matchesType && matchesFilter;
    });
  }, [activeStrategy, filterValue]);

  const totalValueLocked = MOCK_POOLS.reduce((acc, pool) => acc + pool.tvl, 0);
  const cumulativeVolume = MOCK_POOLS.reduce(
    (acc, pool) => acc + pool.cumulativeVolume,
    0
  );
  const tradingVolume24h = MOCK_POOLS.reduce(
    (acc, pool) => acc + pool.volume24h,
    0
  );

  const formatCurrency = (value: number, fractionDigits = 2) =>
    `$${value.toLocaleString(undefined, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    })}`;

  interface PositionManagerProps {
    context: LiquidityPositionContext;
    onBack: () => void;
  }

  const PositionManager: React.FC<PositionManagerProps> = ({
    context,
    onBack,
  }) => {
    const { position, pool } = context;
    const [mode, setMode] = useState<"increase" | "remove">("increase");
    const [baseInput, setBaseInput] = useState("");
    const [quoteInput, setQuoteInput] = useState("");
    const [removePercent, setRemovePercent] = useState(25);
    const parseValue = (val: string) => {
      const amt = Number(val);
      return Number.isFinite(amt) ? amt : 0;
    };

    const ManageInput = ({
      label,
      token,
      value,
      onChange,
      balance,
    }: {
      label: string;
      token: string;
      value: string;
      onChange: (val: string) => void;
      balance: number;
    }) => (
      <div className="bg-[#101829] rounded-2xl border border-gray-800 p-4 space-y-4">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{label}</span>
          <div className="flex items-center space-x-2">
            <span className="text-gray-500">{balance.toFixed(4)}</span>
            <button
              onClick={() => onChange((balance / 2).toString())}
              className="px-2 py-0.5 rounded-full bg-[#1C2338]"
            >
              HALF
            </button>
            <button
              onClick={() => onChange(balance.toString())}
              className="px-2 py-0.5 rounded-full bg-[#1C2338]"
            >
              MAX
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            type="number"
            placeholder="0.0"
            className="bg-transparent text-2xl text-white focus:outline-none flex-1"
          />
          <div className="flex items-center space-x-2 text-white font-semibold text-lg">
            <img
              src={token === pool.baseSymbol ? pool.baseLogo : pool.quoteLogo}
              className="w-8 h-8 rounded-full"
            />
            <span>{token}</span>
          </div>
        </div>
      </div>
    );

    return (
      <div className="space-y-8">
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-2 text-sm text-gray-400 hover:text-white"
        >
          <ArrowLeft size={16} />
          <span>Back to My Positions</span>
        </button>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-start space-x-4">
            <div className="flex -space-x-4">
              <img
                src={position.baseLogo}
                className="w-14 h-14 rounded-full border-2 border-[#0A0F1C]"
              />
              <img
                src={position.quoteLogo}
                className="w-14 h-14 rounded-full border-2 border-[#0A0F1C]"
              />
            </div>
            <div>
              <div className="flex items-center flex-wrap gap-3">
                <h1 className="text-2xl font-semibold text-white">
                  {position.baseSymbol} · {position.quoteSymbol}
                </h1>
                <span className="px-3 py-1 rounded-full bg-[#102040] text-[#00C2FF] text-xs font-semibold">
                  {position.poolType}
                </span>
                <span className="px-3 py-1 rounded-full border border-gray-700 text-xs text-gray-200">
                  Fee Tier {position.feeTier}
                </span>
                <span className="text-xs flex items-center text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1" />
                  {position.status}
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-2">
                ID · 0xce31…aaf0 · Current pool price{" "}
                {position.currentPrice.toFixed(4)} {position.quoteSymbol}/
                {position.baseSymbol}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-right text-sm text-gray-400">
            <div>
              <p>Pool APR</p>
              <p className="text-lg text-white font-semibold mt-1">
                {position.apr.toFixed(2)}%
              </p>
            </div>
            <div>
              <p>Liquidity</p>
              <p className="text-lg text-white font-semibold mt-1">
                {formatCurrency(position.liquidityUSD)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-gray-800 bg-[#05080f] p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Price Range</p>
                  <p className="text-2xl font-semibold text-white mt-2">
                    {position.priceRange}
                  </p>
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <button className="px-3 py-1 rounded-full border border-gray-700">
                    {position.baseSymbol}
                  </button>
                  <button className="px-3 py-1 rounded-full border border-gray-700">
                    {position.quoteSymbol}
                  </button>
                </div>
              </div>
              <div className="bg-[#080d1b] rounded-2xl border border-gray-900 p-4 space-y-4">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Current Pool Price</span>
                  <span>
                    {position.currentPrice.toFixed(4)} {position.quoteSymbol}/
                    {position.baseSymbol}
                  </span>
                </div>
                <div className="relative h-48 bg-gradient-to-b from-[#0b1424] to-[#02050b] rounded-2xl overflow-hidden">
                  <div className="absolute inset-6 flex items-end space-x-1">
                    {[80, 110, 140, 120, 95, 75, 60, 55, 50].map(
                      (height, index) => (
                        <div
                          key={`manager-hist-${index}`}
                          className="flex-1 rounded-full bg-[#1E4FC2]/70"
                          style={{ height: `${height * 0.6}%` }}
                        />
                      )
                    )}
                  </div>
                  <div className="absolute inset-y-6 left-[20%] w-1 bg-[#32E2C1] rounded-full" />
                  <div className="absolute inset-y-6 left-[75%] w-1 bg-[#5FA0FF] rounded-full" />
                  <div className="absolute inset-y-6 left-1/2 w-1 bg-white rounded-full">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-3 w-2 h-2 rounded-full bg-white" />
                  </div>
                  <div className="absolute bottom-4 left-0 right-0 flex justify-between text-xs text-gray-500 px-6">
                    <span>1.56</span>
                    <span>1.80</span>
                    <span>2.10</span>
                    <span>2.40</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>30D Price Range</span>
                  <span>
                    1.5637 – 2.7211 {position.quoteSymbol}/{position.baseSymbol}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-800 bg-[#05080f] p-6 space-y-4">
              <div className="flex items-center justify-between text-sm text-gray-400">
                <span>Liquidity</span>
                <span className="text-white font-semibold">
                  {formatCurrency(position.liquidityUSD)}
                </span>
              </div>
              <div className="flex items-center text-xs text-gray-400">
                <span className="text-sky-400 font-semibold mr-2">
                  {position.baseSymbol} 70.82%
                </span>
                <div className="flex-1 h-3 rounded-full bg-[#0a111f] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#2ee7c9] via-[#25b8f5] to-[#1c63ff]"
                    style={{ width: "70%" }}
                  />
                </div>
                <span className="text-emerald-400 font-semibold ml-2">
                  29.18% {position.quoteSymbol}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                <div className="flex items-center space-x-3">
                  <img
                    src={position.baseLogo}
                    className="w-9 h-9 rounded-full"
                  />
                  <div>
                    <p className="text-white font-semibold">
                      0.97 {position.baseSymbol}
                    </p>
                    <p className="text-xs text-gray-500">$1.62</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 justify-end">
                  <div className="text-right">
                    <p className="text-white font-semibold">
                      0.66 {position.quoteSymbol}
                    </p>
                    <p className="text-xs text-gray-500">$0.66</p>
                  </div>
                  <img
                    src={position.quoteLogo}
                    className="w-9 h-9 rounded-full"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-800 bg-[#05080f] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Claimable Yield</p>
                  <p className="text-white text-2xl mt-1">
                    {formatCurrency(position.claimableYieldUSD, 4)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Est. Daily Yield +${position.estDailyYieldUSD.toFixed(2)}
                  </p>
                </div>
                <button className="px-4 py-2 rounded-full bg-[#00C2FF] text-black text-sm font-semibold">
                  Claim
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-400">
                <div>
                  <p>Fees</p>
                  <p className="text-white text-lg mt-1">
                    0.00012 {position.baseSymbol}
                  </p>
                </div>
                <div>
                  <p>Fees</p>
                  <p className="text-white text-lg mt-1">
                    0.00022 {position.quoteSymbol}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-gray-800 bg-[#050b18] p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-sm text-white">
                  {(["increase", "remove"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setMode(tab)}
                      className={`px-4 py-1.5 rounded-full border ${
                        mode === tab
                          ? "border-[#00C2FF] text-white"
                          : "border-gray-700 text-gray-400"
                      }`}
                    >
                      {tab === "increase" ? "Increase" : "Remove"}
                    </button>
                  ))}
                </div>
                <button className="px-3 py-1 rounded-full border border-gray-700 text-gray-300 text-xs flex items-center space-x-1">
                  <span>0.5%</span>
                  <ChevronDown size={12} />
                </button>
              </div>

              <ManageInput
                label="Token A"
                token={pool.baseSymbol}
                value={baseInput}
                onChange={setBaseInput}
                balance={pool.userBaseBalance}
              />
              <ManageInput
                label="Token B"
                token={pool.quoteSymbol}
                value={quoteInput}
                onChange={setQuoteInput}
                balance={pool.userQuoteBalance}
              />

              {mode === "remove" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>Remove Percentage</span>
                    <span className="text-white font-semibold">
                      {removePercent}%
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {[25, 50, 75, 100].map((value) => (
                      <button
                        key={value}
                        onClick={() => setRemovePercent(value)}
                        className={`px-3 py-1.5 rounded-full border text-xs ${
                          removePercent === value
                            ? "border-[#00C2FF] text-white"
                            : "border-gray-700 text-gray-400"
                        }`}
                      >
                        {value === 100 ? "MAX" : `${value}%`}
                      </button>
                    ))}
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={removePercent}
                    onChange={(event) =>
                      setRemovePercent(Number(event.target.value))
                    }
                    className="w-full accent-[#00C2FF]"
                  />
                </div>
              )}

              <div className="text-sm text-gray-400">
                <p>Total Amount</p>
                <p className="text-white text-lg mt-1">
                  {formatCurrency(
                    parseValue(baseInput) + parseValue(quoteInput)
                  )}
                </p>
              </div>

              <button className="w-full py-3 rounded-2xl bg-[#0052FF] text-white font-semibold hover:bg-[#0046DD]">
                {mode === "increase"
                  ? "Increase Liquidity"
                  : "Remove Liquidity"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const filteredPositions = useMemo(() => {
    return MOCK_POSITIONS.filter((position) => {
      const matchesSearch =
        position.baseSymbol.toLowerCase().includes(filterValue.toLowerCase()) ||
        position.quoteSymbol.toLowerCase().includes(filterValue.toLowerCase());
      return matchesSearch;
    });
  }, [filterValue]);
  const totalPositionLiquidity = filteredPositions.reduce(
    (sum, pos) => sum + pos.liquidityUSD,
    0
  );
  const totalClaimableYield = filteredPositions.reduce(
    (sum, pos) => sum + pos.claimableYieldUSD,
    0
  );
  const tvlLineSeries = [
    [
      0.363, 0.456, 0.453, 0.45, 0.411, 0.452, 0.51, 0.606, 0.67, 0.696,
      0.678, 0.622, 0.627, 0.665, 0.774, 0.903, 0.955, 0.986, 1.002, 0.946,
      1.001, 1.061, 1.191, 1.259,
    ].map((ratio) => totalValueLocked * ratio),
  ];
  const tradingVolumeHistorySeries = [
    0.55, 0.6, 0.58, 0.63, 0.7, 0.65, 0.72, 0.75, 0.69, 0.74, 0.7, 0.67, 0.71,
    0.68, 0.66,
  ].map((ratio) => tradingVolume24h * ratio);
  const tradingVolumeSecondaryHistory = tradingVolumeHistorySeries.map(
    (value) => value * 0.6
  );
  const maxTradingVolumeHistory = Math.max(...tradingVolumeHistorySeries, 1);

  if (managingContext) {
    return (
      <PositionManager
        context={managingContext}
        onBack={() => setManagingContext(null)}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 rounded-3xl border border-gray-800 bg-[#050910] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-400">Total TVL</div>
              <div className="text-3xl font-bold text-white mt-2">
                {formatCurrency(totalValueLocked, 2)}
              </div>
            </div>
          </div>
          <div className="h-32 w-full">
            <svg
              viewBox="0 0 100 40"
              preserveAspectRatio="none"
              className="w-full h-full"
            >
              <defs>
                <linearGradient
                  id="dexTvlGradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="rgba(110, 126, 254, 1)" />
                  <stop offset="40%" stopColor="rgba(96, 110, 255, 1)" />
                  <stop offset="80%" stopColor="rgba(85, 105, 255, 1)" />
                  <stop offset="100%" stopColor="rgba(72, 96, 255, 1)" />
                </linearGradient>
                <linearGradient
                  id="dexTvlFill"
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="rgba(110,126,254,0.25)" />
                  <stop offset="100%" stopColor="rgba(10,11,13,0)" />
                </linearGradient>
              </defs>
              <path
                d={createSparklineAreaPath(tvlLineSeries[0])}
                fill="url(#dexTvlFill)"
                opacity={0.4}
              />
              <path
                d={createSparklinePath(tvlLineSeries[0])}
                fill="none"
                stroke="url(#dexTvlGradient)"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
        <div className="flex-1 rounded-3xl border border-gray-800 bg-[#050910] p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-gray-400">Trading Volume (24H)</div>
              <div className="text-2xl font-semibold text-white mt-1">
                {formatCurrency(tradingVolume24h, 2)}
              </div>
            </div>
          </div>
          <div className="h-40 w-full">
            <svg
              viewBox="0 0 100 40"
              preserveAspectRatio="none"
              className="w-full h-full"
            >
              {tradingVolumeHistorySeries.map((value, index) => {
                const segment = 100 / tradingVolumeHistorySeries.length;
                const width = Math.max(segment * 0.6, 1.5);
                const x = index * segment + (segment - width) / 2;
                const height = (value / maxTradingVolumeHistory) * 40;
                const y = 40 - height;
                const secondaryHeight =
                  (tradingVolumeSecondaryHistory[index] /
                    maxTradingVolumeHistory) *
                  40;
                const secondaryY = 40 - secondaryHeight;
                return (
                  <g key={`dex-volume-${index}`}>
                    <rect
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      rx={width * 0.2}
                      fill="url(#dexVolumeBase)"
                      opacity={0.85}
                    />
                    <rect
                      x={x}
                      y={secondaryY}
                      width={width}
                      height={secondaryHeight}
                      rx={width * 0.2}
                      fill="url(#dexVolumeAccent)"
                    />
                  </g>
                );
              })}
              <defs>
                <linearGradient
                  id="dexVolumeBase"
                  x1="0%"
                  y1="100%"
                  x2="0%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="#0B1120" />
                  <stop offset="100%" stopColor="#111B33" />
                </linearGradient>
                <linearGradient
                  id="dexVolumeAccent"
                  x1="0%"
                  y1="100%"
                  x2="0%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="#23273F" />
                  <stop offset="100%" stopColor="#6E7EFE" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          {(
            [
              { key: "CLMM", label: "CLMM" },
              { key: "positions", label: "My Positions" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveStrategy(tab.key)}
              className={`px-4 py-2 rounded-full border ${
                activeStrategy === tab.key
                  ? "border-[#0052FF] text-white"
                  : "border-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
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
      </div>

      {activeStrategy === "positions" ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-gray-800 bg-gradient-to-r from-[#0c162c] to-[#091124] p-5">
              <p className="text-sm text-gray-400">Total Liquidity</p>
              <p className="text-3xl font-semibold text-white mt-1">
                {formatCurrency(totalPositionLiquidity)}
              </p>
            </div>
            <div className="rounded-3xl border border-gray-800 bg-gradient-to-r from-[#051b23] via-[#062232] to-[#0c283d] p-5 flex items-center justify-between">
              <div className="relative group">
                <p className="text-sm text-gray-400">Claimable Yield</p>
                <p className="text-3xl font-semibold text-emerald-300 mt-1 cursor-pointer">
                  {formatCurrency(totalClaimableYield, 4)}
                </p>
                <div className="absolute top-full left-0 mt-3 hidden w-48 rounded-2xl border border-gray-800 bg-[#05080f] p-3 shadow-2xl group-hover:block">
                  <div className="space-y-2 text-sm">
                    {[
                      { token: "USDC", amount: 0.5 },
                      { token: "SUI", amount: 1.2 },
                      { token: "ETH", amount: 0.01 },
                    ].map((item) => (
                      <div
                        key={item.token}
                        className="flex items-center justify-between text-white"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span>{item.token}</span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {item.amount} ({formatCurrency(item.amount * 1, 3)})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <button className="px-4 py-2 rounded-full bg-[#00C2FF] text-sm font-semibold text-black hover:bg-[#00a3d6]">
                Claim All
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {filteredPositions.map((position) => (
              <div
                key={position.id}
                className="rounded-3xl border border-gray-800 bg-[#070c16] p-6 space-y-4"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex -space-x-3">
                      {[position.baseLogo, position.quoteLogo].map(
                        (logo, index) => (
                          <img
                            key={`${position.id}-${index}`}
                            src={logo}
                            className="w-10 h-10 rounded-full border-2 border-[#070c16]"
                          />
                        )
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-white text-lg font-semibold">
                          {position.baseSymbol} · {position.quoteSymbol}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full border border-[#1E2540] text-gray-300">
                          {position.poolType}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full border border-[#1E2540] text-gray-300">
                          {position.feeTier}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Current pool price · {position.currentPrice.toFixed(3)}{" "}
                        {position.quoteSymbol}/{position.baseSymbol}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0f1829] rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <div>
                      <span className="text-gray-500">Price Range</span>
                      <div className="text-white font-mono mt-1">
                        {position.priceRange}
                      </div>
                    </div>
                    <span className="text-emerald-400 flex items-center space-x-1 text-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>{position.status}</span>
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-[#0a111f] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#2ee7c9] to-[#1c63ff]"
                      style={{ width: "60%" }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 mb-1">APR</p>
                    <p className="text-white font-semibold flex items-center space-x-2">
                      <span>{position.apr.toFixed(1)}%</span>
                      <Info size={14} className="text-gray-500" />
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Liquidity</p>
                    <p className="text-white font-semibold">
                      {formatCurrency(position.liquidityUSD)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Claimable Yield</p>
                    <p className="text-white font-semibold">
                      {formatCurrency(position.claimableYieldUSD, 4)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Est. Daily Yield</p>
                    <p className="text-white font-semibold">
                      {formatCurrency(position.estDailyYieldUSD, 2)}
                    </p>
                  </div>
                  <div className="flex items-center justify-end">
                    <button
                      onClick={() => {
                        const targetPool =
                          MOCK_POOLS.find(
                            (pool) => pool.id === position.poolId
                          ) || MOCK_POOLS[0];
                        setManagingContext({ position, pool: targetPool });
                      }}
                      className="px-5 py-2 rounded-full border border-gray-800 text-white hover:bg-white/10 text-sm"
                    >
                      Manage
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filteredPositions.length === 0 && (
              <div className="rounded-3xl border border-gray-800 bg-[#0b101e] p-10 text-center text-gray-500">
                No positions match your filters yet.
              </div>
            )}
          </div>
        </div>
      ) : (
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
                <tr
                  key={pool.id}
                  className="border-t border-gray-900/70 hover:bg-white/5 transition"
                >
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
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-200">
                    {formatCurrency(pool.liquidity)}
                  </td>
                  <td className="px-6 py-4 text-gray-200">
                    {formatCurrency(pool.volume24h)}
                  </td>
                  <td className="px-6 py-4 text-gray-200">
                    {formatCurrency(pool.fees24h)}
                  </td>
                  <td className="px-6 py-4 text-[#00FFA3] font-semibold">
                    {pool.apr.toFixed(2)}%
                  </td>
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
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    No pools match your filters yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
