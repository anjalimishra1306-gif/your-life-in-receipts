// src/data/selectors.ts
// Memoized selectors for chart-ready aggregates from pre-aggregated data.

import type { SpotifyMonthly, FilterState } from './types';
import { spotifyMonthToDate } from '../utils/dates';

/** Z-score normalize an array */
export function zScore(arr: number[]): number[] {
  const n = arr.length;
  if (n === 0) return [];
  const mean = arr.reduce((s, v) => s + v, 0) / n;
  const variance = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const sd = Math.sqrt(variance);
  if (sd === 0) return arr.map(() => 0);
  return arr.map(v => (v - mean) / sd);
}

/** Pearson r */
export function pearsonR(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const denom = Math.sqrt(dx2 * dy2);
  return denom === 0 ? 0 : num / denom;
}

/** First differences */
export function firstDiff(arr: number[]): number[] {
  const r = [];
  for (let i = 1; i < arr.length; i++) r.push(arr[i] - arr[i - 1]);
  return r;
}

/** Get Spotify monthly series for a date range filter */
export function filterSpotifyMonthly(
  monthly: SpotifyMonthly[],
  filter: Pick<FilterState, 'dateRange'>
): SpotifyMonthly[] {
  if (!filter.dateRange[0] && !filter.dateRange[1]) return monthly;
  return monthly.filter(m => {
    const d = spotifyMonthToDate(m.m);
    const dStr = d.toISOString().slice(0, 7);
    if (filter.dateRange[0] && dStr < filter.dateRange[0].slice(0, 7)) return false;
    if (filter.dateRange[1] && dStr > filter.dateRange[1].slice(0, 7)) return false;
    return true;
  });
}

/** Aggregate weekday-hour matrix across months */
export function aggregateWeekHour(monthly: SpotifyMonthly[]): number[][] {
  const matrix = Array.from({ length: 7 }, () => new Array(24).fill(0));
  for (const m of monthly) {
    if (!m.wh) continue;
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        matrix[d][h] += m.wh[d][h];
      }
    }
  }
  return matrix;
}

/** Compute total hours by year from monthly data */
export function hoursByYear(monthly: SpotifyMonthly[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const mo of monthly) {
    const d = spotifyMonthToDate(mo.m);
    const yr = d.getUTCFullYear();
    m.set(yr, (m.get(yr) ?? 0) + mo.h);
  }
  return m;
}
