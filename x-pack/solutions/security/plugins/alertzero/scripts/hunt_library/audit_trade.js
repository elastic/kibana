#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Audit the TRADE ES|QL hunting content for the Hunt Library POC (plan 18, Phase 0).
 *
 * Usage:
 *   node x-pack/solutions/security/plugins/alertzero/scripts/hunt_library/audit_trade.js \
 *     [--trade ~/dev/detection-rules] [--out <file.json>]
 *
 * Records per query: parse status, index patterns, KEEP columns, default window, resultKind
 * heuristic, MITRE ids, and a coverage-matrix tag set. Mismatched resultKind heuristics are
 * warnings only. Output feeds the Steph-approved frozen id list.
 */

require('@kbn/setup-node-env');

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { validateQuery } = require('@kbn/esql-language');

const args = process.argv.slice(2);
const argValue = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const tradeRoot = argValue('--trade', path.join(os.homedir(), 'dev', 'detection-rules'));
const outFile = argValue('--out', path.join(__dirname, 'trade_audit.json'));
const huntingRoot = path.join(tradeRoot, 'hunting');

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return e.name.endsWith('.toml') ? [p] : [];
  });

const parseToml = (file) =>
  JSON.parse(
    execFileSync('python3', [
      '-c',
      'import sys,json,tomllib;print(json.dumps(tomllib.load(open(sys.argv[1],"rb"))))',
      file,
    ]).toString()
  );

const stripComments = (q) => q.replace(/\/\/.*$/gm, '');

const indexPatterns = (q) => {
  const m = stripComments(q).match(
    /^\s*(?:FROM|TS)\s+([^\n|]+?)(?:\s+METADATA[^\n|]*)?\s*(?:\||$)/im
  );
  return m
    ? m[1]
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
};

const keepColumns = (q) => {
  const m = stripComments(q).match(/\|\s*KEEP\s+([^\n|]+)/i);
  return m
    ? m[1]
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
};

const defaultWindow = (q) => {
  const m = stripComments(q).match(
    /now\(\)\s*-\s*(\d+)\s*(day|days|hour|hours|minute|minutes|d|h|m)\b/i
  );
  return m ? `${m[1]} ${m[2]}` : null;
};

const windowDays = (w) => {
  if (!w) return null;
  const [n, unit] = w.split(' ');
  const v = Number(n);
  if (/^d/i.test(unit)) return v;
  if (/^h/i.test(unit)) return v / 24;
  return v / 1440;
};

const resultKind = (q) => (/\|\s*STATS\b/i.test(stripComments(q)) ? 'aggregate' : 'raw_event');

const tags = (rel, q, kind) => {
  const t = new Set();
  const lower = stripComments(q).toLowerCase();
  const dir = rel.split(path.sep)[0];
  if (dir === 'windows' || dir === 'linux' || dir === 'macos') t.add('endpoint');
  if (dir === 'linux') t.add('linux');
  if (['aws', 'azure', 'okta'].includes(dir)) t.add('cloud_identity');
  if (kind === 'aggregate' && /(count|count_distinct|values)\b/.test(lower))
    t.add('aggregate_rarity');
  if (kind === 'raw_event') t.add('event_level');
  if (/lsass/.test(lower)) t.add('lsass');
  return [...t];
};

const main = async () => {
  const revision = execFileSync('git', ['-C', tradeRoot, 'rev-parse', 'HEAD']).toString().trim();
  const files = walk(huntingRoot).sort();
  const results = [];
  let skippedNonEsql = 0;

  for (const file of files) {
    const rel = path.relative(huntingRoot, file);
    const doc = parseToml(file).hunt;
    if (!doc || !(doc.language || []).includes('ES|QL')) {
      skippedNonEsql++;
      continue;
    }
    const queries = Array.isArray(doc.query) ? doc.query : [doc.query];
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i].trim();
      let parseStatus = 'ok';
      let parseErrors = [];
      try {
        const { errors } = await validateQuery(query);
        if (errors && errors.length) {
          parseStatus = 'error';
          parseErrors = errors.map((e) => e.text || String(e)).slice(0, 5);
        }
      } catch (e) {
        parseStatus = 'error';
        parseErrors = [String(e.message || e).slice(0, 200)];
      }
      const kind = resultKind(query);
      const w = defaultWindow(query);
      results.push({
        tradeId: doc.uuid,
        path: `hunting/${rel}`,
        queryIndex: i,
        queryCount: queries.length,
        name: doc.name,
        platformDir: rel.split(path.sep)[0],
        integration: doc.integration || [],
        mitre: doc.mitre || [],
        parseStatus,
        parseErrors,
        indexPatterns: indexPatterns(query),
        keepColumns: keepColumns(query),
        defaultWindow: w,
        exceedsAutomatedWindow: windowDays(w) != null && windowDays(w) > 7,
        resultKind: kind,
        hasFalsePositiveNotes: (doc.notes || []).some((n) =>
          /false positive|benign|legitimate/i.test(n)
        ),
        usesLimit: /\|\s*LIMIT\b/i.test(query),
        coverageTags: tags(rel, query, kind),
      });
    }
  }

  const summary = {
    revision,
    generatedAt: new Date().toISOString(),
    totalFiles: files.length,
    skippedNonEsql,
    esqlQueries: results.length,
    parseOk: results.filter((r) => r.parseStatus === 'ok').length,
    singleQueryParseOk: results.filter((r) => r.parseStatus === 'ok' && r.queryCount === 1).length,
    byPlatform: results.reduce(
      (acc, r) => ({ ...acc, [r.platformDir]: (acc[r.platformDir] || 0) + 1 }),
      {}
    ),
  };

  fs.writeFileSync(outFile, `${JSON.stringify({ summary, results }, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
