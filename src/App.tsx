// src/App.tsx
import { useEffect, useCallback, useReducer, lazy, Suspense } from 'react';
import type { FilterState } from './data/types';
import { DEFAULT_FILTER } from './data/types';
import { readHash, writeHash } from './utils/hashState';
import AppShell from './components/AppShell';

// Lazy-load chapters
const ChapterArchive = lazy(() => import('./chapters/Archive'));
const ChapterSoundtrack = lazy(() => import('./chapters/Soundtrack'));
const ChapterLedger = lazy(() => import('./chapters/Ledger'));
const ChapterGap = lazy(() => import('./chapters/Gap'));
const ChapterFalseConnection = lazy(() => import('./chapters/FalseConnection'));
const ChapterThreeStreams = lazy(() => import('./chapters/ThreeStreams'));
const ChapterDiscover = lazy(() => import('./chapters/Discover'));

type AppAction =
  | { type: 'SET_CHAPTER'; chapter: number }
  | { type: 'SET_FILTER'; filter: Partial<FilterState> }
  | { type: 'RESET_FILTER' };

interface AppState {
  chapter: number;
  filter: FilterState;
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_CHAPTER':
      return { ...state, chapter: action.chapter, filter: { ...state.filter, chapter: action.chapter } };
    case 'SET_FILTER':
      return { ...state, filter: { ...state.filter, ...action.filter } };
    case 'RESET_FILTER':
      return { ...state, filter: { ...DEFAULT_FILTER, chapter: state.chapter } };
    default:
      return state;
  }
}

function ChapterSuspense({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div style={{ padding: '4rem', color: 'var(--muted)', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.75rem' }}>
        Loading chapter...
      </div>
    }>
      {children}
    </Suspense>
  );
}

export default function App() {
  const [state, dispatch] = useReducer(appReducer, null, () => {
    const { chapter, filter } = readHash();
    return { chapter, filter };
  });

  // Sync URL hash on state changes
  useEffect(() => {
    writeHash(state.chapter, state.filter);
  }, [state.chapter, state.filter]);

  // Listen for back/forward navigation
  useEffect(() => {
    const onPopState = () => {
      const { chapter, filter } = readHash();
      dispatch({ type: 'SET_CHAPTER', chapter });
      dispatch({ type: 'SET_FILTER', filter });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'j' || e.key === 'J') {
        dispatch({ type: 'SET_CHAPTER', chapter: Math.min(7, state.chapter + 1) });
      } else if (e.key === 'k' || e.key === 'K') {
        dispatch({ type: 'SET_CHAPTER', chapter: Math.max(1, state.chapter - 1) });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.chapter]);

  const setChapter = useCallback((n: number) => dispatch({ type: 'SET_CHAPTER', chapter: n }), []);
  const setFilter = useCallback((f: Partial<FilterState>) => dispatch({ type: 'SET_FILTER', filter: f }), []);
  const resetFilter = useCallback(() => dispatch({ type: 'RESET_FILTER' }), []);

  const chapterProps = { filter: state.filter, setFilter, setChapter };

  return (
    <AppShell
      chapter={state.chapter}
      filter={state.filter}
      setChapter={setChapter}
      resetFilter={resetFilter}
    >
      <main id="main-content">
        {state.chapter === 1 && (
          <ChapterSuspense><ChapterArchive {...chapterProps} /></ChapterSuspense>
        )}
        {state.chapter === 2 && (
          <ChapterSuspense><ChapterSoundtrack {...chapterProps} /></ChapterSuspense>
        )}
        {state.chapter === 3 && (
          <ChapterSuspense><ChapterLedger {...chapterProps} /></ChapterSuspense>
        )}
        {state.chapter === 4 && (
          <ChapterSuspense><ChapterGap {...chapterProps} /></ChapterSuspense>
        )}
        {state.chapter === 5 && (
          <ChapterSuspense><ChapterFalseConnection {...chapterProps} /></ChapterSuspense>
        )}
        {state.chapter === 6 && (
          <ChapterSuspense><ChapterThreeStreams {...chapterProps} /></ChapterSuspense>
        )}
        {state.chapter === 7 && (
          <ChapterSuspense><ChapterDiscover {...chapterProps} /></ChapterSuspense>
        )}
      </main>
    </AppShell>
  );
}
