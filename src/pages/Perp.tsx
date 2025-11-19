import { useEffect, useMemo, useState, useRef } from "react";

const formatCompactNumber = (value: number) => {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toFixed(2);
};

type PerpTimeframe = "5m" | "15m" | "1h" | "4h" | "D";
const PERP_TIMEFRAMES: PerpTimeframe[] = ["5m", "15m", "1h", "4h", "D"];
const PERP_TIMEFRAME_SLICES: Record<PerpTimeframe, number> = {
  "5m": 25,
  "15m": 40,
  "1h": 60,
  "4h": 75,
  D: 90,
};

type PerpCandle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

interface PerpPair {
  id: string;
  label: string;
  base: string;
  quote: string;
  price: number;
  change24h: number;
  fundingRate: number;
  volumeUsd: number;
  openInterestUsd: number;
  range24h: { high: number; low: number };
  sparkline: number[];
}

interface PerpOrderBookEntry {
  price: number;
  size: number;
}

type PerpSide = "Long" | "Short";

interface PerpPosition {
  id: string;
  pairId: string;
  label: string;
  side: PerpSide;
  size: number;
  entry: number;
  mark: number;
  pnlUsd: number;
  pnlPercent: number;
  leverage: number;
  marginUsd: number;
  liquidation: number;
}

interface PerpActivityOrder {
  id: string;
  pairId: string;
  pairLabel: string;
  side: PerpSide;
  type: "Limit" | "Market";
  size: number;
  price: number;
  filledPercent?: number;
  status?: string;
  time?: string;
  pnlUsd?: number;
}

const createMockCandles = (basePrice: number): PerpCandle[] => {
  const candles: PerpCandle[] = [];
  let price = basePrice * 1.08;
  for (let i = 0; i < 90; i++) {
    const drift = -0.0024 + Math.sin(i / 3.8) * 0.0011;
    const open = price;
    const closeRaw = open * (1 + drift);
    const close = Math.max(open * 0.93, closeRaw);
    const high = Math.max(open, close) * (1 + 0.002 + (i % 4) * 0.0004);
    const low = Math.min(open, close) * (1 - 0.002 - ((i + 1) % 4) * 0.0004);
    const volume =
      420000 +
      (Math.sin(i * 0.45) + 1) * 230000 +
      ((i % 6) + 1) * 35000;
    candles.push({
      time: `Nov ${i + 1}`,
      open,
      high,
      low,
      close,
      volume,
    });
    price = close;
  }
  return candles;
};

const CandlestickChart: React.FC<{ data: PerpCandle[] }> = ({ data }) => {
  if (!data.length) return null;
  const width = 860;
  const height = 360;
  const padding = 24;
  const volumeHeight = 80;
  const chartHeight = height - volumeHeight - padding * 1.5;
  const maxPrice = Math.max(...data.map((d) => d.high));
  const minPrice = Math.min(...data.map((d) => d.low));
  const priceRange = maxPrice - minPrice || 1;
  const maxVolume = Math.max(...data.map((d) => d.volume)) || 1;
  const xStep = (width - padding * 2) / data.length;
  const candleWidth = xStep * 0.55;
  const yScale = (price: number) =>
    padding + ((maxPrice - price) / priceRange) * chartHeight;
  const volumeScale = (volume: number) =>
    (volume / maxVolume) * volumeHeight;
  const lastPrice = data[data.length - 1].close;
  const lastPriceY = yScale(lastPrice);
  const toolbarIcons = ["＋", "✕", "☰", "✎", "T", "☺", "⌖", "⌦"];
  const markerBIndex = data.length - 18;
  const markerLIndex = data.length - 7;

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center rounded-2xl border border-white/5 bg-[#0A0E17] px-2 py-3 text-[0.7rem] text-gray-500">
        {toolbarIcons.map((icon) => (
          <span
            key={icon}
            className="w-6 h-6 mb-1 flex items-center justify-center rounded-full hover:text-white hover:bg-white/10 transition"
          >
            {icon}
          </span>
        ))}
      </div>
      <div className="relative flex-1 rounded-3xl border border-white/5 bg-[#080B13] p-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="w-full h-[360px]"
        >
          <defs>
            <linearGradient id="perpGrid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1a2336" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0d121f" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <rect width={width} height={height} fill="url(#perpGrid)" />
          {Array.from({ length: 6 }).map((_, index) => {
            const y =
              padding + (index / 5) * chartHeight;
            return (
              <line
                key={`h-${index}`}
                x1={padding}
                x2={width - padding}
                y1={y}
                y2={y}
                stroke="#131a2a"
                strokeWidth={1}
                strokeDasharray="2 6"
              />
            );
          })}
          {Array.from({ length: 5 }).map((_, index) => {
            const x =
              padding + (index / 4) * (width - padding * 2);
            return (
              <line
                key={`v-${index}`}
                x1={x}
                x2={x}
                y1={padding}
                y2={padding + chartHeight}
                stroke="#131a2a"
                strokeWidth={1}
                strokeDasharray="2 6"
              />
            );
          })}
          {data.map((candle, index) => {
            const isBullish = candle.close >= candle.open;
            const color = isBullish ? "#6EF2B1" : "#FF7088";
            const secondaryColor = isBullish ? "#1E3D2B" : "#3D1C26";
            const x = padding + index * xStep + xStep / 2;
            const openY = yScale(candle.open);
            const closeY = yScale(candle.close);
            const highY = yScale(candle.high);
            const lowY = yScale(candle.low);
            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.max(Math.abs(closeY - openY), 2);
            const volumeBarHeight = volumeScale(candle.volume);
            const volumeTop = chartHeight + padding + (volumeHeight - volumeBarHeight);

            return (
              <g key={candle.time}>
                <line
                  x1={x}
                  x2={x}
                  y1={highY}
                  y2={lowY}
                  stroke={color}
                  strokeWidth={2}
                />
                <rect
                  x={x - candleWidth / 2}
                  y={bodyTop}
                  width={candleWidth}
                  height={bodyHeight}
                  fill={color}
                  opacity={0.85}
                />
                <rect
                  x={x - candleWidth / 2}
                  y={volumeTop}
                  width={candleWidth}
                  height={volumeBarHeight}
                  fill={secondaryColor}
                />
              </g>
            );
          })}
          <line
            x1={padding}
            x2={width - padding}
            y1={lastPriceY}
            y2={lastPriceY}
            stroke="#6E7EFE"
            strokeDasharray="6 6"
            strokeWidth={1}
          />
          <rect
            x={width - padding - 80}
            y={lastPriceY - 10}
            width={78}
            height={20}
            rx={8}
            fill="#11172a"
            stroke="#6E7EFE"
          />
          <text
            x={width - padding - 40}
            y={lastPriceY + 4}
            textAnchor="middle"
            fill="#C3C9E4"
            fontSize={12}
            fontWeight={600}
          >
            ${lastPrice.toFixed(2)}
          </text>
          {[0, 1, 2, 3, 4].map((i) => {
            const price =
              maxPrice - (priceRange / 4) * i;
            const y = yScale(price);
            return (
              <text
                key={`price-${i}`}
                x={padding - 6}
                y={y + 4}
                textAnchor="end"
                fill="#4b5775"
                fontSize={11}
              >
                ${price.toFixed(2)}
              </text>
            );
          })}
          {data.map((candle, index) => {
            if (index % Math.ceil(data.length / 6) !== 0) return null;
            const x = padding + index * xStep;
            return (
              <text
                key={`time-${candle.time}`}
                x={x}
                y={height - padding / 2}
                fill="#4b5775"
                fontSize={11}
              >
                {candle.time}
              </text>
            );
          })}
          {[markerBIndex, markerLIndex].map((markerIndex, idx) => {
            if (markerIndex < 0 || markerIndex >= data.length) return null;
            const candle = data[markerIndex];
            const x = padding + markerIndex * xStep + xStep / 2;
            const y = yScale(candle.close) - 12;
            const label = idx === 0 ? "B" : "L";
            const markerColor = idx === 0 ? "#46d185" : "#FF9E54";
            return (
              <g key={`marker-${markerIndex}`}>
                <circle cx={x} cy={y} r={11} fill={markerColor} opacity={0.9} />
                <text
                  x={x}
                  y={y + 4}
                  textAnchor="middle"
                  fontSize={12}
                  fontWeight={700}
                  fill="#050608"
                >
                  {label}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <button className="px-3 py-1 text-xs rounded-full border border-white/10 text-gray-400 hover:text-white hover:border-white/20">
            Indicators
          </button>
          <button className="px-3 py-1 text-xs rounded-full border border-white/10 text-gray-400 hover:text-white hover:border-white/20">
            Expand
          </button>
        </div>
      </div>
    </div>
  );
};

const PERP_PAIRS: PerpPair[] = [
  {
    id: "btc-usdc",
    label: "BTC · USDC",
    base: "BTC",
    quote: "USDC",
    price: 65342.18,
    change24h: 1.84,
    fundingRate: 0.013,
    volumeUsd: 48_200_000,
    openInterestUsd: 26_600_000,
    range24h: { high: 65980.32, low: 64052.11 },
    sparkline: [
      62410, 62750, 62140, 63220, 63980, 63410, 64290, 64840, 64610, 65120,
      65380, 65830,
    ],
  },
  {
    id: "eth-usdc",
    label: "ETH · USDC",
    base: "ETH",
    quote: "USDC",
    price: 3094.54,
    change24h: -0.64,
    fundingRate: -0.005,
    volumeUsd: 28_400_000,
    openInterestUsd: 19_200_000,
    range24h: { high: 3164.14, low: 3028.22 },
    sparkline: [
      2890, 2924, 2958, 3005, 2982, 3061, 3094, 3052, 3124, 3082, 3112, 3095,
    ],
  },
  {
    id: "sui-usdc",
    label: "SUI · USDC",
    base: "SUI",
    quote: "USDC",
    price: 1.42,
    change24h: 3.12,
    fundingRate: 0.021,
    volumeUsd: 12_850_000,
    openInterestUsd: 7_100_000,
    range24h: { high: 1.48, low: 1.35 },
    sparkline: [
      1.28, 1.31, 1.29, 1.34, 1.33, 1.36, 1.38, 1.41, 1.4, 1.43, 1.42, 1.45,
    ],
  },
];

const PERP_CANDLE_SERIES: Record<string, PerpCandle[]> = PERP_PAIRS.reduce(
  (acc, pair) => {
    acc[pair.id] = createMockCandles(pair.price);
    return acc;
  },
  {} as Record<string, PerpCandle[]>
);

const generateOrderBook = (
  mid: number
): { bids: PerpOrderBookEntry[]; asks: PerpOrderBookEntry[] } => {
  const levels = 7;
  const step = Math.max(mid * 0.0008, 0.02);
  const bids: PerpOrderBookEntry[] = Array.from({ length: levels }, (_, i) => ({
    price: Number((mid - step * (i + 1)).toFixed(2)),
    size: Number((1.2 - i * 0.1).toFixed(3)),
  }));
  const asks: PerpOrderBookEntry[] = Array.from({ length: levels }, (_, i) => ({
    price: Number((mid + step * (i + 1)).toFixed(2)),
    size: Number((1.05 - i * 0.08).toFixed(3)),
  }));
  return { bids, asks };
};

const PERP_ORDER_BOOK: Record<
  string,
  { bids: PerpOrderBookEntry[]; asks: PerpOrderBookEntry[] }
> = PERP_PAIRS.reduce(
  (acc, pair) => ({
    ...acc,
    [pair.id]: generateOrderBook(pair.price),
  }),
  {} as Record<
    string,
    { bids: PerpOrderBookEntry[]; asks: PerpOrderBookEntry[] }
  >
);

const PERP_POSITIONS: PerpPosition[] = [
  {
    id: "pos-btc",
    pairId: "btc-usdc",
    label: "BTC · USDC",
    side: "Long",
    size: 0.84,
    entry: 64210.12,
    mark: 65342.18,
    pnlUsd: 845.32,
    pnlPercent: 3.42,
    leverage: 8,
    marginUsd: 6800,
    liquidation: 58210.52,
  },
  {
    id: "pos-eth",
    pairId: "eth-usdc",
    label: "ETH · USDC",
    side: "Short",
    size: 5.2,
    entry: 3148.11,
    mark: 3094.54,
    pnlUsd: 278.4,
    pnlPercent: 1.78,
    leverage: 6,
    marginUsd: 2700,
    liquidation: 3475.32,
  },
];

const PERP_OPEN_ORDERS: PerpActivityOrder[] = [
  {
    id: "order-btc-1",
    pairId: "btc-usdc",
    pairLabel: "BTC · USDC",
    side: "Long",
    type: "Limit",
    size: 0.25,
    price: 64800,
    filledPercent: 35,
    status: "Working",
  },
  {
    id: "order-eth-1",
    pairId: "eth-usdc",
    pairLabel: "ETH · USDC",
    side: "Short",
    type: "Limit",
    size: 3.1,
    price: 3175,
    filledPercent: 0,
    status: "Working",
  },
  {
    id: "order-sui-1",
    pairId: "sui-usdc",
    pairLabel: "SUI · USDC",
    side: "Long",
    type: "Limit",
    size: 4.2,
    price: 1.39,
    filledPercent: 80,
    status: "Partial",
  },
];

const PERP_TRADE_HISTORY: PerpActivityOrder[] = [
  {
    id: "trade-btc-1",
    pairId: "btc-usdc",
    pairLabel: "BTC · USDC",
    side: "Long",
    type: "Market",
    size: 0.18,
    price: 65210,
    pnlUsd: 155,
    time: "14:42:31",
  },
  {
    id: "trade-btc-2",
    pairId: "btc-usdc",
    pairLabel: "BTC · USDC",
    side: "Short",
    type: "Limit",
    size: 0.12,
    price: 65720,
    pnlUsd: -62,
    time: "13:28:08",
  },
  {
    id: "trade-eth-1",
    pairId: "eth-usdc",
    pairLabel: "ETH · USDC",
    side: "Short",
    type: "Market",
    size: 4.5,
    price: 3102,
    pnlUsd: 210,
    time: "11:10:51",
  },
  {
    id: "trade-sui-1",
    pairId: "sui-usdc",
    pairLabel: "SUI · USDC",
    side: "Long",
    type: "Market",
    size: 6.5,
    price: 1.41,
    pnlUsd: 18,
    time: "10:04:18",
  },
];

export const Perp = () => {
  const [selectedPairId, setSelectedPairId] = useState(PERP_PAIRS[0].id);
  const [perpTimeframe, setPerpTimeframe] = useState<PerpTimeframe>("15m");
  const [perpSide, setPerpSide] = useState<PerpSide>("Long");
  const [perpOrderType, setPerpOrderType] = useState<"Market" | "Limit">(
    "Market"
  );
  const [perpOrderSize, setPerpOrderSize] = useState("0.50");
  const [perpOrderPrice, setPerpOrderPrice] = useState(
    PERP_PAIRS[0].price.toFixed(2)
  );
  const [perpLeverage, setPerpLeverage] = useState(8);
  const [perpActivityTab, setPerpActivityTab] = useState<
    "openOrders" | "tradeHistory"
  >("openOrders");
  const [chartSectionTab, setChartSectionTab] = useState<
    "price" | "depth" | "details"
  >("price");
  const [orderPanelTab, setOrderPanelTab] = useState<
    "book" | "trades"
  >("book");
  const [pairPickerOpen, setPairPickerOpen] = useState(false);
  const [pairSearch, setPairSearch] = useState("");
  const pairPickerRef = useRef<HTMLDivElement | null>(null);

  const parseAmount = (value: string) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  };

  const selectedPair = useMemo(
    () =>
      PERP_PAIRS.find((pair) => pair.id === selectedPairId) ?? PERP_PAIRS[0],
    [selectedPairId]
  );

  useEffect(() => {
    setPerpOrderPrice(selectedPair.price.toFixed(2));
  }, [selectedPair]);

  useEffect(() => {
    if (perpOrderType === "Market") {
      setPerpOrderPrice(selectedPair.price.toFixed(2));
    }
  }, [perpOrderType, selectedPair]);

  useEffect(() => {
    if (!pairPickerOpen) return;
    const handler = (event: MouseEvent) => {
      if (
        pairPickerRef.current &&
        !pairPickerRef.current.contains(event.target as Node)
      ) {
        setPairPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pairPickerOpen]);

  const orderBook =
    PERP_ORDER_BOOK[selectedPair.id] ?? generateOrderBook(selectedPair.price);
  const filteredPositions = PERP_POSITIONS.filter(
    (position) => position.pairId === selectedPair.id
  );
  const filteredOpenOrders = PERP_OPEN_ORDERS.filter(
    (order) => order.pairId === selectedPair.id
  );
  const filteredTrades = PERP_TRADE_HISTORY.filter(
    (trade) => trade.pairId === selectedPair.id
  );
  const activityRows =
    perpActivityTab === "openOrders" ? filteredOpenOrders : filteredTrades;
  const orderSizeValue = parseAmount(perpOrderSize);
  const orderPriceValue =
    perpOrderType === "Market"
      ? selectedPair.price
      : parseAmount(perpOrderPrice) || selectedPair.price;
  const notionalValue = orderSizeValue * orderPriceValue;
  const requiredMargin = perpLeverage > 0 ? notionalValue / perpLeverage : 0;
  const fundingImpact = (selectedPair.fundingRate / 100) * notionalValue;
  const filteredPairs = useMemo(() => {
    const query = pairSearch.trim().toLowerCase();
    if (!query) return PERP_PAIRS;
    return PERP_PAIRS.filter(
      (pair) =>
        pair.label.toLowerCase().includes(query) ||
        pair.base.toLowerCase().includes(query) ||
        pair.quote.toLowerCase().includes(query)
    );
  }, [pairSearch]);
  const handlePairSelect = (pairId: string) => {
    setSelectedPairId(pairId);
    setPairPickerOpen(false);
    setPairSearch("");
  };
  const pairCandles = PERP_CANDLE_SERIES[selectedPair.id] ?? [];
  const displayedCandles = useMemo(() => {
    const slice = PERP_TIMEFRAME_SLICES[perpTimeframe] ?? pairCandles.length;
    return pairCandles.slice(-slice);
  }, [pairCandles, perpTimeframe]);
  const latestCandle = displayedCandles[displayedCandles.length - 1];
  const chartStats = [
    {
      label: "Mark Price",
      value: `$${selectedPair.price.toFixed(4)}`,
    },
    {
      label: "Next Funding",
      value: `${selectedPair.fundingRate >= 0 ? "+" : ""}${selectedPair.fundingRate.toFixed(4)}% · 03:25`,
    },
    {
      label: "24h High",
      value: `$${selectedPair.range24h.high.toLocaleString()}`,
    },
    {
      label: "24h Low",
      value: `$${selectedPair.range24h.low.toLocaleString()}`,
    },
    {
      label: "24h Volume",
      value: `$${formatCompactNumber(selectedPair.volumeUsd)}`,
    },
    {
      label: "Open Interest",
      value: `$${formatCompactNumber(selectedPair.openInterestUsd)}`,
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-white">Perpetual Trading</h1>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[2.2fr_1.1fr]">
        <div className="space-y-6">
          <div className="bg-[#0F1016] border border-gray-800 rounded-3xl p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-2 relative" ref={pairPickerRef}>
                <p className="text-sm text-gray-400">Perpetual Chart</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setPairPickerOpen((prev) => !prev)}
                    className="flex items-center gap-2 rounded-2xl border border-[#2d395f] bg-[#101425] px-4 py-2 text-white"
                  >
                    <span className="text-lg font-semibold">
                      {selectedPair.label}
                    </span>
                    <svg
                      className={`h-4 w-4 text-gray-400 transition-transform ${
                        pairPickerOpen ? "rotate-180" : ""
                      }`}
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
                  <span
                    className={`rounded-full px-3 py-0.5 text-xs ${
                      selectedPair.change24h >= 0
                        ? "bg-[#1b3125] text-[#A3FF6E]"
                        : "bg-[#351821] text-[#FF6B7A]"
                    }`}
                  >
                    {selectedPair.change24h >= 0 ? "+" : ""}
                    {selectedPair.change24h.toFixed(2)}%
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Funding {selectedPair.fundingRate >= 0 ? "+" : ""}
                  {selectedPair.fundingRate.toFixed(3)}% · OI $
                  {formatCompactNumber(selectedPair.openInterestUsd)}
                </p>
                {pairPickerOpen && (
                  <div className="absolute mt-2 w-72 rounded-2xl border border-[#243256] bg-[#0B0F19] shadow-[0_25px_50px_rgba(3,9,28,0.55)] z-30">
                    <div className="px-4 py-3 border-b border-white/5">
                      <input
                        type="text"
                        value={pairSearch}
                        onChange={(e) => setPairSearch(e.target.value)}
                        placeholder="Search markets..."
                        className="w-full rounded-2xl border border-[#2f3c5f] bg-[#0f1425] px-4 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#6E7EFE]"
                      />
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-white/5">
                      {filteredPairs.length === 0 && (
                        <div className="px-4 py-6 text-center text-sm text-gray-500">
                          No markets found
                        </div>
                      )}
                      {filteredPairs.map((pair) => (
                        <button
                          key={pair.id}
                          onClick={() => handlePairSelect(pair.id)}
                          className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition ${
                            pair.id === selectedPair.id
                              ? "bg-white/5 text-white"
                              : "text-gray-300 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <div>
                            <p className="font-semibold">{pair.label}</p>
                            <p className="text-xs text-gray-500">
                              Funding {pair.fundingRate >= 0 ? "+" : ""}
                              {pair.fundingRate.toFixed(3)}%
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-white">
                              $
                              {pair.price.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </p>
                            <p
                              className={`text-xs ${
                                pair.change24h >= 0
                                  ? "text-[#A3FF6E]"
                                  : "text-[#FF6B7A]"
                              }`}
                            >
                              {pair.change24h >= 0 ? "+" : ""}
                              {pair.change24h.toFixed(2)}% · OI $
                              {formatCompactNumber(pair.openInterestUsd)}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {PERP_TIMEFRAMES.map((frame) => (
                  <button
                    key={frame}
                    onClick={() => setPerpTimeframe(frame)}
                    className={`px-4 py-1.5 rounded-full text-xs uppercase tracking-wide transition ${
                      perpTimeframe === frame
                        ? "bg-[#1F2240] text-[#C3C9E4] border border-[#6E7EFE]"
                        : "text-gray-500 border border-transparent hover:text-white"
                    }`}
                  >
                    {frame}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-6 text-xs text-gray-400 border-t border-white/5 pt-4">
              {chartStats.map((stat) => (
                <div key={stat.label}>
                  <p className="uppercase tracking-widest text-[0.65rem] text-gray-500">
                    {stat.label}
                  </p>
                  <p className="text-base font-semibold text-white mt-1">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-400 border-t border-white/5 pt-4">
              <div className="flex items-center gap-4">
                {(["price", "depth", "details"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setChartSectionTab(tab)}
                    className={`uppercase tracking-widest ${
                      chartSectionTab === tab
                        ? "text-[#6E7EFE] border-b-2 border-[#6E7EFE]"
                        : "text-gray-500 border-b border-transparent"
                    } pb-1`}
                  >
                    {tab === "price"
                      ? "Price"
                      : tab === "depth"
                      ? "Depth"
                      : "Details"}
                  </button>
                ))}
              </div>
              <span>Volume SMA 9 · {formatCompactNumber(latestCandle?.volume ?? 0)}</span>
            </div>
            <CandlestickChart data={displayedCandles} />
          </div>
          <div className="bg-[#0F1016] border border-gray-800 rounded-3xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex space-x-6">
                {(["book", "trades"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setOrderPanelTab(tab)}
                    className={`text-sm font-semibold pb-1 ${
                      orderPanelTab === tab
                        ? "text-[#6E7EFE] border-b-2 border-[#6E7EFE]"
                        : "text-gray-500 border-b border-transparent"
                    }`}
                  >
                    {tab === "book" ? "Order Book" : "Last Trades"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                Price ({selectedPair.quote}) · Size ({selectedPair.base})
              </p>
            </div>
            {orderPanelTab === "book" ? (
              <div className="grid gap-6 lg:grid-cols-2 mt-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">
                    Asks
                  </p>
                  <div className="space-y-2">
                    {orderBook.asks.map((entry, index) => {
                      const intensity = Math.max(0.15, 1 - index * 0.12);
                      return (
                        <div
                          key={`ask-${entry.price}`}
                          className="relative rounded-xl overflow-hidden px-3 py-2"
                        >
                          <div
                            className="absolute inset-0 bg-[#331428]"
                            style={{ opacity: intensity }}
                          />
                          <div className="relative grid grid-cols-[1.2fr_0.8fr_1fr] text-xs font-mono text-gray-300">
                            <span className="text-left text-[#FF6B7A]">
                              {entry.price.toLocaleString()}
                            </span>
                            <span className="text-center">
                              {entry.size.toFixed(3)}
                            </span>
                            <span className="text-right text-gray-500">
                              {(entry.price * entry.size).toLocaleString(
                                undefined,
                                { maximumFractionDigits: 0 }
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">
                    Bids
                  </p>
                  <div className="space-y-2">
                    {orderBook.bids.map((entry, index) => {
                      const intensity = Math.max(0.15, 1 - index * 0.12);
                      return (
                        <div
                          key={`bid-${entry.price}`}
                          className="relative rounded-xl overflow-hidden px-3 py-2"
                        >
                          <div
                            className="absolute inset-0 bg-[#163727]"
                            style={{ opacity: intensity }}
                          />
                          <div className="relative grid grid-cols-[1.2fr_0.8fr_1fr] text-xs font-mono text-gray-300">
                            <span className="text-left text-[#A3FF6E]">
                              {entry.price.toLocaleString()}
                            </span>
                            <span className="text-center">
                              {entry.size.toFixed(3)}
                            </span>
                            <span className="text-right text-gray-500">
                              {(entry.price * entry.size).toLocaleString(
                                undefined,
                                { maximumFractionDigits: 0 }
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-2 max-h-80 overflow-y-auto">
                {filteredTrades.map((trade) => (
                  <div
                    key={trade.id}
                    className="flex items-center justify-between text-sm text-gray-300 border-b border-white/5 pb-2"
                  >
                    <span>{trade.time}</span>
                    <span
                      className={
                        trade.side === "Long" ? "text-[#A3FF6E]" : "text-[#FF6B7A]"
                      }
                    >
                      ${trade.price.toLocaleString()}
                    </span>
                    <span>
                      {trade.size} {selectedPair.base}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#0F1016] border border-gray-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex space-x-4">
                {(["Limit", "Market"] as const).map((label) => (
                  <button
                    key={label}
                    onClick={() =>
                      setPerpOrderType(label === "Limit" ? "Limit" : "Market")
                    }
                    className={`text-sm font-semibold pb-1 ${
                      (perpOrderType === "Limit" && label === "Limit") ||
                      (perpOrderType === "Market" && label === "Market")
                        ? "text-[#6E7EFE] border-b-2 border-[#6E7EFE]"
                        : "text-gray-500 border-b border-transparent"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <span className="text-xs text-gray-500">Avb: 0.00 {selectedPair.quote}</span>
            </div>

            <div className="flex gap-3">
              {(["Long", "Short"] as PerpSide[]).map((side) => (
                <button
                  key={side}
                  onClick={() => setPerpSide(side)}
                  className={`flex-1 rounded-2xl px-4 py-3 font-semibold transition ${
                    perpSide === side
                      ? side === "Long"
                        ? "bg-gradient-to-r from-[#1F4B2A] via-[#2F7341] to-[#3FD282] text-white"
                        : "bg-gradient-to-r from-[#4B1D30] via-[#7B2949] to-[#FF6B7A] text-white"
                      : "bg-[#151823] text-gray-400 border border-gray-800"
                  }`}
                >
                  {side}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <label className="text-xs text-gray-500 flex items-center justify-between">
                Price ({selectedPair.quote})
                {perpOrderType === "Limit" && (
                  <button
                    onClick={() =>
                      setPerpOrderPrice(selectedPair.price.toFixed(2))
                    }
                    className="text-[#6E7EFE] text-[0.7rem]"
                  >
                    Last
                  </button>
                )}
              </label>
              <input
                type="number"
                min="0"
                step="0.0001"
                readOnly={perpOrderType === "Market"}
                value={perpOrderPrice}
                onChange={(e) => setPerpOrderPrice(e.target.value)}
                className={`w-full rounded-2xl border border-gray-800 bg-[#0A0D16] px-4 py-3 text-lg font-semibold text-white focus:border-[#6E7EFE] focus:outline-none ${
                  perpOrderType === "Market"
                    ? "opacity-60 cursor-not-allowed"
                    : ""
                }`}
              />
            </div>

            <div className="space-y-3">
              <label className="text-xs text-gray-500 flex items-center justify-between">
                Size ({selectedPair.base})
                <span className="text-gray-600">Balance: 0.00</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={perpOrderSize}
                onChange={(e) => setPerpOrderSize(e.target.value)}
                className="w-full rounded-2xl border border-gray-800 bg-[#0A0D16] px-4 py-3 text-lg font-semibold text-white focus:border-[#6E7EFE] focus:outline-none"
              />
              <input
                type="range"
                min={1}
                max={25}
                value={perpLeverage}
                onChange={(e) => setPerpLeverage(Number(e.target.value))}
                className="w-full accent-[#6E7EFE]"
              />
              <div className="flex justify-between text-[0.65rem] uppercase tracking-widest text-gray-500">
                <span>1x</span>
                <span>10x</span>
                <span>25x</span>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-800 bg-[#0A0D16] p-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Notional Value</span>
                <span className="text-white">
                  {notionalValue
                    ? `$${notionalValue.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}`
                    : "--"}
                </span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Required Margin</span>
                <span className="text-white">
                  {requiredMargin
                    ? `$${requiredMargin.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}`
                    : "--"}
                </span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Est. Funding / 8h</span>
                <span className="text-white">
                  ${fundingImpact.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <label className="flex items-center text-xs text-gray-400 space-x-2">
                <input type="checkbox" className="accent-[#6E7EFE]" />
                <span>Take Profit / Stop Loss</span>
              </label>
              <span className="text-[0.65rem] text-gray-500">
                Effective Time: GTC
              </span>
            </div>

            <button
              className={`w-full rounded-2xl py-3 text-base font-semibold text-white transition ${
                perpSide === "Long"
                  ? "bg-gradient-to-r from-[#1F4B2A] via-[#2F7341] to-[#3FD282]"
                  : "bg-gradient-to-r from-[#4B1D30] via-[#7B2949] to-[#FF6B7A]"
              }`}
            >
              {perpOrderType === "Market" ? "Execute" : "Place"}{" "}
              {perpSide === "Long" ? "Long" : "Short"}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-[#0F1016] border border-gray-800 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold">Active Positions</h3>
          <span className="text-xs text-gray-500">
            {filteredPositions.length} live
          </span>
        </div>
        {filteredPositions.length === 0 ? (
          <p className="text-sm text-gray-500">
            No active exposure on this market.
          </p>
        ) : (
          <div className="space-y-3">
            {filteredPositions.map((position) => (
              <div
                key={position.id}
                className="rounded-2xl border border-gray-800 bg-[#0A0D16] p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-semibold">
                      {position.label}
                    </p>
                    <p className="text-xs text-gray-500">
                      {position.size} {selectedPair.base} · {position.leverage}x
                    </p>
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      position.side === "Long"
                        ? "text-[#A3FF6E]"
                        : "text-[#FF6B7A]"
                    }`}
                  >
                    {position.side}
                  </span>
                </div>
                <div className="grid gap-4 text-xs text-gray-400 md:grid-cols-4">
                  <div>
                    <p>Entry</p>
                    <p className="text-white">
                      ${position.entry.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p>Mark</p>
                    <p className="text-white">
                      ${position.mark.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p>PnL</p>
                    <p
                      className={`text-white ${
                        position.pnlUsd >= 0
                          ? "text-[#A3FF6E]"
                          : "text-[#FF6B7A]"
                      }`}
                    >
                      {position.pnlUsd >= 0 ? "+" : "-"}$
                      {Math.abs(position.pnlUsd).toFixed(2)} (
                      {position.pnlPercent.toFixed(2)}%)
                    </p>
                  </div>
                  <div>
                    <p>Liquidation</p>
                    <p className="text-white">
                      ${position.liquidation.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Margin ${position.marginUsd.toLocaleString()}</span>
                  <button className="text-[#6E7EFE] font-medium">Manage</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-[#0F1016] border border-gray-800 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex space-x-6 border-b border-[rgba(195,201,228,0.15)]">
            {(
              [
                { key: "openOrders", label: "Open Orders" },
                { key: "tradeHistory", label: "Trade History" },
              ] as { key: "openOrders" | "tradeHistory"; label: string }[]
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setPerpActivityTab(tab.key)}
                className={`pb-2 text-sm font-semibold ${
                  perpActivityTab === tab.key
                    ? "text-[#6E7EFE] border-b-2 border-[#6E7EFE]"
                    : "text-gray-500 border-b border-transparent"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-500">
            {activityRows.length} records
          </span>
        </div>
        <div className="overflow-x-auto">
          {perpActivityTab === "openOrders" ? (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-widest text-gray-500">
                  <th className="py-3">Pair</th>
                  <th className="py-3">Side</th>
                  <th className="py-3">Type</th>
                  <th className="py-3">Size</th>
                  <th className="py-3">Price</th>
                  <th className="py-3">Filled</th>
                  <th className="py-3">Status</th>
                  <th className="py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activityRows.map((order) => {
                  const baseSymbol = order.pairLabel.split(" · ")[0] ?? "";
                  return (
                    <tr
                      key={order.id}
                      className="border-t border-white/5 text-gray-300"
                    >
                      <td className="py-3">{order.pairLabel}</td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            order.side === "Long"
                              ? "bg-[#1B3522] text-[#A3FF6E]"
                              : "bg-[#3E1A23] text-[#FF6B7A]"
                          }`}
                        >
                          {order.side}
                        </span>
                      </td>
                      <td className="py-3">{order.type}</td>
                      <td className="py-3">
                        {order.size} {baseSymbol}
                      </td>
                      <td className="py-3">${order.price.toLocaleString()}</td>
                      <td className="py-3">{order.filledPercent ?? 0}%</td>
                      <td className="py-3">
                        <span className="text-gray-400">{order.status}</span>
                      </td>
                      <td className="py-3 text-right">
                        <button className="text-xs text-gray-200 border border-gray-700 rounded-full px-3 py-1 hover:text-white">
                          Cancel
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-widest text-gray-500">
                  <th className="py-3">Pair</th>
                  <th className="py-3">Side</th>
                  <th className="py-3">Type</th>
                  <th className="py-3">Size</th>
                  <th className="py-3">Price</th>
                  <th className="py-3">Time</th>
                  <th className="py-3 text-right">PnL</th>
                </tr>
              </thead>
              <tbody>
                {activityRows.map((trade) => {
                  const baseSymbol = trade.pairLabel.split(" · ")[0] ?? "";
                  return (
                    <tr
                      key={trade.id}
                      className="border-t border-white/5 text-gray-300"
                    >
                      <td className="py-3">{trade.pairLabel}</td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            trade.side === "Long"
                              ? "bg-[#1B3522] text-[#A3FF6E]"
                              : "bg-[#3E1A23] text-[#FF6B7A]"
                          }`}
                        >
                          {trade.side}
                        </span>
                      </td>
                      <td className="py-3">{trade.type}</td>
                      <td className="py-3">
                        {trade.size} {baseSymbol}
                      </td>
                      <td className="py-3">${trade.price.toLocaleString()}</td>
                      <td className="py-3">{trade.time}</td>
                      <td className="py-3 text-right">
                        <span
                          className={
                            (trade.pnlUsd ?? 0) >= 0
                              ? "text-[#A3FF6E]"
                              : "text-[#FF6B7A]"
                          }
                        >
                          {(trade.pnlUsd ?? 0) >= 0 ? "+" : "-"}$
                          {Math.abs(trade.pnlUsd ?? 0).toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
