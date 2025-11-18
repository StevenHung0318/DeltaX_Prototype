import React, { useMemo, useState } from "react";

type Order = {
  price: number;
  size: number;
};

type Candle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

const candles: Candle[] = [
  { time: "08:00", open: 3172.3, high: 3176.6, low: 3167.4, close: 3174.8, volume: 820 },
  { time: "09:00", open: 3174.8, high: 3181.0, low: 3171.2, close: 3178.9, volume: 1020 },
  { time: "10:00", open: 3178.9, high: 3183.4, low: 3175.5, close: 3182.2, volume: 1240 },
  { time: "11:00", open: 3182.2, high: 3186.1, low: 3178.2, close: 3180.4, volume: 930 },
  { time: "12:00", open: 3180.4, high: 3184.9, low: 3174.2, close: 3176.3, volume: 840 },
  { time: "13:00", open: 3176.3, high: 3182.6, low: 3170.3, close: 3172.1, volume: 1420 },
  { time: "14:00", open: 3172.1, high: 3176.2, low: 3168.6, close: 3175.4, volume: 1110 },
  { time: "15:00", open: 3175.4, high: 3180.8, low: 3172.2, close: 3179.5, volume: 1010 },
  { time: "16:00", open: 3179.5, high: 3184.6, low: 3175.8, close: 3182.9, volume: 1180 },
  { time: "17:00", open: 3182.9, high: 3186.5, low: 3178.9, close: 3184.2, volume: 1560 },
  { time: "18:00", open: 3184.2, high: 3187.1, low: 3179.6, close: 3181.1, volume: 990 },
  { time: "19:00", open: 3181.1, high: 3184.7, low: 3176.5, close: 3178.2, volume: 870 },
];

const marketPairs = [
  {
    id: "eth-usdc",
    base: "ETH",
    quote: "USDC",
    price: 3183.52,
    change: 2.35,
    volume: 182_564_211,
    high: 3198,
    low: 3156,
  },
  {
    id: "sui-usdc",
    base: "SUI",
    quote: "USDC",
    price: 1.63,
    change: -1.2,
    volume: 12_452_000,
    high: 1.7,
    low: 1.56,
  },
  {
    id: "btc-usdc",
    base: "BTC",
    quote: "USDC",
    price: 64750.12,
    change: 0.8,
    volume: 1_234_500_111,
    high: 65200,
    low: 62300,
  },
  {
    id: "aapl-usdc",
    base: "AAPL",
    quote: "USDC",
    price: 189.87,
    change: -0.5,
    volume: 98_765_432,
    high: 195,
    low: 185,
  },
];

const asks: Order[] = [
  { price: 3182.45, size: 0.64 },
  { price: 3182.12, size: 0.92 },
  { price: 3181.68, size: 1.12 },
  { price: 3181.12, size: 0.75 },
  { price: 3180.87, size: 1.44 },
];

const bids: Order[] = [
  { price: 3180.12, size: 1.38 },
  { price: 3179.76, size: 0.95 },
  { price: 3179.42, size: 1.24 },
  { price: 3178.95, size: 1.02 },
  { price: 3178.34, size: 1.55 },
];

const recentTrades = [
  { side: "buy", price: 3180.25, size: 0.45, time: "10:24:51" },
  { side: "sell", price: 3180.12, size: 0.82, time: "10:24:34" },
  { side: "buy", price: 3180.35, size: 0.58, time: "10:24:12" },
  { side: "buy", price: 3180.56, size: 1.2, time: "10:23:58" },
  { side: "sell", price: 3179.98, size: 0.32, time: "10:23:46" },
];

const mockOpenOrders = [
  {
    id: "order-1",
    market: "ETH / USDC",
    side: "buy",
    price: 3180.2,
    size: 0.5,
    filled: 0.1,
    created: "10:21:04",
  },
  {
    id: "order-2",
    market: "ETH / USDC",
    side: "sell",
    price: 3183.1,
    size: 0.25,
    filled: 0.0,
    created: "10:09:22",
  },
];

const mockTradeHistory = [
  { id: "trade-1", market: "ETH / USDC", side: "sell", price: 3182.2, size: 0.42, time: "10:19:58" },
  { id: "trade-2", market: "ETH / USDC", side: "buy", price: 3180.6, size: 0.33, time: "10:15:40" },
  { id: "trade-3", market: "ETH / USDC", side: "sell", price: 3181.8, size: 0.51, time: "10:07:11" },
  { id: "trade-4", market: "SOL / USDC", side: "buy", price: 146.2, size: 10.0, time: "09:58:54" },
];

const formatNumber = (value: number, decimals = 2) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

const CandlestickChart: React.FC<{ data: Candle[] }> = ({ data }) => {
  const width = 800;
  const height = 320;
  const padding = 20;
  const maxPrice = Math.max(...data.map((candle) => candle.high));
  const minPrice = Math.min(...data.map((candle) => candle.low));
  const priceRange = maxPrice - minPrice || 1;
  const maxVolume = Math.max(...data.map((candle) => candle.volume));
  const xStep = (width - padding * 2) / data.length;
  const candleWidth = xStep * 0.45;

  const yScale = (value: number) =>
    padding + ((maxPrice - value) / priceRange) * (height - padding * 2);

  const volumeScale = (value: number) =>
    (value / maxVolume) * (height * 0.18);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-[360px] w-full"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="gridGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#2b3750" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#1a2234" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="url(#gridGradient)"
      />
      {Array.from({ length: 6 }).map((_, index) => {
        const y = padding + (index / 5) * (height - padding * 2);
        return (
          <line
            key={`h-${index}`}
            x1={padding}
            x2={width - padding}
            y1={y}
            y2={y}
            stroke="#1c2640"
            strokeWidth={1}
            strokeDasharray="2 6"
          />
        );
      })}
      {data.map((candle, index) => {
        const isBullish = candle.close >= candle.open;
        const x = padding + index * xStep + xStep / 2;
        const openY = yScale(candle.open);
        const closeY = yScale(candle.close);
        const highY = yScale(candle.high);
        const lowY = yScale(candle.low);
        const bodyTop = Math.min(openY, closeY);
        const bodyHeight = Math.max(Math.abs(closeY - openY), 2);
        const volumeHeight = volumeScale(candle.volume);

        return (
          <g key={candle.time}>
            <rect
              x={x - candleWidth / 2}
              y={height - padding - volumeHeight}
              width={candleWidth}
              height={volumeHeight}
              fill={isBullish ? "#1b4a3c" : "#4a1b1b"}
              opacity={0.4}
            />
            <line
              x1={x}
              x2={x}
              y1={highY}
              y2={lowY}
              stroke={isBullish ? "#5ce0b5" : "#f472b6"}
              strokeWidth={2}
              strokeLinecap="round"
            />
            <rect
              x={x - candleWidth / 2}
              y={bodyTop}
              width={candleWidth}
              height={bodyHeight}
              fill={isBullish ? "#5ce0b5" : "#f472b6"}
              rx={2}
            />
            {index % 2 === 0 && (
              <text
                x={x}
                y={height - padding / 2}
                fill="#7a86a8"
                fontSize={10}
                textAnchor="middle"
              >
                {candle.time}
              </text>
            )}
          </g>
        );
      })}
      <text
        x={padding}
        y={padding - 4}
        fill="#7a86a8"
        fontSize={10}
      >{`${formatNumber(maxPrice, 2)} USDC`}</text>
      <text
        x={padding}
        y={height - padding + 12}
        fill="#7a86a8"
        fontSize={10}
      >{`${formatNumber(minPrice, 2)} USDC`}</text>
    </svg>
  );
};

export const Clob: React.FC = () => {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [priceInput, setPriceInput] = useState("3180.25");
  const [sizeInput, setSizeInput] = useState("1.25");
  const [positionsTab, setPositionsTab] = useState<"openOrders" | "tradeHistory">(
    "openOrders"
  );
  const [selectedMarketId, setSelectedMarketId] = useState("eth-usdc");
  const selectedMarket =
    marketPairs.find((pair) => pair.id === selectedMarketId) ?? marketPairs[0];
  const [pairMenuOpen, setPairMenuOpen] = useState(false);
  const baseSymbol = selectedMarket.base;
  const quoteSymbol = selectedMarket.quote;

  const totalValue = useMemo(() => {
    const price = parseFloat(priceInput) || 0;
    const size = parseFloat(sizeInput) || 0;
    return price * size;
  }, [priceInput, sizeInput]);

  const askDepth = useMemo(() => {
    let cumulative = 0;
    return asks.map((order) => {
      cumulative += order.size;
      return { ...order, cumulative };
    });
  }, []);

  const bidDepth = useMemo(() => {
    let cumulative = 0;
    return bids.map((order) => {
      cumulative += order.size;
      return { ...order, cumulative };
    });
  }, []);

  const maxDepth = Math.max(
    ...askDepth.map((order) => order.cumulative),
    ...bidDepth.map((order) => order.cumulative)
  );

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#1f2c4e]/80 bg-[#0f1424]/90 p-6 shadow-[0px_25px_60px_rgba(2,6,23,0.55)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center space-x-3 relative">
              <button
                onClick={() => setPairMenuOpen((prev) => !prev)}
                className="flex items-center space-x-2 rounded-full border border-[#243152] bg-[#0d1426] px-4 py-2 text-white"
              >
                <span className="text-sm font-semibold">{baseSymbol}</span>
                <span className="text-gray-500">/</span>
                <span className="text-sm font-semibold">{quoteSymbol}</span>
                <svg
                  className={`h-4 w-4 transition-transform ${pairMenuOpen ? "rotate-180" : ""}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.24 4.39a.75.75 0 01-1.08 0L5.25 8.27a.75.75 0 01-.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              {pairMenuOpen && (
                <div className="absolute left-0 top-12 w-56 rounded-2xl border border-[#1f2c4e]/80 bg-[#0d1323]/95 shadow-lg z-30">
                  {marketPairs.map((pair) => (
                    <button
                      key={pair.id}
                      onClick={() => {
                        setSelectedMarketId(pair.id);
                        setPairMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between px-4 py-3 text-sm ${
                        pair.id === selectedMarketId
                          ? "text-white"
                          : "text-gray-300 hover:text-white"
                      }`}
                    >
                      <span>
                        {pair.base} / {pair.quote}
                      </span>
                      <span
                        className={`text-xs ${
                          pair.change >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {pair.change >= 0 ? "+" : ""}
                        {pair.change.toFixed(2)}%
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
                {selectedMarket.change > 0 ? "+" : ""}
                {selectedMarket.change.toFixed(2)}% 24h
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-6 text-sm text-gray-300">
              <div>
                <div className="text-gray-400">Price ({selectedMarket.quote})</div>
                <div className="text-2xl font-semibold text-white">
                  ${selectedMarket.price.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-gray-400">24h Change</div>
                <div className={`text-lg font-semibold ${
                  selectedMarket.change >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}>
                  {selectedMarket.change >= 0 ? "+" : ""}
                  {selectedMarket.change.toFixed(2)}%
                </div>
              </div>
              <div>
                <div className="text-gray-400">24h Volume ({selectedMarket.quote})</div>
                <div className="text-lg text-white">
                  ${selectedMarket.volume.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-gray-400">24h High / Low</div>
                <div className="text-lg text-white">
                  ${selectedMarket.high.toLocaleString()} / $
                  {selectedMarket.low.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-right text-sm text-gray-400">
            <div className="rounded-2xl border border-[#22336d]/70 bg-[#111b33] px-4 py-3">
              <div>Best Bid</div>
              <div className="text-2xl font-semibold text-emerald-400">
                ${formatNumber(bids[0].price)}
              </div>
            </div>
            <div className="rounded-2xl border border-[#3b254f]/70 bg-[#181227] px-4 py-3">
              <div>Best Ask</div>
              <div className="text-2xl font-semibold text-rose-400">
                ${formatNumber(asks[0].price)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[2.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-[#1f2c4e]/80 bg-[#0d1323]/95 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {baseSymbol} / {quoteSymbol}
                </h2>
                <div className="mt-1 text-xs uppercase tracking-[0.25rem] text-gray-500">
                  Trading View
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                {["1m", "5m", "15m", "1h", "4h", "1d"].map((interval) => (
                  <button
                    key={interval}
                    className={`rounded-full px-3 py-1 ${
                      interval === "15m"
                        ? "bg-white/10 text-white"
                        : "hover:bg-white/5"
                    }`}
                  >
                    {interval}
                  </button>
                ))}
                <button className="rounded-full border border-white/10 px-3 py-1">
                  Indicators
                </button>
              </div>
            </div>
            <div className="mt-4">
              <CandlestickChart data={candles} />
            </div>
          </div>

          <div className="rounded-3xl border border-[#1f2c4e]/80 bg-[#0d1323]/95 p-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <h2 className="text-lg font-semibold text-white">Order Book</h2>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span>Depth</span>
                <select className="rounded-lg border border-white/10 bg-transparent px-2 py-1 text-white outline-none text-xs">
                  <option className="bg-[#0d1323]" value="0.1">
                    0.1
                  </option>
                  <option className="bg-[#0d1323]" value="0.01">
                    0.01
                  </option>
                </select>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 text-xs text-gray-400">
              <span>Price ({quoteSymbol})</span>
              <span>Size ({baseSymbol})</span>
              <span className="text-right">Total</span>
            </div>
            <div className="mt-2 space-y-1 text-sm">
              {askDepth
                .slice()
                .reverse()
                .map((order) => (
                  <div key={`ask-${order.price}`} className="relative">
                    <div
                      className="absolute inset-0 right-0 rounded-lg bg-rose-500/10"
                      style={{
                        width: `${(order.cumulative / maxDepth) * 100}%`,
                      }}
                    />
                    <div className="relative grid grid-cols-3 px-2 py-1 text-rose-200">
                      <span>${formatNumber(order.price)}</span>
                      <span>{order.size.toFixed(2)}</span>
                      <span className="text-right">
                        {order.cumulative.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
            <div className="my-3 flex items-center justify-between rounded-2xl bg-[#101931] px-3 py-2 text-sm text-gray-300">
              <span>Spread</span>
              <span className="font-semibold text-white">$1.90 (0.06%)</span>
            </div>
            <div className="space-y-1 text-sm">
              {bidDepth.map((order) => (
                <div key={`bid-${order.price}`} className="relative">
                  <div
                    className="absolute inset-0 right-0 rounded-lg bg-emerald-500/10"
                    style={{
                      width: `${(order.cumulative / maxDepth) * 100}%`,
                    }}
                  />
                  <div className="relative grid grid-cols-3 px-2 py-1 text-emerald-200">
                    <span>${formatNumber(order.price)}</span>
                    <span>{order.size.toFixed(2)}</span>
                    <span className="text-right">
                      {order.cumulative.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-[#1f2c4e]/80 bg-[#0d1323]/95 p-4">
            <h2 className="text-lg font-semibold text-white">Trade</h2>
            <div className="mt-4 flex rounded-full bg-[#121933] p-1 text-sm">
              <button
                className={`flex-1 rounded-full px-3 py-1.5 ${
                  side === "buy"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "text-gray-400"
                }`}
                onClick={() => setSide("buy")}
              >
                Buy
              </button>
              <button
                className={`flex-1 rounded-full px-3 py-1.5 ${
                  side === "sell"
                    ? "bg-rose-500/20 text-rose-300"
                    : "text-gray-400"
                }`}
                onClick={() => setSide("sell")}
              >
                Sell
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <div className="mb-2 text-xs text-gray-400">Price ({quoteSymbol})</div>
                <input
                  value={priceInput}
                  onChange={(event) => setPriceInput(event.target.value)}
                  className="w-full rounded-2xl border border-white/5 bg-[#0b1120] px-4 py-3 text-white outline-none focus:border-[#2e4aa5]"
                  type="number"
                  min="0"
                />
              </div>
              <div>
                <div className="mb-2 text-xs text-gray-400">Amount ({baseSymbol})</div>
                <input
                  value={sizeInput}
                  onChange={(event) => setSizeInput(event.target.value)}
                  className="w-full rounded-2xl border border-white/5 bg-[#0b1120] px-4 py-3 text-white outline-none focus:border-[#2e4aa5]"
                  type="number"
                  min="0"
                />
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-[#0b1120] px-4 py-3 text-sm">
                <span className="text-gray-400">Total ({quoteSymbol})</span>
                <span className="text-white">${formatNumber(totalValue, 2)}</span>
              </div>
              <button
                className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${
                  side === "buy"
                    ? "bg-emerald-500 hover:bg-emerald-400 text-black"
                    : "bg-rose-500 hover:bg-rose-400 text-white"
                }`}
              >
                {side === "buy" ? "Place Buy Order" : "Place Sell Order"}
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-[#1f2c4e]/80 bg-[#0d1323]/95 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Recent Trades</h2>
              <span className="text-xs text-gray-400">
                {baseSymbol} / {quoteSymbol}
              </span>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              {recentTrades.map((trade) => (
                <div
                  key={`${trade.time}-${trade.price}`}
                  className="flex items-center justify-between rounded-2xl bg-[#0b1120] px-4 py-2"
                >
                  <span
                    className={
                      trade.side === "buy" ? "text-emerald-300" : "text-rose-300"
                    }
                  >
                    {trade.side.toUpperCase()}
                  </span>
                  <span className="text-white">${formatNumber(trade.price)}</span>
                  <span className="text-gray-300">{trade.size} ETH</span>
                  <span className="text-gray-500">{trade.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-[#1f2c4e]/80 bg-[#0b0f1c]/95 p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center space-x-6 text-sm text-gray-400">
            {(["openOrders", "tradeHistory"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setPositionsTab(tab)}
                className={`pb-3 ${
                  positionsTab === tab
                    ? "text-white border-b-2 border-[#0b5cff]"
                    : "hover:text-white"
                }`}
              >
                {tab === "openOrders" ? "Open Orders" : "Trade History"}
              </button>
            ))}
          </div>
          <div className="text-xs text-gray-500">
            {positionsTab === "openOrders" ? `${mockOpenOrders.length} Orders` : `${mockTradeHistory.length} Fills`}
          </div>
        </div>
        <div className="space-y-3 text-sm">
          {positionsTab === "openOrders"
            ? mockOpenOrders.map((order) => (
                <div
                  key={order.id}
                  className="grid grid-cols-5 gap-4 rounded-2xl bg-[#0f182a] p-4 border border-[#18203a]"
                >
                  <div>
                    <p className="text-gray-400 text-xs">Market</p>
                    <p className="text-white font-semibold">{order.market}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Side</p>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        order.side === "buy" ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                      }`}
                    >
                      {order.side.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Price</p>
                    <p className="text-white">${order.price.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Filled / Qty</p>
                    <p className="text-white">
                      {order.filled}/{order.size} ETH
                    </p>
                  </div>
                  <div className="text-right">
                    <button className="px-4 py-1.5 rounded-full border border-[#323a5a] text-sm text-white hover:bg-white/10">
                      Cancel
                    </button>
                  </div>
                </div>
              ))
            : mockTradeHistory.map((trade) => (
                <div
                  key={trade.id}
                  className="grid grid-cols-5 gap-4 rounded-2xl bg-[#0f182a] p-4 border border-[#18203a]"
                >
                  <div>
                    <p className="text-gray-400 text-xs">Market</p>
                    <p className="text-white font-semibold">{trade.market}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Side</p>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        trade.side === "buy" ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                      }`}
                    >
                      {trade.side.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Price</p>
                    <p className="text-white">${trade.price.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Qty</p>
                    <p className="text-white">{trade.size} ETH</p>
                  </div>
                  <div className="text-right text-gray-400 text-xs">{trade.time}</div>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
};
