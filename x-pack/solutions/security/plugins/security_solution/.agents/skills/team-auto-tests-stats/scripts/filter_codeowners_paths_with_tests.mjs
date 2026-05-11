#!/usr/bin/env node
/**
 * Reads CODEOWNERS-style path prefixes (stdin, one per line) and prints only those whose
 * resolved repo subtree contains at least one test-relevant source file:
 *   - named like *.test.ts, *.spec.ts, *.cy.ts, …, or
 *   - any *.ts / *.tsx under a directory segment `test`, `integration_tests`, `cypress`, `scout`, or `e2e`
 * Skips: node_modules, build, target, typings.
 *
 * Usage:
 *   bash list_owned_paths_for_team.sh @elastic/foo | node filter_codeowners_paths_with_tests.mjs
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

const repoRoot =
  process.argv[2] ||
  execSync('git rev-parse --show-toplevel', { cwd: SCRIPT_DIR, encoding: 'utf8' }).trim();

const TEST_FILE_RE =
  /\.(test|spec)\.[cm]?[tj]sx?$|\.cy\.[tj]sx?$/;

/** Directory segments marking test trees (integration / FTR / Cypress / Scout / Playwright Scout). */
const TEST_DIR_SEGMENT = new Set(['test', 'integration_tests', 'cypress', 'scout', 'e2e']);

/**
 * @param {string} repoRoot
 * @param {string} fileAbs
 */
function isColocatedTestTypescript(repoRoot, fileAbs, name) {
  if (!/\.[cm]?tsx?$/.test(name) || name.endsWith('.d.ts')) {
    return false;
  }
  if (TEST_FILE_RE.test(name)) {
    return true;
  }
  const relDir = path.relative(repoRoot, path.dirname(fileAbs));
  const segments = relDir.split(path.sep);
  for (const seg of segments) {
    if (TEST_DIR_SEGMENT.has(seg)) {
      return true;
    }
  }
  return false;
}

const SKIP_DIR = new Set([
  'node_modules',
  'bower_components',
  'build',
  'target',
  'dist',
  '.git',
  '__snapshots__',
]);

/**
 * @param {string} rawPosix Repo-relative path using `/`, may contain `*` (CODEOWNERS glob).
 */
function resolveRelForFilesystem(rawPosix) {
  const trimmed = rawPosix.trim().replace(/^\/+/, '').replace(/\/+$/, '');
  if (!trimmed || trimmed.includes('**')) {
    /** Normalize `prefix/**` and `prefix**` → search `prefix`. */
    return trimmed.replace(/\*\*?$/, '').replace(/\/+$/, '');
  }

  const starIdx = trimmed.indexOf('*');
  if (starIdx !== -1) {
    /** e.g. `.../support_callout.*` → subtree under parent dir containing matching TS. */
    const before = trimmed.slice(0, starIdx).replace(/[/\\]+$/, '');
    if (!before) {
      return '';
    }
    const parent = path.posix.dirname(before.replace(/\\/g, '/'));
    return parent === '.' ? before : parent;
  }

  return trimmed;
}

/** @param {string} abs */
function normalizeSearchRoot(abs) {
  try {
    const st = fs.statSync(abs);
    if (st.isDirectory()) {
      return abs;
    }
    /** Single-file CODEOWNERS entry: meaningful if the file itself is a test artifact. */
    if (st.isFile() && TEST_FILE_RE.test(path.basename(abs))) {
      return abs;
    }
    return path.dirname(abs);
  } catch {
    return '';
  }
}

/**
 * @param {string} raw CODEOWNERS first column (POSIX slashes).
 */
function prefixToAbsolute(raw) {
  const trimmed = raw.trim().replace(/^\/+/, '');
  if (!trimmed || trimmed.startsWith('#')) {
    return '';
  }

  let relPosix = resolveRelForFilesystem(trimmed.replace(/\\/g, '/'));
  relPosix = relPosix.replace(/[/\\]+$/, '');

  if (!relPosix) {
    return '';
  }

  return path.join(repoRoot, ...relPosix.split('/'));
}

/**
 * @param {string} dir
 * @returns {boolean}
 */
function subtreeHasTestFile(dir) {
  const root = normalizeSearchRoot(dir);
  if (!root || !fs.existsSync(root)) {
    return false;
  }

  let st0;
  try {
    st0 = fs.statSync(root);
  } catch {
    return false;
  }
  if (st0.isFile()) {
    return isColocatedTestTypescript(repoRoot, root, path.basename(root));
  }

  /** @type {string[]} */
  const stack = [root];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      const name = ent.name;
      if (SKIP_DIR.has(name) || name.startsWith('.')) {
        continue;
      }
      const full = path.join(current, name);
      if (ent.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (
        ent.isFile() &&
        !name.endsWith('.d.ts') &&
        isColocatedTestTypescript(repoRoot, full, name)
      ) {
        return true;
      }
    }
  }

  return false;
}

async function main() {
  /** @type {Set<string>} */
  const emitted = new Set();

  const rl = readline.createInterface({ input: process.stdin });
  const lines = [];
  for await (const line of rl) {
    lines.push(line);
  }

  for (const raw of lines) {
    const t = raw.trim();
    const posixBase = path.posix.basename(t.replace(/^\/+/, '').split('*')[0]);
    /** Omit single `.ts` production files outside paths that contain a `test` path segment */
    if (
      /\.tsx?$/i.test(posixBase) &&
      !TEST_FILE_RE.test(posixBase) &&
      !/\btest\b/.test('/' + t.replace(/^\/+/, ''))
    ) {
      continue;
    }

    const abs = prefixToAbsolute(raw);
    const keyPath = normalizeSearchRoot(abs);
    const key = keyPath || abs;
    if (!key || emitted.has(key)) {
      continue;
    }
    if (subtreeHasTestFile(abs)) {
      emitted.add(key);
      /** Echo original normalized prefix line (without leading slashes) like list script uses */
      console.log(raw.trim().replace(/^\/+/, ''));
    }
  }
}

await main();
