export const formatUSD = (amount?: number | null): string => {
  const safeAmount = Number(amount ?? 0) || 0;
  if (safeAmount >= 1_000_000) {
    return `$${(safeAmount / 1_000_000).toFixed(2)}M`;
  }
  if (safeAmount >= 1_000) {
    return `$${(safeAmount / 1_000).toFixed(2)}K`;
  }
  return `$${safeAmount.toFixed(2)}`;
};

export const formatNumber = (num?: number | null, decimals: number = 2): string => {
  const safeNum = Number(num ?? 0) || 0;
  return safeNum.toFixed(decimals);
};

export const formatPercent = (percent?: number | null): string => {
  const safePercent = Number(percent ?? 0) || 0;
  return `${safePercent.toFixed(2)}%`;
};

export const formatAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const formatFullUSD = (amount?: number | null, fractionDigits: number = 2): string => {
  const safeAmount = Number(amount ?? 0) || 0;
  return `$${safeAmount.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  })}`;
};

export const calculateProjectedEarnings = (amount: number, apy: number) => {
  const daily = (amount * apy) / 100 / 365;
  const monthly = (amount * apy) / 100 / 12;
  const yearly = (amount * apy) / 100;

  return { daily, monthly, yearly };
};

export const calculateHealthFactor = (
  collateralValue: number,
  borrowedValue: number,
  lltv: number
): number => {
  if (borrowedValue === 0) return Infinity;
  const maxBorrow = (collateralValue * lltv) / 100;
  return maxBorrow / borrowedValue;
};

export const calculateLiquidationPrice = (
  collateralAmount: number,
  borrowedValue: number,
  lltv: number
): number => {
  if (collateralAmount === 0) return 0;
  return borrowedValue / (collateralAmount * (lltv / 100));
};
