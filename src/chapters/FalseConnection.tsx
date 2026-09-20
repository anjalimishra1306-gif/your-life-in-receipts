// src/chapters/FalseConnection.tsx - Chapter 5: THE FALSE CONNECTION
// The analytical centrepiece. Full audit trail. No causal claims.

import { useState, useEffect } from 'react';
import type { FilterState, AnalysisData } from '../data/types';
import { loadAnalysis } from '../data/loaders';
import ErrorBoundary from '../components/ErrorBoundary';
import CorrelationScatter from '../visualizations/CorrelationScatter';
import ShiftStrip from '../visualizations/ShiftStrip';
import { firstDiff } from '../data/selectors';
import { zScore } from '../data/selectors';

interface Props {
  filter: FilterState;
  setFilter: (f: Partial<FilterState>) => void;
  setChapter: (n: number) => void;
}

export default function ChapterFalseConnection({ setChapter }: Props) {
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalysis()
      .then(a => { setAnalysis(a); setLoading(false); })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) return <section className="chapter"><div className="loading" style={{ height: 400 }} /></section>;
  if (error || !analysis) return (
    <section className="chapter">
      <div style={{ padding: '2rem', border: '1px solid var(--rule)', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.75rem', color: 'var(--muted)' }}>
        Could not load analysis data: {error}
      </div>
    </section>
  );

  const fc = analysis.falseConnection;
  const { months, ledgerRows, spotifyPlays } = fc.alignedSeries;
  const rLevel = fc.rLevel;
  const rFD = fc.rFirstDiff;
  const nullShare = fc.nullDistShare;

  const xZ = zScore(ledgerRows);
  const yZ = zScore(spotifyPlays);
  const xFD = firstDiff(ledgerRows);
  const yFD = firstDiff(spotifyPlays);

  return (
    <section className="chapter" id="false-connection" aria-labelledby="ch5-title">
      <p className="chapter-num" style={{ marginBottom: '1rem' }}>05 / 07</p>
      <h2 id="ch5-title" className="font-display" style={{ fontSize: 'var(--text-3xl)', marginBottom: '0.75rem' }}>
        The False Connection
      </h2>
      <p style={{ color: 'var(--muted)', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.75rem', marginBottom: '3rem' }}>
        Stream 01 × Stream 02 — {months.length} overlapping months — What a correlation looks like, and what it means.
      </p>

      {/* The question */}
      <div style={{
        borderLeft: '3px solid var(--stream-01)', paddingLeft: '1.5rem',
        marginBottom: '3rem', maxWidth: 560,
      }}>
        <p style={{ fontFamily: 'Fraunces Variable, serif', fontSize: 'var(--text-xl)', lineHeight: 1.4, color: 'var(--paper)', marginBottom: '0.75rem' }}>
          The more months with many ledger rows, the more plays in those months.
        </p>
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.7 }}>
          This is a testable claim. The data lets us measure it, examine it, and understand its limits.
        </p>
      </div>

      {/* Correlation audit */}
      <div style={{
        border: '1px solid var(--rule)', background: 'var(--ink-2)',
        padding: '1.5rem 2rem', marginBottom: '2.5rem',
      }}>
        <p className="label" style={{ marginBottom: '1rem' }}>CORRELATION AUDIT — LEDGER ROWS × SPOTIFY PLAYS</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
          {[
            { label: 'Overlap months', value: months.length, sub: 'Jan 2015 – Sep 2018', color: 'var(--paper)' },
            { label: 'Level r', value: `${rLevel >= 0 ? '+' : ''}${rLevel.toFixed(3)}`, sub: 'raw counts', color: 'var(--stream-01)' },
            { label: 'First-diff r', value: `${rFD >= 0 ? '+' : ''}${rFD.toFixed(3)}`, sub: 'trend removed', color: 'var(--stream-02)' },
            { label: 'Null dist share', value: `${(nullShare * 100).toFixed(0)}%`, sub: 'shifts ≥ |observed r|', color: 'var(--muted)' },
          ].map(s => (
            <div key={s.label} style={{ border: '1px solid var(--rule)', padding: '1rem' }}>
              <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem', color: 'var(--muted)', marginBottom: '0.25rem', letterSpacing: '0.06em' }}>
                {s.label.toUpperCase()}
              </p>
              <p style={{ fontFamily: 'Fraunces Variable, serif', fontSize: '1.5rem', color: s.color, fontVariantNumeric: 'tabular-nums' }}>
                {s.value}
              </p>
              <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.55rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                {s.sub}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Scatter pair */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
        <ErrorBoundary>
          <div>
            <h3 style={{ fontSize: 'var(--text-base)', marginBottom: '0.75rem' }}>Level: raw counts</h3>
            <CorrelationScatter
              xValues={xZ} yValues={yZ}
              xLabel="Ledger rows (z)" yLabel="Spotify plays (z)"
              labels={months}
              r={rLevel}
              color="var(--stream-01)"
              ariaLabel={`Scatter plot: ledger rows vs spotify plays (z-scored). r = ${rLevel >= 0 ? '+' : ''}${rLevel.toFixed(3)}`}
            />
          </div>
        </ErrorBoundary>
        <ErrorBoundary>
          <div>
            <h3 style={{ fontSize: 'var(--text-base)', marginBottom: '0.75rem' }}>First differences: trend removed</h3>
            <CorrelationScatter
              xValues={xFD} yValues={yFD}
              xLabel="Δ Ledger rows" yLabel="Δ Spotify plays"
              labels={months.slice(1)}
              r={rFD}
              color="var(--stream-02)"
              ariaLabel={`Scatter plot: first differences. r = ${rFD >= 0 ? '+' : ''}${rFD.toFixed(3)}`}
            />
          </div>
        </ErrorBoundary>
      </div>

      {/* Interpretation */}
      <div style={{
        border: '1px solid var(--rule)', borderLeft: '3px solid var(--muted)',
        background: 'var(--ink-2)', padding: '1.5rem 2rem', marginBottom: '2.5rem',
      }}>
        <p className="label" style={{ marginBottom: '0.75rem' }}>INTERPRETATION</p>
        <p style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '0.875rem', color: 'var(--paper)', lineHeight: 1.7, marginBottom: '0.75rem' }}>
          Level r = {rLevel >= 0 ? '+' : ''}{rLevel.toFixed(3)} looks substantial. But logging density in the Ledger is uneven: some years average 33 rows/month, others 86. This creates shared trend in both series.
        </p>
        <p style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '0.875rem', color: 'var(--paper)', lineHeight: 1.7 }}>
          First-difference r = {rFD >= 0 ? '+' : ''}{rFD.toFixed(3)}. When trend is removed, the month-to-month co-variation is minimal. The two series do not move together except through shared long-run growth.
        </p>
      </div>

      {/* Shift test */}
      <section aria-labelledby="fc-shift">
        <h3 id="fc-shift" style={{ fontSize: 'var(--text-lg)', marginBottom: '0.75rem' }}>Circular shift test</h3>
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.65rem', color: 'var(--muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
          We circularly shift the Ledger series by 6 to {months.length - 6} months and re-compute r. If the observed r is unusual, fewer than 5% of shifts should be as strong. {(nullShare * 100).toFixed(0)}% were.
        </p>
        <ErrorBoundary>
          <ShiftStrip
            shiftResults={fc.shiftResults}
            observedR={rLevel}
            nullDistShare={nullShare}
            color="var(--stream-01)"
          />
        </ErrorBoundary>
      </section>

      {/* Conclusion */}
      <div style={{ marginTop: '2.5rem', borderTop: '1px solid var(--rule)', paddingTop: '2rem', maxWidth: 580 }}>
        <p style={{ fontFamily: 'Fraunces Variable, serif', fontSize: 'var(--text-xl)', lineHeight: 1.5, color: 'var(--paper)', marginBottom: '1rem' }}>
          Two datasets. One shared period. A measurable level correlation.
        </p>
        <p style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '0.875rem', color: 'var(--muted)', lineHeight: 1.7 }}>
          The correlation does not survive detrending. Logging density is the most probable shared driver. These datasets share a calendar, not a causal mechanism. They cannot be joined. No individual-level inference is warranted.
        </p>
        <button
          onClick={() => setChapter(6)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: '1.5rem',
            fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.75rem', letterSpacing: '0.08em',
            color: 'var(--paper)', border: '1px solid var(--rule)', padding: '0.75rem 1.25rem',
            cursor: 'pointer', background: 'transparent',
          }}
        >
          Continue to Three Streams →
        </button>
      </div>
    </section>
  );
}
