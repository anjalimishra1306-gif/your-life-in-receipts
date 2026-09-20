// src/data/loaders.ts
// Data fetch wrappers with error handling and lazy loading.

const BASE = import.meta.env.BASE_URL;

async function fetchJSON<T>(path: string): Promise<T> {
  const url = `${BASE}data/${path}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load ${url}: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

import type {
  SpotifyMonthlyData,
  SpotifyArtistsData,
  SpotifyTracksData,
  SpotifyGraphData,
  LedgerMonthlyData,
  LedgerRecordsData,
  TransactionsMonthlyData,
  TransactionsRecordsData,
  AnalysisData,
  ManifestData,
} from './types';

// Initial-load data
export const loadManifest = () => fetchJSON<ManifestData>('manifest.json');
export const loadAnalysis = () => fetchJSON<AnalysisData>('analysis.json');
export const loadSpotifyMonthly = () => fetchJSON<SpotifyMonthlyData>('spotify-monthly.json');
export const loadSpotifyArtists = () => fetchJSON<SpotifyArtistsData>('spotify-artists.json');
export const loadLedgerMonthly = () => fetchJSON<LedgerMonthlyData>('ledger-monthly.json');
export const loadTransactionsMonthly = () => fetchJSON<TransactionsMonthlyData>('transactions-monthly.json');

// Lazy-loaded data chunks
export const loadSpotifyTracks = () => fetchJSON<SpotifyTracksData>('spotify-tracks.json');
export const loadSpotifyGraph = () => fetchJSON<SpotifyGraphData>('spotify-graph.json');
export const loadLedgerRecords = () => fetchJSON<LedgerRecordsData>('ledger-records.json');
export const loadTransactionsRecords = () => fetchJSON<TransactionsRecordsData>('transactions-records.json');
