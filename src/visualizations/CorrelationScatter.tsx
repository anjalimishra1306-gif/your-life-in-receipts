// src/visualizations/CorrelationScatter.tsx
// Scatter plot for the False Connection chapter.
// Shows both level and first-difference scatter.

import { useMemo } from 'react';
import { scaleLinear } from 'd3-scale';

interface ScatterPoint {
  x: number;
  y: number;
  label: string;
}

interface CorrelationScatterProps {
  xValues: number[];
  yValues: number[];
  xLabel: string;
  yLabel: string;
  labels?: string[];
  r: number;
  color?: string;
  height?: number;
  ariaLabel?: string;
}

export default function CorrelationScatter({
  xValues, yValues, xLabel, yLabel, labels,
  r, color = 'var(--stream-01)', height = 280, ariaLabel,
}: CorrelationScatterProps) {
  const margin = { top: 20, right: 16, bottom: 40, left: 40 };
  const W = 300 - margin.left - margin.right;
  const H = height - margin.top - margin.bottom;

  const points: ScatterPoint[] = useMemo(() =>
    xValues.map((x, i) => ({ x, y: yValues[i] ?? 0, label: labels?.[i] ?? String(i) })),
    [xValues, yValues, labels]
  );

  const xExtent = [Math.min(...xValues), Math.max(...xValues)];
  const yExtent = [Math.min(...yValues), Math.max(...yValues)];

  const xScale = useMemo(() => scaleLinear().domain(xExtent).range([0, W]).nice(), [xExtent, W]);
  const yScale = useMemo(() => scaleLinear().domain(yExtent).range([H, 0]).nice(), [yExtent, H]);

  return (
    <figure>
      <figcaption className="caption" style={{ marginBottom: '0.5rem' }}>
        {ariaLabel ?? `${xLabel} vs ${yLabel}, r = ${r >= 0 ? '+' : ''}${r.toFixed(3)}`}
      </figcaption>
      <div style={{ overflowX: 'auto' }}>
        <svg
          width={300}
          height={height}
          role="img"
          aria-label={ariaLabel ?? `Scatter plot: ${xLabel} vs ${yLabel}`}
          style={{ display: 'block' }}
        >
          <g transform={`translate(${margin.left},${margin.top})`}>
            {/* Grid */}
            {xScale.ticks(4).map(v => (
              <line key={v} x1={xScale(v)} x2={xScale(v)} y1={0} y2={H}
                stroke="var(--rule)" strokeWidth={1} />
            ))}
            {yScale.ticks(4).map(v => (
              <line key={v} x1={0} x2={W} y1={yScale(v)} y2={yScale(v)}
                stroke="var(--rule)" strokeWidth={1} />
            ))}

            {/* Zero lines */}
            <line x1={xScale(0)} x2={xScale(0)} y1={0} y2={H}
              stroke="var(--muted)" strokeWidth={1} strokeOpacity={0.5} strokeDasharray="4,2" />
            <line x1={0} x2={W} y1={yScale(0)} y2={yScale(0)}
              stroke="var(--muted)" strokeWidth={1} strokeOpacity={0.5} strokeDasharray="4,2" />

            {/* Points */}
            {points.map((p, i) => (
              <circle
                key={i}
                cx={xScale(p.x)}
                cy={yScale(p.y)}
                r={4}
                fill={color}
                fillOpacity={0.65}
                stroke={color}
                strokeWidth={0.5}
              >
                <title>{p.label}: ({p.x.toFixed(2)}, {p.y.toFixed(2)})</title>
              </circle>
            ))}

            {/* Axes */}
            <line x1={0} x2={W} y1={H} y2={H} stroke="var(--rule)" strokeWidth={1} />
            <line x1={0} x2={0} y1={0} y2={H} stroke="var(--rule)" strokeWidth={1} />

            {/* Axis labels */}
            <text x={W / 2} y={H + 32} textAnchor="middle" fill="var(--muted)"
              style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem' }}>
              {xLabel}
            </text>
            <text x={-H / 2} y={-28} textAnchor="middle" fill="var(--muted)"
              transform="rotate(-90)"
              style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem' }}>
              {yLabel}
            </text>

            {/* r label */}
            <text x={W - 4} y={12} textAnchor="end" fill={color}
              style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.75rem', fontWeight: 600 }}>
              r = {r >= 0 ? '+' : ''}{r.toFixed(3)}
            </text>
          </g>
        </svg>
      </div>

      <details style={{ marginTop: '0.5rem' }}>
        <summary className="label" style={{ cursor: 'pointer' }}>View as table</summary>
        <div style={{ overflowX: 'auto', maxHeight: 200, overflowY: 'auto', marginTop: '0.25rem' }}>
          <table style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem', borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--rule)' }}>
                <th style={{ padding: '3px 6px', textAlign: 'left', color: 'var(--muted)' }}>Period</th>
                <th style={{ padding: '3px 6px', textAlign: 'right', color: 'var(--muted)' }}>{xLabel}</th>
                <th style={{ padding: '3px 6px', textAlign: 'right', color: 'var(--muted)' }}>{yLabel}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--rule)' }}>
                  <td style={{ padding: '3px 6px', color: 'var(--muted)' }}>{p.label}</td>
                  <td style={{ padding: '3px 6px', textAlign: 'right', color: 'var(--paper)' }}>{p.x.toFixed(2)}</td>
                  <td style={{ padding: '3px 6px', textAlign: 'right', color: 'var(--paper)' }}>{p.y.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
