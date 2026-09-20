// scripts/adapters/spotify.mjs
// STREAM 01: Spotify Listening History
// Parses spotify_history.csv (UTF-8 BOM), removes exact duplicates,
// computes all aggregates. Does NOT use the 'skipped' flag for analysis.

import { createReadStream } from 'fs';
import { parse } from 'csv-parse';

const SKIP_REASONS = new Set(['fwdbtn', 'nextbtn']);

function stripBOM(str) {
  return str.charCodeAt(0) === 0xFEFF ? str.slice(1) : str;
}

export async function processSpotify(filePath) {
  const rows = [];

  await new Promise((resolve, reject) => {
    const stream = createReadStream(filePath, { encoding: 'utf8' });
    let firstChunk = true;

    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });

    parser.on('readable', () => {
      let record;
      while ((record = parser.read()) !== null) {
        rows.push(record);
      }
    });
    parser.on('error', reject);
    parser.on('end', resolve);

    stream.on('data', chunk => {
      if (firstChunk) {
        // Strip BOM manually if needed
        if (chunk.charCodeAt && chunk.charCodeAt(0) === 0xFEFF) {
          chunk = chunk.slice(1);
        }
        firstChunk = false;
      }
      parser.write(chunk);
    });
    stream.on('end', () => parser.end());
    stream.on('error', reject);
  });

  const rawCount = rows.length;

  // Remove exact duplicates (all 11 columns)
  const seen = new Set();
  const deduped = [];
  let dupCount = 0;
  for (const r of rows) {
    const key = [r.spotify_track_uri, r.ts, r.platform, r.ms_played,
      r.track_name, r.artist_name, r.album_name,
      r.reason_start, r.reason_end, r.shuffle, r.skipped].join('|');
    if (seen.has(key)) {
      dupCount++;
    } else {
      seen.add(key);
      deduped.push(r);
    }
  }

  // Compute epoch base: 2013-07 = month index 0
  const BASE_YEAR = 2013;
  const BASE_MONTH = 7; // July

  function toMonthIndex(date) {
    return (date.getUTCFullYear() - BASE_YEAR) * 12 + (date.getUTCMonth() + 1 - BASE_MONTH);
  }

  // Parse and enrich
  let playsUnder30 = 0;
  let playsZeroMs = 0;
  let skippedFlagTrue = 0;
  let fwdbtnCount = 0;

  const enriched = deduped.map(r => {
    const ms = parseInt(r.ms_played, 10) || 0;
    const tsDate = new Date(r.ts + 'Z'); // treat as UTC
    const monthIdx = toMonthIndex(tsDate);
    const hourUTC = tsDate.getUTCHours();
    const weekdayUTC = tsDate.getUTCDay(); // 0=Sun..6=Sat
    const isListen = ms >= 30000;
    const isSkip = SKIP_REASONS.has(r.reason_end);
    const isShuffle = r.shuffle === 'TRUE' || r.shuffle === 'true' || r.shuffle === '1';
    const skippedFlag = r.skipped === 'TRUE' || r.skipped === 'true' || r.skipped === '1';

    if (ms < 30000) playsUnder30++;
    if (ms === 0) playsZeroMs++;
    if (skippedFlag) skippedFlagTrue++;
    if (r.reason_end === 'fwdbtn') fwdbtnCount++;

    return {
      monthIdx,
      hourUTC,
      weekdayUTC,
      ms,
      isListen,
      isSkip,
      isShuffle,
      skippedFlag,
      artist: r.artist_name,
      track: r.track_name,
      album: r.album_name,
      platform: r.platform,
      reason_start: r.reason_start,
      reason_end: r.reason_end,
    };
  });

  // Find month range
  let minMonth = Infinity;
  let maxMonth = -Infinity;
  for (const r of enriched) {
    if (r.monthIdx < minMonth) minMonth = r.monthIdx;
    if (r.monthIdx > maxMonth) maxMonth = r.monthIdx;
  }
  const totalMonths = maxMonth - minMonth + 1;

  // Monthly aggregates
  const monthlyMap = new Map();
  function getMonth(idx) {
    if (!monthlyMap.has(idx)) {
      monthlyMap.set(idx, {
        monthIdx: idx,
        plays: 0,
        listens: 0,
        hours: 0,
        skips: 0,
        shortPlays: 0,
        shufflePlays: 0,
        platforms: {},
        reason_start: {},
        reason_end: {},
        // 7x24 matrix for heatmap
        weekHour: Array.from({length: 7}, () => new Array(24).fill(0)),
      });
    }
    return monthlyMap.get(idx);
  }

  for (const r of enriched) {
    const m = getMonth(r.monthIdx);
    m.plays++;
    if (r.isListen) m.listens++;
    m.hours += r.ms / 3600000;
    if (r.isSkip) m.skips++;
    if (r.ms < 30000) m.shortPlays++;
    if (r.isShuffle) m.shufflePlays++;
    m.platforms[r.platform] = (m.platforms[r.platform] || 0) + 1;
    m.reason_start[r.reason_start] = (m.reason_start[r.reason_start] || 0) + 1;
    m.reason_end[r.reason_end] = (m.reason_end[r.reason_end] || 0) + 1;
    if (r.weekdayUTC >= 0 && r.weekdayUTC < 7 && r.hourUTC >= 0 && r.hourUTC < 24) {
      m.weekHour[r.weekdayUTC][r.hourUTC]++;
    }
  }

  // Fill all month slots from min to max
  const monthly = [];
  for (let i = minMonth; i <= maxMonth; i++) {
    const m = monthlyMap.get(i);
    if (m) {
      monthly.push({
        m: i,
        p: m.plays,
        l: m.listens,
        h: Math.round(m.hours * 10) / 10,
        sk: m.skips,
        sp: m.shortPlays,
        sh: m.shufflePlays,
        pl: m.platforms,
        rs: m.reason_start,
        re: m.reason_end,
        wh: m.weekHour,
      });
    } else {
      monthly.push({ m: i, p: 0, l: 0, h: 0, sk: 0, sp: 0, sh: 0, pl: {}, rs: {}, re: {}, wh: null });
    }
  }

  const activeMonths = monthly.filter(m => m.p > 0).length;

  // Year summaries
  const yearMap = new Map();
  for (const r of enriched) {
    const year = BASE_YEAR + Math.floor((r.monthIdx + BASE_MONTH - 1) / 12);
    // Actually compute year from monthIdx
    const absMonth = r.monthIdx + BASE_MONTH - 1; // months since Jan 2013
    const yr = Math.floor(absMonth / 12) + 2013;

    if (!yearMap.has(yr)) {
      yearMap.set(yr, { year: yr, plays: 0, listens: 0, hours: 0, skips: 0, artists: new Set(), tracks: new Set() });
    }
    const y = yearMap.get(yr);
    y.plays++;
    if (r.isListen) y.listens++;
    y.hours += r.ms / 3600000;
    if (r.isSkip) y.skips++;
    y.artists.add(r.artist);
    y.tracks.add(r.track + '|' + r.artist);
  }

  const years = Array.from(yearMap.entries()).sort((a, b) => a[0] - b[0]).map(([yr, y]) => ({
    year: yr,
    plays: y.plays,
    listens: y.listens,
    hours: Math.round(y.hours),
    skips: y.skips,
    artists: y.artists.size,
    tracks: y.tracks.size,
  }));

  // Artist aggregates (top 1000 by hours)
  const artistMap = new Map();
  for (const r of enriched) {
    if (!artistMap.has(r.artist)) {
      artistMap.set(r.artist, {
        artist: r.artist,
        plays: 0, listens: 0, hours: 0, skips: 0,
        hourHist: new Array(24).fill(0),
        weekdayHist: new Array(7).fill(0),
        monthly: new Map(),
        firstMonth: Infinity,
        lastMonth: -Infinity,
      });
    }
    const a = artistMap.get(r.artist);
    a.plays++;
    if (r.isListen) a.listens++;
    a.hours += r.ms / 3600000;
    if (r.isSkip) a.skips++;
    a.hourHist[r.hourUTC]++;
    a.weekdayHist[r.weekdayUTC]++;
    if (!a.monthly.has(r.monthIdx)) a.monthly.set(r.monthIdx, { plays: 0, ms: 0 });
    const am = a.monthly.get(r.monthIdx);
    am.plays++;
    am.ms += r.ms;
    if (r.monthIdx < a.firstMonth) a.firstMonth = r.monthIdx;
    if (r.monthIdx > a.lastMonth) a.lastMonth = r.monthIdx;
  }

  // Sort by hours, take top 1000
  const sortedArtists = Array.from(artistMap.values())
    .sort((a, b) => b.hours - a.hours);

  const top1000 = sortedArtists.slice(0, 1000);
  const otherArtists = sortedArtists.slice(1000);

  // Compute "all other" bucket totals
  const otherBucket = {
    artist: '__other__',
    plays: otherArtists.reduce((s, a) => s + a.plays, 0),
    listens: otherArtists.reduce((s, a) => s + a.listens, 0),
    hours: Math.round(otherArtists.reduce((s, a) => s + a.hours, 0) * 10) / 10,
    skips: otherArtists.reduce((s, a) => s + a.skips, 0),
    firstMonth: null,
    lastMonth: null,
    hourHist: new Array(24).fill(0),
    weekdayHist: new Array(7).fill(0),
    monthly: [],
  };

  for (const a of otherArtists) {
    for (let i = 0; i < 24; i++) otherBucket.hourHist[i] += a.hourHist[i];
    for (let i = 0; i < 7; i++) otherBucket.weekdayHist[i] += a.weekdayHist[i];
  }

  const artists = [
    ...top1000.map(a => ({
      a: a.artist,
      p: a.plays,
      l: a.listens,
      h: Math.round(a.hours * 10) / 10,
      sk: a.skips,
      hh: a.hourHist,
      wh: a.weekdayHist,
      fm: a.firstMonth,
      lm: a.lastMonth,
      // sparse monthly: [monthIdx, plays, minutes]
      mo: Array.from(a.monthly.entries()).sort((x, y) => x[0] - y[0])
        .map(([mi, v]) => [mi, v.plays, Math.round(v.ms / 60000)]),
    })),
    otherBucket,
  ];

  // Co-play graph (top 300 artists)
  const top300Names = new Set(sortedArtists.slice(0, 300).map(a => a.artist));
  const top300Idx = new Map(sortedArtists.slice(0, 300).map((a, i) => [a.artist, i]));

  // Sort enriched by monthIdx then need ts for within-30-min adjacency
  // We need to sort all plays chronologically. Use original ts ordering from deduped.
  // We already have them ordered. Build co-play from sequential pairs within 30 min gap.
  const coPlayMap = new Map(); // "a|b" -> count

  // We need the timestamp for co-play; re-parse from deduped
  const timestampedDeduped = deduped.map(r => {
    const ms = parseInt(r.ms_played, 10) || 0;
    const tsMs = new Date(r.ts + 'Z').getTime();
    return { artist: r.artist_name, tsMs, ms };
  }).sort((a, b) => a.tsMs - b.tsMs);

  for (let i = 0; i < timestampedDeduped.length - 1; i++) {
    const cur = timestampedDeduped[i];
    const next = timestampedDeduped[i + 1];
    if (!top300Names.has(cur.artist) || !top300Names.has(next.artist)) continue;
    if (cur.artist === next.artist) continue;
    // Gap between end of current and start of next
    const endTs = cur.tsMs + cur.ms;
    const gap = next.tsMs - endTs;
    if (gap <= 30 * 60 * 1000 && gap >= 0) {
      const key = cur.artist < next.artist
        ? `${cur.artist}|${next.artist}`
        : `${next.artist}|${cur.artist}`;
      coPlayMap.set(key, (coPlayMap.get(key) || 0) + 1);
    }
  }

  // Build adjacency: for each top-300 artist, up to 12 neighbours
  const graphAdjacency = {};
  for (const [key, count] of coPlayMap.entries()) {
    const [a, b] = key.split('|');
    if (!graphAdjacency[a]) graphAdjacency[a] = [];
    if (!graphAdjacency[b]) graphAdjacency[b] = [];
    graphAdjacency[a].push([b, count]);
    graphAdjacency[b].push([a, count]);
  }

  const graph = {};
  for (const [artist, neighbours] of Object.entries(graphAdjacency)) {
    graph[artist] = neighbours
      .sort((x, y) => y[1] - x[1])
      .slice(0, 12)
      .map(([n, c]) => ({ n, c }));
  }

  // Top 3000 tracks
  const trackMap = new Map();
  for (const r of enriched) {
    const key = r.track + '|||' + r.artist;
    if (!trackMap.has(key)) {
      trackMap.set(key, {
        track: r.track, artist: r.artist, album: r.album,
        plays: 0, listens: 0, hours: 0, skips: 0,
        firstMonth: Infinity, lastMonth: -Infinity,
        monthly: new Map(),
      });
    }
    const t = trackMap.get(key);
    t.plays++;
    if (r.isListen) t.listens++;
    t.hours += r.ms / 3600000;
    if (r.isSkip) t.skips++;
    if (r.monthIdx < t.firstMonth) t.firstMonth = r.monthIdx;
    if (r.monthIdx > t.lastMonth) t.lastMonth = r.monthIdx;
    t.monthly.set(r.monthIdx, (t.monthly.get(r.monthIdx) || 0) + 1);
  }

  const tracks = Array.from(trackMap.values())
    .sort((a, b) => b.plays - a.plays)
    .slice(0, 3000)
    .map(t => ({
      t: t.track,
      ar: t.artist,
      al: t.album,
      p: t.plays,
      l: t.listens,
      h: Math.round(t.hours * 10) / 10,
      sk: t.skips,
      fm: t.firstMonth === Infinity ? null : t.firstMonth,
      lm: t.lastMonth === -Infinity ? null : t.lastMonth,
      // compact monthly sparkline: [monthIdx, plays]
      mo: Array.from(t.monthly.entries()).sort((a, b) => a[0] - b[0]).map(([mi, p]) => [mi, p]),
    }));

  return {
    monthly,
    years,
    artists,
    tracks,
    graph,
    meta: {
      rawCount,
      dupCount,
      dedupCount: rawCount - dupCount,
      playsUnder30,
      playsZeroMs,
      skippedFlagTrue,
      fwdbtnCount,
      minMonth,
      maxMonth,
      activeMonths,
      totalMonths,
      baseYear: BASE_YEAR,
      baseMonth: BASE_MONTH,
    },
  };
}
