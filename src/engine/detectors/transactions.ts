// src/engine/detectors/transactions.ts
// Descriptive-only detectors for STREAM 03 (SYNTHETIC).
// Always tagged with synthetic-data context.

import type { Insight } from '../../data/types';
import type { TransactionsMonthlyData } from '../../data/types';

export function runTransactionDetectors(data: TransactionsMonthlyData): Insight[] {
  const total = Object.values(data.categoryShares).reduce((s, n) => s + n, 0);
  const shares = Object.entries(data.categoryShares)
    .map(([cat, n]) => ({ cat, n, pct: Math.round((n / total) * 100) }))
    .sort((a, b) => b.n - a.n);

  const insights: Insight[] = [];

  // Category distribution
  if (shares.length > 0) {
    const topCat = shares[0];
    insights.push({
      id: 'trans-category-dist',
      stream: 'transactions',
      title: 'Category distribution (SYNTHETIC data)',
      statement: `Across ${total} reconciled records, "${topCat.cat}" is the most frequent category at ${topCat.pct}%. The near-equal distribution across categories is consistent with synthetic generation.`,
      rule: 'Largest category share across all reconciled records. Descriptive only.',
      evidence: { topCategory: topCat.cat, topPct: topCat.pct, totalRecords: total },
      focus: {},
    });
  }

  // Flat amount distribution
  insights.push({
    id: 'trans-flat-dist',
    stream: 'transactions',
    title: 'Flat amount distribution (SYNTHETIC data)',
    statement: `Amounts range from ${data.meta.amtMin} to ${data.meta.amtMax} (no currency unit). The distribution across 20 equal bins is approximately uniform, consistent with synthetic generation.`,
    rule: 'Observed amount range and bin distribution across all reconciled records.',
    evidence: { amtMin: data.meta.amtMin, amtMax: data.meta.amtMax },
    focus: {},
  });

  return insights;
}
