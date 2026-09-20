// src/chapters/Gap.tsx - Chapter 4: THE GAP

import { useState, useEffect } from 'react';
import type { FilterState, SpotifyMonthlyData, LedgerMonthlyData, TransactionsMonthlyData, AnalysisData } from '../data/types';
import { loadSpotifyMonthly, loadLedgerMonthly, loadTransactionsMonthly, loadAnalysis } from '../data/loaders';
import ErrorBoundary from '../components/ErrorBoundary';
import CoverageBands from '../visualizations/CoverageBands';

interface Props {
  filter: FilterState;
  setFilter: (f: Partial<FilterState>) => void;
  setChapter: (n: number) => void;
}

export default function ChapterGap({ setChapter }: Props) {
  const [spotify, setSpotify] = useState<SpotifyMonthlyData | null>(null);
  const [ledger, setLedger] = useState<LedgerMonthlyData | null>(null);
  const [trans, setTrans] = useState<TransactionsMonthlyData | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([loadSpotifyMonthly(), loadLedgerMonthly(), loadTransactionsMonthly(), loadAnalysis()])
      .then(([s, l, t, a]) => { setSpotify(s); setLedger(l); setTrans(t); setAnalysis(a); setLoading(false); })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  }, []);

  const gapDays = analysis?.coverage.gapDays ?? 1305;

  if (loading) return <section className="chapter"><div className="loading" style={{ height: 300 }} /></section>;
  if (error || !spotify || !ledger || !trans) return (
    <section className="chapter">
      <div style={{ padding: '2rem', border: '1px solid var(--rule)', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.75rem', color: 'var(--muted)' }}>
        Could not load gap data: {error}
      </div>
    </section>
  );

  return (
    <section className="chapter" id="gap" aria-labelledby="ch4-title">
      <p className="chapter-num" style={{ marginBottom: '1rem' }}>04 / 07</p>
      <h2 id="ch4-title" className="font-display" style={{ fontSize: 'var(--text-3xl)', marginBottom: '0.75rem' }}>
        The Gap
      </h2>
      <p style={{ color: 'var(--muted)', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.75rem', marginBottom: '1rem' }}>
        A shared calendar. Three streams. One long silence.
      </p>

      {/* Gap callout */}
      <div style={{
        border: '1px solid var(--rule)',
        borderLeft: '3px solid var(--muted)',
        padding: '1.5rem 2rem',
        background: 'var(--ink-2)',
        marginBottom: '3rem',
      }}>
        <p style={{ fontFamily: 'Fraunces Variable, serif', fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--paper)', lineHeight: 1, marginBottom: '0.5rem', fontVariantNumeric: 'tabular-nums' }}>
          {gapDays.toLocaleString('en-IN')} days
        </p>
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.6 }}>
          Between the last ledger record (2018-09-20) and the first transaction record (2022-04-17).
          The Soundtrack dataset continues through this interval. The Ledger and Transactions datasets do not overlap with each other anywhere.
        </p>
      </div>

      {/* Coverage bands visualization */}
      <ErrorBoundary>
        <CoverageBands
          spotifyMonthly={spotify.monthly}
          ledgerMonthly={ledger.monthly}
          transMonthly={trans.monthly}
          gapDays={gapDays}
          onStreamClick={(stream) => {
            if (stream === 'soundtrack') setChapter(2);
            if (stream === 'ledger') setChapter(3);
            if (stream === 'transactions') setChapter(7);
          }}
        />
      </ErrorBoundary>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '3rem' }}>
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.7, maxWidth: 600 }}>
          We know what the datasets contain. We do not know what happened outside them.
        </p>
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.7, maxWidth: 600 }}>
          In the hatched region, no Ledger or Transaction records exist. This is a fact about the datasets, not about the period itself.
          The Soundtrack dataset has {spotify.monthly.filter(m => {
            const ym = (() => {
              const abs = m.m + 7 - 1;
              const year = 2013 + Math.floor(abs / 12);
              const month = ((abs % 12) + 12) % 12 + 1;
              return `${year}-${String(month).padStart(2, '0')}`;
            })();
            return ym >= '2018-10' && ym <= '2022-03' && m.p > 0;
          }).length} months with records in this interval.
        </p>
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.75rem', color: 'var(--paper)', lineHeight: 1.7, maxWidth: 600, borderLeft: '2px solid var(--rule)', paddingLeft: '1rem' }}>
          "No records" — not "nothing happened."
        </p>
      </div>
    </section>
  );
}
