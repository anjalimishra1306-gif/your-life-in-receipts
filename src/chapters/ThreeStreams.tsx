// src/chapters/ThreeStreams.tsx - Chapter 6: THREE STREAMS, NOT ONE

import { useState, useEffect } from 'react';
import type { FilterState, AnalysisData } from '../data/types';
import { loadAnalysis } from '../data/loaders';
import { buildCrossStreamComparisons } from '../engine/crossStream';
import type { CrossStreamComparison } from '../engine/crossStream';
import ErrorBoundary from '../components/ErrorBoundary';

interface Props {
  filter: FilterState;
  setFilter: (f: Partial<FilterState>) => void;
  setChapter: (n: number) => void;
}

function JoinAttempt({
  pair, overlapDays, overlapDescription, timeConvention, scaleNote,
  rhythmNote, categoryNote, provenanceNote,
}: CrossStreamComparison) {
  return (
    <article style={{ border: '1px solid var(--rule)', background: 'var(--ink-2)', padding: '1.5rem 2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
        <h3 style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.85rem', letterSpacing: '0.06em', color: 'var(--paper)' }}>
          {pair}
        </h3>
        <span style={{
          fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem', letterSpacing: '0.08em',
          padding: '2px 8px', border: `1px solid ${overlapDays > 0 ? 'var(--rule)' : 'var(--muted-2)'}`,
          color: overlapDays > 0 ? 'var(--paper)' : 'var(--muted)',
        }}>
          {overlapDays > 0 ? `${overlapDays.toLocaleString('en-IN')} days overlap` : 'NO CALENDAR OVERLAP'}
        </span>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {[
          { key: 'Coverage', value: overlapDescription },
          { key: 'Time convention', value: timeConvention },
          { key: 'Scale', value: scaleNote },
          { key: 'Rhythm', value: rhythmNote },
          { key: 'Category', value: categoryNote },
          { key: 'Provenance', value: provenanceNote },
        ].map(row => (
          <div key={row.key} style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.75rem', borderTop: '1px solid var(--rule)', paddingTop: '0.75rem' }}>
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.65rem', color: 'var(--muted)', letterSpacing: '0.06em', paddingTop: 1 }}>
              {row.key.toUpperCase()}
            </span>
            <p style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '0.85rem', color: 'var(--paper)', lineHeight: 1.65 }}>
              {row.value}
            </p>
          </div>
        ))}
      </div>
    </article>
  );
}

export default function ChapterThreeStreams({ setChapter }: Props) {
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalysis()
      .then(a => { setAnalysis(a); setLoading(false); })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  }, []);

  const comparisons = analysis ? buildCrossStreamComparisons(analysis) : [];

  if (loading) return <section className="chapter"><div className="loading" style={{ height: 300 }} /></section>;

  return (
    <section className="chapter" id="three-streams" aria-labelledby="ch6-title">
      <p className="chapter-num" style={{ marginBottom: '1rem' }}>06 / 07</p>
      <h2 id="ch6-title" className="font-display" style={{ fontSize: 'var(--text-3xl)', marginBottom: '0.75rem' }}>
        Three Streams, Not One
      </h2>
      <p style={{ color: 'var(--muted)', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.75rem', marginBottom: '3rem' }}>
        Why these datasets cannot be joined — and what that means for what we can know.
      </p>

      {/* Core thesis */}
      <div style={{ borderLeft: '2px solid var(--rule)', paddingLeft: '1.5rem', marginBottom: '3rem', maxWidth: 580 }}>
        <p style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 'var(--text-md)', color: 'var(--paper)', lineHeight: 1.7, marginBottom: '1rem' }}>
          Three datasets. One subject. No shared column to link them. Three different time conventions.
          Records that overlap in calendar time but refer to different things.
        </p>
        <p style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 'var(--text-md)', color: 'var(--muted)', lineHeight: 1.7 }}>
          Any cross-stream claim is a comparison of aggregate indices, not a statement about moments.
        </p>
      </div>

      {/* Join attempts */}
      {error ? (
        <div style={{ padding: '1rem', border: '1px solid var(--rule)', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.75rem', color: 'var(--muted)' }}>
          Could not load analysis: {error}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '3rem' }}>
          {comparisons.map(c => (
            <ErrorBoundary key={c.pair}>
              <JoinAttempt {...c} />
            </ErrorBoundary>
          ))}
        </div>
      )}

      {/* The fundamental limit */}
      <div style={{ border: '2px solid var(--rule)', padding: '2rem', background: 'var(--ink-2)', marginBottom: '3rem' }}>
        <p className="label" style={{ marginBottom: '1rem' }}>THE FUNDAMENTAL LIMIT</p>
        <p style={{ fontFamily: 'Fraunces Variable, serif', fontSize: 'var(--text-xl)', lineHeight: 1.5, color: 'var(--paper)', marginBottom: '1rem' }}>
          The data documents. It does not explain.
        </p>
        <p style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '0.875rem', color: 'var(--muted)', lineHeight: 1.7, marginBottom: '0.75rem' }}>
          Personal data from one source records one facet of behaviour. When two personal datasets exist, they share a subject — but the link cannot be established from data alone. The datasets were collected for different purposes, in different formats, with different conventions.
        </p>
        <p style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '0.875rem', color: 'var(--muted)', lineHeight: 1.7 }}>
          The receipts are real. The patterns are measurable. The story is an interpretation — and interpretations require more than data can give.
        </p>
      </div>

      {/* SYNTHETIC disclosure */}
      <div style={{
        border: '1px dashed var(--stream-03)', padding: '1.5rem 2rem',
        background: 'rgba(196, 118, 107, 0.04)', marginBottom: '3rem',
      }}>
        <p className="label" style={{ marginBottom: '0.75rem', color: 'var(--stream-03)' }}>
          STREAM 03 — SYNTHETIC DATA DISCLOSURE
        </p>
        <p style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '0.875rem', color: 'var(--paper)', lineHeight: 1.7, marginBottom: '0.5rem' }}>
          The Transactions dataset is computer-generated. No real individuals are represented in it. Uniform amount distributions, near-equal category counts, and absent temporal clustering are consistent with synthetic generation.
        </p>
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.7rem', color: 'var(--stream-03)', lineHeight: 1.6 }}>
          Any patterns detected in this stream describe the generator, not a person. Stream 03 is included for coverage, not inference.
        </p>
      </div>

      <button
        onClick={() => setChapter(7)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.75rem', letterSpacing: '0.08em',
          color: 'var(--paper)', border: '1px solid var(--rule)', padding: '0.75rem 1.25rem',
          cursor: 'pointer', background: 'transparent',
        }}
      >
        Continue to Discovery →
      </button>
    </section>
  );
}
