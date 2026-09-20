// src/visualizations/CoverageBands.tsx
// Three-stream shared timeline visualization for Chapter 4.

import { useMemo, useState } from 'react';
import { scalePoint } from 'd3-scale';
import type { SpotifyMonthly, LedgerMonthly, TransactionsMonthlyEntry } from '../data/types';

interface CoverageBandsProps {
  spotifyMonthly: SpotifyMonthly[];
  ledgerMonthly: LedgerMonthly[];
  transMonthly: TransactionsMonthlyEntry[];
  gapDays: number;
  onStreamClick?: (stream: 'soundtrack' | 'ledger' | 'transactions') => void;
}

// Generate all months from 2013-07 to 2024-12
function generateMonths() {
  const months: string[] = [];
  for (let y = 2013; y <= 2024; y++) {
    const startM = y === 2013 ? 7 : 1;
    const endM = y === 2024 ? 12 : 12;
    for (let m = startM; m <= endM; m++) {
      months.push(`${y}-${String(m).padStart(2, '0')}`);
    }
  }
  return months;
}

function spotifyMonthToYM(idx: number): string {
  const abs = idx + 7 - 1; // base month = 7
  const year = 2013 + Math.floor(abs / 12);
  const month = ((abs % 12) + 12) % 12 + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
}

export default function CoverageBands({
  spotifyMonthly, ledgerMonthly, transMonthly, gapDays, onStreamClick,
}: CoverageBandsProps) {
  const allMonths = useMemo(() => generateMonths(), []);
  const [scrubberIdx, setScrubberIdx] = useState(Math.floor(allMonths.length / 2));

  const spotifyMap = useMemo(() => new Map(spotifyMonthly.map(m => [spotifyMonthToYM(m.m), m.p])), [spotifyMonthly]);
  const ledgerMap = useMemo(() => {
    const mp = new Map<string, number>();
    for (const m of ledgerMonthly) {
      const year = 2015 + Math.floor(m.m / 12);
      const month = (m.m % 12) + 1;
      mp.set(`${year}-${String(month).padStart(2, '0')}`, m.tr);
    }
    return mp;
  }, [ledgerMonthly]);
  const transMap = useMemo(() => {
    const mp = new Map<string, number>();
    for (const m of transMonthly) {
      const total = Object.values(m.cats).reduce((s, v) => s + v.n, 0);
      mp.set(m.ym, total);
    }
    return mp;
  }, [transMonthly]);

  const W = 700;
  const BAND_H = 50;
  const GAP_H = 12;
  const totalH = 3 * BAND_H + 2 * GAP_H + 60;
  const xScale = scalePoint<string>().domain(allMonths).range([0, W]).padding(0);

  const spMax = Math.max(...Array.from(spotifyMap.values()), 1);
  const ldMax = Math.max(...Array.from(ledgerMap.values()), 1);
  const trMax = Math.max(...Array.from(transMap.values()), 1);

  // Gap region
  const gapStart = '2018-10';
  const gapEnd = '2022-03';
  const gapX1 = xScale(gapStart) ?? 0;
  const gapX2 = xScale(gapEnd) ?? W;

  const scrubMonth = allMonths[scrubberIdx] ?? '';
  const spVal = spotifyMap.get(scrubMonth);
  const ldVal = ledgerMap.get(scrubMonth);
  const trVal = transMap.get(scrubMonth);
  const scrubX = xScale(scrubMonth) ?? 0;

  const streams = [
    { id: 'soundtrack' as const, label: 'STREAM 01 SOUNDTRACK', color: 'var(--stream-01)', data: spotifyMap, max: spMax, y: 0 },
    { id: 'ledger' as const, label: 'STREAM 02 LEDGER', color: 'var(--stream-02)', data: ledgerMap, max: ldMax, y: BAND_H + GAP_H },
    { id: 'transactions' as const, label: 'STREAM 03 TRANSACTIONS (SYNTHETIC)', color: 'var(--stream-03)', data: transMap, max: trMax, y: 2 * (BAND_H + GAP_H) },
  ];

  const scrubValues: Record<string, number | null> = {
    soundtrack: spVal ?? null,
    ledger: ldVal ?? null,
    transactions: trVal ?? null,
  };

  return (
    <figure>
      <figcaption className="caption" style={{ marginBottom: '0.5rem' }}>
        Three-stream shared timeline, 2013-07 to 2024-12.
        Heights are relative to each stream's own maximum and are not comparable across streams.
        Hatched region = {gapDays}-day gap where no Ledger or Transactions records exist.
      </figcaption>

      <div style={{ overflowX: 'auto' }}>
        <svg width={W} height={totalH} role="img"
          aria-label={`Three-stream timeline coverage bands. Scrubber at ${scrubMonth}.`}
          style={{ display: 'block' }}>
          {/* Gap region */}
          <defs>
            <pattern id="hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="6" stroke="var(--muted)" strokeWidth="1" strokeOpacity="0.3" />
            </pattern>
          </defs>
          <rect x={gapX1} y={0} width={gapX2 - gapX1} height={3 * BAND_H + 2 * GAP_H}
            fill="url(#hatch)" />

          {streams.map(s => {
            const bars = allMonths.map(ym => {
              const val = s.data.get(ym) ?? 0;
              const bH = (val / s.max) * (BAND_H - 4);
              const x = xScale(ym) ?? 0;
              const step = W / Math.max(allMonths.length - 1, 1);
              return { ym, val, bH, x, step };
            });

            return (
              <g key={s.id} transform={`translate(0,${s.y})`}>
                {/* Band background */}
                <rect x={0} y={0} width={W} height={BAND_H}
                  fill="var(--ink-2)" stroke="var(--rule)" strokeWidth={1} />

                {/* Bars */}
                {bars.map(b => (
                  <rect key={b.ym}
                    x={b.x}
                    y={BAND_H - b.bH}
                    width={Math.max(b.step - 1, 1)}
                    height={b.bH}
                    fill={s.id === 'transactions' ? 'transparent' : s.color}
                    fillOpacity={s.id === 'transactions' ? 0 : 0.7}
                    stroke={s.id === 'transactions' ? s.color : 'none'}
                    strokeWidth={b.bH > 0 ? 1 : 0}
                    strokeOpacity={0.7}
                  />
                ))}

                {/* Label */}
                <text x={4} y={14} fill={s.color}
                  style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem', letterSpacing: '0.06em' }}>
                  {s.label}
                </text>
                <text x={4} y={27} fill="var(--muted)"
                  style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.55rem' }}>
                  heights relative to own maximum
                </text>

                {/* Click to navigate */}
                <rect x={0} y={0} width={W} height={BAND_H} fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onClick={() => onStreamClick?.(s.id)}
                  role="button"
                  aria-label={`View ${s.label} chapter`}
                />
              </g>
            );
          })}

          {/* Gap label */}
          <text
            x={(gapX1 + gapX2) / 2} y={3 * BAND_H + 2 * GAP_H + 20}
            textAnchor="middle" fill="var(--muted)"
            style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem' }}>
            {gapDays.toLocaleString('en-IN')} days — no Ledger or Transaction records
          </text>

          {/* Scrubber line */}
          <line x1={scrubX} x2={scrubX} y1={0} y2={3 * BAND_H + 2 * GAP_H}
            stroke="var(--paper)" strokeWidth={1.5} strokeOpacity={0.6} />

          {/* Year labels */}
          {[2014, 2016, 2018, 2020, 2022, 2024].map(yr => {
            const x = xScale(`${yr}-01`) ?? 0;
            return (
              <text key={yr} x={x} y={3 * BAND_H + 2 * GAP_H + 44} textAnchor="middle"
                fill="var(--muted)"
                style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem' }}>
                {yr}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Scrubber */}
      <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <label htmlFor="timeline-scrubber" className="label">MONTH</label>
        <input
          id="timeline-scrubber"
          type="range"
          min={0} max={allMonths.length - 1} step={1}
          value={scrubberIdx}
          onChange={e => setScrubberIdx(parseInt(e.target.value, 10))}
          onKeyDown={e => {
            if (e.key === 'ArrowLeft') setScrubberIdx(i => Math.max(0, i - 1));
            if (e.key === 'ArrowRight') setScrubberIdx(i => Math.min(allMonths.length - 1, i + 1));
          }}
          aria-label={`Timeline scrubber: ${scrubMonth}`}
          aria-valuetext={scrubMonth}
          style={{ flex: 1, maxWidth: 400, accentColor: 'var(--paper)' }}
        />
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.75rem', color: 'var(--paper)', minWidth: 70 }}>
          {scrubMonth}
        </span>
      </div>

      {/* Scrubber readout */}
      <div role="status" aria-live="polite" style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
        {streams.map(s => (
          <div key={s.id} style={{ border: '1px solid var(--rule)', padding: '0.75rem', background: 'var(--ink-2)' }}>
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem', color: s.color, letterSpacing: '0.06em', marginBottom: '0.25rem' }}>
              {s.label.split(' ').slice(0, 3).join(' ')}
            </p>
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.9rem', color: 'var(--paper)', fontVariantNumeric: 'tabular-nums' }}>
              {scrubValues[s.id] !== null
                ? scrubValues[s.id]!.toLocaleString('en-IN')
                : <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>No records</span>
              }
            </p>
          </div>
        ))}
      </div>

      <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.65rem', color: 'var(--muted)', marginTop: '1rem' }}>
        We know what the datasets contain. We do not know what happened outside them.
      </p>
    </figure>
  );
}
