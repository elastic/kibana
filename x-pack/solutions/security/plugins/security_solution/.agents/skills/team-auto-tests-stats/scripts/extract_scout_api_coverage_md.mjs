#!/usr/bin/env node
/**
 * Prints a markdown table row per .spec.ts: file | suite titles (br) | TC titles (br).
 * Heuristic: Scout tests using apiTest.describe / apiTest(, spaceTest.describe / spaceTest(,
 * and (when `spaceTest as test` is present) test.describe / test( — excludes hooks and
 * test.use / test.extend / test.setTimeout / test.info / test.step.
 *
 * Recursively walks <tests-directory> for *.spec.ts (nested folders supported).
 *
 * Usage:
 *   node extract_scout_api_coverage_md.mjs /path/to/tests/root [relative-link-prefix]
 */

import fs from 'fs';
import path from 'path';

const testDir = process.argv[2];
if (!testDir) {
  console.error('Usage: extract_scout_api_coverage_md.mjs <tests-directory> [relative-link-prefix]');
  process.exit(1);
}

/**
 * @param {string} dir
 * @param {string} baseRel posix-style relative path from testDir
 * @returns {{ fp: string; rel: string }[]}
 */
function collectSpecFiles(dir, baseRel = '') {
  /** @type {{ fp: string; rel: string }[]} */
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules') {
      continue;
    }
    const abs = path.join(dir, ent.name);
    const rel = path.posix.join(baseRel.replace(/\\/g, '/'), ent.name);
    if (ent.isDirectory()) {
      out.push(...collectSpecFiles(abs, rel));
    } else if (ent.isFile() && ent.name.endsWith('.spec.ts')) {
      out.push({ fp: abs, rel });
    }
  }
  return out;
}

const specFiles = collectSpecFiles(testDir).sort((a, b) => a.rel.localeCompare(b.rel));

/** @param {string} s */
function escCell(s) {
  return s.replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
}

/**
 * @param {string} content
 * @returns {string[]}
 */
function extractDescribeTitles(content) {
  const titles = [];
  const re =
    /\b(?:apiTest|spaceTest)\.describe(?:\.skip)?\(\s*(?:\r?\n\s*)?['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    titles.push(m[1].trim());
  }
  if (content.includes('spaceTest as test')) {
    const re2 = /\btest\.describe(?:\.skip)?\(\s*(?:\r?\n\s*)?['"]([^'"]+)['"]/g;
    while ((m = re2.exec(content)) !== null) {
      titles.push(m[1].trim());
    }
  }
  return titles;
}

/**
 * @param {string} content
 * @param {number} start
 * @param {boolean} usePlaywrightTestAlias
 * @returns {{ pos: number; kw: string; kwLen: number } | null}
 */
function findNextTestKeyword(content, start, usePlaywrightTestAlias) {
  const len = content.length;
  /** @type {{ pos: number; kw: string; kwLen: number } | null} */
  let best = null;
  /** @type {string[]} */
  const kws = ['apiTest', 'spaceTest'];
  if (usePlaywrightTestAlias) {
    kws.push('test');
  }
  for (const kw of kws) {
    const kwLen = kw.length;
    let idx = content.indexOf(kw, start);
    while (idx !== -1) {
      const before = idx > 0 ? content[idx - 1] : '';
      if (!/[$.\w]/.test(before)) {
        if (!best || idx < best.pos) {
          best = { pos: idx, kw, kwLen };
        }
        break;
      }
      idx = content.indexOf(kw, idx + 1);
    }
  }
  return best;
}

/**
 * @param {string} content
 * @returns {string[]}
 */
function extractTcTitles(content) {
  const useAlias = content.includes('spaceTest as test');
  const titles = [];
  const len = content.length;
  let i = 0;

  while (i < len) {
    const hit = findNextTestKeyword(content, i, useAlias);
    if (hit === null) {
      break;
    }
    const { pos: idx, kw, kwLen } = hit;

    const prefix = content.slice(idx, idx + kwLen + 40);
    const skipRe = new RegExp(
      `^${kw}\\.(beforeAll|beforeEach|afterAll|afterEach|extend|describe|use|only|setTimeout|info|step)`
    );
    if (skipRe.test(prefix)) {
      i = idx + kwLen;
      continue;
    }

    let j = idx + kwLen;
    while (j < len && /\s/.test(content[j])) {
      j++;
    }
    if (content[j] !== '(') {
      i = idx + kwLen;
      continue;
    }
    j++;
    while (j < len && /\s/.test(content[j])) {
      j++;
    }
    /** @type {string} */
    let title = '';
    const quote = content[j];
    if (quote === "'" || quote === '"') {
      j++;
      const startTitle = j;
      while (j < len && content[j] !== quote) {
        if (content[j] === '\\') {
          j += 2;
          continue;
        }
        j++;
      }
      title = content.slice(startTitle, j).trim();
      j++;
    } else if (quote === '`') {
      j++;
      const startTitle = j;
      while (j < len && content[j] !== '`') {
        j++;
      }
      title = content.slice(startTitle, j).trim();
      j++;
    } else {
      i = idx + kwLen;
      continue;
    }
    if (title.length > 0) {
      titles.push(title);
    }
    i = j;
  }

  return titles;
}

const defaultRel =
  '../x-pack/solutions/security/plugins/entity_store/test/scout/api/tests/';
let REL = defaultRel;
if (process.argv[3]) {
  REL = process.argv[3];
  if (!REL.endsWith('/')) {
    REL += '/';
  }
}

console.log('| File name | Suite description | Test case descriptions |');
console.log('|-----------|-------------------|------------------------|');

for (const { fp, rel } of specFiles) {
  const content = fs.readFileSync(fp, 'utf8');
  const suites = extractDescribeTitles(content);
  const tcs = extractTcTitles(content);

  const suiteCell = escCell(suites.join('<br>'));
  const tcCell = escCell(tcs.join('<br>'));
  const base = path.basename(rel);
  const display = rel.includes('/') ? rel : base;
  console.log(`| [${display}](${REL}${rel}) | ${suiteCell} | ${tcCell} |`);
}
