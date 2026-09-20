// src/visualizations/ActivityArea.tsx
// Monthly plays/hours area chart with brush selection.

import { useMemo, useRef, useEffect, useState } from 'react';
import { scaleLinear, scalePoint } from 'd3-scale';
import { area, line } from 'd3-shape';
import type { SpotifyMonthly } from '../data/types';
import { spotifyMonthToDate } from '../utils/dates';
import { formatHours } from '../utils/format';

interface ActivityAreaProps {
  monthly: SpotifyMonthly[];
  baseYear: number;
  baseMonth: number;
  metric: 'plays' | 'hours';
  color?: string;
  height?: number;
  onBrush?: (start: number, end: number) => void;
  brushRange?: [number, number] | null;
  ariaLabel?: string;
}

function getVal(m: SpotifyMonthly, metric: 'plays' | 'hours') {
  return metric === 'plays' ? m.p : m.h;
}

export default function ActivityArea({
  monthly, metric, color = 'var(--stream-01)',
  height = 180, onBrush, brushRange, ariaLabel,
}: ActivityAreaProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(700);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const obs = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(w);
    });
    obs.observe(svg);
    return () => obs.disconnect();
  }, []);

  const margin = { top: 20, right: 16, bottom: 32, left: 40 };
  const W = width - margin.left - margin.right;
  const H = height - margin.top - margin.bottom;

  const { xScale, yScale, areaPath, linePath, labels } = useMemo(() => {
    const vals = monthly.map(m => getVal(m, metric));
    const maxVal = Math.max(...vals, 1);

    const xScale = scalePoint<number>()
      .domain(monthly.map(m => m.m))
      .range([0, W]);

    const yScale = scaleLinear()
      .domain([0, maxVal])
      .range([H, 0])
      .nice();

    const areaFn = area<SpotifyMonthly>()
      .x(m => xScale(m.m) ?? 0)
      .y0(H)
      .y1(m => yScale(getVal(m, metric)));

    const lineFn = line<SpotifyMonthly>()
      .x(m => xScale(m.m) ?? 0)
      .y(m => yScale(getVal(m, metric)));

    // Year labels
    const yearLabels: { year: number; x: number }[] = [];
    let lastYear = -1;
    for (const m of monthly) {
      const d = spotifyMonthToDate(m.m);
      const yr = d.getUTCFullYear();
      if (yr !== lastYear) {
        const x = xScale(m.m);
        if (x !== undefined) yearLabels.push({ year: yr, x });
        lastYear = yr;
      }
    }

    return {
      xScale,
      yScale,
      areaPath: areaFn(monthly) ?? '',
      linePath: lineFn(monthly) ?? '',
      labels: yearLabels,
    };
  }, [monthly, metric, W, H]);

  const yTicks = yScale.ticks(4);

  function formatTick(v: number) {
    if (metric === 'hours') return formatHours(v);
    if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
    return String(v);
  }

  const tableRows = monthly
    .filter(m => getVal(m, metric) > 0)
    .slice(0, 50);

  return (
    <figure>
      <figcaption className="caption" style={{ marginBottom: '0.5rem' }}>
        {ariaLabel ?? `Monthly ${metric === 'plays' ? 'play count' : 'hours'} — UTC timestamps`}
      </figcaption>
      <div>
        <svg
          ref={svgRef}
          width="100%"
          height={height}
          role="img"
          aria-label={ariaLabel ?? `Monthly ${metric} area chart`}
          style={{ overflow: 'visible', display: 'block' }}
        >
          <defs>
            <linearGradient id={`area-grad-${metric}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
            <clipPath id={`clip-area-${metric}`}>
              <rect x={0} y={0} width={W} height={H} />
            </clipPath>
          </defs>

          <g transform={`translate(${margin.left},${margin.top})`}>
            {/* Y grid lines */}
            {yTicks.map(v => (
              <line key={v} x1={0} x2={W} y1={yScale(v)} y2={yScale(v)}
                stroke="var(--rule)" strokeWidth={1} />
            ))}

            {/* Y labels */}
            {yTicks.map(v => (
              <text key={v} x={-6} y={yScale(v)} dy="0.35em"
                textAnchor="end" fill="var(--muted)"
                style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem' }}>
                {formatTick(v)}
              </text>
            ))}

            {/* Area */}
            <g clipPath={`url(#clip-area-${metric})`}>
              <path d={areaPath} fill={`url(#area-grad-${metric})`} />
              <path d={linePath} fill="none" stroke={color} strokeWidth={1.5} />
            </g>

            {/* Empty month indicators (hairlines below axis) */}
            {monthly.filter(m => m.p === 0).map(m => {
              const x = xScale(m.m);
              if (x === undefined) return null;
              return <rect key={m.m} x={x - 0.5} y={H} width={1} height={4}
                fill="var(--rule)" />;
            })}

            {/* Year labels */}
            {labels.map(l => (
              <g key={l.year} transform={`translate(${l.x},${H + 20})`}>
                <text
                  textAnchor="middle" fill="var(--muted)"
                  style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem' }}
                >
                  {l.year}
                </text>
              </g>
            ))}

            {/* Brush range highlight */}
            {brushRange && (() => {
              const x1 = xScale(brushRange[0]);
              const x2 = xScale(brushRange[1]);
              if (x1 === undefined || x2 === undefined) return null;
              return (
                <rect x={x1} y={0} width={x2 - x1} height={H}
                  fill={color} fillOpacity={0.08}
                  stroke={color} strokeWidth={1} strokeOpacity={0.3} />
              );
            })()}

            {/* Hover point */}
            {hoveredIdx !== null && (() => {
              const m = monthly[hoveredIdx];
              if (!m) return null;
              const x = xScale(m.m);
              const v = getVal(m, metric);
              const y = yScale(v);
              if (x === undefined) return null;
              return (
                <g>
                  <line x1={x} x2={x} y1={0} y2={H} stroke="var(--paper)" strokeWidth={1} strokeOpacity={0.3} />
                  <circle cx={x} cy={y} r={3} fill={color} />
                  <rect x={x + 6} y={y - 14} width={60} height={18} fill="var(--ink-2)" stroke="var(--rule)" strokeWidth={1} />
                  <text x={x + 10} y={y} fill="var(--paper)"
                    style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem' }}>
                    {metric === 'plays' ? v.toLocaleString('en-IN') : formatHours(v)}
                  </text>
                </g>
              );
            })()}

            {/* Invisible hit targets */}
            {monthly.map((m, i) => {
              const x = xScale(m.m);
              if (x === undefined) return null;
              const step = W / Math.max(monthly.length - 1, 1);
              return (
                <rect
                  key={m.m}
                  x={x - step / 2} y={0} width={step} height={H}
                  fill="transparent"
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onClick={() => onBrush?.(m.m, m.m)}
                  style={{ cursor: 'pointer' }}
                />
              );
            })}
          </g>
        </svg>
      </div>

      {/* Table toggle (accessible) */}
      <details style={{ marginTop: '0.5rem' }}>
        <summary className="label" style={{ cursor: 'pointer', padding: '0.25rem 0' }}>
          View as table
        </summary>
        <div style={{ overflowX: 'auto', marginTop: '0.5rem' }}>
          <table style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.65rem', width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--rule)' }}>
                <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--muted)' }}>Month</th>
                <th style={{ textAlign: 'right', padding: '4px 8px', color: 'var(--muted)' }}>{metric === 'plays' ? 'Plays' : 'Hours'}</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map(m => {
                const d = spotifyMonthToDate(m.m);
                return (
                  <tr key={m.m} style={{ borderBottom: '1px solid var(--rule)' }}>
                    <td style={{ padding: '4px 8px', color: 'var(--muted)' }}>
                      {d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', timeZone: 'UTC' })}
                    </td>
                    <td style={{ padding: '4px 8px', color: 'var(--paper)', textAlign: 'right' }}>
                      {metric === 'plays' ? getVal(m, metric).toLocaleString('en-IN') : formatHours(getVal(m, metric))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
