// src/chapters/Archive.tsx - Chapter 1: THE ARCHIVE
// Cinematic opening with animated receipt tape strips.

import { useState, useEffect } from 'react';
import type { FilterState } from '../data/types';
import { loadManifest } from '../data/loaders';
import type { ManifestData } from '../data/types';
import Counter from '../components/Counter';
import ErrorBoundary from '../components/ErrorBoundary';
import { useInView } from '../utils/useInView';
import { useReducedMotion } from '../utils/useReducedMotion';
import { ChevronDown } from 'lucide-react';

interface Props {
  filter: FilterState;
  setFilter: (f: Partial<FilterState>) => void;
  setChapter: (n: number) => void;
}

function StreamTape({
  num,
  color,
  label,
  date,
  rawCount,
  finalCount,
  note,
  synthetic,
  delay,
  visible,
  reduced,
}: {
  num: string; color: string; label: string; date: string;
  rawCount: number; finalCount: number; note: string;
  synthetic?: boolean; delay: number; visible: boolean; reduced: boolean;
}) {
  const style: React.CSSProperties = {
    opacity: (visible || reduced) ? 1 : 0,
    transform: (visible || reduced) ? 'translateX(0)' : 'translateX(-40px)',
    transition: reduced ? 'none' : `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
  };

  return (
    <div style={style}>
      <div style={{
        border: `1px solid ${color}`,
        background: 'var(--ink-2)',
        padding: '2rem 2.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Perforated top edge */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 8,
          backgroundImage: `repeating-linear-gradient(90deg, transparent 0, transparent 6px, var(--ink) 6px, var(--ink) 10px)`,
        }} />

        <div style={{ paddingTop: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <div>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.65rem', letterSpacing: '0.12em', color: 'var(--muted)' }}>
                STREAM {num}
              </span>
              <h3 style={{
                fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.8rem',
                fontWeight: 600, color, letterSpacing: '0.06em',
                marginTop: '0.25rem',
              }}>
                {label}
              </h3>
            </div>
            {synthetic && <span className="synthetic-badge">SYNTHETIC</span>}
          </div>

          {/* Date range line */}
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--rule)' }}>DATE RANGE</span>
            <div style={{ flex: 1, borderTop: '1px dotted var(--rule)' }} />
            <span style={{ color: 'var(--paper)' }}>{date}</span>
          </div>

          {/* Count */}
          <div style={{ borderTop: '1px solid var(--rule)', paddingTop: '1.5rem' }}>
            {rawCount !== finalCount ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.65rem', color: 'var(--muted)', letterSpacing: '0.08em' }}>RAW RECORDS</span>
                  <div style={{ flex: 1, borderTop: '1px dotted var(--rule)', margin: '0 8px', alignSelf: 'center' }} />
                  <Counter value={rawCount} className="stat" style={{ fontSize: '2rem', color, fontFamily: 'Fraunces Variable, serif' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.65rem', color: 'var(--muted)', letterSpacing: '0.08em' }}>AFTER RECONCILIATION</span>
                  <div style={{ flex: 1, borderTop: '1px dotted var(--rule)', margin: '0 8px', alignSelf: 'center' }} />
                  <Counter value={finalCount} className="stat" style={{ fontSize: '2rem', color, fontFamily: 'Fraunces Variable, serif' }} />
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.65rem', color: 'var(--muted)', letterSpacing: '0.08em' }}>RECORDS</span>
                <div style={{ flex: 1, borderTop: '1px dotted var(--rule)', margin: '0 8px', alignSelf: 'center' }} />
                <Counter value={finalCount} className="stat" style={{ fontSize: '2rem', color, fontFamily: 'Fraunces Variable, serif' }} />
              </div>
            )}
          </div>

          {/* Note */}
          <p style={{
            fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.65rem', color: 'var(--muted)',
            marginTop: '1rem', lineHeight: 1.6, borderTop: '1px dotted var(--rule)', paddingTop: '0.75rem',
          }}>
            {note}
          </p>
        </div>

        {/* Perforated bottom */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 8,
          backgroundImage: `repeating-linear-gradient(90deg, transparent 0, transparent 6px, var(--ink) 6px, var(--ink) 10px)`,
        }} />
      </div>
    </div>
  );
}

export default function ChapterArchive({ setChapter }: Props) {
  const [manifest, setManifest] = useState<ManifestData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.1 });
  const reduced = useReducedMotion();

  useEffect(() => {
    loadManifest()
      .then(setManifest)
      .catch((e: Error) => setError(e.message));
  }, []);

  const spotifyFinal = manifest?.streams.spotify.dedupRows as number ?? 148675;
  const ledgerFinal = manifest?.streams.ledger.rawRows as number ?? 2461;
  const transRaw = manifest?.streams.transactions.rawRows as number ?? 10267;
  const transFinal = manifest?.streams.transactions.reconciledRecords as number ?? 1404;

  return (
    <section className="chapter" id="archive" aria-labelledby="ch1-title">
      <ErrorBoundary>
        <div ref={ref}>
          {/* Title reveal */}
          <div style={{
            marginBottom: 'var(--space-16)',
            opacity: (inView || reduced) ? 1 : 0,
            transform: (inView || reduced) ? 'translateY(0)' : 'translateY(24px)',
            transition: reduced ? 'none' : 'opacity 0.8s ease, transform 0.8s ease',
          }}>
            <p className="chapter-num" style={{ marginBottom: '1rem' }}>01 / 07</p>
            <h1 id="ch1-title" className="font-display" style={{
              fontSize: 'var(--text-4xl)',
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: '-0.03em',
              color: 'var(--paper)',
              marginBottom: '2rem',
            }}>
              The Receipts<br />Archive
            </h1>
            <p style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '0.85rem',
              color: 'var(--muted)',
              letterSpacing: '0.04em',
              lineHeight: 1.7,
              maxWidth: 480,
              borderLeft: '2px solid var(--rule)',
              paddingLeft: '1.25rem',
            }}>
              Three data streams. One question: can we find the story?
              <br /><br />
              The honest answer includes what the data cannot tell us.
              The limitation is part of the narrative, not a disclaimer.
            </p>
          </div>

          {error && (
            <div style={{ padding: '1rem', border: '1px solid var(--rule)', marginBottom: '2rem', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.75rem', color: 'var(--muted)' }}>
              Could not load manifest: {error}
            </div>
          )}

          {/* Three stream tapes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: 'var(--space-16)' }}>
            <StreamTape
              num="01" color="var(--stream-01)" label="SOUNDTRACK"
              date="2013 – 2024"
              rawCount={149860} finalCount={spotifyFinal}
              note={`${(149860 - spotifyFinal).toLocaleString('en-IN')} exact duplicate rows removed. Timestamps in UTC. Timezone of listener unknown.`}
              delay={200} visible={inView} reduced={reduced}
            />
            <StreamTape
              num="02" color="var(--stream-02)" label="LEDGER"
              date="2015 – 2018"
              rawCount={ledgerFinal} finalCount={ledgerFinal}
              note="Personal household ledger. Dates in naive local time, no timezone. All 45 months in range have records."
              delay={400} visible={inView} reduced={reduced}
            />
            <StreamTape
              num="03" color="var(--stream-03)" label="TRANSACTIONS"
              date="2022 – 2024"
              rawCount={transRaw} finalCount={transFinal}
              note={`${(transRaw - transFinal).toLocaleString('en-IN')} rows collapsed to unique records. ${649} rows lacked a transaction ID and were excluded.`}
              synthetic delay={600} visible={inView} reduced={reduced}
            />
          </div>

          {/* Enter prompt */}
          <div style={{
            opacity: (inView || reduced) ? 1 : 0,
            transition: reduced ? 'none' : 'opacity 0.8s ease 0.8s',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '1rem',
          }}>
            <p style={{
              fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.75rem',
              color: 'var(--muted)', letterSpacing: '0.06em',
            }}>
              Three datasets. Different origins. Different conventions. No shared key.
            </p>
            <button
              onClick={() => setChapter(2)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.75rem',
                letterSpacing: '0.1em', textTransform: 'uppercase',
                color: 'var(--paper)', border: '1px solid var(--paper)',
                padding: '0.75rem 1.5rem', cursor: 'pointer',
                background: 'transparent',
                transition: 'background var(--dur-base)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--highlight)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              Enter the archive <ChevronDown size={14} />
            </button>
          </div>
        </div>
      </ErrorBoundary>
    </section>
  );
}
