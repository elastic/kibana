/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Deterministic test-link matcher.
 *
 * Link types (see references/link-rules.md):
 *   import       — a test file imports/requires the changed production file
 *   colocated    — <name>.test.ts(x) sits next to <name>.ts(x)
 *   feature-path — a Cypress/Scout/FTR spec lives under a directory that mirrors the feature path
 *
 * CODEOWNERS ownership is only used to build the search boundary. It is never a link.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { classifyFile, CONVENTIONAL_TEST_ROOTS, changeType } from './classify.mjs';
import { loadCodeowners, resolveOwners, teamPrefixes } from './codeowners.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ALIASES_FILE = path.join(HERE, '..', 'feature_path_aliases.json');

export const VERDICTS = {
  UPDATED: 'CANDIDATE COVERAGE — UPDATED',
  NOT_UPDATED: 'CANDIDATE COVERAGE — NOT UPDATED',
  NONE: 'NO EXISTING TEST',
};

export const LEGEND =
  'A link means a test sits in the right area (import, colocated, or feature-path); it does not mean the test’s assertions cover the new behavior.';

const SOURCE_EXT_RE = /\.(tsx?|jsx?|mjs)$/;
const IMPORT_RE =
  /(?:import|export)\s[^'"`;]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|require\s*\(\s*['"]([^'"]+)['"]\s*\)|^\s*import\s+['"]([^'"]+)['"]/gm;

export const loadAliases = (file = DEFAULT_ALIASES_FILE) => {
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  return {
    aliases: parsed.aliases ?? {},
    stopSegments: new Set(parsed.stopSegments ?? []),
  };
};

/** Parse `@kbn/*` → directory mappings from tsconfig.base.json `paths` text. */
export const parseKbnPaths = (raw) => {
  const map = new Map();
  if (!raw) return map;
  // tsconfig allows comments/trailing commas; strip the common cases before parsing.
  const text = raw.replace(/^\s*\/\/.*$/gm, '').replace(/,(\s*[}\]])/g, '$1');
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return map;
  }
  const paths = parsed?.compilerOptions?.paths ?? {};
  const packageKeys = Object.entries(paths).filter(
    ([key]) => key.startsWith('@kbn/') && !key.endsWith('/*')
  );
  for (const [key, targets] of packageKeys) {
    const target = Array.isArray(targets) ? targets[0] : targets;
    if (typeof target === 'string') map.set(key, target.replace(/\/+$/, ''));
  }
  return map;
};

/** Load `@kbn/*` → directory mappings from the working tree's tsconfig.base.json. */
export const loadKbnPaths = (repoRoot) => {
  const file = path.join(repoRoot, 'tsconfig.base.json');
  return parseKbnPaths(fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null);
};

const stripExt = (p) => p.replace(SOURCE_EXT_RE, '');

/** Keys under which a production file can be imported (without extension, plus dir for index). */
export const moduleKeysFor = (filePath) => {
  const keys = new Set([stripExt(filePath)]);
  if (/(^|\/)index\.(tsx?|jsx?|mjs)$/.test(filePath)) {
    keys.add(path.posix.dirname(filePath));
  }
  return [...keys];
};

/** Resolve an import specifier found in `fromFile` to a repo-relative module key, or null. */
export const resolveSpecifier = (specifier, fromFile, kbnPaths) => {
  const spec = specifier.replace(/\?.*$/, '');
  if (spec.startsWith('.')) {
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), spec));
    return stripExt(resolved).replace(/\/$/, '');
  }
  if (spec.startsWith('@kbn/')) {
    const [, pkg, ...rest] = spec.split('/');
    const base = kbnPaths.get(`@kbn/${pkg}`);
    if (!base) return null;
    const sub = rest.join('/');
    return stripExt(sub ? `${base}/${sub}` : base);
  }
  return null;
};

export const extractSpecifiers = (source) => {
  const out = [];
  let m;
  IMPORT_RE.lastIndex = 0;
  while ((m = IMPORT_RE.exec(source)) !== null) {
    const spec = m[1] ?? m[2] ?? m[3] ?? m[4];
    if (spec) out.push(spec);
  }
  return out;
};

const GIT_OPTS = { maxBuffer: 1024 * 1024 * 512 };

/**
 * Source of "tests already in the repo". Either the working tree (default) or a git ref such as
 * `upstream/main`, so a stale local checkout does not hide recently merged tests.
 *
 * @returns {{ label: string, list: (prefixes: string[]) => string[], read: (p: string) => string | null, exists: (p: string) => boolean }}
 */
export const createFileSource = (repoRoot, ref = null) => {
  if (!ref) {
    return {
      label: 'working tree',
      list: (prefixes) => {
        const out = new Set();
        const existing = prefixes.filter((p) => fs.existsSync(path.join(repoRoot, p)));
        for (let i = 0; i < existing.length; i += 40) {
          const chunk = existing.slice(i, i + 40);
          const stdout = execFileSync('git', ['ls-files', '-z', '--', ...chunk], {
            cwd: repoRoot,
            ...GIT_OPTS,
          });
          for (const f of stdout.toString('utf8').split('\0')) if (f) out.add(f);
        }
        return [...out];
      },
      read: (p) => {
        try {
          return fs.readFileSync(path.join(repoRoot, p), 'utf8');
        } catch {
          return null;
        }
      },
      exists: (p) => fs.existsSync(path.join(repoRoot, p)),
    };
  }

  execFileSync('git', ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], { cwd: repoRoot });
  let allFiles = null;
  const listAll = () => {
    if (!allFiles) {
      const stdout = execFileSync('git', ['ls-tree', '-r', '-z', '--name-only', ref], {
        cwd: repoRoot,
        ...GIT_OPTS,
      });
      allFiles = new Set(stdout.toString('utf8').split('\0').filter(Boolean));
    }
    return allFiles;
  };
  const cache = new Map();
  const readBatch = (paths) => {
    const missing = paths.filter((p) => !cache.has(p));
    if (missing.length === 0) return;
    const input = `${missing.map((p) => `${ref}:${p}`).join('\n')}\n`;
    const stdout = execFileSync('git', ['cat-file', '--batch'], {
      cwd: repoRoot,
      input,
      ...GIT_OPTS,
    });
    let offset = 0;
    for (const p of missing) {
      const headerEnd = stdout.indexOf(0x0a, offset);
      const header = stdout.toString('utf8', offset, headerEnd);
      offset = headerEnd + 1;
      if (header.endsWith(' missing')) {
        cache.set(p, null);
      } else {
        const size = Number(header.split(' ')[2]);
        cache.set(p, stdout.toString('utf8', offset, offset + size));
        offset += size + 1; // trailing LF after the object body
      }
    }
  };
  return {
    label: ref,
    list: (prefixes) => {
      const all = listAll();
      const out = [];
      for (const f of all) {
        if (prefixes.some((p) => f === p || f.startsWith(`${p}/`))) out.push(f);
      }
      return out;
    },
    read: (p) => {
      if (!cache.has(p)) readBatch([p]);
      return cache.get(p);
    },
    readMany: readBatch,
    exists: (p) => listAll().has(p),
  };
};

const normalizeSegment = (segment, aliases) => {
  let s = segment.toLowerCase().replace(/-/g, '_');
  s = s.replace(/\.(spec|cy|test)$/, '');
  s = s.replace(/_(ui|api|page|pages|tab|tabs|v2|v3)$/, '');
  return aliases[s] ?? s;
};

const SOURCE_ROOT_RE = /^(.*?\/(?:public|server|common|src))\//;

/**
 * Feature tokens for a production path, most specific first.
 * Package names (`kbn-foo`) are included as a token after stripping `kbn-`.
 */
export const featureTokens = (filePath, { aliases, stopSegments }) => {
  const dir = path.posix.dirname(filePath);
  const base = path.posix.basename(filePath).split('.')[0];
  const rootMatch = dir.match(SOURCE_ROOT_RE);
  const rel = rootMatch ? dir.slice(rootMatch[0].length) : dir;
  const segments = rel ? rel.split('/') : [];
  // Package / plugin name is the outermost feature token. Kibana package names carry
  // `kbn-` / `securitysolution-` prefixes and `-common|-server|-browser|-plugin` suffixes that
  // are not part of the feature name.
  const pkgMatch = filePath.match(/\/(?:packages|plugins)\/(?:kbn-)?([^/]+)\//);
  if (pkgMatch) {
    const stripped = pkgMatch[1]
      .replace(/^(securitysolution|security-solution|security)[-_]/, '')
      .replace(/[-_](common|server|browser|plugin|utils|types)$/, '');
    segments.unshift(pkgMatch[1]);
    if (stripped !== pkgMatch[1]) segments.unshift(stripped);
  }

  const ordered = [base, ...segments.reverse()].filter(
    (seg) => seg && !seg.startsWith('use_') && !seg.startsWith('__')
  );
  const tokens = [];
  for (const seg of ordered) {
    const norm = normalizeSegment(seg, aliases);
    const keep =
      norm.length >= 4 && !stopSegments.has(norm) && !stopSegments.has(seg.toLowerCase());
    if (keep && !tokens.includes(norm)) tokens.push(norm);
  }
  return tokens;
};

const FEATURE_FRAMEWORKS = new Set(['cypress', 'scout', 'ftr']);

/**
 * Feature-path matches for one production file against a list of spec files.
 * Returns groups: { anchorDir, tokens, specs[] } with best score first.
 */
export const featurePathMatches = (tokens, specFiles, { aliases, stopSegments }) => {
  if (tokens.length === 0) return [];
  const tokenRank = new Map(tokens.map((t, i) => [t, i]));
  const groups = new Map();

  const matchSpec = (spec) => {
    const dirSegments = path.posix.dirname(spec.path).split('/');
    const matched = [];
    let anchorIndex = -1;
    dirSegments.forEach((seg, i) => {
      const norm = normalizeSegment(seg, aliases);
      if (stopSegments.has(norm)) return;
      if (tokenRank.has(norm) && !matched.includes(norm)) {
        matched.push(norm);
        anchorIndex = i;
      }
    });
    if (matched.length === 0) return null;
    return { anchorDir: dirSegments.slice(0, anchorIndex + 1).join('/'), matched };
  };

  for (const spec of specFiles) {
    const hit = matchSpec(spec);
    if (hit) {
      const { anchorDir, matched } = hit;
      const bestRank = Math.min(...matched.map((t) => tokenRank.get(t)));
      const group = groups.get(anchorDir) ?? {
        anchorDir,
        tokens: matched,
        score: matched.length,
        bestRank,
        specs: [],
      };
      group.specs.push(spec);
      groups.set(anchorDir, group);
    }
  }

  const all = [...groups.values()];
  if (all.length === 0) return [];
  const topScore = Math.max(...all.map((g) => g.score));
  const topRank = Math.min(...all.filter((g) => g.score === topScore).map((g) => g.bestRank));
  return all
    .filter((g) => g.score === topScore && g.bestRank === topRank)
    .sort((a, b) => a.anchorDir.localeCompare(b.anchorDir));
};

const addedLines = (patch) =>
  (patch ?? '')
    .split('\n')
    .filter((l) => l.startsWith('+') && !l.startsWith('+++'))
    .map((l) => l.slice(1))
    .join('\n');

/**
 * @typedef {{ filename: string, status: string, patch?: string, previous_filename?: string, headContent?: string }} PrFile
 *
 * @param {object} opts
 * @param {string} opts.repoRoot
 * @param {PrFile[]} opts.files                 Changed files from the PR
 * @param {object} [opts.aliases]               Output of loadAliases()
 * @param {Map<string,string>} [opts.kbnPaths]  Output of loadKbnPaths()
 * @param {Array} [opts.codeowners]             Output of loadCodeowners()
 * @param {string[]} [opts.extraRoots]          Additional search roots
 * @param {number} [opts.maxFeaturePaths]       Max feature-path specs listed per file (default 6)
 * @param {string|null} [opts.ref]              Git ref to read existing tests from (default: working tree)
 * @param {object} [opts.fileSource]            Output of createFileSource() (overrides `ref`)
 */
export const analyzePr = (opts) => {
  const {
    repoRoot,
    files,
    aliases = loadAliases(),
    kbnPaths = loadKbnPaths(repoRoot),
    codeowners = loadCodeowners(repoRoot),
    extraRoots = [],
    maxFeaturePaths = 6,
    ref = null,
    fileSource = createFileSource(repoRoot, ref),
  } = opts;

  // 1. Classify PR files
  const production = [];
  const tests = [];
  const ignored = [];
  for (const f of files) {
    const cls = classifyFile(f.filename);
    const entry = { ...f, ...cls };
    if (cls.kind === 'production') production.push(entry);
    else if (cls.kind === 'test') tests.push(entry);
    else ignored.push(entry);
  }

  // 2. Owners + search boundary (CODEOWNERS is a boundary, never a link)
  const owners = new Set();
  for (const p of production) {
    const resolved = resolveOwners(codeowners, p.filename);
    p.owners = resolved.owners;
    p.ownerPattern = resolved.pattern;
    resolved.owners.forEach((o) => owners.add(o));
  }
  const boundary = new Set(extraRoots.map((r) => r.replace(/\/$/, '')));
  for (const team of owners) teamPrefixes(codeowners, team).forEach((p) => boundary.add(p));
  CONVENTIONAL_TEST_ROOTS.forEach((r) => boundary.add(r.replace(/\/$/, '')));
  for (const p of production) boundary.add(path.posix.dirname(p.filename));
  const boundaryList = [...boundary].sort();

  // 3. Candidate test files: repo (local checkout) + this PR (added/modified)
  const prTestByPath = new Map();
  const removedInPr = new Set();
  for (const t of tests) {
    if (t.status === 'removed') {
      removedInPr.add(t.filename);
    } else if (t.framework !== 'support') {
      prTestByPath.set(t.filename, t);
      if (t.previous_filename) removedInPr.add(t.previous_filename);
    }
  }
  const repoTestFiles = fileSource
    .list(boundaryList)
    .map((p) => ({ path: p, ...classifyFile(p) }))
    .filter((f) => f.kind === 'test' && f.framework !== 'support' && !removedInPr.has(f.path));

  const candidates = new Map();
  for (const f of repoTestFiles) {
    candidates.set(f.path, { path: f.path, framework: f.framework, inPr: false, prStatus: null });
  }
  for (const [p, t] of prTestByPath) {
    const existing = candidates.get(p);
    candidates.set(p, {
      path: p,
      framework: t.framework,
      inPr: true,
      prStatus: t.status,
      existedBefore: Boolean(existing) || t.status !== 'added',
    });
  }

  // 4. Import index: module key → set of test paths
  const importIndex = new Map();
  const productionKeys = new Map();
  for (const p of production) moduleKeysFor(p.filename).forEach((k) => productionKeys.set(k, p));
  if (productionKeys.size > 0) {
    if (fileSource.readMany) fileSource.readMany([...candidates.keys()]);
    for (const cand of candidates.values()) {
      let source = fileSource.read(cand.path) ?? '';
      if (cand.inPr) {
        const pr = prTestByPath.get(cand.path);
        source += `\n${pr.headContent ?? ''}\n${addedLines(pr.patch)}`;
      }
      const importedKeys = extractSpecifiers(source)
        .map((spec) => resolveSpecifier(spec, cand.path, kbnPaths))
        .filter((key) => key && productionKeys.has(key));
      for (const key of importedKeys) {
        if (!importIndex.has(key)) importIndex.set(key, new Set());
        importIndex.get(key).add(cand.path);
      }
    }
  }

  const specFiles = [...candidates.values()].filter((c) => FEATURE_FRAMEWORKS.has(c.framework));

  // 5. Per production file links + verdict
  const rows = production.map((p) => {
    const links = new Map(); // test path → { types: Set, via }
    const addLink = (testPath, type, via) => {
      const cand = candidates.get(testPath);
      const entry = links.get(testPath) ?? {
        path: testPath,
        types: new Set(),
        via: [],
        framework: cand?.framework ?? classifyFile(testPath).framework,
        inPr: Boolean(cand?.inPr),
        prStatus: cand?.prStatus ?? null,
      };
      entry.types.add(type);
      if (via) entry.via.push(via);
      links.set(testPath, entry);
    };

    for (const key of moduleKeysFor(p.filename)) {
      for (const t of importIndex.get(key) ?? []) addLink(t, 'import', null);
    }

    // colocated: any Jest test file in the same directory; same-name is the strongest form.
    const noExt = stripExt(p.filename);
    const dir = path.posix.dirname(p.filename);
    const sameNameTests = ['ts', 'tsx']
      .map((ext) => `${noExt}.test.${ext}`)
      .filter((t) => !removedInPr.has(t) && (candidates.has(t) || fileSource.exists(t)));
    for (const sameName of sameNameTests) addLink(sameName, 'colocated', 'same name');
    const sameDirTests = [...candidates.values()].filter(
      (cand) =>
        cand.framework === 'jest' &&
        path.posix.dirname(cand.path) === dir &&
        !links.get(cand.path)?.types.has('colocated')
    );
    for (const cand of sameDirTests) addLink(cand.path, 'colocated', 'same directory');

    const tokens = featureTokens(p.filename, aliases);
    const groups = featurePathMatches(tokens, specFiles, aliases);
    const featureSummary = [];
    for (const g of groups) {
      const shown = g.specs.slice(0, maxFeaturePaths);
      // Make sure PR-touched specs in this group are shown even when the cap cuts them.
      for (const s of g.specs) {
        if (s.inPr && !shown.includes(s)) shown.push(s);
      }
      shown.forEach((s) =>
        addLink(s.path, 'feature-path', `${g.tokens.join('+')} → ${g.anchorDir}`)
      );
      featureSummary.push({
        anchorDir: g.anchorDir,
        tokens: g.tokens,
        total: g.specs.length,
        shown: shown.length,
        touchedInPr: g.specs.filter((s) => s.inPr).length,
      });
    }

    const linked = [...links.values()].map((l) => ({ ...l, types: [...l.types].sort() }));
    const updatedInPr = linked.filter((l) => l.inPr);
    let verdict = VERDICTS.NONE;
    if (linked.length > 0)
      verdict = updatedInPr.length > 0 ? VERDICTS.UPDATED : VERDICTS.NOT_UPDATED;

    return {
      file: p.filename,
      status: p.status,
      previousFilename: p.previous_filename ?? null,
      owners: p.owners,
      changeType: changeType(p.filename, p.patch),
      verdict,
      featureTokens: tokens,
      featureSummary,
      links: linked.sort((a, b) => a.path.localeCompare(b.path)),
      linkedTestsUpdatedInPr: updatedInPr.map((l) => l.path),
    };
  });

  const summary = {
    [VERDICTS.UPDATED]: rows.filter((r) => r.verdict === VERDICTS.UPDATED).length,
    [VERDICTS.NOT_UPDATED]: rows.filter((r) => r.verdict === VERDICTS.NOT_UPDATED).length,
    [VERDICTS.NONE]: rows.filter((r) => r.verdict === VERDICTS.NONE).length,
  };

  const citedTestPaths = [...new Set(rows.flatMap((r) => r.links.map((l) => l.path)))].sort();

  const searchBoundary = boundaryList.map((prefix) => ({
    prefix,
    candidateTests: repoTestFiles.filter(
      (f) => f.path === prefix || f.path.startsWith(`${prefix}/`)
    ).length,
  }));

  return {
    legend: LEGEND,
    existingTestsSource: fileSource.label,
    owners: [...owners].sort(),
    searchBoundary,
    counts: {
      productionFiles: production.length,
      testFiles: tests.length,
      ignoredFiles: ignored.length,
      candidateTestFilesScanned: candidates.size,
    },
    testFiles: tests.map((t) => ({ file: t.filename, status: t.status, framework: t.framework })),
    ignoredFiles: ignored.map((i) => ({ file: i.filename, reason: i.reason })),
    summary,
    rows,
    citedTestPaths,
  };
};
