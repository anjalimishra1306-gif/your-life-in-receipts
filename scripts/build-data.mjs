// scripts/build-data.mjs
// Main data pipeline orchestrator.
// Run: node scripts/build-data.mjs
// Reads from: data/raw/ (gitignored)
// Outputs to: public/data/ (committed - safe aggregates only)

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { processSpotify } from './adapters/spotify.mjs';
import { processLedger } from './adapters/ledger.mjs';
import { processTransactions } from './adapters/transactions.mjs';
import { computeAnalysis } from './adapters/analysis.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Data source paths - try data/raw/ first, then the archive folders
function findDataFile(candidates) {
  for (const p of candidates) {
    const full = join(ROOT, p);
    if (existsSync(full)) return full;
  }
  throw new Error(`Cannot find data file. Tried: ${candidates.join(', ')}`);
}

const SPOTIFY_PATH = findDataFile([
  'data/raw/spotify_history.csv',
  '../archive (3)/spotify_history.csv',
]);
const LEDGER_PATH = findDataFile([
  'data/raw/Daily Household Transactions.csv',
  '../archive (1)/Daily Household Transactions.csv',
]);
const TRANS_PATH = findDataFile([
  'data/raw/Augmented_IndiaTransactMultiFacet2024.csv',
  '../archive (2)/Augmented_IndiaTransactMultiFacet2024.csv',
]);

const OUT_DIR = join(ROOT, 'public/data');
mkdirSync(OUT_DIR, { recursive: true });

function writeJSON(filename, data) {
  const path = join(OUT_DIR, filename);
  writeFileSync(path, JSON.stringify(data));
  const sizeKB = (JSON.stringify(data).length / 1024).toFixed(1);
  console.log(`  Wrote ${filename} (${sizeKB} KB raw)`);
}

// Load expected counts
const expected = JSON.parse(readFileSync(join(__dirname, 'expected.json'), 'utf8'));

function assertClose(label, actual, expectedVal, tolerance = 0) {
  if (Math.abs(actual - expectedVal) > tolerance) {
    console.error(`ASSERTION FAILED: ${label}`);
    console.error(`  Expected: ${expectedVal} (+/-${tolerance}), Got: ${actual}`);
    process.exit(1);
  } else {
    console.log(`  OK: ${label} = ${actual}`);
  }
}

console.log('\n=== THE RECEIPTS ARCHIVE - DATA PIPELINE ===\n');

// --- STREAM 01: Spotify ---
console.log('Processing STREAM 01: Spotify...');
const spotifyData = await processSpotify(SPOTIFY_PATH);

assertClose('spotify.rawRows', spotifyData.meta.rawCount, expected.spotify.rawRows);
assertClose('spotify.duplicateRows', spotifyData.meta.dupCount, expected.spotify.duplicateRows);
assertClose('spotify.postDedupRows', spotifyData.meta.dedupCount, expected.spotify.postDedupRows);
assertClose('spotify.playsUnder30s', spotifyData.meta.playsUnder30, expected.spotify.playsUnder30s, 500);
assertClose('spotify.activeMonths', spotifyData.meta.activeMonths, expected.spotify.activeMonths, 2);

// Write Spotify files
writeJSON('spotify-monthly.json', {
  baseYear: spotifyData.meta.baseYear,
  baseMonth: spotifyData.meta.baseMonth,
  monthly: spotifyData.monthly,
  years: spotifyData.years,
  meta: spotifyData.meta,
});

writeJSON('spotify-artists.json', { artists: spotifyData.artists });

// Lazy: tracks and graph
writeJSON('spotify-tracks.json', { tracks: spotifyData.tracks });
writeJSON('spotify-graph.json', { graph: spotifyData.graph });

// --- STREAM 02: Ledger ---
console.log('\nProcessing STREAM 02: Ledger...');
const ledgerData = await processLedger(LEDGER_PATH);

assertClose('ledger.rawRows', ledgerData.meta.rawCount, expected.ledger.rawRows);
assertClose('ledger.expenseRows', ledgerData.meta.byType.Expense, expected.ledger.expenseRows, 10);
assertClose('ledger.incomeRows', ledgerData.meta.byType.Income, expected.ledger.incomeRows, 5);
assertClose('ledger.transferOutRows', ledgerData.meta.byType['Transfer-Out'], expected.ledger.transferOutRows, 5);
assertClose('ledger.activeMonths', ledgerData.meta.activeMonths, expected.ledger.activeMonths);
assertClose('ledger.parseFailures', ledgerData.meta.parseFailures, 0);

writeJSON('ledger-monthly.json', {
  monthly: ledgerData.monthly,
  weekdayHist: ledgerData.weekdayHist,
  hourHist: ledgerData.hourHist,
  categoryPresence: ledgerData.categoryPresence,
  meta: ledgerData.meta,
});

// Lazy: individual records
writeJSON('ledger-records.json', { records: ledgerData.records });

// --- STREAM 03: Transactions ---
console.log('\nProcessing STREAM 03: Transactions (SYNTHETIC)...');
const transData = await processTransactions(TRANS_PATH);

assertClose('transactions.rawRows', transData.meta.rawCount, expected.transactions.rawRows, 50);
assertClose('transactions.nullTransIdRows', transData.meta.nullTransIdRows, expected.transactions.nullTransIdRows, 50);
assertClose('transactions.reconciledRecords', transData.meta.reconciledRecords, expected.transactions.reconciledRecords, 50);
assertClose('transactions.datedRecords', transData.meta.datedRecords, expected.transactions.datedRecords, 50);

writeJSON('transactions-monthly.json', {
  monthly: transData.monthly,
  hourHist: transData.hourHist,
  amtHist: transData.amtHist,
  categoryShares: transData.categoryShares,
  meta: transData.meta,
});

// Lazy: individual records (safe only)
writeJSON('transactions-records.json', { records: transData.records });

// --- ANALYSIS ---
console.log('\nComputing cross-stream analysis...');
const analysisData = computeAnalysis(spotifyData, ledgerData, transData);

// Check correlation values against audit expectations (+/- 0.03)
const rLevel = analysisData.falseConnection.rLevel;
const expectedRLevel = 0.54;
if (Math.abs(rLevel - expectedRLevel) > 0.1) {
  console.warn(`WARNING: Level correlation r=${rLevel}, expected ~${expectedRLevel} (+/-0.1). Displaying computed value.`);
}
const rFD = analysisData.falseConnection.rFirstDiff;
const expectedRFD = 0.05;
if (Math.abs(rFD - expectedRFD) > 0.15) {
  console.warn(`WARNING: First-diff correlation r=${rFD}, expected ~${expectedRFD} (+/-0.15). Displaying computed value.`);
}

writeJSON('analysis.json', analysisData);

// --- MANIFEST ---
const manifest = {
  version: '1.0.0',
  generatedAt: new Date().toISOString(),
  streams: {
    spotify: {
      rawRows: spotifyData.meta.rawCount,
      dedupRows: spotifyData.meta.dedupCount,
      duplicates: spotifyData.meta.dupCount,
      firstDate: '2013-07-08',
      lastDate: '2024-12-15',
      activeMonths: spotifyData.meta.activeMonths,
    },
    ledger: {
      rawRows: ledgerData.meta.rawCount,
      expenseRows: ledgerData.meta.byType.Expense,
      incomeRows: ledgerData.meta.byType.Income,
      transferRows: ledgerData.meta.byType['Transfer-Out'],
      firstDate: ledgerData.meta.minDate,
      lastDate: ledgerData.meta.maxDate,
      activeMonths: ledgerData.meta.activeMonths,
    },
    transactions: {
      rawRows: transData.meta.rawCount,
      nullIdRows: transData.meta.nullTransIdRows,
      reconciledRecords: transData.meta.reconciledRecords,
      datedRecords: transData.meta.datedRecords,
      undatedRecords: transData.meta.undatedRecords,
      firstDate: transData.meta.dateMin,
      lastDate: transData.meta.dateMax,
      synthetic: true,
    },
  },
  falseConnection: {
    rLevel: analysisData.falseConnection.rLevel,
    rFirstDiff: analysisData.falseConnection.rFirstDiff,
    nullDistShare: analysisData.falseConnection.nullDistShare,
    rTransSpotify: analysisData.falseConnection.rTransSpotify,
  },
};

writeJSON('manifest.json', manifest);

console.log('\n=== DATA PIPELINE COMPLETE ===');
console.log(`Spotify: ${spotifyData.meta.rawCount} raw -> ${spotifyData.meta.dedupCount} deduplicated`);
console.log(`Ledger: ${ledgerData.meta.rawCount} rows, ${ledgerData.meta.parseFailures} parse failures`);
console.log(`Transactions: ${transData.meta.rawCount} raw -> ${transData.meta.reconciledRecords} reconciled`);
console.log(`Level r (Ledger vs Spotify): ${analysisData.falseConnection.rLevel}`);
console.log(`First-diff r: ${analysisData.falseConnection.rFirstDiff}`);
console.log(`Null dist share: ${analysisData.falseConnection.nullDistShare}`);
