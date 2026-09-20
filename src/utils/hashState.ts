// src/utils/hashState.ts
// URL hash serialization for shareable filter state and chapter navigation.
// Uses hash routing: #/chapter?key=val&key=val

import type { FilterState } from '../data/types';
import { DEFAULT_FILTER } from '../data/types';

const CHAPTERS = ['archive', 'soundtrack', 'ledger', 'gap', 'false-connection', 'three-streams', 'discover'];

export function chapterToIndex(slug: string): number {
  const i = CHAPTERS.indexOf(slug);
  return i >= 0 ? i + 1 : 1;
}

export function indexToChapter(n: number): string {
  return CHAPTERS[n - 1] ?? CHAPTERS[0];
}

function encodeFilter(filter: FilterState): string {
  const params = new URLSearchParams();
  if (filter.stream !== 'all') params.set('stream', filter.stream);
  if (filter.dateRange[0]) params.set('from', filter.dateRange[0]);
  if (filter.dateRange[1]) params.set('to', filter.dateRange[1]);
  if (filter.artist) params.set('artist', filter.artist);
  if (filter.track) params.set('track', filter.track);
  if (filter.category) params.set('cat', filter.category);
  if (filter.family) params.set('family', filter.family);
  if (filter.platform) params.set('platform', filter.platform);
  if (filter.utcOffset !== 0) params.set('utc', String(filter.utcOffset));
  if (filter.shuffle !== null) params.set('shuffle', filter.shuffle ? '1' : '0');
  if (filter.search) params.set('q', filter.search);
  return params.toString();
}

function decodeFilter(qs: string): Partial<FilterState> {
  const params = new URLSearchParams(qs);
  const f: Partial<FilterState> = {};
  const stream = params.get('stream');
  if (stream === 'soundtrack' || stream === 'ledger' || stream === 'transactions') f.stream = stream;
  const from = params.get('from');
  const to = params.get('to');
  if (from || to) f.dateRange = [from, to];
  const artist = params.get('artist');
  if (artist) f.artist = artist;
  const track = params.get('track');
  if (track) f.track = track;
  const cat = params.get('cat');
  if (cat) f.category = cat;
  const family = params.get('family');
  if (family) f.family = family;
  const platform = params.get('platform');
  if (platform) f.platform = platform;
  const utc = params.get('utc');
  if (utc !== null) f.utcOffset = parseInt(utc, 10);
  const shuffle = params.get('shuffle');
  if (shuffle !== null) f.shuffle = shuffle === '1';
  const q = params.get('q');
  if (q) f.search = q;
  return f;
}

/** Read the current URL hash and return parsed chapter index + filter state */
export function readHash(): { chapter: number; filter: FilterState } {
  const hash = window.location.hash.slice(1); // remove #
  const [path, qs] = hash.split('?');
  const slug = path.replace(/^\//, '');
  const chapter = chapterToIndex(slug);
  const filter = { ...DEFAULT_FILTER, ...decodeFilter(qs ?? ''), chapter };
  return { chapter, filter };
}

/** Write chapter + filter to URL hash without triggering navigation */
export function writeHash(chapter: number, filter: FilterState): void {
  const slug = indexToChapter(chapter);
  const qs = encodeFilter(filter);
  const hash = qs ? `#/${slug}?${qs}` : `#/${slug}`;
  history.replaceState(null, '', hash);
  document.title = `The Receipts Archive - Chapter ${chapter}`;
}
