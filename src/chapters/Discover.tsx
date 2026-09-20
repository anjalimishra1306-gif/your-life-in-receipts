// src/chapters/Discover.tsx - Chapter 7: WHAT WE CAN DISCOVER

import { useState, useEffect, useMemo } from 'react';
import type {
  FilterState, SpotifyArtistsData, SpotifyTracksData,
  LedgerRecordsData, TransactionsRecordsData
} from '../data/types';
import {
  loadSpotifyArtists, loadSpotifyTracks,
  loadLedgerRecords, loadTransactionsRecords
} from '../data/loaders';
import ErrorBoundary from '../components/ErrorBoundary';
import { formatINR, formatTransactionAmount } from '../utils/format';
import { Lock } from 'lucide-react';

interface Props {
  filter: FilterState;
  setFilter: (f: Partial<FilterState>) => void;
  setChapter: (n: number) => void;
}

type SearchMode = 'artists' | 'tracks' | 'ledger' | 'transactions';

export default function ChapterDiscover({ filter, setFilter }: Props) {
  const [artists, setArtists] = useState<SpotifyArtistsData | null>(null);
  const [tracks, setTracks] = useState<SpotifyTracksData | null>(null);
  const [ledger, setLedger] = useState<LedgerRecordsData | null>(null);
  const [trans, setTrans] = useState<TransactionsRecordsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<SearchMode>('artists');
  const [query, setQuery] = useState(filter.search ?? '');

  useEffect(() => {
    Promise.all([
      loadSpotifyArtists(),
      loadSpotifyTracks(),
      loadLedgerRecords(),
      loadTransactionsRecords(),
    ])
      .then(([a, t, l, tr]) => {
        setArtists(a); setTracks(t); setLedger(l); setTrans(tr);
        setLoading(false);
      })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  }, []);

  // Sync filter search to local query
  useEffect(() => {
    if (filter.search !== query) setQuery(filter.search);
  }, [filter.search]);

  const artistResults = useMemo(() => {
    if (!artists || mode !== 'artists') return [];
    const q = query.toLowerCase().trim();
    return artists.artists
      .filter(a => a.a !== '__other__' && (q === '' || a.a.toLowerCase().includes(q)))
      .slice(0, 30);
  }, [artists, query, mode]);

  const trackResults = useMemo(() => {
    if (!tracks || mode !== 'tracks') return [];
    const q = query.toLowerCase().trim();
    return tracks.tracks
      .filter(t => q === '' || t.t.toLowerCase().includes(q) || t.ar.toLowerCase().includes(q))
      .slice(0, 40);
  }, [tracks, query, mode]);

  const ledgerResults = useMemo(() => {
    if (!ledger || mode !== 'ledger') return [];
    const q = query.toLowerCase().trim();
    const cat = filter.category?.toLowerCase() ?? '';
    return ledger.records
      .filter(r => {
        if (cat && r.category.toLowerCase() !== cat) return false;
        if (q === '') return true;
        return r.category.toLowerCase().includes(q) || r.family.toLowerCase().includes(q);
      })
      .slice(0, 50);
  }, [ledger, query, mode, filter.category]);

  const transResults = useMemo(() => {
    if (!trans || mode !== 'transactions') return [];
    const q = query.toLowerCase().trim();
    const cat = filter.category?.toLowerCase() ?? '';
    return trans.records
      .filter(r => {
        if (cat && r.category.toLowerCase() !== cat) return false;
        if (q === '') return true;
        return r.category.toLowerCase().includes(q);
      })
      .slice(0, 50);
  }, [trans, query, mode, filter.category]);

  const MODES: Array<{ id: SearchMode; label: string; color: string }> = [
    { id: 'artists', label: 'Artists', color: 'var(--stream-01)' },
    { id: 'tracks', label: 'Tracks', color: 'var(--stream-01)' },
    { id: 'ledger', label: 'Ledger (INR)', color: 'var(--stream-02)' },
    { id: 'transactions', label: 'Transactions (SYNTHETIC)', color: 'var(--stream-03)' },
  ];

  if (loading) return <section className="chapter"><div className="loading" style={{ height: 400 }} /></section>;

  return (
    <section className="chapter" id="discover" aria-labelledby="ch7-title">
      <p className="chapter-num" style={{ marginBottom: '1rem' }}>07 / 07</p>
      <h2 id="ch7-title" className="font-display" style={{ fontSize: 'var(--text-3xl)', marginBottom: '0.75rem' }}>
        What We Can Discover
      </h2>
      <p style={{ color: 'var(--muted)', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.75rem', marginBottom: '2rem' }}>
        Browse the aggregated records. Each record is aggregate or public-record level — no raw personal data is exposed.
      </p>

      {/* Privacy notice */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '2rem', padding: '0.75rem 1rem', border: '1px solid var(--rule)', background: 'var(--ink-2)' }}>
        <Lock size={12} color="var(--muted)" />
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.65rem', color: 'var(--muted)', lineHeight: 1.5 }}>
          Amounts above 10,000 INR are banded. Transaction amounts are unit-less (no INR symbol ever applies).
          The data shown here is derived only from pre-aggregated per-record files — no raw logs are exposed.
        </p>
      </div>

      {/* Mode tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            aria-pressed={mode === m.id}
            style={{
              fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.7rem', letterSpacing: '0.06em',
              padding: '6px 14px', cursor: 'pointer',
              border: `1px solid ${mode === m.id ? m.color : 'var(--rule)'}`,
              background: mode === m.id ? 'var(--highlight)' : 'transparent',
              color: mode === m.id ? m.color : 'var(--muted)',
              transition: 'all var(--dur-base)',
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label htmlFor="discover-search" className="label" style={{ display: 'block', marginBottom: '0.5rem' }}>
          SEARCH {mode.toUpperCase()}
        </label>
        <input
          id="discover-search"
          type="search"
          value={query}
          onChange={e => { setQuery(e.target.value); setFilter({ search: e.target.value }); }}
          placeholder={mode === 'artists' ? 'Filter artists...' : mode === 'tracks' ? 'Filter tracks or artists...' : 'Filter by category...'}
          aria-label={`Search ${mode}`}
          style={{
            width: '100%', maxWidth: 480,
            fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.85rem',
            padding: '0.75rem 1rem',
            background: 'var(--ink-2)', border: '1px solid var(--rule)', color: 'var(--paper)',
            outline: 'none',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--paper)'}
          onBlur={e => e.target.style.borderColor = 'var(--rule)'}
        />
      </div>

      {error && (
        <div style={{ padding: '1rem', border: '1px solid var(--rule)', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '1rem' }}>
          Could not load all data: {error}
        </div>
      )}

      {/* Results */}
      <ErrorBoundary>
        <div role="region" aria-live="polite" aria-label={`${mode} search results`}>
          {mode === 'artists' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.7rem', borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--rule)' }}>
                    {['Artist', 'Plays', 'Hours', 'Skip rate', 'Months active'].map(h => (
                      <th key={h} style={{ padding: '6px 10px', textAlign: h === 'Artist' ? 'left' : 'right', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {artistResults.map(a => (
                    <tr key={a.a} style={{ borderBottom: '1px solid var(--rule)' }}
                      onClick={() => setFilter({ artist: a.a, stream: 'soundtrack' })}>
                      <td style={{ padding: '6px 10px', color: 'var(--stream-01)', cursor: 'pointer' }}>{a.a}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', color: 'var(--paper)' }}>{a.p.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', color: 'var(--paper)' }}>{a.h.toFixed(0)}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', color: 'var(--stream-01)' }}>
                        {a.p > 0 ? ((a.sk / a.p) * 100).toFixed(1) : 0}%
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', color: 'var(--muted)' }}>
                        {a.mo.length}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {artistResults.length === 0 && (
                <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.75rem', color: 'var(--muted)', padding: '1rem 0' }}>
                  No artists match "{query}".
                </p>
              )}
            </div>
          )}

          {mode === 'tracks' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.7rem', borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--rule)' }}>
                    {['Track', 'Artist', 'Plays', 'Hours', 'Skip rate'].map(h => (
                      <th key={h} style={{ padding: '6px 10px', textAlign: h === 'Track' || h === 'Artist' ? 'left' : 'right', color: 'var(--muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trackResults.map((t, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--rule)' }}>
                      <td style={{ padding: '6px 10px', color: 'var(--paper)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.t}</td>
                      <td style={{ padding: '6px 10px', color: 'var(--stream-01)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.ar}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', color: 'var(--paper)' }}>{t.p.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', color: 'var(--paper)' }}>{t.h.toFixed(1)}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', color: 'var(--stream-01)' }}>
                        {t.p > 0 ? ((t.sk / t.p) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {trackResults.length === 0 && (
                <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.75rem', color: 'var(--muted)', padding: '1rem 0' }}>
                  No tracks match "{query}".
                </p>
              )}
            </div>
          )}

          {mode === 'ledger' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.7rem', borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--rule)' }}>
                    {['Date', 'Category', 'Family', 'Mode', 'Amount (INR)'].map(h => (
                      <th key={h} style={{ padding: '6px 10px', textAlign: h === 'Amount (INR)' ? 'right' : 'left', color: 'var(--muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ledgerResults.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--rule)' }}>
                      <td style={{ padding: '6px 10px', color: 'var(--muted)' }}>{r.date}</td>
                      <td style={{ padding: '6px 10px', color: 'var(--paper)' }}>{r.category}</td>
                      <td style={{ padding: '6px 10px', color: 'var(--muted)' }}>{r.family}</td>
                      <td style={{ padding: '6px 10px', color: 'var(--muted)' }}>{r.mode}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', color: 'var(--stream-02)', fontVariantNumeric: 'tabular-nums' }}>
                        {typeof r.amount === 'string' ? r.amount : formatINR(r.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {ledgerResults.length === 0 && (
                <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.75rem', color: 'var(--muted)', padding: '1rem 0' }}>
                  No ledger records match "{query}".
                </p>
              )}
            </div>
          )}

          {mode === 'transactions' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '1rem', padding: '0.5rem 0.75rem', border: '1px dashed var(--stream-03)', background: 'rgba(196,118,107,0.04)' }}>
                <span className="synthetic-badge">SYNTHETIC DATA</span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem', color: 'var(--stream-03)' }}>
                  Amounts are unit-less. No currency symbol applies. No real individuals are represented.
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.7rem', borderCollapse: 'collapse', width: '100%' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--rule)' }}>
                      {['Date', 'Hour', 'Category', 'Amount (unit-less)'].map(h => (
                        <th key={h} style={{ padding: '6px 10px', textAlign: h.includes('Amount') ? 'right' : 'left', color: 'var(--muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {transResults.map(r => (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--rule)' }}>
                        <td style={{ padding: '6px 10px', color: 'var(--muted)' }}>{r.day ?? '—'}</td>
                        <td style={{ padding: '6px 10px', color: 'var(--muted)' }}>
                          {r.hour !== null ? `${String(r.hour).padStart(2, '0')}:xx` : '—'}
                        </td>
                        <td style={{ padding: '6px 10px', color: 'var(--stream-03)' }}>{r.category}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'right', color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                          {formatTransactionAmount(r.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {transResults.length === 0 && (
                  <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.75rem', color: 'var(--muted)', padding: '1rem 0' }}>
                    No transaction records match "{query}".
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </ErrorBoundary>

      {/* Closing note */}
      <div style={{ marginTop: '4rem', borderTop: '1px solid var(--rule)', paddingTop: '2rem', maxWidth: 580 }}>
        <p style={{ fontFamily: 'Fraunces Variable, serif', fontSize: 'var(--text-xl)', lineHeight: 1.5, color: 'var(--paper)', marginBottom: '1rem' }}>
          The receipts are real. The story is yours to read.
        </p>
        <p style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '0.875rem', color: 'var(--muted)', lineHeight: 1.7 }}>
          Three datasets. Different origins. Different conventions. No shared key. No identity claim.
          The patterns are in the aggregate. The interpretation is yours to make.
        </p>
      </div>
    </section>
  );
}
