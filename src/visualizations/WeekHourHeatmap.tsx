// src/visualizations/WeekHourHeatmap.tsx
// 7x24 Canvas heatmap with UTC offset control.
// Renders on Canvas for performance; accessible summary + table toggle.

import { useRef, useEffect, useMemo, useState } from 'react';
import { scaleLinear } from 'd3-scale';
import { WEEKDAY_LABELS } from '../utils/format';

interface WeekHourHeatmapProps {
  matrix: number[][]; // [7][24]
  utcOffset: number;
  color?: string;
  onOffsetChange?: (offset: number) => void;
}

export default function WeekHourHeatmap({ matrix, utcOffset, color = '#6FB3A4', onOffsetChange }: WeekHourHeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cellSize, setCellSize] = useState(22);
  const containerRef = useRef<HTMLDivElement>(null);

  // Shift the matrix by UTC offset
  const shifted = useMemo(() => {
    const result: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        const adjustedH = ((h + utcOffset) % 24 + 24) % 24;
        result[d][adjustedH] += matrix[d]?.[h] ?? 0;
      }
    }
    return result;
  }, [matrix, utcOffset]);

  const maxVal = useMemo(() => Math.max(...shifted.flat(), 1), [shifted]);
  const colorScale = useMemo(() => scaleLinear().domain([0, maxVal]).range([0, 1] as never as [number, number]), [maxVal]);

  // Calculate cell size based on container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width ?? 700;
      const labelsWidth = 32;
      const size = Math.max(14, Math.floor((w - labelsWidth) / 24));
      setCellSize(size);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 32 + 24 * cellSize;
    const H = 20 + 7 * cellSize;
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;

    ctx.clearRect(0, 0, W, H);

    // Draw cells
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        const val = shifted[d]?.[h] ?? 0;
        const t = colorScale(val) as unknown as number;

        // Parse hex color and interpolate
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);

        ctx.fillStyle = `rgba(${r},${g},${b},${0.05 + t * 0.85})`;
        ctx.fillRect(32 + h * cellSize, 20 + d * cellSize, cellSize - 1, cellSize - 1);

        // Highlight late window (00:00-05:59)
        if (h >= 0 && h <= 5) {
          ctx.strokeStyle = `rgba(${r},${g},${b},0.15)`;
          ctx.lineWidth = 1;
          ctx.strokeRect(32 + h * cellSize, 20 + d * cellSize, cellSize - 1, cellSize - 1);
        }
      }
    }

    // Weekday labels
    ctx.fillStyle = '#8C8778';
    ctx.font = `${Math.max(9, cellSize - 10)}px "IBM Plex Mono", monospace`;
    ctx.textAlign = 'right';
    for (let d = 0; d < 7; d++) {
      ctx.fillText(WEEKDAY_LABELS[d], 28, 20 + d * cellSize + cellSize / 2 + 4);
    }

    // Hour labels (every 4 hours)
    ctx.textAlign = 'center';
    for (let h = 0; h < 24; h += 4) {
      ctx.fillStyle = '#8C8778';
      ctx.font = `${Math.max(8, cellSize - 12)}px "IBM Plex Mono", monospace`;
      ctx.fillText(String(h).padStart(2, '0'), 32 + h * cellSize + cellSize / 2, 14);
    }
  }, [shifted, cellSize, color, colorScale]);

  const totalPlays = shifted.flat().reduce((s, v) => s + v, 0);
  const latePlays = shifted.flat().filter((_, i) => {
    const h = i % 24;
    return h >= 0 && h <= 5;
  }).reduce((s, v) => s + v, 0);

  // Generate accessible table data
  const tableData = WEEKDAY_LABELS.map((day, d) => ({
    day,
    hours: Array.from({ length: 24 }, (_, h) => ({ hour: h, count: shifted[d]?.[h] ?? 0 })),
  }));

  return (
    <figure>
      <figcaption className="caption" style={{ marginBottom: '0.5rem' }}>
        Listening activity by day of week and hour (UTC{utcOffset >= 0 ? '+' : ''}{utcOffset}).
        Columns 00-05 are the late window (00:00-05:59).
      </figcaption>

      {/* UTC offset control */}
      {onOffsetChange && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
          <label htmlFor="utc-offset" style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.65rem', color: 'var(--muted)', letterSpacing: '0.06em' }}>
            UTC OFFSET
          </label>
          <input
            id="utc-offset"
            type="range"
            min={-12} max={14} step={1}
            value={utcOffset}
            onChange={e => onOffsetChange(parseInt(e.target.value, 10))}
            aria-label={`UTC offset: ${utcOffset >= 0 ? '+' : ''}${utcOffset}`}
            style={{ flex: 1, maxWidth: 200, accentColor: color }}
          />
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.75rem', color: 'var(--paper)', minWidth: 40 }}>
            UTC{utcOffset >= 0 ? '+' : ''}{utcOffset}
          </span>
        </div>
      )}

      <div ref={containerRef} style={{ overflowX: 'auto' }}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`Heatmap of listening activity by weekday and hour, UTC offset ${utcOffset}. ${(latePlays / Math.max(totalPlays, 1) * 100).toFixed(1)}% of plays in late window (00:00-05:59 UTC${utcOffset >= 0 ? '+' : ''}${utcOffset}).`}
        />
      </div>

      <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.65rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
        Late-window share (00:00-05:59, UTC{utcOffset >= 0 ? '+' : ''}{utcOffset}):{' '}
        <strong style={{ color: color }}>{totalPlays > 0 ? ((latePlays / totalPlays) * 100).toFixed(1) : 0}%</strong>
        {' '}of plays. All hours shown as UTC{utcOffset >= 0 ? '+' : ''}{utcOffset}.
      </p>

      <details style={{ marginTop: '0.5rem' }}>
        <summary className="label" style={{ cursor: 'pointer', padding: '0.25rem 0' }}>View as table</summary>
        <div style={{ overflowX: 'auto', maxHeight: 300, overflowY: 'auto', marginTop: '0.5rem' }}>
          <table style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--rule)' }}>
                <th style={{ padding: '4px 8px', color: 'var(--muted)', textAlign: 'left' }}>Day</th>
                {Array.from({ length: 24 }, (_, h) => (
                  <th key={h} style={{ padding: '4px 4px', color: 'var(--muted)', textAlign: 'right', minWidth: 28 }}>
                    {String(h).padStart(2, '0')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.map(row => (
                <tr key={row.day} style={{ borderBottom: '1px solid var(--rule)' }}>
                  <td style={{ padding: '4px 8px', color: 'var(--muted)' }}>{row.day}</td>
                  {row.hours.map(({ hour, count }) => (
                    <td key={hour} style={{ padding: '4px 4px', textAlign: 'right', color: count > 0 ? 'var(--paper)' : 'var(--rule)' }}>
                      {count > 0 ? count.toLocaleString('en-IN') : '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
