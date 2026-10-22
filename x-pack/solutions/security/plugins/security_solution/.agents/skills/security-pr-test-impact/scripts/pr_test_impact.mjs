#!/usr/bin/env node

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * security-pr-test-impact — read-only matcher between a Kibana PR's production files and tests in the repo.
 *
 * Usage (from anywhere inside the Kibana checkout):
 *   node pr_test_impact.mjs --pr <url|number> [--format md|json] [--out .agents/tmp/<file>.md]
 *   node pr_test_impact.mjs --team @elastic/<team> [--days 7] [--max-prs 20] [--format md|json] [--out ...]
 *   node pr_test_impact.mjs --files <changed-files.json> [--format md|json]   # offline / fixtures
 *
 * Flags:
 *   --repo <owner/name>     default elastic/kibana
 *   --repo-root <dir>       default: the checkout containing this script (used by the tests)
 *   --ref <git-ref>         read "existing tests" from this ref (e.g. upstream/main) instead of the
 *                           working tree; use it when the local checkout is behind main
 *   --format md|json        default md (json includes `citedTestPaths` for cross-checking)
 *   --out <path>            optional; must resolve under <repo>/.agents/tmp/
 *   --no-head-content       do not fetch PR-head content for added test files whose patch was omitted
 *   --max-feature-paths N   feature-path specs listed per production file (default 6)
 *   --compact               markdown sized for a GitHub comment: boundary prefixes omitted, UPDATED
 *                           rows collapsed, Checks replaced by a pointer to the agent skill
 *
 * Exit codes: 0 ok, 1 bad arguments, 2 PR/GitHub not readable (no guessing of the file list).
 *
 * This script never comments on, labels, or edits a PR.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  analyzePr,
  createFileSource,
  loadAliases,
  loadKbnPaths,
  parseKbnPaths,
} from './lib/matcher.mjs';
import { loadCodeowners, normalizeTeam, parseCodeowners, teamPrefixes } from './lib/codeowners.mjs';
import {
  GithubError,
  fetchFileAtRef,
  fetchPrFiles,
  fetchPrMeta,
  listMergedPrs,
  parsePrRef,
} from './lib/github.mjs';
import { renderPrReport, renderTeamReport } from './lib/report.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

const usage = () => {
  const header = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0];
  process.stderr.write(`${header.replace(/^\/\*\*\n/, '').replace(/^ \* ?/gm, '')}\n`);
};

const parseArgs = (argv) => {
  const args = {
    repo: 'elastic/kibana',
    format: 'md',
    days: 7,
    maxPrs: 20,
    headContent: true,
    maxFeaturePaths: 6,
    compact: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`Missing value for ${a}`);
      return v;
    };
    switch (a) {
      case '--pr':
        args.pr = next();
        break;
      case '--team':
        args.team = next();
        break;
      case '--files':
        args.files = next();
        break;
      case '--repo':
        args.repo = next();
        break;
      case '--repo-root':
        args.repoRoot = next();
        break;
      case '--ref':
        args.ref = next();
        break;
      case '--format':
        args.format = next();
        break;
      case '--out':
        args.out = next();
        break;
      case '--days':
        args.days = Number(next());
        break;
      case '--max-prs':
        args.maxPrs = Number(next());
        break;
      case '--max-feature-paths':
        args.maxFeaturePaths = Number(next());
        break;
      case '--no-head-content':
        args.headContent = false;
        break;
      case '--compact':
        args.compact = true;
        break;
      case '-h':
      case '--help':
        args.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${a}`);
    }
  }
  const modes = ['pr', 'team', 'files'].filter((m) => args[m] !== undefined);
  if (!args.help && modes.length !== 1) {
    throw new Error('Provide exactly one of --pr, --team, or --files');
  }
  if (!['md', 'json'].includes(args.format)) throw new Error('--format must be md or json');
  return args;
};

const repoRootOf = () =>
  execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: HERE }).toString().trim();

const guardOutPath = (repoRoot, out) => {
  const allowed = path.resolve(repoRoot, '.agents', 'tmp');
  const resolved = path.resolve(process.cwd(), out);
  if (resolved !== allowed && !resolved.startsWith(`${allowed}${path.sep}`)) {
    throw new Error(`--out must be under ${path.relative(repoRoot, allowed)}/ (got ${out})`);
  }
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  return resolved;
};

const emit = (text, resolvedOut) => {
  process.stdout.write(text);
  if (resolvedOut) {
    fs.writeFileSync(resolvedOut, text);
    process.stderr.write(`\nSaved to ${resolvedOut}\n`);
  }
};

/** Add head content for added test files whose patch was omitted by the API (large files). */
const hydrateHeadContent = (repo, files, headSha) => {
  let fetched = 0;
  for (const f of files) {
    if (f.status === 'added' && !f.patch && /\.(ts|tsx)$/.test(f.filename) && fetched < 40) {
      f.headContent = fetchFileAtRef(repo, f.filename, headSha) ?? undefined;
      fetched++;
    }
  }
};

const analyzeOne = (ctx, prMeta, files) =>
  analyzePr({
    repoRoot: ctx.repoRoot,
    files,
    aliases: ctx.aliases,
    kbnPaths: ctx.kbnPaths,
    codeowners: ctx.codeowners,
    fileSource: ctx.fileSource,
    maxFeaturePaths: ctx.args.maxFeaturePaths,
  });

const runPr = (ctx) => {
  const number = parsePrRef(ctx.args.pr, ctx.args.repo);
  const pr = fetchPrMeta(ctx.args.repo, number);
  const files = fetchPrFiles(ctx.args.repo, number);
  if (!Array.isArray(files)) throw new GithubError('PR file list could not be read');
  if (ctx.args.headContent && pr.headRefOid)
    hydrateHeadContent(ctx.args.repo, files, pr.headRefOid);
  const analysis = analyzeOne(ctx, pr, files);
  if (ctx.args.format === 'json') return `${JSON.stringify({ pr, analysis }, null, 2)}\n`;
  return renderPrReport({ pr, analysis, compact: ctx.args.compact });
};

const runFiles = (ctx) => {
  const raw = JSON.parse(fs.readFileSync(path.resolve(ctx.args.files), 'utf8'));
  const files = Array.isArray(raw) ? raw : raw.files;
  const pr = raw.pr ?? {
    number: 0,
    title: `(offline) ${path.basename(ctx.args.files)}`,
    url: '',
    state: 'OFFLINE',
    mergedAt: null,
  };
  const analysis = analyzeOne(ctx, pr, files);
  if (ctx.args.format === 'json') return `${JSON.stringify({ pr, analysis }, null, 2)}\n`;
  return renderPrReport({ pr, analysis, compact: ctx.args.compact });
};

const runTeam = (ctx) => {
  const team = normalizeTeam(ctx.args.team);
  const prefixes = teamPrefixes(ctx.codeowners, team);
  if (prefixes.length === 0) throw new Error(`${team} owns no paths in .github/CODEOWNERS`);

  const since = new Date(Date.now() - ctx.args.days * 86400000).toISOString().slice(0, 10);
  const { prs: merged, hitListLimit } = listMergedPrs(ctx.args.repo, since);
  const touches = (file) => prefixes.some((p) => file === p || file.startsWith(`${p}/`));
  const matching = merged.filter((pr) => pr.files.some(touches));
  const selected = matching.slice(0, ctx.args.maxPrs);

  const prs = [];
  const unreadable = [];
  for (const pr of selected) {
    process.stderr.write(`Analyzing #${pr.number}…\n`);
    try {
      const meta = fetchPrMeta(ctx.args.repo, pr.number);
      const files = fetchPrFiles(ctx.args.repo, pr.number);
      if (ctx.args.headContent && meta.headRefOid) {
        hydrateHeadContent(ctx.args.repo, files, meta.headRefOid);
      }
      prs.push({ pr: meta, analysis: analyzeOne(ctx, meta, files) });
    } catch (err) {
      if (!(err instanceof GithubError)) throw err;
      unreadable.push({ number: pr.number, url: pr.url, title: pr.title, error: err.message });
      process.stderr.write(`  could not read #${pr.number}: ${err.message}\n`);
    }
  }
  if (selected.length > 0 && prs.length === 0) {
    throw new GithubError(`none of the ${selected.length} selected PRs could be read`);
  }

  const input = {
    team,
    days: ctx.args.days,
    since,
    prs,
    unreadable,
    totalMatching: matching.length,
    cap: ctx.args.maxPrs,
    hitListLimit,
    prefixes,
  };
  if (ctx.args.format === 'json') return `${JSON.stringify(input, null, 2)}\n`;
  return renderTeamReport({ ...input, compact: ctx.args.compact });
};

// Exit codes: 0 ok, 1 usage / setup error, 2 the PR could not be read from GitHub.
const main = () => {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`${err.message}\n\n`);
    usage();
    return 1;
  }
  if (args.help) {
    usage();
    return 0;
  }

  const repoRoot = args.repoRoot ? path.resolve(args.repoRoot) : repoRootOf();
  const resolvedOut = args.out ? guardOutPath(repoRoot, args.out) : null;
  let fileSource;
  try {
    fileSource = createFileSource(repoRoot, args.ref ?? null);
  } catch {
    process.stderr.write(
      `--ref ${args.ref} is not a commit in this checkout (try: git fetch upstream main)\n`
    );
    return 1;
  }
  // With --ref, CODEOWNERS and tsconfig paths come from that ref too, so the boundary matches the tests.
  const ctx = {
    args,
    repoRoot,
    fileSource,
    aliases: loadAliases(),
    kbnPaths: args.ref
      ? parseKbnPaths(fileSource.read('tsconfig.base.json'))
      : loadKbnPaths(repoRoot),
    codeowners: args.ref
      ? parseCodeowners(fileSource.read('.github/CODEOWNERS') ?? '')
      : loadCodeowners(repoRoot),
  };
  if (ctx.codeowners.length === 0) {
    process.stderr.write('No CODEOWNERS rules could be read — not a Kibana checkout?\n');
    return 1;
  }

  try {
    if (args.pr) emit(runPr(ctx), resolvedOut);
    else if (args.team) emit(runTeam(ctx), resolvedOut);
    else emit(runFiles(ctx), resolvedOut);
  } catch (err) {
    if (err instanceof GithubError) {
      process.stderr.write(
        `Cannot read the PR from GitHub — stopping (no file list will be guessed).\n${err.message}\n`
      );
      return 2;
    }
    throw err;
  }
  return 0;
};

process.exitCode = main();
