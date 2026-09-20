// src/utils/format.ts
// Formatting utilities.
// CRITICAL: INR formatter is ONLY for Ledger stream.
// Transactions amounts are ALWAYS unit-less (no currency symbol).

/** Format an INR amount for the Ledger stream using en-IN grouping */
export function formatINR(amount: number | string): string {
  if (typeof amount === 'string') return amount; // banded, e.g. "10,000+"
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format a number with en-IN grouping (no currency symbol) */
export function formatNumber(n: number, decimals = 0): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

/** Format Transactions amounts as plain numbers, NO currency symbol ever */
export function formatTransactionAmount(amount: number | null): string {
  if (amount === null) return '-';
  return formatNumber(Math.round(amount));
}

/** Format hours */
export function formatHours(h: number): string {
  if (h >= 1000) return `${formatNumber(Math.round(h / 1000), 1)}k hrs`;
  if (h >= 1) return `${formatNumber(Math.round(h))} hrs`;
  return `${Math.round(h * 60)} min`;
}

/** Format a month index to a display string */
export function monthIdxToLabel(idx: number, baseYear: number, baseMonth: number): string {
  const absMonth = idx + baseMonth - 1;
  const year = baseYear + Math.floor(absMonth / 12);
  const month = ((absMonth % 12) + 12) % 12;
  return new Date(year, month, 1).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}

/** Format a month index to ISO year-month string */
export function monthIdxToISO(idx: number, baseYear: number, baseMonth: number): string {
  const absMonth = idx + baseMonth - 1;
  const year = baseYear + Math.floor(absMonth / 12);
  const month = ((absMonth % 12) + 12) % 12 + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** Format a Pearson r value */
export function formatR(r: number): string {
  const sign = r >= 0 ? '+' : '';
  return `r = ${sign}${r.toFixed(3)}`;
}

/** Format a percentage share */
export function formatPct(share: number, decimals = 1): string {
  return `${(share * 100).toFixed(decimals)}%`;
}

/** Weekday label (Sun=0) */
export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Hour label with UTC offset */
export function hourLabel(h: number, utcOffset: number): string {
  const adj = ((h + utcOffset) % 24 + 24) % 24;
  return `${String(adj).padStart(2, '0')}:00`;
}
