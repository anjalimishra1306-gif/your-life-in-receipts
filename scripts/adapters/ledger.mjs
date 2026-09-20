// scripts/adapters/ledger.mjs
// STREAM 02: Daily Household Transactions (Ledger)
// Parses INR ledger, normalizes categories, applies privacy guards.
// NEVER ships Note field. NEVER ships raw account names.

import { createReadStream } from 'fs';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const taxonomy = JSON.parse(readFileSync(join(__dirname, '../ledger-taxonomy.json'), 'utf8'));

const AGGREGATE_ONLY = new Set(taxonomy.aggregateOnly);
const SUBCATEGORY_ALLOWED_FAMILIES = new Set(['Food', 'Transport']);

// Mode normalization: mask account names, keep type
function normalizeMode(rawMode) {
  if (!rawMode) return 'Unknown';
  const m = rawMode.toLowerCase();
  if (m.includes('cash')) return 'Cash';
  if (m.includes('credit card') || m.includes('creditcard')) return 'Card';
  if (m.includes('debit card') || m.includes('debitcard')) return 'Card';
  if (m.includes('bank') || m.includes('saving') || m.includes('current')) return 'Bank Account';
  if (m.includes('fund') || m.includes('mutual') || m.includes('deposit') || m.includes('ppf') || m.includes('nps')) return 'Investment Instrument';
  if (m.includes('wallet') || m.includes('upi') || m.includes('paytm') || m.includes('phonepe')) return 'Digital Wallet';
  return 'Other';
}

// Normalize a raw category string to canonical form
function normalizeCategory(raw) {
  if (!raw) return 'Other';
  const trimmed = raw.trim();

  // Check direct mapping
  if (taxonomy.normalizations[trimmed]) return taxonomy.normalizations[trimmed];

  // Case-insensitive check
  const lower = trimmed.toLowerCase();
  for (const [key, val] of Object.entries(taxonomy.normalizations)) {
    if (key.toLowerCase() === lower) return val;
  }

  // Fuzzy: remove numbers and trailing spaces for variants like "Small Cap fund 2"
  const stripped = trimmed.replace(/\s*\d+\s*$/, '').trim();
  if (taxonomy.normalizations[stripped]) return taxonomy.normalizations[stripped];
  for (const [key, val] of Object.entries(taxonomy.normalizations)) {
    if (key.toLowerCase() === stripped.toLowerCase()) return val;
  }

  // Check if it contains keywords
  for (const [key, val] of Object.entries(taxonomy.normalizations)) {
    if (lower.includes(key.toLowerCase()) && key.length > 3) return val;
  }

  // Title-case fallback
  const titleCased = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  return titleCased || 'Other';
}

function getFamily(category) {
  return taxonomy.families[category] || 'Spending';
}

// Parse ledger date (day-first, two formats)
function parseDate(raw) {
  if (!raw) return null;
  const s = raw.trim();

  // Format: "dd/mm/yyyy hh:mm:ss"
  const dtMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/);
  if (dtMatch) {
    const [, d, mo, y, h, mi, sec] = dtMatch;
    return {
      date: new Date(Date.UTC(+y, +mo - 1, +d)),
      hour: +h,
      hasTime: true,
    };
  }

  // Format: "d/m/yyyy" or "dd/mm/yyyy"
  const dMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dMatch) {
    const [, d, mo, y] = dMatch;
    return {
      date: new Date(Date.UTC(+y, +mo - 1, +d)),
      hour: null,
      hasTime: false,
    };
  }

  return null;
}

export async function processLedger(filePath) {
  const rows = [];

  await new Promise((resolve, reject) => {
    const stream = createReadStream(filePath, { encoding: 'utf8' });
    const parser = parse({ columns: true, skip_empty_lines: true, trim: true, bom: true });
    parser.on('readable', () => {
      let r;
      while ((r = parser.read()) !== null) rows.push(r);
    });
    parser.on('error', reject);
    parser.on('end', resolve);
    stream.pipe(parser);
  });

  const rawCount = rows.length;
  let parseFailures = 0;

  const enriched = [];
  for (const r of rows) {
    const parsed = parseDate(r['Date']);
    if (!parsed) { parseFailures++; continue; }

    const category = normalizeCategory(r['Category']);
    const family = getFamily(category);
    const type = r['Income/Expense']?.trim() || 'Unknown';
    const amount = parseFloat(r['Amount']) || 0;
    const mode = normalizeMode(r['Mode']);
    const subcategory = r['Subcategory']?.trim() || null;
    const rawCurrency = r['Currency']?.trim() || 'INR';

    // Tag Expense rows with investment categories as Savings and Investments
    let effectiveFamily = family;
    if (type === 'Expense' && (category === 'Savings and Investments' || category === 'Life Insurance')) {
      effectiveFamily = 'Investments';
    }

    enriched.push({
      date: parsed.date,
      hour: parsed.hour,
      hasTime: parsed.hasTime,
      category,
      family: effectiveFamily,
      type, // Expense / Income / Transfer-Out
      amount,
      mode,
      subcategory,
      currency: rawCurrency,
    });
  }

  if (parseFailures > 0) {
    throw new Error(`Ledger: ${parseFailures} date parse failures - expected 0`);
  }

  // Count by type
  const byType = { Expense: 0, Income: 0, 'Transfer-Out': 0, other: 0 };
  for (const r of enriched) {
    if (r.type in byType) byType[r.type]++;
    else byType.other++;
  }

  // Date range
  let minDateMs = Infinity;
  let maxDateMs = -Infinity;
  for (const r of enriched) {
    const t = r.date.getTime();
    if (t < minDateMs) minDateMs = t;
    if (t > maxDateMs) maxDateMs = t;
  }
  const minDate = new Date(minDateMs);
  const maxDate = new Date(maxDateMs);

  // Month index: months since 2015-01 (absolute)
  function toMonthIdx(date) {
    return (date.getUTCFullYear() - 2015) * 12 + date.getUTCMonth();
  }

  // Active months (any record)
  const activeMonthSet = new Set(enriched.map(r => toMonthIdx(r.date)));
  const activeMonths = activeMonthSet.size;

  // Monthly aggregates
  const monthMap = new Map();
  function getM(idx) {
    if (!monthMap.has(idx)) {
      monthMap.set(idx, {
        idx,
        expenseSum: 0, expenseCount: 0,
        incomeSum: 0, incomeCount: 0,
        transferSum: 0, transferCount: 0,
        totalRows: 0,
        byCategory: new Map(),
        modeGroups: {},
        investmentSum: 0, investmentCount: 0,
      });
    }
    return monthMap.get(idx);
  }

  const weekdayHist = new Array(7).fill(0); // Sun=0
  const hourHist = new Array(24).fill(0);

  for (const r of enriched) {
    const idx = toMonthIdx(r.date);
    const m = getM(idx);
    m.totalRows++;
    weekdayHist[r.date.getUTCDay()]++;
    if (r.hasTime && r.hour !== null) hourHist[r.hour]++;

    m.modeGroups[r.mode] = (m.modeGroups[r.mode] || 0) + 1;

    if (r.type === 'Transfer-Out') {
      m.transferSum += r.amount;
      m.transferCount++;
    } else if (r.type === 'Income') {
      m.incomeSum += r.amount;
      m.incomeCount++;
    } else if (r.type === 'Expense') {
      // Investments excluded from ordinary spending
      if (r.family === 'Investments') {
        m.investmentSum += r.amount;
        m.investmentCount++;
      } else {
        m.expenseSum += r.amount;
        m.expenseCount++;
        if (!m.byCategory.has(r.category)) m.byCategory.set(r.category, { sum: 0, count: 0 });
        const bc = m.byCategory.get(r.category);
        bc.sum += r.amount;
        bc.count++;
      }
    }
  }

  // Enumerate all months in range
  const minIdx = toMonthIdx(minDate);
  const maxIdx = toMonthIdx(maxDate);
  const monthly = [];
  for (let i = minIdx; i <= maxIdx; i++) {
    const m = monthMap.get(i) || { idx: i, expenseSum: 0, expenseCount: 0, incomeSum: 0, incomeCount: 0, transferSum: 0, transferCount: 0, totalRows: 0, byCategory: new Map(), modeGroups: {}, investmentSum: 0, investmentCount: 0 };
    monthly.push({
      m: i,
      es: Math.round(m.expenseSum),
      ec: m.expenseCount,
      is_: Math.round(m.incomeSum),
      ic: m.incomeCount,
      ts: Math.round(m.transferSum),
      tc: m.transferCount,
      tr: m.totalRows,
      cat: Object.fromEntries(
        Array.from(m.byCategory.entries()).map(([k, v]) => [k, { s: Math.round(v.sum), c: v.count }])
      ),
      mg: m.modeGroups,
      inv: Math.round(m.investmentSum),
    });
  }

  // Category presence matrix
  const allCategories = new Set();
  for (const r of enriched) if (r.type === 'Expense' && r.family !== 'Investments') allCategories.add(r.category);

  const catMonthMap = new Map();
  for (const cat of allCategories) {
    const monthsPresent = new Set(
      enriched.filter(r => r.category === cat && r.type === 'Expense' && r.family !== 'Investments')
        .map(r => toMonthIdx(r.date))
    );
    const first = Math.min(...monthsPresent);
    const last = Math.max(...monthsPresent);
    catMonthMap.set(cat, { months: [...monthsPresent].sort((a, b) => a - b), first, last, count: monthsPresent.size });
  }

  const categoryPresence = Object.fromEntries(
    Array.from(catMonthMap.entries()).map(([cat, v]) => [cat, { mo: v.months, fm: v.first, lm: v.last, n: v.count }])
  );

  // Individual records (non-sensitive expense rows)
  // Strip Note always. Mask amounts >= 10000 as band.
  let recordId = 0;
  const records = [];
  for (const r of enriched) {
    if (r.type !== 'Expense') continue;
    if (r.family === 'Investments') continue;
    if (AGGREGATE_ONLY.has(r.category)) continue;

    recordId++;
    const amountDisplay = r.amount >= 10000 ? '10,000+' : r.amount;
    const rec = {
      id: recordId,
      date: r.date.toISOString().slice(0, 10),
      category: r.category,
      family: r.family,
      mode: r.mode,
      amount: amountDisplay,
    };
    // Only include subcategory for Food and Transport
    if (SUBCATEGORY_ALLOWED_FAMILIES.has(r.category) && r.subcategory) {
      rec.sub = r.subcategory;
    }
    records.push(rec);
  }

  return {
    monthly,
    weekdayHist,
    hourHist,
    categoryPresence,
    records,
    meta: {
      rawCount,
      parseFailures,
      byType,
      minDate: minDate.toISOString().slice(0, 10),
      maxDate: maxDate.toISOString().slice(0, 10),
      activeMonths,
      minMonthIdx: minIdx,
      maxMonthIdx: maxIdx,
      investmentRowsExcluded: enriched.filter(r => r.type === 'Expense' && r.family === 'Investments').length,
      timedRows: enriched.filter(r => r.hasTime).length,
      recordCount: records.length,
    },
  };
}
