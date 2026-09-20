// src/components/ShortcutsDialog.tsx
import { useEffect } from 'react';
import { X } from 'lucide-react';

interface ShortcutsDialogProps {
  onClose: () => void;
}

const shortcuts = [
  { key: 'J', description: 'Next chapter' },
  { key: 'K', description: 'Previous chapter' },
  { key: '/', description: 'Focus search (Chapter 7)' },
  { key: 'Esc', description: 'Close panels / reset focus' },
  { key: '←/→', description: 'Move scrubbers by one month' },
];

export default function ShortcutsDialog({ onClose }: ShortcutsDialogProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      style={{
        position: 'fixed', inset: 0, zIndex: 'var(--z-modal)' as never,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(15,15,14,0.85)', backdropFilter: 'blur(4px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--ink-2)',
        border: '1px solid var(--rule)',
        padding: '2rem',
        minWidth: 320,
        maxWidth: '90vw',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.75rem', letterSpacing: '0.12em', fontWeight: 500, color: 'var(--muted)' }}>
            KEYBOARD SHORTCUTS
          </h2>
          <button onClick={onClose} aria-label="Close shortcuts dialog" style={{ color: 'var(--muted)', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>
        <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.75rem 1.5rem' }}>
          {shortcuts.map(s => (
            <>
              <dt key={`dt-${s.key}`}>
                <kbd style={{
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '0.75rem',
                  padding: '2px 8px',
                  border: '1px solid var(--rule)',
                  background: 'var(--ink)',
                  color: 'var(--paper)',
                  display: 'inline-block',
                }}>
                  {s.key}
                </kbd>
              </dt>
              <dd key={`dd-${s.key}`} style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '0.875rem', color: 'var(--paper)', display: 'flex', alignItems: 'center' }}>
                {s.description}
              </dd>
            </>
          ))}
        </dl>
      </div>
    </div>
  );
}
