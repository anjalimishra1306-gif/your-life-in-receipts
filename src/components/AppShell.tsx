// src/components/AppShell.tsx
import { useState } from 'react';
import type { FilterState } from '../data/types';
import ChapterRail from './ChapterRail';
import MobileNav from './MobileNav';
import LensStrip from './LensStrip';
import ShortcutsDialog from './ShortcutsDialog';

interface AppShellProps {
  chapter: number;
  filter: FilterState;
  setChapter: (n: number) => void;
  resetFilter: () => void;
  children: React.ReactNode;
}

const CHAPTER_TITLES = [
  'The Archive',
  'The Soundtrack',
  'The Ledger',
  'The Gap',
  'The False Connection',
  'Three Streams, Not One',
  'What We Can Discover',
];

export default function AppShell({ chapter, filter, setChapter, resetFilter, children }: AppShellProps) {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  return (
    <div className="app-shell">
      {/* Desktop rail nav */}
      <ChapterRail
        chapter={chapter}
        titles={CHAPTER_TITLES}
        setChapter={setChapter}
        onShortcuts={() => setShortcutsOpen(true)}
      />

      {/* Content */}
      <div className="main-content">
        {/* Active lens strip */}
        <LensStrip filter={filter} onReset={resetFilter} />

        {/* Chapter content */}
        {children}
      </div>

      {/* Mobile bottom nav */}
      <MobileNav
        chapter={chapter}
        total={7}
        title={CHAPTER_TITLES[chapter - 1]}
        setChapter={setChapter}
        onMenu={() => setShortcutsOpen(true)}
      />

      {/* Keyboard shortcuts dialog */}
      {shortcutsOpen && (
        <ShortcutsDialog onClose={() => setShortcutsOpen(false)} />
      )}
    </div>
  );
}
