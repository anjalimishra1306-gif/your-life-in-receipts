// src/engine/crossStream.ts
// Cross-stream descriptive comparison templates.
// ONLY descriptive sentences. No causal, identity, or sentiment wording.

import type { AnalysisData } from '../data/types';

export interface CrossStreamComparison {
  pair: string;
  overlapDays: number;
  overlapDescription: string;
  timeConvention: string;
  scaleNote: string;
  rhythmNote: string;
  categoryNote: string;
  provenanceNote: string;
}

export function buildCrossStreamComparisons(analysis: AnalysisData): CrossStreamComparison[] {
  const { coverage } = analysis;

  return [
    {
      pair: 'Soundtrack + Ledger',
      overlapDays: coverage.overlaps.ledgerSpotify,
      overlapDescription: `Both datasets have records in the same ${coverage.overlaps.ledgerSpotify}-day window (2015-01-01 to 2018-09-20). No shared column exists to link individual records.`,
      timeConvention: 'Soundtrack timestamps are UTC. Ledger dates are naive local time with no timezone recorded.',
      scaleNote: 'Soundtrack records count in tens of thousands; Ledger records count in thousands.',
      rhythmNote: 'Both datasets show variation over months, but the time conventions differ and no individual-level alignment is possible.',
      categoryNote: 'Soundtrack organizes by artist and platform. Ledger organizes by spending category and payment mode.',
      provenanceNote: 'Soundtrack: real listening history. Ledger: real personal ledger.',
    },
    {
      pair: 'Soundtrack + Transactions',
      overlapDays: coverage.overlaps.transSpotify,
      overlapDescription: `Both datasets have records in the same ${coverage.overlaps.transSpotify}-day window (2022-04-17 to 2024-04-16). No shared column exists to link individual records.`,
      timeConvention: 'Soundtrack timestamps are UTC. Transactions timestamps are naive with no timezone.',
      scaleNote: 'Soundtrack records count in tens of thousands across the overlap; Transactions has 1,294 dated records.',
      rhythmNote: 'Monthly counts in both datasets vary, but the small overlap window and different temporal conventions make any comparison inconclusive.',
      categoryNote: 'Soundtrack organizes by artist and platform. Transactions organizes by spending category (online_shopping, travel, entertainment, fitness_and_medical).',
      provenanceNote: 'Soundtrack: real listening history. Transactions: SYNTHETIC dataset - no real individuals are represented.',
    },
    {
      pair: 'Ledger + Transactions',
      overlapDays: 0,
      overlapDescription: `These two datasets have no calendar overlap. The last Ledger record is 2018-09-20; the first Transaction record is 2022-04-17. There are ${analysis.coverage.gapDays} days between them.`,
      timeConvention: 'Ledger dates are naive local time. Transactions timestamps are naive with no timezone.',
      scaleNote: 'No temporal overlap means no shared period for any comparison.',
      rhythmNote: 'No monthly comparison is possible given the absence of overlap.',
      categoryNote: 'Ledger categories cover household spending; Transactions categories cover online shopping, travel, entertainment, and fitness/medical.',
      provenanceNote: 'Ledger: real personal ledger. Transactions: SYNTHETIC dataset - no real individuals are represented.',
    },
  ];
}
