// scripts/adapters/transactions.mjs
// STREAM 03: Augmented India Transactions (SYNTHETIC)
// Reads CSV only. Drops null trans_id rows. Reconciles per trans_id.
// NEVER ships: cc_num, customer_id, first, last, dob, street, gender, job,
//              city, city_pop, lat, long, merch_lat, merch_long, merchant,
//              is_fraud, trans_id, state.
// No currency symbol ever. Amount is unit-less.

import { createReadStream } from 'fs';
import { parse } from 'csv-parse';

const VALID_CATEGORIES = new Set(['online_shopping', 'travel', 'entertainment', 'fitness_and_medical']);

function parseTransDate(raw) {
  if (!raw || !raw.trim()) return { day: null, hour: null };
  // Format: m/d/yyyy h:mm
  const m = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/);
  if (!m) return { day: null, hour: null };
  const [, mo, d, y, h] = m;
  return {
    day: `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    hour: +h,
  };
}

export async function processTransactions(filePath) {
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

  // Drop rows with null/empty trans_id
  const nullTransIdRows = rows.filter(r => !r.trans_id || !r.trans_id.trim() || r.trans_id.trim() === '').length;
  const withId = rows.filter(r => r.trans_id && r.trans_id.trim() && r.trans_id.trim() !== '');

  // Reconcile per trans_id: first non-null per field
  const reconciled = new Map();
  for (const r of withId) {
    const id = r.trans_id.trim();
    if (!reconciled.has(id)) {
      reconciled.set(id, {
        trans_id: id,
        trans_date_trans_time: r.trans_date_trans_time?.trim() || null,
        category: r.category?.trim() || null,
        amt: r.amt?.trim() || null,
      });
    } else {
      const existing = reconciled.get(id);
      if (!existing.trans_date_trans_time && r.trans_date_trans_time?.trim()) {
        existing.trans_date_trans_time = r.trans_date_trans_time.trim();
      }
      if (!existing.category && r.category?.trim()) {
        existing.category = r.category.trim();
      }
      if (!existing.amt && r.amt?.trim()) {
        existing.amt = r.amt.trim();
      }
    }
  }

  const reconciledRecords = reconciled.size;
  let datedRecords = 0;
  let undatedRecords = 0;

  let seqId = 0;
  const records = [];
  const monthlyMap = new Map(); // "yyyy-mm" -> { category -> { count, sum } }
  const hourHist = new Array(24).fill(0);
  const amountValues = [];
  const categoryShares = {};

  let dateMin = null, dateMax = null;

  for (const rec of reconciled.values()) {
    seqId++;
    const { day, hour } = parseTransDate(rec.trans_date_trans_time);
    const category = VALID_CATEGORIES.has(rec.category) ? rec.category : 'uncategorised';
    const amount = rec.amt ? parseFloat(rec.amt) : null;

    if (day) {
      datedRecords++;
      if (!dateMin || day < dateMin) dateMin = day;
      if (!dateMax || day > dateMax) dateMax = day;

      const ym = day.slice(0, 7);
      if (!monthlyMap.has(ym)) monthlyMap.set(ym, {});
      const mc = monthlyMap.get(ym);
      if (!mc[category]) mc[category] = { count: 0, sum: 0 };
      mc[category].count++;
      if (amount !== null) mc[category].sum += amount;

      if (hour !== null) hourHist[hour]++;
    } else {
      undatedRecords++;
    }

    if (amount !== null) amountValues.push(amount);
    categoryShares[category] = (categoryShares[category] || 0) + 1;

    records.push({
      id: seqId,
      day,
      hour: day ? hour : null,
      category,
      amount,
    });
  }

  // Amount histogram: 20 fixed bins across observed range
  const amtMin = Math.min(...amountValues);
  const amtMax = Math.max(...amountValues);
  const binWidth = (amtMax - amtMin) / 20;
  const amtHist = new Array(20).fill(0);
  for (const v of amountValues) {
    const bin = Math.min(19, Math.floor((v - amtMin) / binWidth));
    amtHist[bin]++;
  }

  const monthly = Array.from(monthlyMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([ym, cats]) => ({
    ym,
    cats: Object.fromEntries(Object.entries(cats).map(([c, v]) => [c, { n: v.count, s: Math.round(v.sum) }])),
  }));

  return {
    monthly,
    hourHist,
    amtHist: { min: Math.round(amtMin), max: Math.round(amtMax), bins: amtHist },
    categoryShares,
    records,
    meta: {
      rawCount,
      nullTransIdRows,
      withIdCount: withId.length,
      reconciledRecords,
      datedRecords,
      undatedRecords,
      dateMin,
      dateMax,
      amtMin: Math.round(amtMin),
      amtMax: Math.round(amtMax),
    },
  };
}
