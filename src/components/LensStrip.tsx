// src/components/LensStrip.tsx
import { X } from 'lucide-react';
import type { FilterState } from '../data/types';

interface LensStripProps {
  filter: FilterState;
  onReset: () => void;
}

export default function LensStrip({ filter, onReset }: LensStripProps) {
  const hasFilter =
    filter.stream !== 'all' ||
    filter.dateRange[0] !== null ||
    filter.dateRange[1] !== null ||
    filter.artist !== null ||
    filter.track !== null ||
    filter.category !== null ||
    filter.family !== null ||
    filter.platform !== null ||
    filter.search !== '';

  if (!hasFilter) {
    return (
      <div className="lens-strip" aria-label="Active filters">
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.65rem', color: 'var(--muted)', letterSpacing: '0.06em' }}>
          NO ACTIVE FILTERS
        </span>
      </div>
    );
  }

  const chips: { label: string; key: string }[] = [];
  if (filter.stream !== 'all') chips.push({ label: `Stream: ${filter.stream}`, key: 'stream' });
  if (filter.dateRange[0]) chips.push({ label: `From: ${filter.dateRange[0]}`, key: 'from' });
  if (filter.dateRange[1]) chips.push({ label: `To: ${filter.dateRange[1]}`, key: 'to' });
  if (filter.artist) chips.push({ label: `Artist: ${filter.artist}`, key: 'artist' });
  if (filter.track) chips.push({ label: `Track: ${filter.track}`, key: 'track' });
  if (filter.category) chips.push({ label: `Category: ${filter.category}`, key: 'category' });
  if (filter.family) chips.push({ label: `Family: ${filter.family}`, key: 'family' });
  if (filter.platform) chips.push({ label: `Platform: ${filter.platform}`, key: 'platform' });
  if (filter.search) chips.push({ label: `Search: "${filter.search}"`, key: 'search' });

  return (
    <div className="lens-strip" role="status" aria-label="Active filters" aria-live="polite">
      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem', color: 'var(--muted)', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
        ACTIVE LENS
      </span>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'nowrap', overflow: 'hidden' }}>
        {chips.map(chip => (
          <span key={chip.key} style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '0.65rem',
            padding: '1px 8px',
            border: '1px solid var(--rule)',
            color: 'var(--paper)',
            whiteSpace: 'nowrap',
            background: 'var(--highlight)',
          }}>
            {chip.label}
          </span>
        ))}
      </div>
      <button
        onClick={onReset}
        aria-label="Reset all filters"
        style={{
          marginLeft: 'auto',
          display: 'flex', alignItems: 'center', gap: 4,
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: '0.65rem', letterSpacing: '0.06em',
          color: 'var(--muted)', cursor: 'pointer',
          padding: '2px 8px',
          border: '1px solid var(--rule)',
          whiteSpace: 'nowrap',
          transition: 'color var(--dur-fast)',
        }}
      >
        <X size={10} /> RESET
      </button>
    </div>
  );
}
