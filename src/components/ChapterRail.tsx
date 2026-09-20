// src/components/ChapterRail.tsx
import { Keyboard } from 'lucide-react';

interface ChapterRailProps {
  chapter: number;
  titles: string[];
  setChapter: (n: number) => void;
  onShortcuts: () => void;
}

export default function ChapterRail({ chapter, titles, setChapter, onShortcuts }: ChapterRailProps) {
  return (
    <nav className="chapter-rail" aria-label="Chapter navigation">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
        {titles.map((title, i) => {
          const num = i + 1;
          const isActive = chapter === num;
          return (
            <button
              key={num}
              onClick={() => setChapter(num)}
              aria-label={`Chapter ${num}: ${title}`}
              aria-current={isActive ? 'page' : undefined}
              title={title}
              style={{
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: isActive ? '1px solid var(--paper)' : '1px solid var(--rule)',
                background: isActive ? 'var(--highlight-strong)' : 'transparent',
                color: isActive ? 'var(--paper)' : 'var(--muted)',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '0.7rem',
                fontWeight: isActive ? 600 : 400,
                letterSpacing: '0.05em',
                cursor: 'pointer',
                transition: 'all var(--dur-base) var(--ease)',
                borderRadius: 2,
              }}
            >
              {String(num).padStart(2, '0')}
            </button>
          );
        })}
      </div>

      {/* Shortcuts button */}
      <button
        onClick={onShortcuts}
        aria-label="Keyboard shortcuts"
        title="Keyboard shortcuts"
        style={{
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid var(--rule)',
          background: 'transparent',
          color: 'var(--muted)',
          cursor: 'pointer',
          transition: 'color var(--dur-base)',
          borderRadius: 2,
        }}
      >
        <Keyboard size={14} />
      </button>
    </nav>
  );
}
