// src/chapters/Soundtrack.tsx - Chapter 2: THE SOUNDTRACK

import { useState, useEffect, useMemo } from 'react';
import type { FilterState, SpotifyMonthlyData, SpotifyArtistsData } from '../data/types';
import { loadSpotifyMonthly, loadSpotifyArtists } from '../data/loaders';
import ErrorBoundary from '../components/ErrorBoundary';
import ActivityArea from '../visualizations/ActivityArea';
import WeekHourHeatmap from '../visualizations/WeekHourHeatmap';
import RankedBars from '../visualizations/RankedBars';
import InsightCard from '../components/InsightCard';
import { aggregateWeekHour } from '../data/selectors';
import { detectArtistDominance, detectSkipRateShift, detectShuffleShift, detectBusiestMonth, detectLateWindow } from '../engine/detectors/soundtrack';

interface Props {
  filter: FilterState;
  setFilter: (f: Partial<FilterState>) => void;
  setChapter: (n: number) => void;
}

export default function ChapterSoundtrack({ filter, setFilter }: Props) {
  const [monthly, setMonthly] = useState<SpotifyMonthlyData | null>(null);
  const [artists, setArtists] = useState<SpotifyArtistsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [utcOffset, setUtcOffset] = useState(filter.utcOffset ?? 0);

  useEffect(() => {
    Promise.all([loadSpotifyMonthly(), loadSpotifyArtists()])
      .then(([m, a]) => { setMonthly(m); setArtists(a); setLoading(false); })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  }, []);

  const weekHourMatrix = useMemo(() => {
    if (!monthly) return Array.from({ length: 7 }, () => new Array(24).fill(0));
    return aggregateWeekHour(monthly.monthly);
  }, [monthly]);

  const topArtists = useMemo(() => {
    if (!artists) return [];
    return artists.artists
      .filter(a => a.a !== '__other__')
      .slice(0, 30)
      .map(a => ({ label: a.a, value: Math.round(a.h), sublabel: `${a.p.toLocaleString('en-IN')} plays` }));
  }, [artists]);

  const insights = useMemo(() => {
    if (!monthly || !artists) return [];
    const ins = [];
    ins.push(...detectArtistDominance(monthly.monthly, artists.artists.filter(a => a.a !== '__other__')));
    ins.push(...detectSkipRateShift(monthly.years));
    ins.push(...detectShuffleShift(monthly.monthly));
    ins.push(detectLateWindow(monthly.monthly, utcOffset));
    ins.push(detectBusiestMonth(monthly.monthly));
    return ins;
  }, [monthly, artists, utcOffset]);

  const skipNote = useMemo(() => {
    if (!monthly) return null;
    const m = monthly.meta;
    const flagRate = ((m.skippedFlagTrue / m.dedupCount) * 100).toFixed(1);
    const derivedRate = ((m.fwdbtnCount / m.dedupCount) * 100).toFixed(1);
    return { flagRate, derivedRate, flagCount: m.skippedFlagTrue, derivedCount: m.fwdbtnCount };
  }, [monthly]);

  if (loading) return <section className="chapter"><div className="loading" style={{ height: 200, width: '100%' }} /></section>;
  if (error || !monthly) return (
    <section className="chapter">
      <div style={{ padding: '2rem', border: '1px solid var(--rule)', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.75rem', color: 'var(--muted)' }}>
        Could not load Soundtrack data: {error}
      </div>
    </section>
  );

  return (
    <section className="chapter" id="soundtrack" aria-labelledby="ch2-title">
      <p className="chapter-num" style={{ marginBottom: '1rem' }}>02 / 07</p>
      <h2 id="ch2-title" className="font-display" style={{ fontSize: 'var(--text-3xl)', marginBottom: '0.5rem' }}>
        The Soundtrack
      </h2>
      <p style={{ color: 'var(--muted)', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.75rem', marginBottom: '3rem' }}>
        Stream 01 — {monthly.meta.rawCount.toLocaleString('en-IN')} raw plays, {monthly.meta.dedupCount.toLocaleString('en-IN')} after deduplication — Timestamps in UTC
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>

        {/* Monthly plays */}
        <section aria-labelledby="s01-activity">
          <h3 id="s01-activity" style={{ fontSize: 'var(--text-lg)', marginBottom: '0.75rem' }}>When was listening active?</h3>
          <ErrorBoundary>
            <ActivityArea
              monthly={monthly.monthly}
              baseYear={monthly.baseYear}
              baseMonth={monthly.baseMonth}
              metric="plays"
              color="var(--stream-01)"
              height={200}
              ariaLabel="Monthly play count, 2013-2024. Empty months before 2016-05 are visible."
            />
          </ErrorBoundary>
        </section>

        <hr className="section-rule" />

        {/* Skip flag note */}
        {skipNote && (
          <section aria-labelledby="s01-skip">
            <h3 id="s01-skip" style={{ fontSize: 'var(--text-lg)', marginBottom: '0.75rem' }}>Moving-on behaviour</h3>
            <div style={{ border: '1px solid var(--rule)', padding: '1.25rem', background: 'var(--ink-2)', marginBottom: '1.5rem' }}>
              <p className="label" style={{ marginBottom: '0.75rem' }}>Why not the "skipped" flag?</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.65rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>
                    skipped flag = true
                  </p>
                  <p style={{ fontFamily: 'Fraunces Variable, serif', fontSize: '1.5rem', color: 'var(--paper)' }}>
                    {skipNote.flagRate}%
                  </p>
                  <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem', color: 'var(--muted)' }}>
                    ({skipNote.flagCount.toLocaleString('en-IN')} rows)
                  </p>
                </div>
                <div>
                  <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.65rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>
                    derived skip (fwdbtn/nextbtn)
                  </p>
                  <p style={{ fontFamily: 'Fraunces Variable, serif', fontSize: '1.5rem', color: 'var(--stream-01)' }}>
                    {skipNote.derivedRate}%
                  </p>
                  <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem', color: 'var(--muted)' }}>
                    ({skipNote.derivedCount.toLocaleString('en-IN')} rows)
                  </p>
                </div>
              </div>
              <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.65rem', color: 'var(--muted)', marginTop: '0.75rem', lineHeight: 1.6 }}>
                The skipped flag captures only {skipNote.flagRate}% of plays as skipped, while reason_end = fwdbtn/nextbtn applies to {skipNote.derivedRate}%.
                The flag is unreliable. Derived skip (fwdbtn/nextbtn) is used throughout this archive.
              </p>
            </div>

            {/* Skip rate by year */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.5rem' }}>
              {monthly.years.map(y => (
                <div key={y.year} style={{ border: '1px solid var(--rule)', padding: '0.75rem', background: 'var(--ink-2)' }}>
                  <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>{y.year}</p>
                  <p style={{ fontFamily: 'Fraunces Variable, serif', fontSize: '1.1rem', color: 'var(--stream-01)', fontVariantNumeric: 'tabular-nums' }}>
                    {y.plays > 0 ? ((y.skips / y.plays) * 100).toFixed(0) : 0}%
                  </p>
                  <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.55rem', color: 'var(--muted)' }}>skip rate</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <hr className="section-rule" />

        {/* Heatmap */}
        <section aria-labelledby="s01-rhythm">
          <h3 id="s01-rhythm" style={{ fontSize: 'var(--text-lg)', marginBottom: '0.75rem' }}>When does listening happen?</h3>
          <ErrorBoundary>
            <WeekHourHeatmap
              matrix={weekHourMatrix}
              utcOffset={utcOffset}
              color="#6FB3A4"
              onOffsetChange={off => { setUtcOffset(off); setFilter({ utcOffset: off }); }}
            />
          </ErrorBoundary>
        </section>

        <hr className="section-rule" />

        {/* Top artists */}
        <section aria-labelledby="s01-artists">
          <h3 id="s01-artists" style={{ fontSize: 'var(--text-lg)', marginBottom: '0.75rem' }}>Most-listened artists</h3>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.65rem', color: 'var(--muted)', marginBottom: '1rem' }}>
            Ranked by total listening hours. Top 30 shown.
          </p>
          <ErrorBoundary>
            <RankedBars
              items={topArtists}
              maxItems={30}
              color="var(--stream-01)"
              unit="hrs"
              selectedLabel={filter.artist}
              onSelect={a => setFilter({ artist: filter.artist === a ? null : a })}
              ariaLabel="Top 30 artists by listening hours"
            />
          </ErrorBoundary>
        </section>

        <hr className="section-rule" />

        {/* Year overview */}
        <section aria-labelledby="s01-years">
          <h3 id="s01-years" style={{ fontSize: 'var(--text-lg)', marginBottom: '0.75rem' }}>Year by year</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.7rem', borderCollapse: 'collapse', width: '100%', minWidth: 400 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--rule)' }}>
                  {['Year', 'Plays', 'Hours', 'Skip rate', 'Artists', 'Tracks'].map(h => (
                    <th key={h} style={{ padding: '6px 10px', textAlign: h === 'Year' ? 'left' : 'right', color: 'var(--muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthly.years.map(y => (
                  <tr key={y.year} style={{ borderBottom: '1px solid var(--rule)' }}>
                    <td style={{ padding: '6px 10px', color: 'var(--muted)' }}>{y.year}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', color: 'var(--paper)' }}>{y.plays.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', color: 'var(--paper)' }}>{y.hours.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', color: 'var(--stream-01)' }}>
                      {y.plays > 0 ? ((y.skips / y.plays) * 100).toFixed(1) : 0}%
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', color: 'var(--paper)' }}>{y.artists.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', color: 'var(--paper)' }}>{y.tracks.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <hr className="section-rule" />

        {/* Insights */}
        {insights.length > 0 && (
          <section aria-labelledby="s01-patterns">
            <h3 id="s01-patterns" style={{ fontSize: 'var(--text-lg)', marginBottom: '0.25rem' }}>Detected patterns</h3>
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.65rem', color: 'var(--muted)', marginBottom: '1.5rem' }}>
              Rule-based detection only.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {insights.slice(0, 6).map(ins => (
                <ErrorBoundary key={ins.id}>
                  <InsightCard
                    insight={ins}
                    onShowRecords={focus => setFilter(focus)}
                  />
                </ErrorBoundary>
              ))}
            </div>
          </section>
        )}
      </div>
    </section>
  );
}
