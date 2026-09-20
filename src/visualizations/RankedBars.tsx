// src/visualizations/RankedBars.tsx
// Horizontal ranked bar chart for artists or tracks.

import { useMemo } from 'react';

interface BarItem {
  label: string;
  value: number;
  sublabel?: string;
}

interface RankedBarsProps {
  items: BarItem[];
  maxItems?: number;
  color?: string;
  unit?: string;
  onSelect?: (label: string) => void;
  selectedLabel?: string | null;
  ariaLabel?: string;
}

export default function RankedBars({
  items, maxItems = 20, color = 'var(--stream-01)', unit = '',
  onSelect, selectedLabel, ariaLabel,
}: RankedBarsProps) {
  const visible = items.slice(0, maxItems);
  const maxVal = useMemo(() => Math.max(...visible.map(i => i.value), 1), [visible]);

  const formatVal = (v: number) => {
    if (unit === 'hrs' && v >= 1000) return `${(v / 1000).toFixed(1)}k hrs`;
    if (unit === 'hrs') return `${v.toFixed(0)} hrs`;
    if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
    return v.toLocaleString('en-IN');
  };

  return (
    <figure aria-label={ariaLabel ?? `Ranked bar chart, ${visible.length} items`}>
      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 2 }} role="list">
        {visible.map((item, i) => {
          const share = item.value / maxVal;
          const isSelected = item.label === selectedLabel;
          return (
            <li key={item.label}>
              <button
                onClick={() => onSelect?.(item.label)}
                aria-label={`${item.label}: ${formatVal(item.value)} ${unit}`}
                aria-pressed={isSelected}
                style={{
                  width: '100%',
                  display: 'grid',
                  gridTemplateColumns: '24px 1fr auto',
                  gap: '0.5rem',
                  alignItems: 'center',
                  padding: '3px 0',
                  background: 'none',
                  border: 'none',
                  cursor: onSelect ? 'pointer' : 'default',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem', color: 'var(--muted)', textAlign: 'right' }}>
                  {i + 1}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <span style={{
                    fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '0.8rem',
                    color: isSelected ? 'var(--paper)' : 'var(--paper)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    fontWeight: isSelected ? 600 : 400,
                  }}>
                    {item.label}
                  </span>
                  {item.sublabel && (
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem', color: 'var(--muted)' }}>
                      {item.sublabel}
                    </span>
                  )}
                  <div style={{
                    height: 3,
                    background: `${color}${isSelected ? 'dd' : '66'}`,
                    width: `${share * 100}%`,
                    transition: 'width 0.3s ease, background 0.2s',
                    borderRadius: 1,
                  }} />
                </div>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.65rem', color: isSelected ? color : 'var(--muted)', whiteSpace: 'nowrap' }}>
                  {formatVal(item.value)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}
