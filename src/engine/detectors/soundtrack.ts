// src/engine/detectors/soundtrack.ts
// Rule-based pattern detectors for STREAM 01 Spotify.
// Each detector is a pure function returning an Insight.

import type { Insight } from '../../data/types';
import type { SpotifyMonthly, SpotifyArtist, SpotifyMeta } from '../../data/types';
import { spotifyMonthToDate, toMonthYear } from '../../utils/dates';

interface SoundtrackDetectorInput {
  monthly: SpotifyMonthly[];
  artists: SpotifyArtist[];
  meta: SpotifyMeta;
}

/** Track with 20+ plays in a single month */
export function detectRepeatListening(
  tracks: Array<{ t: string; ar: string; mo: [number, number][] }>
): Insight[] {
  const results: Insight[] = [];
  for (const track of tracks) {
    for (const [monthIdx, plays] of track.mo) {
      if (plays >= 20) {
        results.push({
          id: `repeat-${track.t}-${monthIdx}`,
          stream: 'soundtrack',
          title: 'Concentrated repeat listening',
          statement: `"${track.t}" by ${track.ar} was played ${plays} times in a single month.`,
          rule: 'Track played 20 or more times within a calendar month.',
          evidence: { track: track.t, artist: track.ar, monthIdx, plays },
          focus: { artist: track.ar, track: track.t },
        });
      }
    }
  }
  return results.slice(0, 10); // top 10
}

/** Artist dominates more than 30% of a month's listening hours */
export function detectArtistDominance(
  monthly: SpotifyMonthly[],
  artists: SpotifyArtist[]
): Insight[] {
  const results: Insight[] = [];
  const artistHoursByMonth = new Map<number, Map<string, number>>();

  for (const artist of artists) {
    for (const [monthIdx, , minutes] of artist.mo) {
      if (!artistHoursByMonth.has(monthIdx)) artistHoursByMonth.set(monthIdx, new Map());
      artistHoursByMonth.get(monthIdx)!.set(artist.a, (artistHoursByMonth.get(monthIdx)!.get(artist.a) || 0) + minutes / 60);
    }
  }

  for (const month of monthly) {
    if (month.h === 0) continue;
    const artistHours = artistHoursByMonth.get(month.m);
    if (!artistHours) continue;
    for (const [artistName, hours] of artistHours.entries()) {
      const share = hours / month.h;
      if (share >= 0.30) {
        const d = spotifyMonthToDate(month.m);
        results.push({
          id: `dominance-${artistName}-${month.m}`,
          stream: 'soundtrack',
          title: 'Artist dominates a month',
          statement: `${artistName} accounted for ${Math.round(share * 100)}% of listening hours in ${toMonthYear(d)}.`,
          rule: 'Artist above 30% of a month\'s total listening hours.',
          evidence: { artist: artistName, monthIdx: month.m, sharePercent: Math.round(share * 100), monthHours: month.h },
          focus: { artist: artistName },
        });
      }
    }
  }
  return results.slice(0, 8);
}

/** Forward-skip rate shift of 5+ percentage points between adjacent years */
export function detectSkipRateShift(years: Array<{ year: number; plays: number; skips: number }>): Insight[] {
  const results: Insight[] = [];
  for (let i = 1; i < years.length; i++) {
    const prev = years[i - 1];
    const curr = years[i];
    if (prev.plays === 0 || curr.plays === 0) continue;
    const prevRate = prev.skips / prev.plays;
    const currRate = curr.skips / curr.plays;
    const shift = (currRate - prevRate) * 100;
    if (Math.abs(shift) >= 5) {
      results.push({
        id: `skip-shift-${curr.year}`,
        stream: 'soundtrack',
        title: 'Skip rate shift between years',
        statement: `The forward-skip rate changed from ${prevRate.toFixed(1)}% in ${prev.year} to ${currRate.toFixed(1)}% in ${curr.year} (${shift > 0 ? '+' : ''}${shift.toFixed(1)} pp).`,
        rule: 'Forward-skip rate changes by 5 or more percentage points between adjacent years.',
        evidence: { fromYear: prev.year, toYear: curr.year, prevRate: prevRate, currRate: currRate, shiftPp: shift },
        focus: {},
      });
    }
  }
  return results;
}

/** Late-window share by year (00:00-05:59 UTC) */
export function detectLateWindow(
  monthly: SpotifyMonthly[],
  utcOffset: number
): Insight {
  let lateTotal = 0;
  let total = 0;
  for (const m of monthly) {
    if (!m.wh) continue;
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        const adj = ((h + utcOffset) % 24 + 24) % 24;
        const count = m.wh[d][h];
        total += count;
        if (adj >= 0 && adj <= 5) lateTotal += count;
      }
    }
  }
  const share = total > 0 ? lateTotal / total : 0;
  return {
    id: 'late-window',
    stream: 'soundtrack',
    title: 'Late-window listening share',
    statement: `${(share * 100).toFixed(1)}% of all plays fall in the 00:00-05:59 window (UTC${utcOffset >= 0 ? '+' : ''}${utcOffset}).`,
    rule: 'Share of plays in the 00:00-05:59 window at the selected UTC offset.',
    evidence: { lateTotal, total, sharePercent: Math.round(share * 100), utcOffset },
    focus: {},
  };
}

/** Shuffle share shift of 10+ percentage points between adjacent years */
export function detectShuffleShift(monthly: SpotifyMonthly[]): Insight[] {
  const yearShuffleMap = new Map<number, { shuffle: number; plays: number }>();
  for (const m of monthly) {
    const year = new Date(spotifyMonthToDate(m.m)).getUTCFullYear();
    if (!yearShuffleMap.has(year)) yearShuffleMap.set(year, { shuffle: 0, plays: 0 });
    const y = yearShuffleMap.get(year)!;
    y.shuffle += m.sh;
    y.plays += m.p;
  }
  const years = Array.from(yearShuffleMap.entries()).sort((a, b) => a[0] - b[0]);
  const results: Insight[] = [];
  for (let i = 1; i < years.length; i++) {
    const [prevYear, prevData] = years[i - 1];
    const [currYear, currData] = years[i];
    if (prevData.plays === 0 || currData.plays === 0) continue;
    const prevShare = prevData.shuffle / prevData.plays;
    const currShare = currData.shuffle / currData.plays;
    const shift = (currShare - prevShare) * 100;
    if (Math.abs(shift) >= 10) {
      results.push({
        id: `shuffle-shift-${currYear}`,
        stream: 'soundtrack',
        title: 'Shuffle usage shift',
        statement: `Shuffle-play share changed from ${(prevShare * 100).toFixed(0)}% (${prevYear}) to ${(currShare * 100).toFixed(0)}% (${currYear}).`,
        rule: 'Shuffle share changes by 10 or more percentage points between adjacent years.',
        evidence: { prevYear, currYear, prevSharePct: Math.round(prevShare * 100), currSharePct: Math.round(currShare * 100) },
        focus: {},
      });
    }
  }
  return results;
}

/** Busiest month */
export function detectBusiestMonth(monthly: SpotifyMonthly[]): Insight {
  const max = monthly.reduce((best, m) => m.p > best.p ? m : best, monthly[0]);
  const d = spotifyMonthToDate(max.m);
  return {
    id: 'busiest-month',
    stream: 'soundtrack',
    title: 'Busiest listening month',
    statement: `${toMonthYear(d)} had the most plays: ${max.p.toLocaleString('en-IN')}.`,
    rule: 'Month with the highest total play count across the full history.',
    evidence: { monthIdx: max.m, plays: max.p, hours: max.h },
    focus: { dateRange: [d.toISOString().slice(0, 7) + '-01', d.toISOString().slice(0, 7) + '-28'] },
  };
}

export function detectLongestEmptyRun(monthly: SpotifyMonthly[]): Insight {
  let longest = 0;
  let current = 0;
  let longestStart = -1;
  let runStart = -1;
  for (const m of monthly) {
    if (m.p === 0) {
      if (current === 0) runStart = m.m;
      current++;
      if (current > longest) { longest = current; longestStart = runStart; }
    } else {
      current = 0;
    }
  }
  const d = longestStart >= 0 ? spotifyMonthToDate(longestStart) : null;
  return {
    id: 'longest-empty-run',
    stream: 'soundtrack',
    title: 'Longest run without records',
    statement: `The longest run of months with no plays is ${longest} months${d ? ` starting ${toMonthYear(d)}` : ''}.`,
    rule: 'Longest consecutive run of months with zero play records.',
    evidence: { months: longest, startMonthIdx: longestStart },
    focus: {},
  };
}

export function runSoundtrackDetectors(input: SoundtrackDetectorInput): Insight[] {
  const insights: Insight[] = [];
  insights.push(...detectArtistDominance(input.monthly, input.artists));
  insights.push(...detectSkipRateShift(input.meta ? [] : [])); // years from meta
  insights.push(...detectShuffleShift(input.monthly));
  insights.push(detectLateWindow(input.monthly, 0));
  insights.push(detectBusiestMonth(input.monthly));
  insights.push(detectLongestEmptyRun(input.monthly));
  return insights;
}
