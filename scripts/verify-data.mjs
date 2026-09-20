// scripts/verify-data.mjs
// Privacy guard: scans all public/data/*.json for banned keys, PII patterns, size budgets.
// Run automatically before every build.

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { createWriteStream } from 'fs';
import { tmpdir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'public/data');

const BANNED_KEYS = new Set([
  'cc_num', 'customer_id', 'first', 'last', 'dob', 'street', 'gender',
  'job', 'city', 'city_pop', 'lat', 'long', 'merch_lat', 'merch_long',
  'merchant', 'is_fraud', 'trans_id', 'note', 'state', 'uri',
]);

const KYC_TERMS = ['aadhar', 'aadhaar', 'pan card', 'kyc', 'passport', 'otp', 'upi', 'ifsc'];
// Regex patterns for word-boundary matching (KYC terms should be standalone)
const KYC_PATTERNS = KYC_TERMS.map(t => new RegExp(`\\b${t.replace(/ /g, '\\s+')}\\b`, 'i'));

const EMAIL_PATTERN = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;
const DIGIT_RUN = /\d{6,}/;

// Initial load files (non-lazy)
const INITIAL_LOAD_FILES = [
  'manifest.json', 'analysis.json', 'spotify-monthly.json',
  'ledger-monthly.json', 'transactions-monthly.json', 'spotify-artists.json',
];
const LAZY_FILES = [
  'spotify-tracks.json', 'spotify-graph.json', 'ledger-records.json', 'transactions-records.json',
];

// Gzip size estimate
async function gzipSize(content) {
  const tmp = join(tmpdir(), `verify-${Date.now()}.gz`);
  await pipeline(Readable.from([content]), createGzip(), createWriteStream(tmp));
  return statSync(tmp).size;
}

let errors = [];
let warnings = [];

function checkObject(obj, filename, path = '') {
  if (typeof obj === 'string') {
    for (const pat of KYC_PATTERNS) {
      if (pat.test(obj)) {
        errors.push(`${filename}${path}: string matches KYC pattern "${pat.source}": ${obj.slice(0, 40)}`);
      }
    }
    if (EMAIL_PATTERN.test(obj)) {
      errors.push(`${filename}${path}: string matches email pattern: ${obj.slice(0, 30)}`);
    }
    if (DIGIT_RUN.test(obj)) {
      errors.push(`${filename}${path}: string contains 6+ consecutive digits: ${obj.slice(0, 30)}`);
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((item, i) => checkObject(item, filename, `${path}[${i}]`));
  } else if (obj !== null && typeof obj === 'object') {
    for (const [key, val] of Object.entries(obj)) {
      if (BANNED_KEYS.has(key)) {
        errors.push(`${filename}${path}: banned key "${key}" found`);
      }
      checkObject(val, filename, `${path}.${key}`);
    }
  }
}

console.log('\n=== PRIVACY GUARD RUNNING ===\n');

let files;
try {
  files = readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
} catch {
  console.error('public/data/ does not exist. Run "npm run data" first.');
  process.exit(1);
}

if (files.length === 0) {
  console.error('public/data/ is empty. Run "npm run data" first.');
  process.exit(1);
}

// Check each file for banned content
for (const filename of files) {
  const content = readFileSync(join(DATA_DIR, filename), 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    errors.push(`${filename}: invalid JSON`);
    continue;
  }
  checkObject(parsed, filename);
}

// Check size budgets
console.log('Checking size budgets...');
let initialTotalRaw = 0;
for (const f of INITIAL_LOAD_FILES) {
  const fp = join(DATA_DIR, f);
  try {
    const size = statSync(fp).size;
    initialTotalRaw += size;
    console.log(`  ${f}: ${(size / 1024).toFixed(1)} KB raw`);
  } catch {
    warnings.push(`${f}: not found (may not be generated yet)`);
  }
}
console.log(`  Total initial load: ${(initialTotalRaw / 1024).toFixed(1)} KB raw`);

// Lazy chunk sizes
for (const f of LAZY_FILES) {
  const fp = join(DATA_DIR, f);
  try {
    const size = statSync(fp).size;
    // Rough gzip estimate: typically ~30-40% of raw size
    const estimatedGzip = size * 0.35;
    if (estimatedGzip > 700 * 1024) {
      warnings.push(`${f}: estimated gzip size ${(estimatedGzip / 1024).toFixed(0)} KB may exceed 700 KB budget`);
    }
    console.log(`  ${f}: ${(size / 1024).toFixed(1)} KB raw (~${(estimatedGzip / 1024).toFixed(0)} KB gzip est.)`);
  } catch {
    warnings.push(`${f}: not found`);
  }
}

// Report
if (warnings.length > 0) {
  console.log('\nWarnings:');
  for (const w of warnings) console.warn(`  WARNING: ${w}`);
}

if (errors.length > 0) {
  console.error('\nPRIVACY GUARD FAILED:');
  for (const e of errors) console.error(`  ERROR: ${e}`);
  process.exit(1);
}

console.log('\nPrivacy guard: all checks passed.\n');
