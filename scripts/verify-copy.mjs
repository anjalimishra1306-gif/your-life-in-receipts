// scripts/verify-copy.mjs
// Scans src/ and README.md for banned phrases.
// Fails the build on any hit.
// The banned-list section in README (delimited by BANNED_PHRASES_START/END) is excluded.

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const BANNED_PHRASES = [
  'caused by',
  'because of',
  'led to',
  'reflects',
  ' sad',
  'lonely',
  ' happy',
  'stressed',
  'mood',
  'emotion',
  'obsessed',
  'same person',
  'his life',
  'her life',
  "this person's life",
  'machine learning',
  'AI-powered',
  'insomnia',
];

// Files/dirs to exclude from scanning
const EXCLUDED_FILES = new Set(['verify-copy.mjs', 'bannedPhrases.ts']);
const EXCLUDED_DIRS = new Set(['node_modules', 'dist', '.git', 'public', 'data']);
const ALLOWED_EXTENSIONS = new Set(['.ts', '.tsx', '.mjs', '.js', '.css', '.html', '.md']);

function scanFile(filePath, content) {
  const lines = content.split('\n');
  const hits = [];

  // For README.md, skip between BANNED_PHRASES_START and BANNED_PHRASES_END markers
  let inBannedSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes('BANNED_PHRASES_START')) { inBannedSection = true; continue; }
    if (line.includes('BANNED_PHRASES_END')) { inBannedSection = false; continue; }
    if (inBannedSection) continue;

    const lower = line.toLowerCase();
    for (const phrase of BANNED_PHRASES) {
      if (lower.includes(phrase.toLowerCase())) {
        hits.push({ line: i + 1, phrase, text: line.trim().slice(0, 80) });
      }
    }
  }
  return hits;
}

function walkDir(dir, callback) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      walkDir(full, callback);
    } else if (entry.isFile()) {
      if (EXCLUDED_FILES.has(entry.name)) continue;
      if (!ALLOWED_EXTENSIONS.has(extname(entry.name))) continue;
      callback(full);
    }
  }
}

console.log('\n=== COPY VERIFIER RUNNING ===\n');

let totalErrors = 0;
const SRC_DIR = join(ROOT, 'src');
const README = join(ROOT, 'README.md');

function checkFile(filePath) {
  let content;
  try {
    content = readFileSync(filePath, 'utf8');
  } catch { return; }

  const hits = scanFile(filePath, content);
  if (hits.length > 0) {
    const rel = filePath.replace(ROOT, '').replace(/\\/g, '/');
    for (const h of hits) {
      console.error(`  ${rel}:${h.line}: banned phrase "${h.phrase}" - ${h.text}`);
      totalErrors++;
    }
  }
}

walkDir(SRC_DIR, checkFile);
checkFile(README);

if (totalErrors > 0) {
  console.error(`\nCOPY VERIFIER FAILED: ${totalErrors} banned phrase(s) found.\n`);
  process.exit(1);
}

console.log('Copy verifier: no banned phrases found.\n');
