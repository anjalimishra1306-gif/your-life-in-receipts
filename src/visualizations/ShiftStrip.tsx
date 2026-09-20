// src/visualizations/ShiftStrip.tsx
// Strip chart showing circular shift null distribution.

import { useMemo } from 'react';
import { scaleLinear } from 'd3-scale';

interface ShiftStripProps {
  shiftResults: Array<{ shift: number; r: number }>;
  observedR: number;
  nullDistShare: number;
  color?: string;
  height?: number;
}

export default function ShiftStrip({ shiftResults, observedR, nullDistShare, color = 'var(--stream-01)', height = 120 }: ShiftStripProps) {
  const margin = { top: 16, right: 16, bottom: 32, left: 40 };
  const W = 440 - margin.left - margin.right;
  const H = height - margin.top - margin.bottom;

  const rVals = shiftResults.map(s => s.r);
  const maxAbs = Math.max(Math.abs(observedR), ...rVals.map(Math.abs), 0.1);

  const xScale = useMemo(() =>
    scaleLinear().domain([0, shiftResults.length - 1]).range([0, W]),
    [shiftResults.length, W]
  );
  const yScale = useMemo(() =>
    scaleLinear().domain([-maxAbs, maxAbs]).range([H, 0]).nice(),
    [maxAbs, H]
  );

  const stronger = shiftResults.filter(s => Math.abs(s.r) >= Math.abs(observedR));

  return (
    <figure>
      <figcaption className="caption" style={{ marginBottom: '0.5rem' }}>
        Circular shift test: r for each allowed shift (6 to n-6 months). Observed r ({observedR >= 0 ? '+' : ''}{observedR.toFixed(3)}) marked.
        {' '}{(nullDistShare * 100).toFixed(0)}% of shifts were at least as strong.
      </figcaption>
      <div style={{ overflowX: 'auto' }}>
        <svg width={440} height={height} role="img"
          aria-label={`Shift strip chart. ${stronger.length} of ${shiftResults.length} shifts have |r| >= |observed r = ${observedR.toFixed(3)}|`}
          style={{ display: 'block' }}>
          <g transform={`translate(${margin.left},${margin.top})`}>
            {/* Zero line */}
            <line x1={0} x2={W} y1={yScale(0)} y2={yScale(0)} stroke="var(--rule)" strokeWidth={1} />

            {/* Observed r lines */}
            <line x1={0} x2={W} y1={yScale(observedR)} y2={yScale(observedR)}
              stroke={color} strokeWidth={1.5} strokeDasharray="6,3" />
            <line x1={0} x2={W} y1={yScale(-observedR)} y2={yScale(-observedR)}
              stroke={color} strokeWidth={1} strokeDasharray="4,3" strokeOpacity={0.5} />

            {/* Shift bars */}
            {shiftResults.map((s, i) => {
              const x = xScale(i);
              const y0 = yScale(0);
              const y1 = yScale(s.r);
              const stronger_ = Math.abs(s.r) >= Math.abs(observedR);
              return (
                <line key={s.shift}
                  x1={x} x2={x} y1={y0} y2={y1}
                  stroke={stronger_ ? color : 'var(--muted)'}
                  strokeWidth={2}
                  strokeOpacity={stronger_ ? 0.8 : 0.3}
                />
              );
            })}

            {/* Y axis */}
            {yScale.ticks(4).map(v => (
              <g key={v}>
                <text x={-6} y={yScale(v)} dy="0.35em" textAnchor="end"
                  fill="var(--muted)"
                  style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem' }}>
                  {v.toFixed(2)}
                </text>
              </g>
            ))}

            <text x={W / 2} y={H + 24} textAnchor="middle" fill="var(--muted)"
              style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem' }}>
              Shift (months)
            </text>

            {/* Observed label */}
            <text x={W} y={yScale(observedR) - 4} textAnchor="end" fill={color}
              style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.65rem' }}>
              observed r = {observedR >= 0 ? '+' : ''}{observedR.toFixed(3)}
            </text>
          </g>
        </svg>
      </div>
      <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.65rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
        Highlighted bars: shifts where |r| &ge; |observed r|. Count: {stronger.length} of {shiftResults.length} ({(nullDistShare * 100).toFixed(0)}%).
      </p>
    </figure>
  );
}
