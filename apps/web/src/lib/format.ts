/** Shared number/currency formatters — use these everywhere, never inline */

export function fmtCurrency(value: string | number): string {
  return Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtNumber(value: string | number, decimals = 0): string {
  return Number(value).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function fmtPercent(value: string | number): string {
  return `${Number(value).toFixed(1)}%`;
}
