// src/data/types.ts
// Shared TypeScript types for all data streams.

export type StreamId = 'soundtrack' | 'ledger' | 'transactions';
export type PrivacyLevel = 'aggregate' | 'banded' | 'public-record';
export type RecordType = 'track' | 'expense' | 'transaction';

/** The normalized unit shown when a user opens a record */
export interface Receipt {
  id: string;
  stream: StreamId;
  type: RecordType;
  /** ISO day or year-month string */
  date: string;
  title: string;
  category: string;
  amount?: number | string; // string only for banded amounts like "10,000+"
  unit?: 'INR' | 'unspecified';
  meta: Record<string, string | number>;
  source: string;
  privacy: PrivacyLevel;
}

// ---- Spotify types ----

export interface SpotifyMonthly {
  m: number;   // month index (0 = 2013-07)
  p: number;   // plays
  l: number;   // listens (>= 30s)
  h: number;   // hours
  sk: number;  // derived skips (fwdbtn/nextbtn)
  sp: number;  // short plays (< 30s)
  sh: number;  // shuffle plays
  pl: Record<string, number>;   // platform counts
  rs: Record<string, number>;   // reason_start counts
  re: Record<string, number>;   // reason_end counts
  wh: number[][] | null;        // 7x24 weekday-hour matrix or null if empty
}

export interface SpotifyYear {
  year: number;
  plays: number;
  listens: number;
  hours: number;
  skips: number;
  artists: number;
  tracks: number;
}

export interface SpotifyArtist {
  a: string;         // artist name
  p: number;         // plays
  l: number;         // listens
  h: number;         // hours
  sk: number;        // skips
  hh: number[];      // 24-bucket hour histogram
  wh: number[];      // 7-bucket weekday histogram
  fm: number;        // first month index
  lm: number;        // last month index
  mo: [number, number, number][]; // sparse [monthIdx, plays, minutes]
}

export interface SpotifyTrack {
  t: string;   // track name
  ar: string;  // artist
  al: string;  // album
  p: number;   // plays
  l: number;   // listens
  h: number;   // hours
  sk: number;  // skips
  fm: number | null;
  lm: number | null;
  mo: [number, number][]; // [monthIdx, plays] sparkline
}

export interface SpotifyMonthlyData {
  baseYear: number;
  baseMonth: number;
  monthly: SpotifyMonthly[];
  years: SpotifyYear[];
  meta: SpotifyMeta;
}

export interface SpotifyMeta {
  rawCount: number;
  dupCount: number;
  dedupCount: number;
  playsUnder30: number;
  playsZeroMs: number;
  skippedFlagTrue: number;
  fwdbtnCount: number;
  minMonth: number;
  maxMonth: number;
  activeMonths: number;
  totalMonths: number;
  baseYear: number;
  baseMonth: number;
}

export interface SpotifyArtistsData {
  artists: SpotifyArtist[];
}

export interface SpotifyTracksData {
  tracks: SpotifyTrack[];
}

export interface SpotifyGraphData {
  graph: Record<string, Array<{ n: string; c: number }>>;
}

// ---- Ledger types ----

export interface LedgerMonthly {
  m: number;   // month index (0 = 2015-01)
  es: number;  // expense sum
  ec: number;  // expense count
  is_: number; // income sum
  ic: number;  // income count
  ts: number;  // transfer-out sum
  tc: number;  // transfer-out count
  tr: number;  // total rows (density)
  cat: Record<string, { s: number; c: number }>;  // category: sum, count
  mg: Record<string, number>;  // mode group counts
  inv: number; // investment sum (excluded from ordinary spending)
}

export interface LedgerRecord {
  id: number;
  date: string;
  category: string;
  family: string;
  mode: string;
  amount: number | string; // string for "10,000+"
  sub?: string; // subcategory (Food/Transport only)
}

export interface LedgerMonthlyData {
  monthly: LedgerMonthly[];
  weekdayHist: number[];
  hourHist: number[];
  categoryPresence: Record<string, { mo: number[]; fm: number; lm: number; n: number }>;
  meta: LedgerMeta;
}

export interface LedgerMeta {
  rawCount: number;
  parseFailures: number;
  byType: Record<string, number>;
  minDate: string;
  maxDate: string;
  activeMonths: number;
  minMonthIdx: number;
  maxMonthIdx: number;
  investmentRowsExcluded: number;
  timedRows: number;
  recordCount: number;
}

export interface LedgerRecordsData {
  records: LedgerRecord[];
}

// ---- Transactions types ----

export interface TransactionRecord {
  id: number;
  day: string | null;
  hour: number | null;
  category: string;
  amount: number | null;
}

export interface TransactionsMonthlyCat {
  n: number; // count
  s: number; // sum
}

export interface TransactionsMonthlyEntry {
  ym: string;
  cats: Record<string, TransactionsMonthlyCat>;
}

export interface TransactionsMonthlyData {
  monthly: TransactionsMonthlyEntry[];
  hourHist: number[];
  amtHist: { min: number; max: number; bins: number[] };
  categoryShares: Record<string, number>;
  meta: TransactionsMeta;
}

export interface TransactionsMeta {
  rawCount: number;
  nullTransIdRows: number;
  withIdCount: number;
  reconciledRecords: number;
  datedRecords: number;
  undatedRecords: number;
  dateMin: string | null;
  dateMax: string | null;
  amtMin: number;
  amtMax: number;
}

export interface TransactionsRecordsData {
  records: TransactionRecord[];
}

// ---- Analysis types ----

export interface AnalysisData {
  coverage: CoverageData;
  falseConnection: FalseConnectionData;
  joinAttempts: JoinAttempt[];
  methodology: MethodologyData;
}

export interface CoverageData {
  spotify: { firstDate: string; lastDate: string; activeMonths: number; totalMonths: number };
  ledger: { firstDate: string; lastDate: string; activeMonths: number };
  transactions: { firstDate: string | null; lastDate: string | null; datedRecords: number; undatedRecords: number };
  overlaps: { ledgerSpotify: number; transSpotify: number; ledgerTrans: number };
  gapDays: number;
}

export interface FalseConnectionData {
  alignedSeries: {
    months: string[];
    ledgerRows: number[];
    spotifyPlays: number[];
  };
  rLevel: number;
  fdLedger: number[];
  fdSpotify: number[];
  rFirstDiff: number;
  shiftResults: Array<{ shift: number; r: number }>;
  nullDistShare: number;
  strongerOrEqual: number;
  totalShifts: number;
  rTransSpotify: number;
  transSpotifyN: number;
}

export interface JoinAttempt {
  streamA: string;
  streamB: string;
  sharedColumns: string[];
  calendarOverlapDays: number;
  timeConventionA: string;
  timeConventionB: string;
  notes: string;
}

export interface MethodologyData {
  spotifyDuplicates: number;
  spotifySkippedFlagTrue: number;
  spotifySkippedFlagRate: number;
  spotifyDerivedSkipCount: number;
  spotifyDerivedSkipRate: number;
  spotifyShortPlays: number;
  ledgerParseFailures: number;
  ledgerInvestmentRowsExcluded: number;
  transNullIdRowsDropped: number;
  transUndatedRecords: number;
}

export interface ManifestData {
  version: string;
  generatedAt: string;
  streams: {
    spotify: Record<string, number | string>;
    ledger: Record<string, number | string>;
    transactions: Record<string, number | string | boolean>;
  };
  falseConnection: {
    rLevel: number;
    rFirstDiff: number;
    nullDistShare: number;
    rTransSpotify: number;
  };
}

// ---- Filter state ----

export interface FilterState {
  chapter: number;
  stream: StreamId | 'all';
  dateRange: [string | null, string | null];
  artist: string | null;
  track: string | null;
  category: string | null;
  family: string | null;
  platform: string | null;
  utcOffset: number;
  shuffle: boolean | null;
  search: string;
}

export const DEFAULT_FILTER: FilterState = {
  chapter: 1,
  stream: 'all',
  dateRange: [null, null],
  artist: null,
  track: null,
  category: null,
  family: null,
  platform: null,
  utcOffset: 0,
  shuffle: null,
  search: '',
};

// ---- Insight/Pattern types ----

export interface Insight {
  id: string;
  stream: StreamId | 'cross';
  title: string;
  statement: string;
  rule: string;
  evidence: Record<string, number | string>;
  focus: Partial<FilterState>;
}
