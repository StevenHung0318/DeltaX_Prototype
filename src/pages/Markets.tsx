import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  TrendingUp,
  AlertTriangle,
  Search,
  Filter,
} from "lucide-react";
import { useProtocol } from "../context/ProtocolContext";
import type { Market } from "../lib/supabase";
import {
  formatUSD,
  formatFullUSD,
  formatPercent,
  calculateHealthFactor,
  calculateLiquidationPrice,
  calculateProjectedEarnings,
} from "../utils/format";

const CRYPTO_TICKERS = new Set(["ETH", "SUI", "BTC"]);
const TOKEN_LOGOS: Record<string, string> = {
  USDC: "https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png",
};

const clampValue = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const createSparklinePoints = (data: number[], width = 100, height = 40) => {
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

const MarketLogo: React.FC<{
  ticker: string;
  name?: string;
  logo?: string;
  size?: "sm" | "md";
}> = ({ ticker, name, logo, size = "md" }) => {
  const [failed, setFailed] = useState(false);
  const dimension = size === "sm" ? "h-8 w-8" : "h-12 w-12";
  const textSize = size === "sm" ? "text-xs" : "text-sm";
  const resolvedLogo = failed
    ? undefined
    : logo || TOKEN_LOGOS[ticker.toUpperCase()];

  if (!resolvedLogo) {
    return (
      <div
        className={`${dimension} rounded-full bg-[#1F2330] flex items-center justify-center`}
      >
        <span className={`font-semibold uppercase text-white ${textSize}`}>
          {ticker.slice(0, 2)}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`${dimension} rounded-full bg-[#1F2330] flex items-center justify-center overflow-hidden`}
    >
      <img
        src={resolvedLogo}
        alt={name ? `${name} logo` : `${ticker} logo`}
        className="h-full w-full object-contain"
        onError={() => setFailed(true)}
      />
    </div>
  );
};

interface MarketsProps {
  selectedMarketId: string | null;
  onSelectMarket: (marketId: string | null) => void;
}

type InteractionTab = "borrow" | "repay";

export const Markets: React.FC<MarketsProps> = ({
  selectedMarketId,
  onSelectMarket,
}) => {
  const {
    markets,
    vaults,
    userMarketPositions,
    userVaultPositions,
    connectedAddress,
    borrow,
    repay,
    withdrawCollateral,
    supplyToVault,
    withdrawFromVault,
  } = useProtocol();
  const [collateralAmount, setCollateralAmount] = useState("");
  const [borrowAmount, setBorrowAmount] = useState("");
  const [repayAmount, setRepayAmount] = useState("");
  const [withdrawColAmount, setWithdrawColAmount] = useState("");
  const [activeTab, setActiveTab] = useState<InteractionTab>("borrow");
  const [viewTab, setViewTab] = useState<"supply" | "borrow">("borrow");
  const [supplyActionTab, setSupplyActionTab] = useState<"supply" | "withdraw">(
    "supply"
  );
  const [vaultSupplyAmount, setVaultSupplyAmount] = useState("");
  const [vaultWithdrawAmount, setVaultWithdrawAmount] = useState("");
  const [transactionModal, setTransactionModal] = useState<{
    open: boolean;
    title: string;
    description: string;
  }>({
    open: false,
    title: "",
    description: "",
  });

  useEffect(() => {
    let timeoutId: number | undefined;
    if (transactionModal.open) {
      timeoutId = window.setTimeout(() => {
        setTransactionModal((prev) => ({
          ...prev,
          open: false,
        }));
      }, 2000);
    }
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [transactionModal.open]);

  const closeTransactionModal = () => {
    setTransactionModal((prev) => ({
      ...prev,
      open: false,
    }));
  };

  const showTransactionModal = (title: string, description: string) => {
    setTransactionModal({
      open: true,
      title,
      description,
    });
  };

  const transactionToast = transactionModal.open ? (
    <div className="fixed top-6 right-6 z-50">
      <div className="bg-[#161921] border border-gray-700 rounded-lg shadow-lg px-5 py-4 space-y-2 w-72">
        <div className="flex items-start justify-between">
          <h3 className="text-sm font-semibold text-white">
            {transactionModal.title}
          </h3>
          <button
            onClick={closeTransactionModal}
            className="text-gray-500 hover:text-white transition-colors text-xs"
            aria-label="Close notification"
          >
            ✕
          </button>
        </div>
        <p className="text-xs text-gray-400 text-left leading-relaxed">
          {transactionModal.description}
        </p>
      </div>
    </div>
  ) : null;

  const selectedMarket = selectedMarketId
    ? markets.find((m) => m.id === selectedMarketId) || null
    : null;
  const userPosition = selectedMarketId
    ? userMarketPositions.find((p) => p.market_id === selectedMarketId)
    : null;
  const primaryVault = vaults[0] ?? null;
  const userVaultPosition = primaryVault
    ? userVaultPositions.find(
        (position) => position.vault_id === primaryVault.id
      )
    : null;
  const fallbackSupplyAssets = 1250;
  const displaySupplyAssets = userVaultPosition?.assets ?? fallbackSupplyAssets;

  const borrowedLiquidity = primaryVault
    ? Math.max(
        primaryVault.total_deposits - primaryVault.available_liquidity,
        0
      )
    : 0;
  const vaultUtilization =
    primaryVault && primaryVault.total_deposits > 0
      ? (borrowedLiquidity / primaryVault.total_deposits) * 100
      : 0;
  const utilizationBarWidth = Math.min(Math.max(vaultUtilization, 0), 100);
  const userSupplyShare =
    primaryVault && primaryVault.total_deposits > 0
      ? (displaySupplyAssets / primaryVault.total_deposits) * 100
      : 0;
  const projectedSupplyEarnings =
    primaryVault && displaySupplyAssets
      ? calculateProjectedEarnings(displaySupplyAssets, primaryVault.apy)
      : null;

  const mockEthBalance = 5.25;
  const mockUsdcBalance = 10000;
  const vaultApy = primaryVault?.apy ?? 0;
  const currentDeposit = userVaultPosition?.assets ?? 0;
  const supplyInputAmount =
    supplyActionTab === "supply" ? Number(vaultSupplyAmount || 0) : 0;
  const withdrawInputAmount =
    supplyActionTab === "withdraw" ? Number(vaultWithdrawAmount || 0) : 0;
  const simulatedDeposit =
    supplyActionTab === "withdraw"
      ? Math.max(
          0,
          currentDeposit -
            (isNaN(withdrawInputAmount) ? 0 : withdrawInputAmount)
        )
      : currentDeposit + (isNaN(supplyInputAmount) ? 0 : supplyInputAmount);
  const poolTotalCurrent = primaryVault?.total_deposits ?? currentDeposit;
  const poolTotalAfterSimulation = primaryVault
    ? poolTotalCurrent - currentDeposit + simulatedDeposit
    : simulatedDeposit;
  const currentSupplyApyValue = vaultApy;
  const projectedSupplyApyValue =
    poolTotalAfterSimulation > 0 && poolTotalCurrent > 0
      ? clampValue(
          vaultApy * (poolTotalCurrent / poolTotalAfterSimulation),
          vaultApy * 0.5,
          vaultApy * 1.5
        )
      : vaultApy;
  const currentSupplyYieldEstimate = calculateProjectedEarnings(
    currentDeposit,
    currentSupplyApyValue
  );
  const simulatedSupplyYieldEstimate = calculateProjectedEarnings(
    simulatedDeposit,
    projectedSupplyApyValue
  );
  const supplyAmountValue = parseFloat(vaultSupplyAmount || "0");
  const supplyAmountError =
    supplyActionTab === "supply" && vaultSupplyAmount
      ? supplyAmountValue <= 0
        ? "Enter an amount greater than 0"
        : supplyAmountValue > mockUsdcBalance
        ? `Exceeds wallet balance (${formatUSD(mockUsdcBalance).replace(
            "$",
            ""
          )} USDC)`
        : undefined
      : undefined;
  const withdrawVaultAmountValue = parseFloat(vaultWithdrawAmount || "0");
  const withdrawVaultError =
    supplyActionTab === "withdraw" && vaultWithdrawAmount
      ? withdrawVaultAmountValue <= 0
        ? "Enter an amount greater than 0"
        : userVaultPosition
        ? withdrawVaultAmountValue > userVaultPosition.assets
          ? `Exceeds available balance (${formatUSD(
              userVaultPosition.assets
            ).replace("$", "")} USDC)`
          : undefined
        : "No supply balance available"
      : undefined;

  const formatDateLabel = (value?: string) =>
    value
      ? new Date(value).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "--";

  const formatTxLabel = (value?: string | null) => {
    if (!value) return "--";
    return value.length > 12
      ? `${value.slice(0, 6)}…${value.slice(-4)}`
      : value;
  };

  const supplyActivity = userVaultPosition
    ? [
        {
          date: "2025/11/01",
          action: "Supply",
          amount: "100 USDC",
          tx: "0x2314",
        },
        {
          date: "2025/11/02",
          action: "Withdraw",
          amount: "50 USDC",
          tx: "0x1324",
        },
      ]
    : [
        {
          date: "2025/11/01",
          action: "Supply",
          amount: "100 USDC",
          tx: "0x2314",
        },
        {
          date: "2025/11/02",
          action: "Withdraw",
          amount: "50 USDC",
          tx: "0x1324",
        },
      ];

  const getSupplyApyForMarket = (market: Market) => {
    if (typeof market.supply_apy === "number") {
      return market.supply_apy;
    }
    return primaryVault?.apy ?? 0;
  };

  const handleMarketSelect = (marketId: string) => {
    setViewTab("borrow");
    onSelectMarket(marketId);
  };

  const handleMarketSelectKey = (
    event: React.KeyboardEvent<HTMLDivElement>,
    marketId: string
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleMarketSelect(marketId);
    }
  };

  const handleMarketAction = (
    marketId: string,
    tab: "supply" | "borrow",
    event?: React.MouseEvent
  ) => {
    if (event) {
      event.stopPropagation();
    }
    setViewTab(tab);
    onSelectMarket(marketId);
  };

  const marketPageDescription =
    "Browse markets to supply liquidity or borrow against collateral.";

  const collateralValue = userPosition
    ? userPosition.collateral * (selectedMarket?.collateral_price || 0)
    : 0;
  const currentBorrowed = userPosition ? userPosition.borrow_assets : 0;
  const currentLtv =
    collateralValue > 0 ? (currentBorrowed / collateralValue) * 100 : 0;

  const maxBorrow = selectedMarket
    ? (collateralValue +
        parseFloat(collateralAmount || "0") *
          (selectedMarket.collateral_price || 0)) *
      (selectedMarket.lltv / 100)
    : 0;
  const availableToBorrow = maxBorrow - currentBorrowed;

  const projectedCollateralValue =
    (userPosition?.collateral || 0) * (selectedMarket?.collateral_price || 0) +
    parseFloat(collateralAmount || "0") *
      (selectedMarket?.collateral_price || 0);
  const projectedBorrowed = currentBorrowed + parseFloat(borrowAmount || "0");
  const healthFactor = selectedMarket
    ? calculateHealthFactor(
        projectedCollateralValue,
        projectedBorrowed,
        selectedMarket.lltv
      )
    : Infinity;

  const liquidationPrice =
    selectedMarket && userPosition
      ? calculateLiquidationPrice(
          userPosition.collateral + parseFloat(collateralAmount || "0"),
          projectedBorrowed,
          selectedMarket.lltv
        )
      : 0;

  const fallbackBorrowPosition = selectedMarket
    ? (() => {
        const price = selectedMarket.collateral_price || 0;
        if (price <= 0) {
          return { collateral: 0, borrow_assets: 0 };
        }
        const targetCollateralUsd = 8000;
        const collateralAmount = parseFloat(
          (targetCollateralUsd / price).toFixed(4)
        );
        const maxBorrowAtLltv =
          targetCollateralUsd * (selectedMarket.lltv / 100);
        const borrowAssets = parseFloat((maxBorrowAtLltv * 0.8).toFixed(2));
        return {
          collateral: collateralAmount,
          borrow_assets: borrowAssets,
        };
      })()
    : null;

  const displayCollateralAmount = selectedMarket
    ? userPosition?.collateral ?? fallbackBorrowPosition?.collateral ?? 0
    : 0;
  const displayBorrowAmount = selectedMarket
    ? userPosition?.borrow_assets ?? fallbackBorrowPosition?.borrow_assets ?? 0
    : 0;
  const displayCollateralValue =
    displayCollateralAmount * (selectedMarket?.collateral_price || 0);
  const displayLtv =
    displayCollateralValue > 0
      ? (displayBorrowAmount / displayCollateralValue) * 100
      : 0;
  const displayLiquidationPrice = selectedMarket
    ? calculateLiquidationPrice(
        displayCollateralAmount,
        displayBorrowAmount,
        selectedMarket.lltv
      )
    : 0;
  const currentHealthFactor = selectedMarket
    ? calculateHealthFactor(
        displayCollateralValue,
        displayBorrowAmount,
        selectedMarket.lltv
      )
    : Infinity;
  const borrowActivity = selectedMarket
    ? [
        {
          date: "2025/11/03",
          action: "Deposit (Collateral)",
          amount: `${Math.max(displayCollateralAmount, 15).toFixed(2)} ${
            selectedMarket.collateral_asset
          }`,
          tx: "0xa91b",
        },
        {
          date: "2025/11/04",
          action: "Borrow (Loan)",
          amount: `${formatUSD(Math.max(displayBorrowAmount, 800)).replace(
            "$",
            ""
          )} ${selectedMarket.loan_asset}`,
          tx: "0xb42c",
        },
        {
          date: "2025/11/05",
          action: "Withdraw (Collateral)",
          amount: `${Math.max(displayCollateralAmount * 0.2, 3).toFixed(2)} ${
            selectedMarket.collateral_asset
          }`,
          tx: "0xc53d",
        },
        {
          date: "2025/11/06",
          action: "Repay (Loan)",
          amount: `${formatUSD(
            Math.max(displayBorrowAmount * 0.3, 250)
          ).replace("$", "")} ${selectedMarket.loan_asset}`,
          tx: "0xd64e",
        },
      ]
    : [];

  const targetUtilization = 90;
  const liquidationPenalty = 4.38;
  const formatUSDCAmount = (value: number) =>
    `${formatUSD(value).replace("$", "")} USDC`;

  const handleBorrow = async () => {
    if (!selectedMarketId || !connectedAddress) return;
    const colAmount = parseFloat(collateralAmount) || 0;
    const borAmount = parseFloat(borrowAmount) || 0;

    if (colAmount <= 0 || borAmount <= 0) return;
    if (colAmount > mockEthBalance) return;
    if (borAmount > availableToBorrow) return;

    await borrow(selectedMarketId, colAmount, borAmount);
    setCollateralAmount("");
    setBorrowAmount("");
    if (selectedMarket) {
      showTransactionModal(
        "Transaction sent",
        `Supplied ${colAmount.toFixed(2)} ${
          selectedMarket.collateral_asset
        } and borrowed ${borAmount.toFixed(2)} ${
          selectedMarket.loan_asset
        } in the ${
          selectedMarket.display_name ??
          `${selectedMarket.collateral_asset} Market`
        }.`
      );
    }
  };

  const handleRepay = async () => {
    if (!selectedMarketId || !repayAmount || !userPosition) return;
    const amount = parseFloat(repayAmount);
    if (
      amount <= 0 ||
      amount > userPosition.borrow_assets ||
      amount > mockUsdcBalance
    )
      return;

    await repay(selectedMarketId, amount);
    setRepayAmount("");
    if (selectedMarket) {
      showTransactionModal(
        "Transaction sent",
        `Repaid ${amount.toFixed(2)} ${selectedMarket.loan_asset} in the ${
          selectedMarket.display_name ??
          `${selectedMarket.collateral_asset} Market`
        }.`
      );
    }
  };

  const handleWithdrawCollateral = async () => {
    if (!selectedMarketId || !withdrawColAmount || !userPosition) return;
    const amount = parseFloat(withdrawColAmount);
    if (amount <= 0 || amount > userPosition.collateral) return;

    await withdrawCollateral(selectedMarketId, amount);
    setWithdrawColAmount("");
    if (selectedMarket) {
      showTransactionModal(
        "Transaction sent",
        `Withdrew ${amount.toFixed(2)} ${
          selectedMarket.collateral_asset
        } from the ${
          selectedMarket.display_name ??
          `${selectedMarket.collateral_asset} Market`
        }.`
      );
    }
  };

  const handleRepayAndWithdrawAction = async () => {
    if (!selectedMarketId || !connectedAddress) return;

    const repayValue = parseFloat(repayAmount || "0");
    const withdrawValue = parseFloat(withdrawColAmount || "0");

    const canRepay =
      !!userPosition &&
      repayValue > 0 &&
      repayValue <= userPosition.borrow_assets &&
      repayValue <= mockUsdcBalance;
    const canWithdraw =
      !!userPosition &&
      withdrawValue > 0 &&
      withdrawValue <= userPosition.collateral;

    if (canRepay) {
      await handleRepay();
    }
    if (canWithdraw) {
      await handleWithdrawCollateral();
    }
  };

  const handleVaultSupply = async () => {
    if (!primaryVault || !connectedAddress || !vaultSupplyAmount) return;
    const amount = parseFloat(vaultSupplyAmount);
    if (amount <= 0 || amount > mockUsdcBalance) return;

    await supplyToVault(primaryVault.id, amount);
    setVaultSupplyAmount("");
    const marketName = selectedMarket
      ? selectedMarket.display_name ??
        `${selectedMarket.collateral_asset} Market`
      : primaryVault.name;
    showTransactionModal(
      "Transaction sent",
      `Supplied ${formatUSD(amount).replace("$", "")} ${
        primaryVault.asset
      } to the ${marketName}.`
    );
  };

  const [marketSearch, setMarketSearch] = useState("");
  const [marketCategory, setMarketCategory] = useState<
    "all" | "crypto" | "stocks"
  >("all");
  const [hoveredLiquidity, setHoveredLiquidity] = useState<{
    index: number;
    x: number;
    y: number;
  } | null>(null);

  const normalizedSearch = marketSearch.trim().toLowerCase();
  const filteredMarkets = markets.filter((market) => {
    const matchesCategory =
      marketCategory === "all"
        ? true
        : marketCategory === "crypto"
        ? CRYPTO_TICKERS.has(market.collateral_asset.toUpperCase())
        : !CRYPTO_TICKERS.has(market.collateral_asset.toUpperCase());

    if (!matchesCategory) return false;

    if (!normalizedSearch) return true;
    const symbolMatch = market.collateral_asset
      .toLowerCase()
      .includes(normalizedSearch);
    const nameMatch =
      market.display_name?.toLowerCase().includes(normalizedSearch) ?? false;
    const loanMatch = market.loan_asset
      .toLowerCase()
      .includes(normalizedSearch);
    return symbolMatch || nameMatch || loanMatch;
  });

  const totalMarketSize = markets.reduce(
    (acc, market) => acc + (market.total_size || 0),
    0
  );
  const totalBorrowed = markets.reduce(
    (acc, market) => acc + (market.total_borrowed || 0),
    0
  );
  const totalAvailableLiquidity = Math.max(totalMarketSize - totalBorrowed, 0);
  const avgSupplyApr = markets.length
    ? markets.reduce((acc, market) => acc + getSupplyApyForMarket(market), 0) /
      markets.length
    : 0;
  const avgBorrowApr = markets.length
    ? markets.reduce((acc, market) => acc + (market.borrow_apy || 0), 0) /
      markets.length
    : 0;
  const displayTotalValueLocked =
    totalMarketSize > 0
      ? totalMarketSize *
        (0.62 + Math.sin(totalMarketSize * 0.00000003) * 0.05)
      : 32_000_000;
  const displayAvailableLiquidity =
    totalAvailableLiquidity > 0
      ? totalAvailableLiquidity *
          (0.58 + Math.cos(totalAvailableLiquidity * 0.00000004) * 0.07)
      : 18_000_000;

  const barReference = filteredMarkets.length ? filteredMarkets : markets;
  const chartMaxVolume = barReference.length
    ? Math.max(...barReference.map((market) => market.total_size || 0)) || 1
    : 1;
  const tvlLineSeries = [
    [
      0.339, 0.475, 0.531, 0.536, 0.508, 0.502, 0.524, 0.631, 0.689, 0.715,
      0.706, 0.645, 0.632, 0.699, 0.809, 0.934, 1.007, 1.014, 0.962, 0.991,
      1.055, 1.131, 1.199, 1.223,
    ].map((ratio) => displayTotalValueLocked * ratio),
  ];
  const totalSupplyHistory = [
    displayAvailableLiquidity * 0.6,
    displayAvailableLiquidity * 0.72,
    displayAvailableLiquidity * 0.68,
    displayAvailableLiquidity * 0.78,
    displayAvailableLiquidity * 0.85,
    displayAvailableLiquidity * 0.93,
    displayAvailableLiquidity * 1.05,
    displayAvailableLiquidity * 0.97,
    displayAvailableLiquidity * 0.88,
    displayAvailableLiquidity * 0.95,
    displayAvailableLiquidity * 0.9,
    displayAvailableLiquidity * 0.82,
    displayAvailableLiquidity * 0.87,
    displayAvailableLiquidity * 0.91,
    displayAvailableLiquidity * 0.86,
    displayAvailableLiquidity * 0.94,
  ];
  const totalBorrowHistory = totalSupplyHistory.map((value) => value * 0.65);
  const availableHistory = totalSupplyHistory.map((value, index) =>
    Math.max(value - totalBorrowHistory[index], 0)
  );
  const maxAvailableHistory = Math.max(...totalSupplyHistory, 1);
  const resolvedLiquidityIndex =
    hoveredLiquidity?.index ?? totalSupplyHistory.length - 1;
  const hoverSupplyValue = totalSupplyHistory[resolvedLiquidityIndex] || 0;
  const hoverBorrowValue = totalBorrowHistory[resolvedLiquidityIndex] || 0;
  const hoverAvailableValue = Math.max(hoverSupplyValue - hoverBorrowValue, 0);

  const handleVaultWithdraw = async () => {
    if (!primaryVault || !userVaultPosition || !vaultWithdrawAmount) return;
    const amount = parseFloat(vaultWithdrawAmount);
    if (amount <= 0 || amount > userVaultPosition.assets) return;

    await withdrawFromVault(primaryVault.id, amount);
    setVaultWithdrawAmount("");
    const marketName = selectedMarket
      ? selectedMarket.display_name ??
        `${selectedMarket.collateral_asset} Market`
      : primaryVault.name;
    showTransactionModal(
      "Transaction sent",
      `Withdrew ${formatUSD(amount).replace("$", "")} ${
        primaryVault.asset
      } from the ${marketName}.`
    );
  };

  if (selectedMarket) {
    const collateralTicker = selectedMarket.collateral_asset;
    const collateralName = selectedMarket.display_name;
    const collateralLabel = collateralName
      ? `${collateralTicker} (${collateralName})`
      : collateralTicker;
    const loanTicker = selectedMarket.loan_asset;
    const formatTokenAmount = (amount: number, symbol: string) =>
      `${amount.toLocaleString(undefined, {
        maximumFractionDigits: 4,
        minimumFractionDigits: 0,
      })} ${symbol}`;
    const currentCollateralAmount = displayCollateralAmount;
    const currentLoanAmount = displayBorrowAmount;
    const projectedCollateralAmount = Math.max(
      0,
      currentCollateralAmount + (Number(collateralAmount) || 0)
    );
    const projectedLoanAmount = Math.max(
      0,
      currentLoanAmount + (Number(borrowAmount) || 0)
    );
    const collateralPrice = selectedMarket.collateral_price || 0;
    const projectedCollateralUsd = projectedCollateralAmount * collateralPrice;
    const currentBorrowLtv = displayLtv;
    const projectedBorrowLtv =
      projectedCollateralUsd > 0
        ? (projectedLoanAmount / projectedCollateralUsd) * 100
        : 0;
    const repayInputValue = Number(repayAmount) || 0;
    const withdrawInputValue = Number(withdrawColAmount) || 0;
    const projectedCollateralAfterRepay = Math.max(
      0,
      currentCollateralAmount - withdrawInputValue
    );
    const projectedLoanAfterRepay = Math.max(
      0,
      currentLoanAmount - repayInputValue
    );
    const projectedCollateralUsdAfterRepay =
      projectedCollateralAfterRepay * collateralPrice;
    const projectedBorrowLtvAfterRepay =
      projectedCollateralUsdAfterRepay > 0
        ? (projectedLoanAfterRepay / projectedCollateralUsdAfterRepay) * 100
        : 0;
    const baseBorrowRate = selectedMarket.borrow_apy || 0;
    const marketBorrowedTotal = selectedMarket.total_borrowed || 0;
    const borrowRateDenominator = Math.max(marketBorrowedTotal, 1);
    const projectedMarketBorrowAfterBorrow = Math.max(
      marketBorrowedTotal - displayBorrowAmount + projectedLoanAmount,
      0
    );
    const projectedMarketBorrowAfterRepay = Math.max(
      marketBorrowedTotal - displayBorrowAmount + projectedLoanAfterRepay,
      0
    );
    const projectedBorrowRateForAction =
      baseBorrowRate === 0
        ? 0
        : clampValue(
            baseBorrowRate *
              (projectedMarketBorrowAfterBorrow / borrowRateDenominator),
            baseBorrowRate * 0.5,
            baseBorrowRate * 1.5
          );
    const projectedBorrowRateAfterRepay =
      baseBorrowRate === 0
        ? 0
        : clampValue(
            baseBorrowRate *
              (projectedMarketBorrowAfterRepay / borrowRateDenominator),
            baseBorrowRate * 0.5,
            baseBorrowRate * 1.5
          );
    const loanMarketPrice =
      selectedMarket.loan_asset === "USDC"
        ? 1
        : selectedMarket.collateral_price || 0;
    const repayValueNumber = parseFloat(repayAmount || "0");
    const withdrawValueNumber = parseFloat(withdrawColAmount || "0");
    const collateralInputValue = parseFloat(collateralAmount || "0");
    const collateralError = collateralAmount
      ? collateralInputValue <= 0
        ? "Enter an amount greater than 0"
        : collateralInputValue > mockEthBalance
        ? `Exceeds wallet balance (${mockEthBalance.toFixed(
            2
          )} ${collateralTicker})`
        : undefined
      : undefined;
    const borrowInputValue = parseFloat(borrowAmount || "0");
    const borrowError = borrowAmount
      ? borrowInputValue <= 0
        ? "Enter an amount greater than 0"
        : borrowInputValue > Math.max(availableToBorrow, 0)
        ? `Exceeds max borrow (${formatUSD(Math.max(availableToBorrow, 0))})`
        : undefined
      : undefined;
    const borrowedBalance = userPosition?.borrow_assets ?? 0;
    const repayError = repayAmount
      ? repayValueNumber <= 0
        ? "Enter an amount greater than 0"
        : borrowedBalance <= 0
        ? "No borrowed balance to repay"
        : repayValueNumber > borrowedBalance
        ? `Exceeds borrowed balance (${formatUSD(borrowedBalance)})`
        : repayValueNumber > mockUsdcBalance
        ? `Exceeds wallet balance (${formatUSD(mockUsdcBalance)})`
        : undefined
      : undefined;
    const availableCollateral = userPosition?.collateral ?? 0;
    const withdrawCollateralError = withdrawColAmount
      ? withdrawValueNumber <= 0
        ? "Enter an amount greater than 0"
        : availableCollateral <= 0
        ? "No collateral available to withdraw"
        : withdrawValueNumber > availableCollateral
        ? `Exceeds available collateral (${availableCollateral.toFixed(
            4
          )} ${collateralTicker})`
        : undefined
      : undefined;
    const repayValid = !!repayAmount && !repayError;
    const withdrawValid = !!withdrawColAmount && !withdrawCollateralError;
    const combinedActionDisabled = !repayValid && !withdrawValid;
    return (
      <div className="space-y-8">
        {transactionToast}
        <button
          onClick={() => onSelectMarket(null)}
          className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back to Markets</span>
        </button>

        <header className="space-y-2 mb-6">
          <div className="flex items-center space-x-4">
            <MarketLogo
              ticker={collateralTicker}
              name={collateralName}
              logo={selectedMarket.logo}
              size="md"
            />
            <div>
              <h1 className="text-3xl font-bold text-white">
                {collateralLabel} / {selectedMarket.loan_asset} Market
              </h1>
            </div>
          </div>
        </header>

        <div className="flex space-x-4 mb-6 border-b border-[rgba(195,201,228,0.15)]">
          {(["supply", "borrow"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setViewTab(tab)}
              className={`px-4 py-2 text-sm font-medium tracking-wide rounded-none transition ${
                viewTab === tab
                  ? "text-[#6E7EFE] border-b-2 border-[#6E7EFE]"
                  : "text-gray-400 border-b border-transparent"
              }`}
              style={{ borderRadius: 0 }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {viewTab === "supply" &&
          (primaryVault ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              <div className="lg:col-span-2 space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="rounded-2xl border border-gray-800 bg-[#05070F] p-5">
                    <div className="text-xs uppercase tracking-wide text-gray-500">
                      Total Supplied
                    </div>
                    <div className="mt-2 text-3xl font-bold text-white font-mono">
                      {`${formatUSD(primaryVault.total_deposits).replace(
                        "$",
                        ""
                      )} USDC`}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-gray-800 bg-[#05070F] p-5">
                    <div
                      className="text-xs uppercase tracking-wide"
                      style={{ color: "rgba(137, 141, 160, 1)" }}
                    >
                      Total Borrowed
                    </div>
                    <div className="mt-2 text-3xl font-bold text-white font-mono">
                      {`${formatUSD(borrowedLiquidity).replace("$", "")} USDC`}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-gray-800 bg-[#05070F] p-5">
                    <div className="text-xs uppercase tracking-wide text-gray-500">
                      Supply APY
                    </div>
                    <div className="mt-2 text-3xl font-bold font-mono text-[#A3FF6E]">
                      {formatPercent(primaryVault.apy)}
                    </div>
                  </div>
                </div>

                <section className="rounded-3xl border border-gray-800 bg-[#0B0F1D] p-6 lg:p-8 shadow-lg shadow-black/20">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-xl font-semibold text-white">
                      Your Supply Position
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-gray-500">
                        Supplied
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-white font-mono">
                        {`${formatUSD(displaySupplyAssets).replace(
                          "$",
                          ""
                        )} USDC`}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-gray-500">
                        Supply APY
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-white font-mono">
                        {formatPercent(primaryVault.apy)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-gray-500">
                        Est. Yearly Yield
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-white font-mono">
                        {projectedSupplyEarnings
                          ? `${formatUSD(
                              projectedSupplyEarnings.yearly
                            ).replace("$", "")} USDC`
                          : "--"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-8">
                    <div className="text-xs uppercase tracking-wide text-gray-500">
                      Activity
                    </div>
                    <div className="mt-3 rounded-2xl border border-gray-800 overflow-hidden">
                      <div className="hidden md:grid grid-cols-4 text-xs text-gray-500 uppercase tracking-wide bg-[#060912] px-6 py-3">
                        <span>Date</span>
                        <span>Action</span>
                        <span>Amount</span>
                        <span>Tx</span>
                      </div>
                      {supplyActivity.length ? (
                        <div className="divide-y divide-gray-800">
                          {supplyActivity.map((entry, index) => (
                            <div
                              key={`${entry.tx}-${index}`}
                              className="grid grid-cols-1 md:grid-cols-4 items-center gap-3 px-4 md:px-6 py-4 text-sm bg-[#05070F]"
                            >
                              <div className="text-white font-semibold">
                                {entry.date}
                              </div>
                              <div className="text-gray-400 uppercase tracking-wide">
                                {entry.action}
                              </div>
                              <div className="text-sm font-mono text-white">
                                {entry.amount}
                              </div>
                              <div className="text-xs text-gray-400 break-all md:text-right">
                                {entry.tx}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="px-6 py-8 text-center text-xs text-gray-500 bg-[#05070F]">
                          No activity yet
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              </div>

              <div className="space-y-6">
                <section className="rounded-3xl border border-gray-800 bg-[#05070F] p-6 shadow-lg shadow-black/20">
                  <div className="flex space-x-4 mb-6 border-b border-[rgba(195,201,228,0.15)]">
                    {(["supply", "withdraw"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setSupplyActionTab(tab)}
                        className={`flex-1 pb-2 text-sm font-medium tracking-wide transition rounded-none ${
                          supplyActionTab === tab
                            ? "text-[#6E7EFE] border-b-2 border-[#6E7EFE]"
                            : "text-gray-500 border-b border-transparent"
                        }`}
                        style={{ borderRadius: 0 }}
                      >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </button>
                    ))}
                  </div>

                  {supplyActionTab === "supply" ? (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm text-gray-400 block mb-2">
                          Amount (USDC)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={vaultSupplyAmount}
                            onChange={(e) =>
                              setVaultSupplyAmount(e.target.value)
                            }
                            placeholder="0.00"
                            className="w-full bg-[#02060F] border border-white/10 rounded-2xl px-4 py-3 text-white font-mono focus:outline-none focus:border-[#0052FF]"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                            USDC
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2 text-sm">
                          <span className="text-gray-400">
                            Balance: {mockUsdcBalance.toLocaleString()} USDC
                          </span>
                          <button
                            onClick={() =>
                              setVaultSupplyAmount(mockUsdcBalance.toString())
                            }
                            className="text-[#4D7DFF] hover:text-[#6B93FF] font-medium"
                          >
                            MAX
                          </button>
                        </div>
                        {supplyAmountError && (
                          <p className="mt-2 text-xs text-[#FF5252]">
                            {supplyAmountError}
                          </p>
                        )}
                      </div>

                      {connectedAddress ? (
                        <button
                          onClick={handleVaultSupply}
                          disabled={!vaultSupplyAmount || !!supplyAmountError}
                          className="w-full py-3 bg-[#0052FF] hover:bg-[#0046DD] disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-2xl font-medium transition-colors"
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
                        <label className="text-sm text-gray-400 block mb-2">
                          Amount (USDC)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={vaultWithdrawAmount}
                            onChange={(e) =>
                              setVaultWithdrawAmount(e.target.value)
                            }
                            placeholder="0.00"
                            className="w-full bg-[#02060F] border border-white/10 rounded-2xl px-4 py-3 text-white font-mono focus:outline-none focus:border-[#0052FF]"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                            USDC
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2 text-sm">
                          <span className="text-gray-400">
                            Balance:{" "}
                            {userVaultPosition
                              ? `${formatUSD(userVaultPosition.assets).replace(
                                  "$",
                                  ""
                                )} USDC`
                              : "--"}
                          </span>
                          {userVaultPosition && (
                            <button
                              onClick={() =>
                                setVaultWithdrawAmount(
                                  userVaultPosition.assets.toString()
                                )
                              }
                              className="text-[#4D7DFF] hover:text-[#6B93FF] font-medium"
                            >
                              MAX
                            </button>
                          )}
                        </div>
                        {withdrawVaultError && (
                          <p className="mt-2 text-xs text-[#FF5252]">
                            {withdrawVaultError}
                          </p>
                        )}
                      </div>

                      {connectedAddress ? (
                        <button
                          onClick={handleVaultWithdraw}
                          disabled={
                            !vaultWithdrawAmount || !!withdrawVaultError
                          }
                          className="w-full py-3 bg-[#0052FF] hover:bg-[#0046DD] disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-2xl font-medium transition-colors"
                        >
                          Withdraw
                        </button>
                      ) : (
                        <div className="text-center text-gray-400 text-sm py-3">
                          Connect wallet to withdraw
                        </div>
                      )}
                    </div>
                  )}
                </section>

                <section className="rounded-3xl border border-gray-800 bg-[#05070F] p-6 text-sm">
                  <div className="text-xs uppercase tracking-wide text-gray-500">
                    Position Simulation
                  </div>
                  <div className="mt-3 grid grid-cols-3 text-xs uppercase tracking-wide text-gray-500">
                    <span>Metric</span>
                    <span>Current</span>
                    <span>After</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="grid grid-cols-3 items-center gap-4 rounded-2xl border border-gray-800 bg-[#090D16] px-4 py-3">
                      <span className="text-gray-400">Your Deposit</span>
                      <span className="font-mono text-white">{`${formatUSD(
                        currentDeposit
                      ).replace("$", "")} USDC`}</span>
                      <span className="font-mono text-white">{`${formatUSD(
                        simulatedDeposit
                      ).replace("$", "")} USDC`}</span>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-4 rounded-2xl border border-gray-800 bg-[#090D16] px-4 py-3">
                      <span className="text-gray-400">Supply APY</span>
                      <span className="font-mono text-white">
                        {formatPercent(currentSupplyApyValue)}
                      </span>
                      <span className="font-mono text-white">
                        {formatPercent(projectedSupplyApyValue)}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-4 rounded-2xl border border-gray-800 bg-[#090D16] px-4 py-3">
                      <span className="text-gray-400">
                        Est. Yearly Earnings
                      </span>
                      <span className="font-mono text-white">{`${formatUSD(
                        currentSupplyYieldEstimate.yearly
                      ).replace("$", "")} USDC`}</span>
                      <span className="font-mono text-white">{`${formatUSD(
                        simulatedSupplyYieldEstimate.yearly
                      ).replace("$", "")} USDC`}</span>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-gray-800 bg-[#0F1016] p-6 text-gray-400">
              Vault data is unavailable at the moment.
            </div>
          ))}
        {viewTab === "borrow" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="rounded-2xl border border-gray-800 bg-[#05070F] p-5">
                  <div className="text-gray-400 text-sm mb-2">
                    Total Market Size
                  </div>
                  <div className="text-3xl font-bold text-white font-mono">
                    {formatUSDCAmount(selectedMarket.total_size)}
                  </div>
                </div>
                <div className="rounded-2xl border border-gray-800 bg-[#05070F] p-5">
                  <div className="text-gray-400 text-sm mb-2">
                    Available Liquidity
                  </div>
                  <div className="text-3xl font-bold text-white font-mono">
                    {formatUSDCAmount(
                      selectedMarket.total_size - selectedMarket.total_borrowed
                    )}
                  </div>
                </div>
                <div className="rounded-2xl border border-gray-800 bg-[#05070F] p-5">
                  <div className="text-gray-400 text-sm mb-2">Borrow Rate</div>
                  <div className="text-3xl font-bold text-[#FFB237] flex items-center space-x-2">
                    <span>{formatPercent(selectedMarket.borrow_apy)}</span>
                    <TrendingUp size={24} />
                  </div>
                </div>
              </div>

              <section className="rounded-3xl border border-gray-800 bg-[#0B0F1D] p-6 lg:p-8 shadow-lg shadow-black/20">
                <div className="flex flex-col gap-2">
                  <h3 className="text-xl font-semibold text-white">
                    Your Borrow Position
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500">
                      Collateral
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-white font-mono">
                      {displayCollateralAmount.toFixed(4)} {collateralTicker}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatUSD(displayCollateralValue)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500">
                      Loan
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-white font-mono">
                      {`${displayBorrowAmount.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })} ${selectedMarket.loan_asset}`}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {selectedMarket.loan_asset}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500">
                      LTV / LLTV
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-white font-mono">
                      {`${formatPercent(displayLtv)} / ${selectedMarket.lltv}%`}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500">
                      Market Price
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-white font-mono">
                      {formatUSD(selectedMarket.collateral_price)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {collateralTicker}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500">
                      Liquidation Price
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-white font-mono">
                      {displayLiquidationPrice > 0
                        ? formatUSD(displayLiquidationPrice)
                        : "--"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500">
                      Borrow Rate
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-[#FFB237] font-mono">
                      {formatPercent(selectedMarket.borrow_apy)}
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <div className="text-xs uppercase tracking-wide text-gray-500">
                    Activity
                  </div>
                  <div className="mt-3 rounded-2xl border border-gray-800 overflow-hidden">
                    <div className="hidden md:grid grid-cols-4 text-xs text-gray-500 uppercase tracking-wide bg-[#060912] px-6 py-3">
                      <span>Date</span>
                      <span>Action</span>
                      <span>Amount</span>
                      <span>Tx</span>
                    </div>
                    {borrowActivity.length ? (
                      <div className="divide-y divide-gray-800">
                        {borrowActivity.map((entry, index) => (
                          <div
                            key={`${entry.tx}-${index}`}
                            className="grid grid-cols-1 md:grid-cols-4 items-center gap-3 px-4 md:px-6 py-4 text-sm bg-[#05070F]"
                          >
                            <div className="text-white font-semibold">
                              {entry.date}
                            </div>
                            <div className="text-gray-400 uppercase tracking-wide">
                              {entry.action}
                            </div>
                            <div className="text-sm font-mono text-white">
                              {entry.amount}
                            </div>
                            <div className="text-xs text-gray-400 break-all md:text-right">
                              {entry.tx}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="px-6 py-8 text-center text-xs text-gray-500 bg-[#05070F]">
                        No borrow activity yet
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-gray-800 bg-[#0B0F1D] p-6 lg:p-8 space-y-10 shadow-lg shadow-black/20">
                <h3 className="text-xl font-semibold text-white">Overview</h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="p-6 space-y-3 text-sm rounded-2xl border border-gray-800 bg-[#05070F]">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Collateral type</span>
                      <span className="text-white font-medium">
                        {collateralTicker}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">
                        Collateral market price
                      </span>
                      <span className="text-white font-medium">
                        {formatUSD(selectedMarket.collateral_price)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Loan type</span>
                      <span className="text-white font-medium">
                        {selectedMarket.loan_asset}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Loan market price</span>
                      <span className="text-white font-medium">
                        {formatUSD(loanMarketPrice)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">LLTV</span>
                      <span className="text-white font-medium">
                        {selectedMarket.lltv}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Liquidation penalty</span>
                      <span className="text-white font-medium">
                        {formatPercent(liquidationPenalty)}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-gray-800 bg-[#05070F] p-6 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs uppercase tracking-wide text-gray-500">
                        Utilization curve
                      </span>
                      <span className="text-xs text-gray-500">Mock data</span>
                    </div>
                    <div className="relative h-40">
                      <div className="absolute inset-0 bg-gradient-to-r from-[#0052FF]/20 via-[#00D395]/10 to-[#FF5252]/20 rounded-lg" />
                      <div className="absolute bottom-6 left-6 right-6 h-1 bg-gray-800 rounded" />
                      <div className="absolute right-10 top-6 h-28 w-px bg-[#0052FF]/40" />
                      <div className="absolute right-10 top-4 text-xs text-[#00D395]">
                        Current
                      </div>
                      <div className="absolute right-10 bottom-12 text-xs text-gray-400">
                        Target
                      </div>
                    </div>
                    <div className="mt-4 text-xs text-gray-500">
                      Curve illustration is for demo purposes only.
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <div className="space-y-6 lg:pt-0">
              <section className="rounded-3xl border border-gray-800 bg-[#05070F] p-6 shadow-lg shadow-black/20">
                <div className="flex items-center mb-6 border-b border-[rgba(195,201,228,0.15)]">
                  {(["borrow", "repay"] as InteractionTab[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 px-4 py-2 text-xs font-medium tracking-wide text-center rounded-none transition ${
                        activeTab === tab
                          ? "text-[#6E7EFE] border-b-2 border-[#6E7EFE]"
                          : "text-gray-500 border-b border-transparent"
                      }`}
                      style={{ borderRadius: 0 }}
                    >
                      {tab === "borrow"
                        ? "Deposit & Borrow"
                        : "Repay & Withdraw"}
                    </button>
                  ))}
                </div>

                {activeTab === "borrow" && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-gray-400 block mb-2">
                        Supply Collateral ({collateralTicker})
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={collateralAmount}
                          onChange={(e) => setCollateralAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-[#02060F] border border-white/10 rounded-2xl px-4 py-3 text-white font-mono focus:outline-none focus:border-[#0052FF]"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                          {collateralTicker}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2 text-sm">
                        <span className="text-gray-400">
                          Balance: {mockEthBalance.toFixed(2)}{" "}
                          {collateralTicker}
                        </span>
                        <button
                          onClick={() =>
                            setCollateralAmount(mockEthBalance.toString())
                          }
                          className="text-[#4D7DFF] hover:text-[#6B93FF] font-medium"
                        >
                          MAX
                        </button>
                      </div>
                      {collateralError && (
                        <p className="mt-2 text-xs text-[#FF5252]">
                          {collateralError}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-sm text-gray-400 block mb-2">
                        Borrow ({selectedMarket.loan_asset})
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={borrowAmount}
                          onChange={(e) => setBorrowAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-[#02060F] border border-white/10 rounded-2xl px-4 py-3 text-white font-mono focus:outline-none focus:border-[#0052FF]"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                          {selectedMarket.loan_asset}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2 text-sm">
                        <span className="text-gray-400">
                          Max: {formatUSD(availableToBorrow)}
                        </span>
                        <button
                          onClick={() =>
                            setBorrowAmount(availableToBorrow.toString())
                          }
                          className="text-[#4D7DFF] hover:text-[#6B93FF] font-medium"
                        >
                          MAX
                        </button>
                      </div>
                      {borrowError && (
                        <p className="mt-2 text-xs text-[#FF5252]">
                          {borrowError}
                        </p>
                      )}
                    </div>

                    <div className="rounded-2xl border border-gray-800 bg-[#090D16] p-4 text-sm">
                      <div className="text-xs uppercase tracking-wide text-gray-500">
                        Position Simulation
                      </div>
                      <div className="mt-3 grid grid-cols-3 text-xs uppercase tracking-wide text-gray-500">
                        <span>Metric</span>
                        <span>Current</span>
                        <span>After</span>
                      </div>
                      <div className="mt-3 space-y-2">
                        <div className="grid grid-cols-3 items-center gap-4 rounded-2xl border border-gray-800 bg-[#050911] px-4 py-3">
                          <span className="text-gray-400">Collateral</span>
                          <span className="font-mono text-white">
                            {formatTokenAmount(
                              currentCollateralAmount,
                              collateralTicker
                            )}
                          </span>
                          <span className="font-mono text-white">
                            {formatTokenAmount(
                              projectedCollateralAmount,
                              collateralTicker
                            )}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 items-center gap-4 rounded-2xl border border-gray-800 bg-[#050911] px-4 py-3">
                          <span className="text-gray-400">Loan</span>
                          <span className="font-mono text-white">
                            {`${formatUSD(currentLoanAmount).replace(
                              "$",
                              ""
                            )} ${loanTicker}`}
                          </span>
                          <span className="font-mono text-white">
                            {`${formatUSD(projectedLoanAmount).replace(
                              "$",
                              ""
                            )} ${loanTicker}`}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 items-center gap-4 rounded-2xl border border-gray-800 bg-[#050911] px-4 py-3">
                          <span className="text-gray-400">LTV / LLTV</span>
                          <span className="font-mono text-white">
                            {`${formatPercent(currentBorrowLtv)} / ${
                              selectedMarket.lltv
                            }%`}
                          </span>
                          <span
                            className={`font-mono ${
                              projectedBorrowLtv > selectedMarket.lltv
                                ? "text-[#FF5252]"
                                : projectedBorrowLtv > selectedMarket.lltv * 0.9
                                ? "text-[#FFB237]"
                                : "text-white"
                            }`}
                          >
                            {`${formatPercent(projectedBorrowLtv)} / ${
                              selectedMarket.lltv
                            }%`}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 items-center gap-4 rounded-2xl border border-gray-800 bg-[#050911] px-4 py-3">
                          <span className="text-gray-400">Borrow Rate</span>
                          <span className="font-mono text-white">
                            {formatPercent(baseBorrowRate)}
                          </span>
                          <span className="font-mono text-white">
                            {formatPercent(projectedBorrowRateForAction)}
                          </span>
                        </div>
                      </div>
                      {projectedBorrowLtv > selectedMarket.lltv && (
                        <div className="flex items-start space-x-2 mt-3 p-2 bg-[#FF5252]/10 rounded">
                          <AlertTriangle
                            className="text-[#FF5252] flex-shrink-0 mt-0.5"
                            size={16}
                          />
                          <span className="text-[#FF5252] text-xs">
                            Borrow exceeds liquidation threshold.
                          </span>
                        </div>
                      )}
                    </div>

                    {connectedAddress ? (
                      <button
                        onClick={handleBorrow}
                        disabled={
                          !connectedAddress ||
                          !collateralAmount ||
                          !borrowAmount ||
                          !!collateralError ||
                          !!borrowError
                        }
                        className="w-full py-3 bg-[#0052FF] hover:bg-[#0046DD] disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-2xl font-medium transition-colors"
                      >
                        Supply & Borrow
                      </button>
                    ) : (
                      <div className="text-center text-gray-400 text-sm py-3">
                        Connect wallet to borrow
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "repay" && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-gray-400 block mb-2">
                        Repay Amount
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={repayAmount}
                          onChange={(e) => setRepayAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-[#02060F] border border-white/10 rounded-2xl px-4 py-3 text-white font-mono focus:outline-none focus:border-[#0052FF]"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                          {selectedMarket.loan_asset}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2 text-sm">
                        <span className="text-gray-400">
                          Borrowed: {formatUSD(displayBorrowAmount)}
                        </span>
                      </div>
                      {repayError && (
                        <p className="mt-2 text-xs text-[#FF5252]">
                          {repayError}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-sm text-gray-400 block mb-2">
                        Withdraw Collateral
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={withdrawColAmount}
                          onChange={(e) => setWithdrawColAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-[#02060F] border border-white/10 rounded-2xl px-4 py-3 text-white font-mono focus:outline-none focus:border-[#0052FF]"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                          {collateralTicker}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2 text-sm">
                        <span className="text-gray-400">
                          Available:{" "}
                          {userPosition
                            ? userPosition.collateral.toFixed(4)
                            : displayCollateralAmount.toFixed(4)}{" "}
                          {collateralTicker}
                        </span>
                        {(userPosition || displayCollateralAmount > 0) && (
                          <button
                            onClick={() =>
                              setWithdrawColAmount(
                                (
                                  userPosition?.collateral ??
                                  displayCollateralAmount
                                ).toString()
                              )
                            }
                            className="text-[#4D7DFF] hover:text-[#6B93FF] font-medium"
                          >
                            MAX
                          </button>
                        )}
                      </div>
                      {withdrawCollateralError && (
                        <p className="mt-2 text-xs text-[#FF5252]">
                          {withdrawCollateralError}
                        </p>
                      )}
                    </div>

                    <div className="rounded-2xl border border-gray-800 bg-[#090D16] p-4 text-sm">
                      <div className="text-xs uppercase tracking-wide text-gray-500">
                        Position Simulation
                      </div>
                      <div className="mt-3 grid grid-cols-3 text-xs uppercase tracking-wide text-gray-500">
                        <span>Metric</span>
                        <span>Current</span>
                        <span>After</span>
                      </div>
                      <div className="mt-3 space-y-2">
                        <div className="grid grid-cols-3 items-center gap-4 rounded-2xl border border-gray-800 bg-[#050911] px-4 py-3">
                          <span className="text-gray-400">Collateral</span>
                          <span className="font-mono text-white">
                            {formatTokenAmount(
                              currentCollateralAmount,
                              collateralTicker
                            )}
                          </span>
                          <span className="font-mono text-white">
                            {formatTokenAmount(
                              projectedCollateralAfterRepay,
                              collateralTicker
                            )}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 items-center gap-4 rounded-2xl border border-gray-800 bg-[#050911] px-4 py-3">
                          <span className="text-gray-400">Loan</span>
                          <span className="font-mono text-white">{`${formatUSD(
                            currentLoanAmount
                          ).replace("$", "")} ${loanTicker}`}</span>
                          <span className="font-mono text-white">{`${formatUSD(
                            projectedLoanAfterRepay
                          ).replace("$", "")} ${loanTicker}`}</span>
                        </div>
                        <div className="grid grid-cols-3 items-center gap-4 rounded-2xl border border-gray-800 bg-[#050911] px-4 py-3">
                          <span className="text-gray-400">LTV / LLTV</span>
                          <span className="font-mono text-white">{`${formatPercent(
                            currentBorrowLtv
                          )} / ${selectedMarket.lltv}%`}</span>
                          <span
                            className={`font-mono ${
                              projectedBorrowLtvAfterRepay > selectedMarket.lltv
                                ? "text-[#FF5252]"
                                : projectedBorrowLtvAfterRepay >
                                  selectedMarket.lltv * 0.9
                                ? "text-[#FFB237]"
                                : "text-white"
                            }`}
                          >
                            {`${formatPercent(
                              projectedBorrowLtvAfterRepay
                            )} / ${selectedMarket.lltv}%`}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 items-center gap-4 rounded-2xl border border-gray-800 bg-[#050911] px-4 py-3">
                          <span className="text-gray-400">Borrow Rate</span>
                          <span className="font-mono text-white">
                            {formatPercent(baseBorrowRate)}
                          </span>
                          <span className="font-mono text-white">
                            {formatPercent(projectedBorrowRateAfterRepay)}
                          </span>
                        </div>
                      </div>
                      {projectedBorrowLtvAfterRepay > selectedMarket.lltv && (
                        <div className="flex items-start space-x-2 mt-3 p-2 bg-[#FF5252]/10 rounded">
                          <AlertTriangle
                            className="text-[#FF5252] flex-shrink-0 mt-0.5"
                            size={16}
                          />
                          <span className="text-[#FF5252] text-xs">
                            Borrow exceeds liquidation threshold.
                          </span>
                        </div>
                      )}
                    </div>

                    {connectedAddress ? (
                      <button
                        onClick={handleRepayAndWithdrawAction}
                        disabled={combinedActionDisabled}
                        className="w-full py-3 bg-[#0052FF] hover:bg-[#0046DD] disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-2xl font-medium transition-colors"
                      >
                        Repay & Withdraw
                      </button>
                    ) : (
                      <div className="text-center text-gray-400 text-sm py-3">
                        Connect wallet to manage position
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {transactionToast}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 rounded-3xl border border-gray-800 bg-[#050910] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-400">Total Value Locked</div>
              <div className="text-3xl font-semibold text-white mt-2">
                {formatFullUSD(displayTotalValueLocked)}
              </div>
            </div>
            <div className="text-xs text-gray-500 text-right">
              <div>Supply Markets {markets.length}</div>
              <div>Borrow Markets {markets.length}</div>
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
                  id="tvlGradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="rgba(110, 126, 254, 1)" />
                  <stop offset="50%" stopColor="rgba(92, 107, 255, 1)" />
                  <stop offset="100%" stopColor="rgba(72, 96, 255, 1)" />
                </linearGradient>
                <linearGradient id="tvlFill" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(110,126,254,0.28)" />
                  <stop offset="100%" stopColor="rgba(10,11,13,0)" />
                </linearGradient>
              </defs>
              <path
                d={createSparklineAreaPath(tvlLineSeries[0])}
                fill="url(#tvlFill)"
                opacity={0.4}
              />
              <path
                d={createSparklinePath(tvlLineSeries[0])}
                fill="none"
                stroke="url(#tvlGradient)"
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
              <div className="text-sm text-gray-400">Available Liquidity</div>
              <div className="text-2xl font-semibold text-white mt-1">
                {formatFullUSD(displayAvailableLiquidity)}
              </div>
            </div>
          </div>
          <div
            className="relative h-40 w-full"
            onMouseLeave={() => setHoveredLiquidity(null)}
          >
            <svg
              viewBox="0 0 100 40"
              preserveAspectRatio="none"
              className="w-full h-full"
            >
              {totalSupplyHistory.map((value, index) => {
                const segment = 100 / totalSupplyHistory.length;
                const width = Math.max(segment * 0.6, 1.5);
                const x = index * segment + (segment - width) / 2;
                const height = (value / maxAvailableHistory) * 40;
                const y = 40 - height;
                const borrowHeight =
                  (totalBorrowHistory[index] / maxAvailableHistory) * 40;
                const borrowY = 40 - borrowHeight;
                const normalizedX = (x + width / 2) / 100;
                const normalizedY = Math.min(y / 40, 0.85);
                return (
                  <g
                    key={`liq-bar-${index}`}
                    onMouseEnter={() =>
                      setHoveredLiquidity({
                        index,
                        x: normalizedX,
                        y: normalizedY,
                      })
                    }
                  >
                    <rect
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      rx={width * 0.2}
                      fill="url(#barBaseGradient)"
                      opacity={hoveredLiquidity?.index === index ? 1 : 0.85}
                    />
                    <rect
                      x={x}
                      y={borrowY}
                      width={width}
                      height={borrowHeight}
                      rx={width * 0.2}
                      fill="url(#barAccentGradient)"
                    />
                  </g>
                );
              })}
              <defs>
                <linearGradient
                  id="barBaseGradient"
                  x1="0%"
                  y1="100%"
                  x2="0%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="#111827" />
                  <stop offset="100%" stopColor="#1F2937" />
                </linearGradient>
                <linearGradient
                  id="barAccentGradient"
                  x1="0%"
                  y1="100%"
                  x2="0%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="#23273F" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#6E7EFE" stopOpacity="0.95" />
                </linearGradient>
              </defs>
            </svg>
            {hoveredLiquidity && (
              <div
                className="absolute z-10 min-w-[150px] rounded-2xl border border-white/10 bg-[#0F172A]/90 px-4 py-3 text-xs text-white shadow-lg backdrop-blur"
                style={{
                  left: `calc(${hoveredLiquidity.x * 100}% - 75px)`,
                  top: `calc(${hoveredLiquidity.y * 100}% - 10px)`,
                }}
              >
                <div className="font-semibold text-gray-300">
                  Liquidity detail
                </div>
                <div className="mt-1 space-y-1">
                  <div className="flex justify-between">
                    <span style={{ color: "rgba(195, 201, 228, 1)" }}>
                      Total Supply
                    </span>
                    <span
                      className="font-mono"
                      style={{ color: "rgba(195, 201, 228, 1)" }}
                    >
                      {formatUSD(hoverSupplyValue)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: "rgba(137, 141, 160, 1)" }}>
                      Total Borrowed
                    </span>
                    <span
                      className="font-mono"
                      style={{ color: "rgba(110, 126, 254, 1)" }}
                    >
                      {formatUSD(hoverBorrowValue)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: "rgba(137, 141, 160, 1)" }}>
                      Available
                    </span>
                    <span
                      className="font-mono"
                      style={{ color: "rgba(163, 255, 110, 1)" }}
                    >
                      {formatUSD(hoverAvailableValue)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-white">Lending Markets</h1>
          <p className="text-sm text-gray-400 sr-only">
            {marketPageDescription}
          </p>
          <div className="flex items-center gap-2 text-xs">
            {[
              { key: "all", label: "All" },
              { key: "crypto", label: "Crypto" },
              { key: "stocks", label: "US Stock" },
            ].map((option) => (
              <button
                key={option.key}
                onClick={() =>
                  setMarketCategory(option.key as "all" | "crypto" | "stocks")
                }
                className={`px-3 py-1.5 rounded-full border ${
                  marketCategory === option.key
                    ? "border-[#0052FF] text-white"
                    : "border-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center space-x-3 w-full lg:w-auto">
          <div className="flex items-center space-x-2 bg-[#0F1424] border border-gray-800 rounded-2xl px-3 py-2 w-full lg:w-80">
            <Search size={16} className="text-gray-500" />
            <input
              type="text"
              placeholder="Filter by asset"
              value={marketSearch}
              onChange={(event) => setMarketSearch(event.target.value)}
              className="bg-transparent text-sm text-white focus:outline-none flex-1"
            />
          </div>
          <button className="p-2 rounded-full border border-gray-800 text-gray-400 hover:text-white">
            <Filter size={16} />
          </button>
        </div>
      </div>

      {markets.length === 0 ? (
        <div className="bg-[#0F1016] rounded-3xl border border-gray-800 p-6 text-center text-gray-400">
          No markets available.
        </div>
      ) : filteredMarkets.length === 0 ? (
        <div className="bg-[#0F1016] rounded-3xl border border-gray-800 p-6 text-center text-gray-400">
          No markets match your search yet.
        </div>
      ) : (
        <div className="bg-[#0F1016] rounded-3xl border border-gray-800 overflow-hidden">
          <div className="grid grid-cols-7 gap-4 px-6 py-4 border-b border-gray-800 text-sm font-medium text-gray-400">
            <div>Collateral</div>
            <div>Loan</div>
            <div>Market Size</div>
            <div>Available Liquidity</div>
            <div>Supply APR</div>
            <div>Borrow APR</div>
            <div>Actions</div>
          </div>

          {filteredMarkets.map((market) => {
            const availableLiquidity = Math.max(
              market.total_size - market.total_borrowed,
              0
            );
            const supplyApy = getSupplyApyForMarket(market);
            const utilization =
              market.total_size > 0
                ? (market.total_borrowed / market.total_size) * 100
                : 0;

            return (
              <div
                key={market.id}
                role="button"
                tabIndex={0}
                onClick={() => handleMarketSelect(market.id)}
                onKeyDown={(event) => handleMarketSelectKey(event, market.id)}
                className="w-full grid grid-cols-7 gap-4 px-6 py-6 hover:bg-[#0A0B0F] transition-colors text-left border-b border-gray-800 last:border-b-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0052FF]"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <MarketLogo
                    ticker={market.collateral_asset}
                    name={market.display_name}
                    logo={market.logo}
                    size="sm"
                  />
                  <div className="font-semibold text-white">
                    {market.collateral_asset}
                  </div>
                  <div className="text-xs text-gray-500 sr-only">
                    Price: {formatUSD(market.collateral_price)}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <MarketLogo
                    ticker={market.loan_asset}
                    logo={
                      TOKEN_LOGOS[market.loan_asset.toUpperCase()] ?? undefined
                    }
                    size="sm"
                  />
                  <div className="text-white font-mono">
                    {market.loan_asset}
                  </div>
                </div>
                <div className="flex flex-col justify-center h-full">
                  <div className="text-white font-mono">
                    {formatUSDCAmount(market.total_size)}
                  </div>
                </div>
                <div className="flex flex-col justify-center h-full">
                  <div className="text-white font-mono">
                    {formatUSDCAmount(availableLiquidity)}
                  </div>
                </div>
                <div className="flex flex-col justify-center h-full">
                  <div className="text-[#00D395] font-semibold">
                    {formatPercent(supplyApy)}
                  </div>
                </div>
                <div className="flex flex-col justify-center h-full">
                  <div className="text-[#FFB237] font-semibold flex items-center space-x-2">
                    <span>{formatPercent(market.borrow_apy)}</span>
                    <TrendingUp size={16} />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(event) =>
                      handleMarketAction(market.id, "borrow", event)
                    }
                    className="px-3 py-2 rounded-lg border border-[#2A3042] text-sm font-medium text-white hover:bg-[#1F2330] transition-colors"
                  >
                    Borrow
                  </button>
                  <button
                    onClick={(event) =>
                      handleMarketAction(market.id, "supply", event)
                    }
                    className="px-3 py-2 rounded-lg bg-[#0052FF] hover:bg-[#0046DD] text-sm font-medium text-white transition-colors"
                  >
                    Supply
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
