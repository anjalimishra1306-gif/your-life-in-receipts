// src/components/MobileNav.tsx
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MobileNavProps {
  chapter: number;
  total: number;
  title: string;
  setChapter: (n: number) => void;
  onMenu: () => void;
}

export default function MobileNav({ chapter, total, title, setChapter, onMenu }: MobileNavProps) {
  return (
    <nav className="mobile-nav" aria-label="Chapter navigation">
      <button
        onClick={() => setChapter(Math.max(1, chapter - 1))}
        disabled={chapter <= 1}
        aria-label="Previous chapter"
        style={{
          width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: chapter <= 1 ? 'var(--rule)' : 'var(--paper)', cursor: chapter <= 1 ? 'default' : 'pointer',
        }}
      >
        <ChevronLeft size={18} />
      </button>

      <button
        onClick={onMenu}
        aria-label="Chapter menu"
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          color: 'var(--muted)', cursor: 'pointer', flex: 1, padding: '0 1rem',
        }}
      >
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem', letterSpacing: '0.1em', color: 'var(--muted)' }}>
          {String(chapter).padStart(2, '0')} / {total}
        </span>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.65rem', color: 'var(--paper)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </span>
      </button>

      <button
        onClick={() => setChapter(Math.min(total, chapter + 1))}
        disabled={chapter >= total}
        aria-label="Next chapter"
        style={{
          width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: chapter >= total ? 'var(--rule)' : 'var(--paper)', cursor: chapter >= total ? 'default' : 'pointer',
        }}
      >
        <ChevronRight size={18} />
      </button>
    </nav>
  );
}
