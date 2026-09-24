#!/usr/bin/env node
/**
 * Counts TCs and skip inventory for Cypress (.cy.ts) and FTR (.ts) test files.
 * Uses tokenization + brace-depth tracking for accurate per-suite TC counts.
 *
 * Usage:
 *   find <dirs> -name "*.cy.ts" | xargs node count_test_cases.mjs [flags]
 *   node count_test_cases.mjs [flags] <file...>
 *
 * Flags:
 *   --ftr                FTR mode: static skips only, no @skipIn scanning
 *   --total              Print only the integer total TC count
 *   --md                 Print markdown skip bullets for the Skipped column
 *   --link-prefix=../    Link prefix prepended to repo-relative paths (default: ../../)
 *
 * Replaces raw grep 'it(' heuristic with:
 *   - Word-boundary \bit\( (excludes intercept(, commit(, it.skip(, xit()
 *   - Brace-depth scoping so K TC per skipped suite counts only within that suite's body
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const rawArgs = process.argv.slice(2);

const isFtr = rawArgs.includes('--ftr');
const modeTotal = rawArgs.includes('--total');
const modeMd = rawArgs.includes('--md');
const linkPrefixArg = rawArgs.find(a => a.startsWith('--link-prefix='));
const linkPrefix = linkPrefixArg ? linkPrefixArg.split('=').slice(1).join('=') : '../../';
const filePaths = rawArgs.filter(a => !a.startsWith('--'));

let repoRoot;
try {
  repoRoot = execSync('git rev-parse --show-toplevel', { cwd: SCRIPT_DIR, encoding: 'utf8' }).trim();
} catch {
  repoRoot = process.cwd();
}

// ── Tokenizer ────────────────────────────────────────────────────────────────
// Replaces string/comment contents with spaces; preserves newlines so line
// numbers remain accurate. Template-literal ${} nesting is not parsed —
// the whole backtick string is blanked, which is safe for our patterns.
function clean(src) {
  const buf = src.split('');
  const L = src.length;
  let i = 0;
  while (i < L) {
    if (src[i] === '/' && src[i + 1] === '/') {
      buf[i] = buf[i + 1] = ' '; i += 2;
      while (i < L && src[i] !== '\n') { buf[i++] = ' '; }
    } else if (src[i] === '/' && src[i + 1] === '*') {
      buf[i] = buf[i + 1] = ' '; i += 2;
      while (i < L && !(src[i] === '*' && src[i + 1] === '/')) {
        if (src[i] !== '\n') buf[i] = ' '; i++;
      }
      if (i < L) { buf[i] = buf[i + 1] = ' '; i += 2; }
    } else if (src[i] === "'" || src[i] === '"') {
      const q = src[i]; buf[i] = ' '; i++;
      while (i < L && src[i] !== q && src[i] !== '\n') {
        if (src[i] === '\\') { buf[i] = ' '; i++; if (i < L) { buf[i] = ' '; i++; } continue; }
        buf[i] = ' '; i++;
      }
      if (i < L && src[i] !== '\n') { buf[i] = ' '; i++; }
    } else if (src[i] === '`') {
      buf[i] = ' '; i++;
      while (i < L && src[i] !== '`') {
        if (src[i] === '\\') { buf[i] = ' '; i++; if (i < L) { buf[i] = ' '; i++; } continue; }
        if (src[i] !== '\n') buf[i] = ' '; i++;
      }
      if (i < L) { buf[i] = ' '; i++; }
    } else {
      i++;
    }
  }
  return buf.join('');
}

// ── Brace helpers ────────────────────────────────────────────────────────────
function findMatchingBrace(s, openPos) {
  let depth = 1, i = openPos + 1;
  while (i < s.length && depth > 0) {
    if (s[i] === '{') depth++;
    else if (s[i] === '}') depth--;
    i++;
  }
  return i - 1;
}

// Finds the opening { of a callback body (=> { or function...{) starting from pos.
function findCallbackBrace(s, pos, limit = 2000) {
  const end = Math.min(pos + limit, s.length);
  for (let i = pos; i < end - 1; i++) {
    if (s[i] === '=' && s[i + 1] === '>') {
      let j = i + 2;
      while (j < end && (s[j] === ' ' || s[j] === '\t')) j++;
      if (j < end && s[j] === '{') return j;
    }
    if (i + 8 <= end && s.slice(i, i + 8) === 'function') {
      let j = i + 8;
      while (j < end && s[j] !== '{' && s[j] !== '}' && s[j] !== ';') j++;
      if (j < end && s[j] === '{') return j;
    }
  }
  return -1;
}

// ── TC counter ───────────────────────────────────────────────────────────────
// Word-boundary \bit\( and \bspecify\(. Excludes .it( method calls.
function countTCs(s, from, to) {
  const chunk = s.slice(from, to);
  const re = /\bit\s*\(|\bspecify\s*\(/g;
  let n = 0, m;
  while ((m = re.exec(chunk)) !== null) {
    const before = m.index > 0 ? chunk[m.index - 1] : ' ';
    if (before !== '.') n++;
  }
  return n;
}

// ── File analysis ────────────────────────────────────────────────────────────
function analyzeFile(filepath, cypress) {
  const src = fs.readFileSync(filepath, 'utf8');
  const cl = clean(src);
  const skips = [];

  // Total TC count — whole file, word-boundary
  const total = countTCs(cl, 0, cl.length);

  // Static suite skips: describe.skip / context.skip
  const staticRe = /\b(?:describe|context)\.skip\s*\(/g;
  let m;
  while ((m = staticRe.exec(cl)) !== null) {
    const brace = findCallbackBrace(cl, m.index);
    if (brace === -1) continue;
    const close = findMatchingBrace(cl, brace);
    skips.push({ file: filepath, mechanism: 'static', count: countTCs(cl, brace + 1, close), bodyStart: brace + 1, bodyEnd: close });
  }

  // Test-level static skips: it.skip / xit
  const testSkipRe = /\bit\.skip\s*\(|\bxit\s*\(/g;
  let nTestSkip = 0;
  while ((testSkipRe.exec(cl)) !== null) nTestSkip++;
  if (nTestSkip > 0) {
    skips.push({ file: filepath, mechanism: 'test-level static', count: nTestSkip, bodyStart: -1, bodyEnd: -1 });
  }

  // Cypress @skipIn tagged suites (skip if already inside a static skip body)
  if (cypress) {
    const descRe = /\b(?:describe|context)\s*\(/g;
    while ((m = descRe.exec(cl)) !== null) {
      if (skips.some(s => s.bodyStart >= 0 && m.index >= s.bodyStart && m.index <= s.bodyEnd)) continue;
      const win = src.slice(m.index, Math.min(m.index + 600, src.length));
      const tags = win.match(/@skipIn\w+/g);
      if (!tags) continue;
      const brace = findCallbackBrace(cl, m.index);
      if (brace === -1) continue;
      const close = findMatchingBrace(cl, brace);
      const uniqTags = [...new Set(tags)].join('; ');
      skips.push({ file: filepath, mechanism: `tags: ${uniqTags}`, count: countTCs(cl, brace + 1, close), bodyStart: brace + 1, bodyEnd: close });
    }
  }

  return { total, skips };
}

// ── Main ─────────────────────────────────────────────────────────────────────
const agg = { total: 0, skips: [] };
for (const fp of filePaths) {
  try {
    const r = analyzeFile(path.resolve(fp), !isFtr);
    agg.total += r.total;
    agg.skips.push(...r.skips);
  } catch (e) {
    process.stderr.write(`Warning: skipping ${fp}: ${e.message}\n`);
  }
}

if (modeTotal) {
  process.stdout.write(String(agg.total) + '\n');
} else if (modeMd) {
  const suites = agg.skips.filter(s => s.mechanism !== 'test-level static');
  const testLevel = agg.skips.filter(s => s.mechanism === 'test-level static');
  const mTCs = suites.reduce((s, x) => s + x.count, 0);
  const nTestLevelTCs = testLevel.reduce((s, x) => s + x.count, 0);
  const header = nTestLevelTCs > 0
    ? `${suites.length} Suites (${mTCs} TCs) + ${nTestLevelTCs} test-level skips`
    : `${suites.length} Suites (${mTCs} TCs)`;
  process.stdout.write(header + '\n');
  for (const s of [...suites, ...testLevel]) {
    const rel = path.relative(repoRoot, s.file).replace(/\\/g, '/');
    process.stdout.write(`- [${path.basename(s.file)}](${linkPrefix}${rel}) - ${s.count} TC (${s.mechanism})\n`);
  }
} else {
  process.stdout.write(JSON.stringify({ total: agg.total, skips: agg.skips.map(({ file, mechanism, count }) => ({ file, mechanism, count })) }, null, 2) + '\n');
}
