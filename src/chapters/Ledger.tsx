// src/chapters/Ledger.tsx - Chapter 3: THE LEDGER

import { useState, useEffect, useMemo } from 'react';
import type { FilterState, LedgerMonthlyData } from '../data/types';
import { loadLedgerMonthly } from '../data/loaders';
import ErrorBoundary from '../components/ErrorBoundary';
import InsightCard from '../components/InsightCard';
import { runLedgerDetectors } from '../engine/detectors/ledger';
import { formatINR } from '../utils/format';
import { WEEKDAY_LABELS } from '../utils/format';

interface Props {
  filter: FilterState;
  setFilter: (f: Partial<FilterState>) => void;
  setChapter: (n: number) => void;
}

export default function ChapterLedger({ filter, setFilter }: Props) {
  const [data, setData] = useState<LedgerMonthlyData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLedgerMonthly()
      .then(d => { setData(d); setLoading(false); })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  }, []);

  const insights = useMemo(() => {
    if (!data) return [];
    return runLedgerDetectors(data.monthly, data.categoryPresence);
  }, [data]);

  if (loading) return <section className="chapter"><div className="loading" style={{ height: 200 }} /></section>;
  if (error || !data) return (
    <section className="chapter">
      <div style={{ padding: '2rem', border: '1px solid var(--rule)', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.75rem', color: 'var(--muted)' }}>
        Could not load Ledger data: {error}
      </div>
    </section>
  );

  const maxRows = Math.max(...data.monthly.map(m => m.tr), 1);
  const maxHourHist = Math.max(...data.hourHist, 1);
  const maxWeekdayHist = Math.max(...data.weekdayHist, 1);

  const catTotals: Record<string, number> = {};
  for (const m of data.monthly) {
    for (const [cat, { s }] of Object.entries(m.cat)) {
      catTotals[cat] = (catTotals[cat] ?? 0) + s;
    }
  }
  const topCategories = Object.entries(catTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  return (
    <section className="chapter" id="ledger" aria-labelledby="ch3-title">
      <p className="chapter-num" style={{ marginBottom: '1rem' }}>03 / 07</p>
      <h2 id="ch3-title" className="font-display" style={{ fontSize: 'var(--text-3xl)', marginBottom: '0.5rem' }}>
        The Ledger
      </h2>
      <p style={{ color: 'var(--muted)', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.75rem', marginBottom: '3rem' }}>
        Stream 02 — {data.meta.rawCount.toLocaleString('en-IN')} records — {data.meta.minDate} to {data.meta.maxDate} — INR, naive local time
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>

        {/* Overview stats */}
        <section aria-labelledby="l-overview">
          <h3 id="l-overview" style={{ fontSize: 'var(--text-lg)', marginBottom: '1.25rem' }}>What was recorded?</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Total rows', value: data.meta.rawCount.toLocaleString('en-IN'), sub: 'all types' },
              { label: 'Expense rows', value: data.meta.byType.Expense?.toLocaleString('en-IN') ?? '0', sub: 'ordinary spending' },
              { label: 'Income rows', value: data.meta.byType.Income?.toLocaleString('en-IN') ?? '0', sub: 'recorded income' },
              { label: 'Transfer-Out', value: data.meta.byType['Transfer-Out']?.toLocaleString('en-IN') ?? '0', sub: 'money moved' },
              { label: 'Active months', value: data.meta.activeMonths, sub: '45 months in range' },
              { label: 'Timed rows', value: data.meta.timedRows.toLocaleString('en-IN'), sub: 'have hour-level time' },
            ].map(s => (
              <div key={s.label} style={{ border: '1px solid var(--rule)', padding: '1rem', background: 'var(--ink-2)' }}>
                <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem', color: 'var(--muted)', marginBottom: '0.25rem', letterSpacing: '0.06em' }}>
                  {s.label.toUpperCase()}
                </p>
                <p style={{ fontFamily: 'Fraunces Variable, serif', fontSize: '1.5rem', color: 'var(--stream-02)', fontVariantNumeric: 'tabular-nums' }}>
                  {s.value}
                </p>
                <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.55rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                  {s.sub}
                </p>
              </div>
            ))}
          </div>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.65rem', color: 'var(--muted)', lineHeight: 1.7 }}>
            {data.meta.investmentRowsExcluded} expense rows with investment-type categories were excluded from ordinary spending totals
            and are shown as aggregates only. Transfer-Out rows (amounts up to 250,000 INR) are shown separately and never enter spending totals.
          </p>
        </section>

        <hr className="section-rule" />

        {/* Monthly density */}
        <section aria-labelledby="l-density">
          <h3 id="l-density" style={{ fontSize: 'var(--text-lg)', marginBottom: '0.5rem' }}>Logging density over time</h3>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.65rem', color: 'var(--muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
            Rows logged per month — not spending volume. Density is uneven: this is a confounder for count-based comparison.
            Mean rows/month: ~33 (2015), ~29 (2016), ~86 (2017), ~75 (2018).
          </p>
          <ErrorBoundary>
            <figure>
              <figcaption className="caption" style={{ marginBottom: '0.5rem' }}>
                Monthly row count (logging density). Height = rows logged, not amount spent.
              </figcaption>
              <div style={{ overflowX: 'auto' }}>
                <svg width={700} height={140} role="img" aria-label="Monthly logging density bar chart" style={{ display: 'block' }}>
                  <g transform="translate(40,10)">
                    {data.monthly.map((m, i) => {
                      const x = i * (620 / data.monthly.length);
                      const bw = Math.max((620 / data.monthly.length) - 1, 1);
                      const bh = (m.tr / maxRows) * 100;
                      const year = 2015 + Math.floor(m.m / 12);
                      const showLabel = m.m % 12 === 0;
                      return (
                        <g key={m.m}>
                          <rect x={x} y={100 - bh} width={bw} height={bh}
                            fill="var(--stream-02)" fillOpacity={0.7} />
                          {showLabel && (
                            <text x={x + bw / 2} y={120} textAnchor="middle" fill="var(--muted)"
                              style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.55rem' }}>
                              {year}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </g>
                </svg>
              </div>
            </figure>
          </ErrorBoundary>
        </section>

        <hr className="section-rule" />

        {/* Monthly expense vs income */}
        <section aria-labelledby="l-expinc">
          <h3 id="l-expinc" style={{ fontSize: 'var(--text-lg)', marginBottom: '0.5rem' }}>Recorded expense vs income</h3>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.65rem', color: 'var(--muted)', marginBottom: '1rem' }}>
            Transfers excluded and shown as a separate thin series below. Labelled "money moved, not spent."
          </p>
          <ErrorBoundary>
            <figure>
              <figcaption className="caption" style={{ marginBottom: '0.5rem' }}>
                Monthly recorded expense (gold) and income (muted) in INR. Heights are comparable. Transfers shown separately.
              </figcaption>
              <div style={{ overflowX: 'auto' }}>
                <svg width={700} height={180} role="img" aria-label="Monthly expense vs income chart" style={{ display: 'block' }}>
                  <defs>
                    <linearGradient id="exp-grad" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="var(--stream-02)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--stream-02)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <g transform="translate(40,10)">
                    {(() => {
                      const maxE = Math.max(...data.monthly.map(m => Math.max(m.es, m.is_)), 1);
                      const W = 620;
                      const H = 140;
                      const step = W / data.monthly.length;
                      return data.monthly.map((m, i) => {
                        const x = i * step;
                        const bw = Math.max(step - 1, 1);
                        const eH = (m.es / maxE) * H;
                        const iH = (m.is_ / maxE) * H;
                        const tH = Math.min((m.ts / maxE) * 20, 8);
                        return (
                          <g key={m.m}>
                            {/* Expense */}
                            <rect x={x} y={H - eH} width={bw} height={eH}
                              fill="var(--stream-02)" fillOpacity={0.6} />
                            {/* Income */}
                            <rect x={x + bw * 0.25} y={H - iH} width={bw * 0.5} height={iH}
                              fill="var(--paper)" fillOpacity={0.25} />
                            {/* Transfer-Out (thin line) */}
                            {m.ts > 0 && (
                              <rect x={x} y={H + 4} width={bw} height={tH}
                                fill="var(--muted)" fillOpacity={0.4} />
                            )}
                          </g>
                        );
                      });
                    })()}
                    {/* Transfer label */}
                    <text x={0} y={160} fill="var(--muted)"
                      style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.55rem' }}>
                      money moved, not spent (Transfer-Out)
                    </text>
                  </g>
                </svg>
              </div>
            </figure>
          </ErrorBoundary>
        </section>

        <hr className="section-rule" />

        {/* Top categories */}
        <section aria-labelledby="l-categories">
          <h3 id="l-categories" style={{ fontSize: 'var(--text-lg)', marginBottom: '0.5rem' }}>Where did ordinary spending go?</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {topCategories.map(([cat, total]) => {
              const share = total / (Object.values(catTotals).reduce((s, v) => s + v, 0));
              return (
                <button
                  key={cat}
                  onClick={() => setFilter({ category: filter.category === cat ? null : cat })}
                  aria-pressed={filter.category === cat}
                  style={{
                    display: 'grid', gridTemplateColumns: '140px 1fr auto auto',
                    gap: '0.75rem', alignItems: 'center', padding: '6px 0',
                    background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <span style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '0.8rem', color: filter.category === cat ? 'var(--stream-02)' : 'var(--paper)' }}>
                    {cat}
                  </span>
                  <div style={{ height: 4, background: `var(--stream-02)`, width: `${share * 100}%`, opacity: 0.65, borderRadius: 1 }} />
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.65rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                    {(share * 100).toFixed(1)}%
                  </span>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.65rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                    {formatINR(total)}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <hr className="section-rule" />

        {/* Rhythm */}
        <section aria-labelledby="l-rhythm">
          <h3 id="l-rhythm" style={{ fontSize: 'var(--text-lg)', marginBottom: '0.75rem' }}>Weekly and hourly rhythm</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <figure>
              <figcaption className="caption" style={{ marginBottom: '0.5rem' }}>Weekday distribution (all timed and untimed rows)</figcaption>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {WEEKDAY_LABELS.map((day, i) => (
                  <div key={day} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem', color: 'var(--muted)', width: 28 }}>{day}</span>
                    <div style={{ flex: 1, height: 12, background: 'var(--ink)', borderRadius: 1, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(data.weekdayHist[i] / maxWeekdayHist) * 100}%`, background: 'var(--stream-02)', opacity: 0.7 }} />
                    </div>
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem', color: 'var(--muted)', minWidth: 32, textAlign: 'right' }}>
                      {data.weekdayHist[i].toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            </figure>
            <figure>
              <figcaption className="caption" style={{ marginBottom: '0.5rem' }}>
                Hourly distribution ({data.meta.timedRows.toLocaleString('en-IN')} timed rows only)
              </figcaption>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 80 }}>
                {data.hourHist.map((v, h) => (
                  <div
                    key={h}
                    title={`${String(h).padStart(2, '0')}:00 — ${v.toLocaleString('en-IN')} rows`}
                    style={{
                      flex: 1, height: `${(v / maxHourHist) * 100}%`,
                      background: 'var(--stream-02)', opacity: 0.7, minHeight: v > 0 ? 1 : 0,
                    }}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                {[0, 6, 12, 18, 23].map(h => (
                  <span key={h} style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.55rem', color: 'var(--muted)' }}>
                    {String(h).padStart(2, '0')}
                  </span>
                ))}
              </div>
            </figure>
          </div>
        </section>

        <hr className="section-rule" />

        {/* Insights */}
        {insights.length > 0 && (
          <section aria-labelledby="l-patterns">
            <h3 id="l-patterns" style={{ fontSize: 'var(--text-lg)', marginBottom: '0.25rem' }}>Detected patterns</h3>
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.65rem', color: 'var(--muted)', marginBottom: '1.5rem' }}>
              Rule-based detection only.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {insights.slice(0, 6).map(ins => (
                <ErrorBoundary key={ins.id}>
                  <InsightCard insight={ins} onShowRecords={f => setFilter(f)} />
                </ErrorBoundary>
              ))}
            </div>
          </section>
        )}
      </div>
    </section>
  );
}
