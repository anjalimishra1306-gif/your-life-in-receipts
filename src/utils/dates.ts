// src/utils/dates.ts
// Month index math and date range helpers.

export const SPOTIFY_BASE_YEAR = 2013;
export const SPOTIFY_BASE_MONTH = 7; // July
export const LEDGER_BASE_YEAR = 2015;
export const LEDGER_BASE_MONTH = 1;

/** Convert spotify month index to Date */
export function spotifyMonthToDate(idx: number): Date {
  const abs = idx + SPOTIFY_BASE_MONTH - 1;
  const year = SPOTIFY_BASE_YEAR + Math.floor(abs / 12);
  const month = ((abs % 12) + 12) % 12;
  return new Date(Date.UTC(year, month, 1));
}

/** Convert ledger month index to Date */
export function ledgerMonthToDate(idx: number): Date {
  const year = LEDGER_BASE_YEAR + Math.floor(idx / 12);
  const month = idx % 12;
  return new Date(Date.UTC(year, month, 1));
}

/** Parse ISO year-month string to Date */
export function parseYM(ym: string): Date {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1));
}

/** Format Date to YYYY-MM */
export function toYM(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Format Date to readable month/year */
export function toMonthYear(d: Date): string {
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', timeZone: 'UTC' });
}

/** Days between two dates */
export function daysBetween(a: Date, b: Date): number {
  return Math.round(Math.abs(b.getTime() - a.getTime()) / 86400000);
}

/** Spotify month index for a given year and month (1-indexed) */
export function toSpotifyMonthIdx(year: number, month: number): number {
  return (year - SPOTIFY_BASE_YEAR) * 12 + (month - SPOTIFY_BASE_MONTH);
}

/** Ledger month index for a given year and month (1-indexed) */
export function toLedgerMonthIdx(year: number, month: number): number {
  return (year - LEDGER_BASE_YEAR) * 12 + (month - LEDGER_BASE_MONTH);
}

/** Format a month index to short label using base parameters */
export function monthIdxToShort(idx: number, baseYear: number, baseMonth: number): string {
  const d = new Date(Date.UTC(baseYear, baseMonth - 1 + idx, 1));
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
}
