// scripts/adapters/analysis.mjs
// Computes all cross-stream statistics:
// - Coverage overlap
// - False connection: Pearson r on levels, first-differences, circular shift test
// - Join attempt metadata

function pearsonR(xs, ys) {
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

function firstDiff(arr) {
  const result = [];
  for (let i = 1; i < arr.length; i++) result.push(arr[i] - arr[i - 1]);
  return result;
}

export function computeAnalysis(spotifyData, ledgerData, transactionsData) {
  // --- Coverage ---
  const spotifyMeta = spotifyData.meta;
  const ledgerMeta = ledgerData.meta;
  const transMeta = transactionsData.meta;

  // Calendar overlap in days:
  // Ledger-Spotify: 2015-01-01 to 2018-09-20
  const ledgerStart = new Date('2015-01-01');
  const ledgerEnd = new Date('2018-09-20');
  const spotifyStart = new Date('2013-07-08');
  const spotifyEnd = new Date('2024-12-15');
  const transStart = new Date('2022-04-17');
  const transEnd = new Date('2024-04-16');

  function overlapDays(s1, e1, s2, e2) {
    const start = Math.max(s1.getTime(), s2.getTime());
    const end = Math.min(e1.getTime(), e2.getTime());
    if (end <= start) return 0;
    return Math.round((end - start) / 86400000);
  }

  const gapDays = Math.round((transStart.getTime() - ledgerEnd.getTime()) / 86400000);

  const coverage = {
    spotify: {
      firstDate: spotifyMeta.minMonth !== undefined ? '2013-07-08' : null,
      lastDate: '2024-12-15',
      activeMonths: spotifyMeta.activeMonths,
      totalMonths: spotifyMeta.totalMonths,
    },
    ledger: {
      firstDate: ledgerMeta.minDate,
      lastDate: ledgerMeta.maxDate,
      activeMonths: ledgerMeta.activeMonths,
    },
    transactions: {
      firstDate: transMeta.dateMin,
      lastDate: transMeta.dateMax,
      datedRecords: transMeta.datedRecords,
      undatedRecords: transMeta.undatedRecords,
    },
    overlaps: {
      ledgerSpotify: overlapDays(ledgerStart, ledgerEnd, spotifyStart, spotifyEnd),
      transSpotify: overlapDays(transStart, transEnd, spotifyStart, spotifyEnd),
      ledgerTrans: overlapDays(ledgerStart, ledgerEnd, transStart, transEnd),
    },
    gapDays,
  };

  // --- False Connection: Ledger rows vs Spotify plays, 2015-01..2018-09 (45 months) ---
  // Ledger month index: months since 2015-01
  // Spotify month index: months since 2013-07 = base
  // 2015-01 in spotify idx = (2015-2013)*12 + (1-7) = 24-6 = 18
  // 2018-09 in spotify idx = (2018-2013)*12 + (9-7) = 60+2 = 62

  const SPOTIFY_OVERLAP_START = 18; // 2015-01
  const SPOTIFY_OVERLAP_END = 62;   // 2018-09
  const LEDGER_OVERLAP_START = 0;   // 2015-01
  const LEDGER_OVERLAP_END = 44;    // 2018-09

  // Build aligned series: for each month in 2015-01..2018-09 (45 months)
  const spotifyMonthMap = new Map(spotifyData.monthly.map(m => [m.m, m.p]));
  const ledgerMonthMap = new Map(ledgerData.monthly.map(m => [m.m, m.tr]));

  const alignedSpotify = [];
  const alignedLedger = [];

  for (let i = 0; i < 45; i++) {
    alignedSpotify.push(spotifyMonthMap.get(SPOTIFY_OVERLAP_START + i) || 0);
    alignedLedger.push(ledgerMonthMap.get(LEDGER_OVERLAP_START + i) || 0);
  }

  const rLevel = pearsonR(alignedLedger, alignedSpotify);

  // First differences
  const fdLedger = firstDiff(alignedLedger);
  const fdSpotify = firstDiff(alignedSpotify);
  const rFirstDiff = pearsonR(fdLedger, fdSpotify);

  // Circular shift null distribution (shifts 6..n-6 = 6..39)
  const n = alignedSpotify.length;
  const shiftResults = [];
  for (let shift = 6; shift <= n - 6; shift++) {
    const shifted = alignedSpotify.slice(shift).concat(alignedSpotify.slice(0, shift));
    const r = pearsonR(alignedLedger, shifted);
    shiftResults.push({ shift, r: Math.round(r * 1000) / 1000 });
  }
  const absObserved = Math.abs(rLevel);
  const strongerOrEqual = shiftResults.filter(s => Math.abs(s.r) >= absObserved).length;
  const nullDistShare = strongerOrEqual / shiftResults.length;

  // Transactions vs Spotify monthly counts (2022-04..2024-04 = 25 months overlap, call it n=23 as stated)
  // trans monthly has "ym" like "2022-04"
  // spotify monthIdx for 2022-04 = (2022-2013)*12 + (4-7) = 108-3 = 105
  const TRANS_SP_START = 105; // 2022-04

  const transMonthMap = new Map();
  for (const m of transactionsData.monthly) {
    const [y, mo] = m.ym.split('-').map(Number);
    const idx = (y - 2013) * 12 + (mo - 7);
    transMonthMap.set(idx, Object.values(m.cats).reduce((s, v) => s + v.n, 0));
  }

  const alignedTransSpotify = [];
  const alignedTransCounts = [];
  for (let i = 0; i < 25; i++) {
    const spIdx = TRANS_SP_START + i;
    const spPlays = spotifyMonthMap.get(spIdx);
    const tCount = transMonthMap.get(spIdx);
    if (spPlays !== undefined && tCount !== undefined) {
      alignedTransSpotify.push(spPlays);
      alignedTransCounts.push(tCount);
    }
  }
  const rTransSpotify = pearsonR(alignedTransCounts, alignedTransSpotify);

  const falseConnection = {
    alignedSeries: {
      months: Array.from({ length: 45 }, (_, i) => {
        const ledgerMonth = LEDGER_OVERLAP_START + i;
        const yr = 2015 + Math.floor(ledgerMonth / 12);
        const mo = (ledgerMonth % 12) + 1;
        return `${yr}-${String(mo).padStart(2, '0')}`;
      }),
      ledgerRows: alignedLedger,
      spotifyPlays: alignedSpotify,
    },
    rLevel: Math.round(rLevel * 1000) / 1000,
    fdLedger,
    fdSpotify,
    rFirstDiff: Math.round(rFirstDiff * 1000) / 1000,
    shiftResults,
    nullDistShare: Math.round(nullDistShare * 1000) / 1000,
    strongerOrEqual,
    totalShifts: shiftResults.length,
    rTransSpotify: Math.round(rTransSpotify * 1000) / 1000,
    transSpotifyN: alignedTransSpotify.length,
  };

  // --- Join attempts ---
  const joinAttempts = [
    {
      streamA: 'spotify',
      streamB: 'ledger',
      sharedColumns: [],
      calendarOverlapDays: coverage.overlaps.ledgerSpotify,
      timeConventionA: 'UTC timestamps',
      timeConventionB: 'Naive local time, no timezone',
      notes: 'No common column. Different temporal conventions. Cannot be joined.',
    },
    {
      streamA: 'spotify',
      streamB: 'transactions',
      sharedColumns: [],
      calendarOverlapDays: coverage.overlaps.transSpotify,
      timeConventionA: 'UTC timestamps',
      timeConventionB: 'Naive, no timezone',
      notes: 'No common column. Transactions data is synthetic. Cannot be joined.',
    },
    {
      streamA: 'ledger',
      streamB: 'transactions',
      sharedColumns: [],
      calendarOverlapDays: 0,
      timeConventionA: 'Naive local time',
      timeConventionB: 'Naive, no timezone',
      notes: 'No common column. No calendar overlap. 1,305-day gap between last ledger record and first transaction record.',
    },
  ];

  const methodology = {
    spotifyDuplicates: spotifyMeta.dupCount,
    spotifySkippedFlagTrue: spotifyMeta.skippedFlagTrue,
    spotifySkippedFlagRate: Math.round((spotifyMeta.skippedFlagTrue / spotifyMeta.dedupCount) * 1000) / 1000,
    spotifyDerivedSkipCount: spotifyMeta.fwdbtnCount,
    spotifyDerivedSkipRate: Math.round((spotifyMeta.fwdbtnCount / spotifyMeta.dedupCount) * 1000) / 1000,
    spotifyShortPlays: spotifyMeta.playsUnder30,
    ledgerParseFailures: ledgerMeta.parseFailures,
    ledgerInvestmentRowsExcluded: ledgerMeta.investmentRowsExcluded,
    transNullIdRowsDropped: transMeta.nullTransIdRows,
    transUndatedRecords: transMeta.undatedRecords,
  };

  return { coverage, falseConnection, joinAttempts, methodology };
}
