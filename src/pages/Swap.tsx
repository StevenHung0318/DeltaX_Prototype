import { useEffect, useMemo, useState, ReactNode } from 'react';
import { ArrowDownIcon, Info, Settings, Repeat, Wallet, ChevronDown } from 'lucide-react';
import { useProtocol } from '../context/ProtocolContext';

interface TokenOption {
  symbol: string;
  name: string;
  priceUsd: number;
}

const TOKENS: TokenOption[] = [
  { symbol: 'USDC', name: 'USD Coin', priceUsd: 1 },
  { symbol: 'BTC', name: 'Bitcoin', priceUsd: 65000 },
  { symbol: 'ETH', name: 'Ethereum', priceUsd: 3095 },
  { symbol: 'SUI', name: 'Sui', priceUsd: 1.4 }
];

type SwapMode = 'Swap' | 'Limit' | 'DCA';
type DcaInputMode = 'total' | 'perOrder';
const DCA_FREQUENCY_UNITS = ['Hour', 'Day', 'Week'] as const;
type DcaFrequencyUnit = typeof DCA_FREQUENCY_UNITS[number];
const DCA_FREQUENCY_TO_MS: Record<DcaFrequencyUnit, number> = {
  Hour: 60 * 60 * 1000,
  Day: 24 * 60 * 60 * 1000,
  Week: 7 * 24 * 60 * 60 * 1000
};

export const Swap = () => {
  const [mode, setMode] = useState<SwapMode>('Swap');
  const [aggregatorMode, setAggregatorMode] = useState(true);
  const [payToken, setPayToken] = useState<TokenOption>(TOKENS[0]);
  const [receiveToken, setReceiveToken] = useState<TokenOption>(TOKENS[1]);
  const [payAmount, setPayAmount] = useState('1000');
  const [receiveAmount, setReceiveAmount] = useState('0.32314712');
  const [slippage] = useState('0.1');
  const formatRateValue = (value: number) => (Number.isFinite(value) && value !== 0 ? value.toFixed(6) : '0');
  const [limitRate, setLimitRate] = useState(() => formatRateValue(TOKENS[0].priceUsd / TOKENS[1].priceUsd));
  const [limitExpiry, setLimitExpiry] = useState('7 Days');
  const [limitRateInPayToken, setLimitRateInPayToken] = useState(true);
  const [dcaInputMode, setDcaInputMode] = useState<DcaInputMode>('perOrder');
  const [dcaFrequencyValue, setDcaFrequencyValue] = useState('1');
  const [dcaFrequencyUnit, setDcaFrequencyUnit] = useState<DcaFrequencyUnit>('Hour');
  const [dcaOrders, setDcaOrders] = useState('2');
  const [dcaMinPrice, setDcaMinPrice] = useState('');
  const [dcaMaxPrice, setDcaMaxPrice] = useState('');
  const [selectedSupplyMarketId, setSelectedSupplyMarketId] = useState<string>('none');
  const [supplyDropdownOpen, setSupplyDropdownOpen] = useState(false);
  const [balances, setBalances] = useState<Record<string, number>>({
    USDC: 5000,
    BTC: 0.15,
    ETH: 1.5,
    SUI: 1500
  });
  const [openSelector, setOpenSelector] = useState<string | null>(null);

  const parseAmount = (value: string) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  };
  const { markets } = useProtocol();
  const formatTokenAmount = (value: number, symbol: string, decimals = 4) =>
    `${Number.isFinite(value) ? value.toFixed(decimals) : '0'} ${symbol}`;

  const conversionRate = useMemo(() => {
    return payToken.priceUsd / receiveToken.priceUsd;
  }, [payToken, receiveToken]);

  useEffect(() => {
    const amount = parseAmount(payAmount) * conversionRate;
    setReceiveAmount(amount ? amount.toFixed(8) : '0');
  }, [payAmount, conversionRate]);

  const price = useMemo(() => {
    return `${conversionRate.toFixed(7)} ${receiveToken.symbol}`;
  }, [conversionRate, receiveToken]);

  const payBalance = balances[payToken.symbol] ?? 0;
  const receiveBalance = balances[receiveToken.symbol] ?? 0;
  const mockLimitOrders = [
    {
      id: 'limit-1',
      fromToken: 'USDC',
      toToken: 'SUI',
      amountFrom: 6,
      amountTo: 3.75,
      price: '1.6 USDC per SUI',
      filled: '0/6 USDC (0%)',
      expiry: '2025-11-24 03:52:08 (UTC)'
    }
  ];

  const mockDcaOrders = [
    {
      id: 'dca-1',
      fromToken: 'USDC',
      toToken: 'SUI',
      priceRange: '1.3 – 1.35 USDC per SUI',
      filled: '0 USDC / 8 USDC (0%)',
      nextOrder: '2025-11-17 09:47'
    }
  ];

  const insufficientBalance = parseAmount(payAmount) > payBalance;

  const resetLimitRateToMarket = (
    nextPay: TokenOption,
    nextReceive: TokenOption,
    direction = limitRateInPayToken
  ) => {
    const marketRate = nextPay.priceUsd / nextReceive.priceUsd;
    const computed = direction ? marketRate : marketRate !== 0 ? 1 / marketRate : 0;
    setLimitRate(formatRateValue(computed));
  };

  const handlePayTokenChange = (token: TokenOption) => {
    setPayToken(token);
    resetLimitRateToMarket(token, receiveToken);
  };

  const handleReceiveTokenChange = (token: TokenOption) => {
    setReceiveToken(token);
    resetLimitRateToMarket(payToken, token);
  };

  const handleDcaModeChange = (nextMode: DcaInputMode) => {
    if (nextMode === dcaInputMode) return;
    const ordersCount = Math.max(1, Math.floor(parseAmount(dcaOrders)) || 1);
    const currentAmount = parseAmount(payAmount);
    if (nextMode === 'total') {
      setPayAmount((currentAmount * ordersCount).toString());
    } else {
      setPayAmount((currentAmount / ordersCount).toString());
    }
    setDcaInputMode(nextMode);
  };

  const handleFrequencyUnitCycle = () => {
    const index = DCA_FREQUENCY_UNITS.indexOf(dcaFrequencyUnit);
    const next = DCA_FREQUENCY_UNITS[(index + 1) % DCA_FREQUENCY_UNITS.length];
    setDcaFrequencyUnit(next);
  };

  const swapTokens = () => {
    setPayToken(receiveToken);
    setReceiveToken(payToken);
    setPayAmount(receiveAmount);
    setReceiveAmount(payAmount);
    resetLimitRateToMarket(receiveToken, payToken);
  };

  const handleFaucet = (symbol: string) => {
    const usdBoost = 2500;
    const token = TOKENS.find((t) => t.symbol === symbol);
    if (!token) return;
    const additional = usdBoost / token.priceUsd;
    setBalances((prev) => ({
      ...prev,
      [symbol]: (prev[symbol] ?? 0) + additional
    }));
  };

  const handleSwapExecute = () => {
    if (insufficientBalance) return;
    const payValue = parseAmount(payAmount);
    const receiveValue = parseAmount(receiveAmount);
    setBalances((prev) => ({
      ...prev,
      [payToken.symbol]: (prev[payToken.symbol] ?? 0) - payValue,
      [receiveToken.symbol]: (prev[receiveToken.symbol] ?? 0) + receiveValue
    }));
    setPayAmount('0');
  };

  const handleMarketRateClick = () => {
    resetLimitRateToMarket(payToken, receiveToken);
  };

  const handleToggleRateDirection = () => {
    const currentRate = parseAmount(limitRate);
    const nextDirection = !limitRateInPayToken;
    setLimitRateInPayToken(nextDirection);
    if (currentRate <= 0) {
      resetLimitRateToMarket(payToken, receiveToken, nextDirection);
      return;
    }
    setLimitRate(formatRateValue(1 / currentRate));
  };

  const handleCreateDcaOrder = (
    totalToInvest: number,
    perOrderInvestment: number,
    ordersCount: number
  ) => {
    if (totalToInvest <= 0 || ordersCount <= 0 || perOrderInvestment <= 0) return;
    setBalances((prev) => ({
      ...prev,
      [payToken.symbol]: (prev[payToken.symbol] ?? 0) - totalToInvest
    }));
  };

  const renderTokenSelector = (
    label: string,
    token: TokenOption,
    onChange: (token: TokenOption) => void,
    amount: string,
    setAmount: (value: string) => void,
    options?: {
      showBalanceActions?: boolean;
      balance?: number;
      readOnly?: boolean;
      onFaucet?: () => void;
      highlight?: boolean;
      selectorKey?: string;
      rightControl?: ReactNode;
      enableSupplySelection?: boolean;
    }
  ) => (
    <div
      className={`bg-[#0F1016] rounded-2xl p-6 border ${
        options?.highlight ? 'border-[#0052FF] shadow-[0_0_15px_rgba(0,82,255,0.35)]' : 'border-gray-800'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-gray-500">{label}</p>
          <p className="text-sm text-gray-400">
            ${(parseAmount(amount) * token.priceUsd).toFixed(2)}
          </p>
        </div>
        {(options?.rightControl || options?.balance !== undefined) && (
          <div className="flex flex-col items-end space-y-2">
            {options?.rightControl}
            {options?.balance !== undefined && (
              <div className="flex items-center space-x-2 text-xs text-gray-400">
                <span className="border border-gray-700 rounded-full px-2 py-0.5">
                  Balance: {options.balance.toFixed(4)}
                </span>
                {options?.showBalanceActions && (
                  <>
                    <button
                      onClick={() => setAmount(((options.balance ?? 0) / 2).toString())}
                      className="text-gray-300 border border-gray-700 rounded-full px-2 py-0.5"
                    >
                      HALF
                    </button>
                    <button
                      onClick={() => setAmount((options.balance ?? 0).toString())}
                      className="text-gray-300 border border-gray-700 rounded-full px-2 py-0.5"
                    >
                      MAX
                    </button>
                  </>
                )}
                {options?.onFaucet && (
                  <button
                    onClick={options.onFaucet}
                    className="text-[#00C2FF] border border-[#00C2FF]/40 rounded-full px-2 py-0.5"
                  >
                    Faucet
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between">
        <input
          type="number"
          value={amount}
          onChange={(e) => !options?.readOnly && setAmount(e.target.value)}
          readOnly={options?.readOnly}
          className={`bg-transparent text-4xl font-semibold text-white focus:outline-none w-full ${
            options?.readOnly ? 'cursor-default' : ''
          } ${options?.readOnly && !amount ? 'placeholder:text-gray-500' : ''}`}
          placeholder={options?.readOnly && !amount ? token.symbol : undefined}
        />
        <div className="relative">
          <button
            onClick={() =>
              setOpenSelector((prev) => (prev === options?.selectorKey ? null : options?.selectorKey ?? null))
            }
            className="flex items-center space-x-2 bg-[#1A1C27] px-3 py-2 rounded-full border border-gray-700 cursor-pointer"
          >
            <span className="text-base font-semibold text-white">{token.symbol}</span>
            <ChevronDown
              size={16}
              className={`text-gray-400 transition-transform ${
                openSelector === options?.selectorKey ? 'rotate-180' : ''
              }`}
            />
          </button>
          {openSelector === options?.selectorKey && (
            <div className="absolute right-0 mt-2 w-40 bg-[#151823] border border-gray-700 rounded-xl shadow-xl z-30">
              {TOKENS.map((option) => (
                <button
                  key={option.symbol}
                  onClick={() => {
                    onChange(option);
                    setOpenSelector(null);
                  }}
                  className={`flex w-full items-center justify-between px-4 py-2 text-sm ${
                    option.symbol === token.symbol ? 'text-[#00C2FF]' : 'text-gray-200 hover:text-white'
                  }`}
                >
                  <span>{option.symbol}</span>
                  <span className="text-xs text-gray-500">${option.priceUsd.toLocaleString()}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {options?.enableSupplySelection && token.symbol === 'USDC' && (
        <div className="mt-4 bg-[#141722] border border-gray-800 rounded-2xl px-4 py-3">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Supply To</span>
            {selectedSupplyOption.apr !== null && (
              <span className="text-[#00FFA3] font-semibold">APR {selectedSupplyOption.apr.toFixed(2)}%</span>
            )}
          </div>
          <div className="relative mt-2">
            <button
              onClick={() => setSupplyDropdownOpen((prev) => !prev)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-700 bg-[#1C1F2A] text-sm text-white"
            >
              <span>{selectedSupplyOption.label}</span>
              <ChevronDown
                size={16}
                className={`text-gray-400 transition-transform ${supplyDropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {supplyDropdownOpen && (
              <div className="absolute left-0 right-0 mt-2 max-h-64 overflow-y-auto rounded-xl border border-gray-700 bg-[#131827] shadow-xl z-30">
                {supplyOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      setSelectedSupplyMarketId(option.id);
                      setSupplyDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between ${
                      selectedSupplyMarketId === option.id
                        ? 'text-[#00C2FF]'
                        : 'text-gray-200 hover:text-white'
                    }`}
                  >
                    <span>{option.label}</span>
                    {option.apr !== null && (
                      <span className="text-xs text-gray-400">APR {option.apr.toFixed(2)}%</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const supplyOptions = useMemo(() => {
    const baseOptions = markets.map((market) => ({
      id: market.id,
      label: `${market.collateral_asset}/${market.loan_asset} Market`,
      apr: market.supply_apy ?? 0
    }));
    return [
      { id: 'none', label: "Don't Supply to any market", apr: null },
      ...baseOptions
    ];
  }, [markets]);

  const selectedSupplyOption = supplyOptions.find((option) => option.id === selectedSupplyMarketId) || supplyOptions[0];


  const limitExpiryOptions = ['1 Hour', '1 Day', '3 Days', '7 Days', '30 Days'];

  const cycleExpiry = () => {
    const index = limitExpiryOptions.findIndex((option) => option === limitExpiry);
    const next = limitExpiryOptions[(index + 1) % limitExpiryOptions.length];
    setLimitExpiry(next);
  };

  const renderSwapControls = () => (
    <>
      <div className="space-y-4">
        {renderTokenSelector('You Pay', payToken, handlePayTokenChange, payAmount, setPayAmount, {
          showBalanceActions: true,
          balance: payBalance,
          onFaucet: () => handleFaucet(payToken.symbol),
          selectorKey: 'swap-pay'
        })}

        <div className="flex justify-center">
          <button
            onClick={swapTokens}
            className="w-12 h-12 rounded-full bg-[#0F1016] border border-gray-800 flex items-center justify-center text-gray-300 hover:text-white"
          >
            <ArrowDownIcon />
          </button>
        </div>

        {renderTokenSelector('You Receive', receiveToken, handleReceiveTokenChange, receiveAmount, setReceiveAmount, {
          balance: receiveBalance,
          readOnly: true,
          selectorKey: 'swap-receive'
        })}
      </div>

      <div className="bg-[#0F1016] rounded-2xl border border-gray-800 p-4 space-y-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2 text-gray-400">
            <span>1 {payToken.symbol} ≈ {price}</span>
            <Info size={14} />
          </div>
          <div className="text-green-400 text-xs">Within 0.01%</div>
        </div>

        <div className="flex justify-between text-sm text-gray-400">
          <span>Price Difference</span>
          <span>0.00%</span>
        </div>
        <div className="flex justify-between text-sm text-gray-400">
          <span>Minimum Received</span>
          <span>
            {(parseAmount(receiveAmount) * (1 - parseFloat(slippage) / 100)).toFixed(8)} {receiveToken.symbol}
          </span>
        </div>
        <div className="flex justify-between text-sm text-gray-400">
          <span>Auto Router</span>
          <span className="flex items-center space-x-1 text-white">
            <Wallet size={14} />
            <span>0xRoute</span>
          </span>
        </div>
      </div>

      <button
        className="w-full py-4 rounded-2xl bg-[#0052FF] text-white font-semibold text-lg hover:bg-[#0046DD] transition-colors disabled:bg-gray-700"
        disabled={insufficientBalance}
        onClick={handleSwapExecute}
      >
        {insufficientBalance ? `Add ${payToken.symbol} to Swap` : 'Confirm Swap'}
      </button>
    </>
  );

  const renderLimitControls = () => {
    const parsedAmount = parseAmount(payAmount);
    const buttonDisabled = parsedAmount <= 0 || insufficientBalance;

    return (
      <>
        <div className="space-y-4">
          {renderTokenSelector('You Pay', payToken, handlePayTokenChange, payAmount, setPayAmount, {
            showBalanceActions: true,
            balance: payBalance,
            onFaucet: () => handleFaucet(payToken.symbol),
            highlight: true,
            selectorKey: 'limit-pay',
            enableSupplySelection: true
          })}

          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-full bg-[#0F1016] border border-[#0052FF] flex items-center justify-center text-gray-300">
              <ArrowDownIcon />
            </div>
          </div>

          {renderTokenSelector('You Receive', receiveToken, handleReceiveTokenChange, receiveAmount, setReceiveAmount, {
            balance: receiveBalance,
            readOnly: true,
            highlight: true,
            selectorKey: 'limit-receive'
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#0F1016] rounded-2xl border border-gray-800 p-5">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Buy {receiveToken.symbol} at rate</span>
              <button
                onClick={handleMarketRateClick}
                className="px-3 py-1 rounded-full border border-gray-700 text-gray-300 text-xs"
              >
                Market
              </button>
            </div>
            <div className="flex items-center justify-between mt-4">
              <input
                type="number"
                value={limitRate}
                onChange={(e) => setLimitRate(e.target.value)}
                className="bg-transparent text-3xl font-semibold text-white focus:outline-none w-full"
              />
              <button
                onClick={handleToggleRateDirection}
                className="flex items-center space-x-2 text-gray-400 text-sm pl-4 hover:text-white transition-colors"
              >
                <span>{limitRateInPayToken ? payToken.symbol : receiveToken.symbol}</span>
                <Repeat
                  size={16}
                  className={`transition-transform ${limitRateInPayToken ? '' : 'rotate-180'}`}
                />
              </button>
            </div>
          </div>

          <div className="bg-[#0F1016] rounded-2xl border border-gray-800 p-5">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Expires in</span>
              <Info size={14} />
            </div>
            <button
              onClick={cycleExpiry}
              className="mt-4 w-full flex items-center justify-between px-4 py-3 bg-[#131520] rounded-2xl text-white text-lg border border-gray-700"
            >
              <span>{limitExpiry}</span>
              <ChevronDown size={18} className="text-gray-400" />
            </button>
          </div>
        </div>

        <button
          className={`w-full py-4 rounded-2xl text-white font-semibold text-lg transition-colors ${
            buttonDisabled ? 'bg-gray-700' : 'bg-[#0052FF] hover:bg-[#0046DD]'
          }`}
          disabled={buttonDisabled}
        >
          {parsedAmount <= 0 ? 'Enter an amount' : 'Place Limit Order'}
        </button>

        <div className="bg-[#0F1016] rounded-3xl border border-gray-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">Limit Orders</h3>
            <span className="text-xs text-gray-500">Open Orders</span>
          </div>
          <div className="grid grid-cols-12 text-xs text-gray-500 uppercase tracking-wider">
            <span className="col-span-3">Order Info</span>
            <span className="col-span-3">Price</span>
            <span className="col-span-2">Filled Size</span>
            <span className="col-span-2">Expiry</span>
            <span className="col-span-2">Actions</span>
          </div>
          <div className="space-y-3">
            {mockLimitOrders.map((order) => (
              <div key={order.id} className="grid grid-cols-12 items-center bg-[#0A0D16] rounded-2xl border border-gray-800 px-4 py-3 text-sm">
                <div className="col-span-3 text-white">
                  <div className="flex items-center space-x-2">
                    <span>{order.amountFrom} {order.fromToken} →</span>
                  </div>
                  <div className="text-gray-400 text-xs">{order.amountTo} {order.toToken}</div>
                </div>
                <div className="col-span-3 text-gray-300">{order.price}</div>
                <div className="col-span-2 text-gray-300">{order.filled}</div>
                <div className="col-span-2 text-gray-300">{order.expiry}</div>
                <div className="col-span-2 flex items-center space-x-2">
                  <button className="px-3 py-1.5 rounded-full bg-[#1A2233] text-gray-300 text-xs">Claim</button>
                  <button className="px-3 py-1.5 rounded-full border border-gray-700 text-gray-300 text-xs">Cancel</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  };

  const renderDcaControls = () => {
    const rawOrders = Math.floor(parseAmount(dcaOrders));
    const ordersCount = Math.max(0, rawOrders);
    const frequencyValue = parseAmount(dcaFrequencyValue);
    const basePayValue = parseAmount(payAmount);
    const perOrderInvestment =
      dcaInputMode === 'perOrder' ? basePayValue : ordersCount > 0 ? basePayValue / ordersCount : 0;
    const totalInvestment = dcaInputMode === 'perOrder' ? basePayValue * ordersCount : basePayValue;
    const perOrderReceive = perOrderInvestment * conversionRate;
    const totalReceive = perOrderReceive * ordersCount;
    const dcaInsufficient = totalInvestment > payBalance;
    const hasSchedule = frequencyValue > 0 && ordersCount > 0;
    const hasAmount = totalInvestment > 0;
    const dcaButtonDisabled = dcaInsufficient || !hasSchedule || !hasAmount;
    const estimatedEnd = hasSchedule
      ? new Date(Date.now() + DCA_FREQUENCY_TO_MS[dcaFrequencyUnit] * frequencyValue * Math.max(ordersCount - 1, 0))
      : null;
    const estimatedEndText = estimatedEnd ? estimatedEnd.toUTCString() : '--';
    const dcaCurrentRate = receiveToken.priceUsd / payToken.priceUsd;

    const dcaToggle = (
      <div className="flex bg-[#141722] border border-gray-700 rounded-full text-xs overflow-hidden">
        {(['total', 'perOrder'] as DcaInputMode[]).map((modeKey) => (
          <button
            key={modeKey}
            onClick={() => handleDcaModeChange(modeKey)}
            className={`px-3 py-1 ${
              dcaInputMode === modeKey ? 'text-white bg-[#1F2333]' : 'text-gray-400'
            }`}
          >
            {modeKey === 'total' ? 'Total' : 'Per Order'}
          </button>
        ))}
      </div>
    );

    return (
      <>
        <div className="space-y-4">
          {renderTokenSelector('You Pay', payToken, handlePayTokenChange, payAmount, setPayAmount, {
            showBalanceActions: true,
            balance: payBalance,
            onFaucet: () => handleFaucet(payToken.symbol),
            highlight: true,
            selectorKey: 'dca-pay',
            rightControl: dcaToggle,
            enableSupplySelection: true
          })}

          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-full bg-[#0F1016] border border-[#0052FF] flex items-center justify-center text-gray-300">
              <ArrowDownIcon />
            </div>
          </div>

          {renderTokenSelector('You Receive', receiveToken, handleReceiveTokenChange, '', () => {}, {
            balance: receiveBalance,
            readOnly: true,
            highlight: true,
            selectorKey: 'dca-receive'
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#0F1016] rounded-2xl border border-gray-800 p-5">
            <p className="text-xs uppercase tracking-widest text-gray-400">Invest Every</p>
            <div className="flex items-center mt-4">
              <input
                type="number"
                min="0"
                value={dcaFrequencyValue}
                onChange={(e) => setDcaFrequencyValue(e.target.value)}
                className="bg-transparent text-3xl font-semibold text-white focus:outline-none w-24"
              />
              <button
                onClick={handleFrequencyUnitCycle}
                className="ml-4 flex items-center space-x-2 px-4 py-2 rounded-2xl bg-[#141722] border border-gray-700 text-white"
              >
                <span>{dcaFrequencyUnit}</span>
                <ChevronDown size={16} className="text-gray-400" />
              </button>
            </div>
          </div>
          <div className="bg-[#0F1016] rounded-2xl border border-gray-800 p-5">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Over</span>
              <Info size={14} />
            </div>
            <div className="flex items-center mt-4">
              <input
                type="number"
                min="0"
                value={dcaOrders}
                onChange={(e) => setDcaOrders(e.target.value)}
                className="bg-transparent text-3xl font-semibold text-white focus:outline-none w-24"
              />
              <span className="ml-4 text-gray-400">Orders</span>
            </div>
          </div>
        </div>

        <div className="bg-[#0F1016] rounded-2xl border border-gray-800 p-6 space-y-6">
          <div>
            <p className="text-sm text-white mb-1">Set Price Range</p>
            <p className="text-xs text-gray-400">
              DCA will only execute if the price falls within your pricing strategy.
            </p>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>Current Rate</span>
            <div className="flex items-center space-x-2 text-white">
              <span>
                1 {receiveToken.symbol} ≈ {dcaCurrentRate.toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
                {payToken.symbol}
              </span>
              <Repeat size={16} className="text-gray-400" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col rounded-2xl border border-gray-800 p-4">
              <span className="text-xs text-gray-500 mb-2">Min Price</span>
              <input
                type="number"
                value={dcaMinPrice}
                onChange={(e) => setDcaMinPrice(e.target.value)}
                placeholder={`${payToken.symbol} per ${receiveToken.symbol}`}
                className="bg-transparent text-2xl text-white focus:outline-none"
              />
            </div>
            <div className="flex flex-col rounded-2xl border border-gray-800 p-4">
              <span className="text-xs text-gray-500 mb-2">Max Price</span>
              <input
                type="number"
                value={dcaMaxPrice}
                onChange={(e) => setDcaMaxPrice(e.target.value)}
                placeholder={`${payToken.symbol} per ${receiveToken.symbol}`}
                className="bg-transparent text-2xl text-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        <button
          className={`w-full py-4 rounded-2xl font-semibold text-lg transition-colors ${
            dcaButtonDisabled ? 'bg-gray-700 text-gray-400' : 'bg-[#0052FF] text-white hover:bg-[#0046DD]'
          }`}
          disabled={dcaButtonDisabled}
          onClick={() => handleCreateDcaOrder(totalInvestment, perOrderInvestment, ordersCount)}
        >
          {dcaInsufficient ? `Insufficient ${payToken.symbol}` : 'Create DCA Order'}
        </button>

        <div className="bg-[#0F1016] rounded-2xl border border-gray-800 p-6 space-y-4">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>Details</span>
            <span>Your first invest cycle will begin immediately</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Sell total</span>
              <span className="text-white">{formatTokenAmount(totalInvestment, payToken.symbol)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Sell per order</span>
              <span className="text-white">{formatTokenAmount(perOrderInvestment, payToken.symbol)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Receive</span>
              <span className="text-white">
                {totalReceive > 0
                  ? formatTokenAmount(totalReceive, receiveToken.symbol)
                  : receiveToken.symbol}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Invest every</span>
              <span className="text-white">
                {dcaFrequencyValue} {dcaFrequencyUnit}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Est. end date (UTC)</span>
              <span className="text-white text-right">{estimatedEndText}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Platform fee</span>
              <span className="text-white">0%</span>
            </div>
          </div>
        </div>

        <div className="bg-[#0F1016] rounded-3xl border border-gray-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">DCA Orders</h3>
            <span className="text-xs text-gray-500">Active DCAs</span>
          </div>
          <div className="grid grid-cols-12 text-xs text-gray-500 uppercase tracking-wider">
            <span className="col-span-3">Orders</span>
            <span className="col-span-3">Price Range</span>
            <span className="col-span-2">Filled Size</span>
            <span className="col-span-2">Next Order (UTC)</span>
            <span className="col-span-2">Actions</span>
          </div>
          <div className="space-y-3">
            {mockDcaOrders.map((order) => (
              <div key={order.id} className="grid grid-cols-12 items-center bg-[#0A0D16] rounded-2xl border border-gray-800 px-4 py-3 text-sm">
                <div className="col-span-3 text-white">
                  <div className="flex items-center space-x-2">
                    <span>{order.fromToken} → {order.toToken}</span>
                  </div>
                </div>
                <div className="col-span-3 text-gray-300">{order.priceRange}</div>
                <div className="col-span-2 text-gray-300">{order.filled}</div>
                <div className="col-span-2 text-gray-300">{order.nextOrder}</div>
                <div className="col-span-2 flex items-center space-x-2">
                  <button className="px-3 py-1.5 rounded-full bg-[#1A2233] text-gray-300 text-xs">Claim</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex space-x-4">
          {(['Swap', 'Limit', 'DCA'] as SwapMode[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setMode(tab)}
              className={`pb-1 text-lg font-medium ${
                mode === tab ? 'text-white border-b-2 border-[#0052FF]' : 'text-gray-500'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="flex items-center space-x-3">
          {mode === 'Swap' && (
            <div className="flex items-center space-x-2 bg-[#0F1016] border border-gray-800 rounded-full px-3 py-1.5">
              <span className="text-xs text-gray-400">Aggregator Mode</span>
              <button
                onClick={() => setAggregatorMode((prev) => !prev)}
                className={`w-12 h-6 rounded-full p-1 transition-colors ${
                  aggregatorMode ? 'bg-[#0052FF]' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`block w-4 h-4 bg-white rounded-full transform transition-transform ${
                    aggregatorMode ? 'translate-x-6' : ''
                  }`}
                />
              </button>
              <button className="text-gray-500 hover:text-white">
                <Repeat size={16} />
              </button>
            </div>
          )}
          <div className="flex items-center space-x-2">
            <button className="px-3 py-1.5 text-xs text-gray-300 border border-gray-800 rounded-full">Merge</button>
            <button className="px-3 py-1.5 text-xs text-gray-300 border border-gray-800 rounded-full">Lite</button>
            <button className="px-3 py-1.5 text-xs text-gray-300 border border-gray-800 rounded-full">{slippage}%</button>
            <button className="p-2 border border-gray-800 rounded-full text-gray-400 hover:text-white">
              <Settings size={16} />
            </button>
          </div>
        </div>
      </div>

      {mode === 'Swap' && renderSwapControls()}
      {mode === 'Limit' && renderLimitControls()}
      {mode === 'DCA' && renderDcaControls()}
    </div>
  );
};
