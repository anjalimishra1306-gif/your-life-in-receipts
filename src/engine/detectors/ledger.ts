// src/engine/detectors/ledger.ts
// Rule-based pattern detectors for STREAM 02 Ledger.

import type { Insight } from '../../data/types';
import type { LedgerMonthly } from '../../data/types';
import { ledgerMonthToDate, toMonthYear } from '../../utils/dates';

/** Category present in 80%+ of active months */
export function detectRecurringCategory(
  monthly: LedgerMonthly[],
  categoryPresence: Record<string, { mo: number[]; fm: number; lm: number; n: number }>
): Insight[] {
  const activeCount = monthly.filter(m => m.tr > 0).length;
  const results: Insight[] = [];
  for (const [cat, presence] of Object.entries(categoryPresence)) {
    const share = presence.n / activeCount;
    if (share >= 0.80 && activeCount > 0) {
      results.push({
        id: `recurring-${cat}`,
        stream: 'ledger',
        title: 'Recurring category',
        statement: `"${cat}" appears in ${presence.n} of ${activeCount} active months (${(share * 100).toFixed(0)}%).`,
        rule: 'Category present in 80% or more of active months.',
        evidence: { category: cat, activeMonths: activeCount, presentMonths: presence.n, sharePercent: Math.round(share * 100) },
        focus: { category: cat },
      });
    }
  }
  return results;
}

/** Category surge: month expense at least 2x that category's median month, above minimum */
export function detectCategorySurge(monthly: LedgerMonthly[]): Insight[] {
  const MIN_AMOUNT = 500;
  const catSeries = new Map<string, number[]>();

  for (const m of monthly) {
    for (const [cat, { s }] of Object.entries(m.cat)) {
      if (!catSeries.has(cat)) catSeries.set(cat, []);
      catSeries.get(cat)!.push(s);
    }
  }

  const results: Insight[] = [];
  for (const m of monthly) {
    for (const [cat, { s }] of Object.entries(m.cat)) {
      if (s < MIN_AMOUNT) continue;
      const series = catSeries.get(cat) ?? [];
      const sorted = [...series].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
      if (median > 0 && s >= 2 * median && s >= MIN_AMOUNT) {
        const d = ledgerMonthToDate(m.m);
        results.push({
          id: `surge-${cat}-${m.m}`,
          stream: 'ledger',
          title: 'Category spending surge',
          statement: `"${cat}" recorded ${s.toLocaleString('en-IN')} INR in ${toMonthYear(d)}, at least 2x its median month (${median.toLocaleString('en-IN')} INR).`,
          rule: 'Month expense at least 2x that category\'s median month, above 500 INR minimum.',
          evidence: { category: cat, monthIdx: m.m, amount: s, medianAmount: median, ratio: Math.round(s / median * 10) / 10 },
          focus: { category: cat },
        });
      }
    }
  }
  return results.slice(0, 8);
}

/** Months where recorded expense exceeded recorded income (transfers excluded) */
export function detectExpenseExceedsIncome(monthly: LedgerMonthly[]): Insight[] {
  const results: Insight[] = [];
  for (const m of monthly) {
    if (m.ec === 0 || m.ic === 0) continue;
    if (m.es > m.is_) {
      const d = ledgerMonthToDate(m.m);
      results.push({
        id: `expense-exceeds-${m.m}`,
        stream: 'ledger',
        title: 'Recorded expense exceeded recorded income',
        statement: `In ${toMonthYear(d)}, recorded ordinary expenses (${m.es.toLocaleString('en-IN')} INR) exceeded recorded income (${m.is_.toLocaleString('en-IN')} INR), as recorded. Transfers are excluded.`,
        rule: 'Month where ordinary expense sum exceeds income sum, as recorded. Transfers excluded.',
        evidence: { monthIdx: m.m, expenseSum: m.es, incomeSum: m.is_ },
        focus: {},
      });
    }
  }
  return results.slice(0, 5);
}

/** Density change: row count shift between years */
export function detectDensityChange(monthly: LedgerMonthly[]): Insight[] {
  const yearMap = new Map<number, { rows: number; months: number }>();
  for (const m of monthly) {
    const d = ledgerMonthToDate(m.m);
    const year = d.getUTCFullYear();
    if (!yearMap.has(year)) yearMap.set(year, { rows: 0, months: 0 });
    const y = yearMap.get(year)!;
    y.rows += m.tr;
    y.months++;
  }
  const years = Array.from(yearMap.entries()).sort((a, b) => a[0] - b[0]);
  const results: Insight[] = [];
  for (let i = 1; i < years.length; i++) {
    const [prevYear, prevData] = years[i - 1];
    const [currYear, currData] = years[i];
    if (prevData.months === 0 || currData.months === 0) continue;
    const prevAvg = prevData.rows / prevData.months;
    const currAvg = currData.rows / currData.months;
    const ratio = currAvg / prevAvg;
    if (ratio >= 2 || ratio <= 0.5) {
      results.push({
        id: `density-${currYear}`,
        stream: 'ledger',
        title: 'Logging density shift',
        statement: `Average rows logged per month changed from ${prevAvg.toFixed(0)} (${prevYear}) to ${currAvg.toFixed(0)} (${currYear}). This is a change in rows logged, not necessarily in activity.`,
        rule: 'Average monthly row count doubles or halves between adjacent years.',
        evidence: { prevYear, currYear, prevAvgRows: Math.round(prevAvg), currAvgRows: Math.round(currAvg) },
        focus: {},
      });
    }
  }
  return results;
}

export function runLedgerDetectors(
  monthly: LedgerMonthly[],
  categoryPresence: Record<string, { mo: number[]; fm: number; lm: number; n: number }>
): Insight[] {
  return [
    ...detectRecurringCategory(monthly, categoryPresence),
    ...detectCategorySurge(monthly),
    ...detectExpenseExceedsIncome(monthly),
    ...detectDensityChange(monthly),
  ];
}
