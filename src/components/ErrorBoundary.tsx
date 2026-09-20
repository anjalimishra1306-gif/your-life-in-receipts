// src/components/ErrorBoundary.tsx
import { Component, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean; error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{
          padding: '2rem', border: '1px solid var(--rule)', background: 'var(--ink-2)',
          margin: '1rem 0',
        }}>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '1rem' }}>
            This section could not load.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.75rem',
              color: 'var(--paper)', border: '1px solid var(--rule)',
              padding: '6px 12px', cursor: 'pointer',
              background: 'var(--ink)',
            }}
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
