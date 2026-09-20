// src/components/InsightCard.tsx
import type { Insight } from '../data/types';
import { ChevronRight, Info } from 'lucide-react';

interface InsightCardProps {
  insight: Insight;
  onShowRecords?: (focus: Insight['focus']) => void;
}

const STREAM_COLOR: Record<string, string> = {
  soundtrack: 'var(--stream-01)',
  ledger: 'var(--stream-02)',
  transactions: 'var(--stream-03)',
  cross: 'var(--muted)',
};

export default function InsightCard({ insight, onShowRecords }: InsightCardProps) {
  const color = STREAM_COLOR[insight.stream] ?? 'var(--muted)';
  const isSynthetic = insight.stream === 'transactions';

  return (
    <article style={{
      border: `1px solid var(--rule)`,
      borderLeft: `2px solid ${color}`,
      background: 'var(--ink-2)',
      padding: '1.25rem 1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
    }}>
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
        <div>
          {isSynthetic && (
            <span className="synthetic-badge" style={{ marginBottom: '0.5rem', display: 'inline-block' }}>SYNTHETIC</span>
          )}
          <h4 style={{
            fontFamily: 'IBM Plex Sans, sans-serif',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--paper)',
            lineHeight: 1.4,
          }}>
            {insight.title}
          </h4>
        </div>
        <Info size={14} color="var(--muted)" style={{ flexShrink: 0, marginTop: 2 }} />
      </header>

      <p style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '0.875rem', color: 'var(--paper)', lineHeight: 1.65 }}>
        {insight.statement}
      </p>

      <details style={{ cursor: 'pointer' }}>
        <summary style={{
          fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.65rem', letterSpacing: '0.08em',
          color: 'var(--muted)', textTransform: 'uppercase', listStyle: 'none', cursor: 'pointer',
        }}>
          Rule
        </summary>
        <p style={{
          fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.7rem', color: 'var(--muted)',
          marginTop: '0.5rem', lineHeight: 1.6, padding: '0.5rem', background: 'var(--ink)',
          border: '1px solid var(--rule)',
        }}>
          {insight.rule}
        </p>
      </details>

      {onShowRecords && Object.keys(insight.focus).length > 0 && (
        <button
          onClick={() => onShowRecords(insight.focus)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.7rem', letterSpacing: '0.06em',
            color: color, cursor: 'pointer', padding: '4px 0',
            border: 'none', background: 'none', textAlign: 'left',
          }}
        >
          Show the records <ChevronRight size={12} />
        </button>
      )}
    </article>
  );
}
