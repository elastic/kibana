/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * ES|QL profiling harness for the entity-store logs-extraction pipeline.
 *
 * See scripts/profile_logs_extraction/README.md for full usage instructions.
 *
 * Quick start:
 *   export ES_LOCAL_USERNAME=elastic ES_LOCAL_PASSWORD=changeme
 *   export ES_REMOTE_URL=https://… ES_REMOTE_API_KEY=…
 *   node scripts/profile_logs_extraction.js \
 *     --cluster both --entity user,host,generic,service \
 *     --from "now-1d" --to "now" --run-id baseline
 */

require('@kbn/setup-node-env');

const path = require('path');
const fs = require('fs');

const {
  buildLogsExtractionEsqlQuery,
} = require('../server/domain/logs_extraction/logs_extraction_query_builder');
const { getEntityDefinitionWithoutId } = require('../common/domain/definitions/registry');
const { getLatestEntitiesIndexName } = require('../common/domain/entity_index');

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const PLUGIN_ROOT = path.resolve(__dirname, '..');
const PROFILES_DIR = path.join(PLUGIN_ROOT, 'profiles');

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function parseArgs() {
  const argv = process.argv.slice(2);
  const get = (flag, defaultVal) => {
    const idx = argv.findIndex((a) => a === flag || a.startsWith(`${flag}=`));
    if (idx === -1) return defaultVal;
    const arg = argv[idx];
    if (arg.includes('=')) return arg.split('=').slice(1).join('=');
    return argv[idx + 1] ?? defaultVal;
  };

  const clusterArg = get('--cluster', 'both');
  const clusters =
    clusterArg === 'both' ? ['local', 'remote'] : clusterArg.split(',').map((s) => s.trim());

  const entityArg = get('--entity', 'user,host,generic,service');
  const entities = entityArg.split(',').map((s) => s.trim());

  const runId = get('--run-id', new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19));
  const namespace = get('--namespace', 'default');
  const docsLimit = parseInt(get('--docs-limit', '10000'), 10);
  const fromDate = get('--from', 'now-1d');
  const toDate = get('--to', 'now');
  const indexPatternsArg = get('--index-patterns', 'logs-*,.entities.v2.updates*');
  const indexPatterns = indexPatternsArg.split(',').map((s) => s.trim());
  // Skip re-querying ES when profile.json already exists for a run; just regenerate analysis.md
  const reuseProfile = argv.includes('--reuse-profile');

  return {
    clusters,
    entities,
    runId,
    namespace,
    docsLimit,
    fromDate,
    toDate,
    indexPatterns,
    reuseProfile,
  };
}

// ---------------------------------------------------------------------------
// Cluster configuration (credentials from env only)
// ---------------------------------------------------------------------------

function buildClusterConfig(clusterName) {
  if (clusterName === 'local') {
    const user = process.env.ES_LOCAL_USERNAME ?? 'elastic';
    const pass = process.env.ES_LOCAL_PASSWORD ?? 'changeme';
    return {
      name: 'local',
      url: 'http://localhost:9200',
      headers: {
        Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
    };
  }
  if (clusterName === 'remote') {
    const url = process.env.ES_REMOTE_URL;
    const apiKey = process.env.ES_REMOTE_API_KEY;
    if (!url) throw new Error('ES_REMOTE_URL env var is required for --cluster remote');
    if (!apiKey) throw new Error('ES_REMOTE_API_KEY env var is required for --cluster remote');
    return {
      name: 'remote',
      url,
      headers: {
        Authorization: `ApiKey ${apiKey}`,
        'Content-Type': 'application/json',
      },
    };
  }
  throw new Error(`Unknown cluster name: ${clusterName}`);
}

// ---------------------------------------------------------------------------
// ES|QL profile request
// ---------------------------------------------------------------------------

async function runProfileQuery(cluster, query) {
  const body = JSON.stringify({ query, profile: true });
  const url = `${cluster.url}/_query?pretty=false`;

  const response = await fetch(url, {
    method: 'POST',
    headers: cluster.headers,
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ES|QL request failed (${response.status}): ${text.slice(0, 500)}`);
  }

  return response.json();
}

// ---------------------------------------------------------------------------
// Profile parsing
// ---------------------------------------------------------------------------

function opKey(desc) {
  // For EvalOperator, capture the evaluator type: EvalOperator[CaseLazyEvaluator]
  // For everything else, just the operator type: LuceneSourceOperator
  const outerBracket = desc.indexOf('[');
  if (outerBracket <= 0) return desc;
  const outerType = desc.slice(0, outerBracket);
  if (outerType === 'EvalOperator' || outerType === 'FilterOperator') {
    const inner = desc.slice(outerBracket + 1);
    const evalMatch = inner.match(/^evaluator=([A-Za-z]+)/);
    if (evalMatch) return `${outerType}[${evalMatch[1]}]`;
  }
  return outerType;
}

function extractOperators(profileResponse) {
  const drivers = profileResponse?.profile?.drivers ?? [];
  // Aggregate across all drivers by operator key
  const byType = new Map();

  for (const driver of drivers) {
    for (const op of driver.operators ?? []) {
      const fullDesc = op.operator ?? op.description ?? 'unknown';
      const key = opKey(fullDesc);
      const st = op.status ?? {};
      const existing = byType.get(key) ?? {
        description: key,
        process_nanos: 0,
        rows_received: 0,
        rows_emitted: 0,
        pages_processed: 0,
        drivers: 0,
      };
      existing.process_nanos += st.process_nanos ?? 0;
      existing.rows_received += st.rows_received ?? st.rows_emitted ?? 0;
      existing.rows_emitted += st.rows_emitted ?? 0;
      existing.pages_processed += st.pages_processed ?? st.pages_emitted ?? 0;
      existing.drivers += 1;
      byType.set(key, existing);
    }
  }

  return [...byType.values()];
}

// ---------------------------------------------------------------------------
// Analysis generation
// ---------------------------------------------------------------------------

function formatNanos(ns) {
  if (ns >= 1e9) return `${(ns / 1e9).toFixed(2)}s`;
  if (ns >= 1e6) return `${(ns / 1e6).toFixed(1)}ms`;
  if (ns >= 1e3) return `${(ns / 1e3).toFixed(0)}µs`;
  return `${ns}ns`;
}

function formatDelta(delta) {
  const sign = delta > 0 ? '+' : '';
  return `${sign}${formatNanos(delta)}`;
}

const TOP_N = 25;

function buildOperatorKey(op) {
  return op.description;
}

function buildAnalysis(entityType, clusterName, currentOps, baselineOps, previousOps, took) {
  const lines = [];

  lines.push(`# ES|QL Profile Analysis — ${entityType} @ ${clusterName}`);
  lines.push('');
  lines.push(`**Query wall time (took):** ${took}ms`);
  lines.push('');

  // Current operators table (aggregated across all drivers, top N by process_nanos)
  const sortedOps = [...currentOps].sort((a, b) => b.process_nanos - a.process_nanos);
  lines.push(`## Top ${TOP_N} operators by process time (aggregated across all drivers)`);
  lines.push('');
  lines.push('| Operator | Process (total) | Rows in | Rows out | Drivers |');
  lines.push('|---|---|---|---|---|');
  for (const op of sortedOps.slice(0, TOP_N)) {
    lines.push(
      `| ${op.description} | ${formatNanos(op.process_nanos)} | ${op.rows_received} | ${
        op.rows_emitted
      } | ${op.drivers} |`
    );
  }
  lines.push('');

  const totalProcessNanos = currentOps.reduce((s, o) => s + o.process_nanos, 0);
  lines.push(`**Total operator process time:** ${formatNanos(totalProcessNanos)}`);
  lines.push('');

  // Delta vs baseline
  if (baselineOps && baselineOps.length > 0) {
    const baselineMap = new Map(baselineOps.map((op) => [buildOperatorKey(op), op]));
    const currentMap = new Map(currentOps.map((op) => [buildOperatorKey(op), op]));

    const allKeys = new Set([...baselineMap.keys(), ...currentMap.keys()]);
    const deltas = [];
    for (const key of allKeys) {
      const curr = currentMap.get(key);
      const base = baselineMap.get(key);
      if (curr && base) {
        deltas.push({ key, delta: curr.process_nanos - base.process_nanos, curr, base });
      } else if (curr) {
        deltas.push({ key, delta: curr.process_nanos, curr, base: null });
      } else if (base) {
        deltas.push({ key, delta: -base.process_nanos, curr: null, base });
      }
    }
    deltas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    lines.push('## Delta vs baseline (sorted by absolute process-time change)');
    lines.push('');
    lines.push('| Operator | Baseline | Current | Δ |');
    lines.push('|---|---|---|---|');
    for (const { key, delta, curr, base } of deltas) {
      const baseCpu = base ? formatNanos(base.process_nanos) : '—';
      const currCpu = curr ? formatNanos(curr.process_nanos) : '—';
      lines.push(`| ${key} | ${baseCpu} | ${currCpu} | ${formatDelta(delta)} |`);
    }

    const baselineTotal = baselineOps.reduce((s, o) => s + o.process_nanos, 0);
    const totalDelta = totalProcessNanos - baselineTotal;
    lines.push('');
    lines.push(
      `**Total process-time delta vs baseline:** ${formatDelta(
        totalDelta
      )} (baseline: ${formatNanos(baselineTotal)}, current: ${formatNanos(totalProcessNanos)})`
    );
    lines.push('');
  } else {
    lines.push('## Delta vs baseline');
    lines.push('');
    lines.push('_No baseline found — this run IS the baseline._');
    lines.push('');
  }

  // Delta vs previous run
  if (previousOps && previousOps.length > 0 && previousOps !== baselineOps) {
    const prevMap = new Map(previousOps.map((op) => [buildOperatorKey(op), op]));
    const currentMap = new Map(currentOps.map((op) => [buildOperatorKey(op), op]));
    const allKeys = new Set([...prevMap.keys(), ...currentMap.keys()]);
    const deltas = [];
    for (const key of allKeys) {
      const curr = currentMap.get(key);
      const prev = prevMap.get(key);
      if (curr && prev) {
        deltas.push({ key, delta: curr.process_nanos - prev.process_nanos, curr, prev });
      } else if (curr) {
        deltas.push({ key, delta: curr.process_nanos, curr, prev: null });
      } else if (prev) {
        deltas.push({ key, delta: -prev.process_nanos, curr: null, prev });
      }
    }
    deltas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    lines.push('## Delta vs previous run (sorted by absolute process-time change)');
    lines.push('');
    lines.push('| Operator | Previous | Current | Δ |');
    lines.push('|---|---|---|---|');
    for (const { key, delta, curr, prev } of deltas) {
      const prevCpu = prev ? formatNanos(prev.process_nanos) : '—';
      const currCpu = curr ? formatNanos(curr.process_nanos) : '—';
      lines.push(`| ${key} | ${prevCpu} | ${currCpu} | ${formatDelta(delta)} |`);
    }

    const prevTotal = previousOps.reduce((s, o) => s + o.process_nanos, 0);
    const totalDelta = totalProcessNanos - prevTotal;
    lines.push('');
    lines.push(
      `**Total process-time delta vs previous:** ${formatDelta(
        totalDelta
      )} (previous: ${formatNanos(prevTotal)}, current: ${formatNanos(totalProcessNanos)})`
    );
    lines.push('');
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Find baseline / previous run profile JSONs
// ---------------------------------------------------------------------------

function loadProfileOps(profileJsonPath) {
  if (!fs.existsSync(profileJsonPath)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(profileJsonPath, 'utf8'));
    return extractOperators({ profile: data });
  } catch {
    return null;
  }
}

function findPreviousRunProfile(runId, clusterName, entityType) {
  if (!fs.existsSync(PROFILES_DIR)) return null;

  const runDirs = fs
    .readdirSync(PROFILES_DIR)
    .filter((d) => d !== runId && fs.statSync(path.join(PROFILES_DIR, d)).isDirectory())
    .sort()
    .reverse();

  for (const dir of runDirs) {
    const candidate = path.join(PROFILES_DIR, dir, clusterName, entityType, 'profile.json');
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isCircuitBreakerError(err) {
  return (
    err.message.includes('circuit_breaking_exception') ||
    err.message.includes('Data too large') ||
    err.message.includes('429')
  );
}

async function main() {
  const {
    clusters,
    entities,
    runId,
    namespace,
    docsLimit,
    fromDate,
    toDate,
    indexPatterns,
    reuseProfile,
  } = parseArgs();

  console.log(`\nRun ID     : ${runId}`);
  console.log(`Clusters   : ${clusters.join(', ')}`);
  console.log(`Entities   : ${entities.join(', ')}`);
  console.log(`Date range : ${fromDate} → ${toDate}`);
  console.log(`Index pats : ${indexPatterns.join(', ')}`);
  console.log(`Docs limit : ${docsLimit}`);
  console.log(`Namespace  : ${namespace}`);
  console.log('');

  const latestIndex = getLatestEntitiesIndexName(namespace);
  const toDateISO = resolveDateISO(toDate);
  const fromDateISO = resolveDateISO(fromDate);

  for (const clusterName of clusters) {
    let cluster;
    try {
      cluster = buildClusterConfig(clusterName);
    } catch (err) {
      console.error(`[${clusterName}] Skipping — ${err.message}`);
      continue;
    }

    for (const entityType of entities) {
      console.log(`[${clusterName}/${entityType}] Building query…`);

      const entityDefinition = getEntityDefinitionWithoutId(entityType);
      const query = buildLogsExtractionEsqlQuery({
        indexPatterns,
        latestIndex,
        entityDefinition,
        docsLimit,
        fromDateISO,
        toDateISO,
      });

      // Output paths
      const outDir = path.join(PROFILES_DIR, runId, clusterName, entityType);
      fs.mkdirSync(outDir, { recursive: true });

      const queryPath = path.join(outDir, 'query.esql');
      const profilePath = path.join(outDir, 'profile.json');
      const analysisPath = path.join(outDir, 'analysis.md');

      // Write query
      fs.writeFileSync(queryPath, query, 'utf8');
      console.log(
        `[${clusterName}/${entityType}] Query written to ${path.relative(PLUGIN_ROOT, queryPath)}`
      );

      let took = '?';
      let profileBlock;

      if (reuseProfile && fs.existsSync(profilePath)) {
        console.log(`[${clusterName}/${entityType}] Reusing existing profile.json`);
        profileBlock = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
      } else {
        // Execute
        console.log(`[${clusterName}/${entityType}] Running with ?profile=true…`);
        let raw;
        try {
          raw = await runProfileQuery(cluster, query);
        } catch (err) {
          console.error(`[${clusterName}/${entityType}] FAILED: ${err.message}`);
          if (isCircuitBreakerError(err)) {
            console.log(
              `[${clusterName}/${entityType}] OOM detected — waiting 60s before next query…`
            );
            await sleep(60_000);
          }
          continue;
        }
        took = raw.took ?? '?';
        profileBlock = raw.profile ?? {};
        fs.writeFileSync(profilePath, JSON.stringify(profileBlock, null, 2), 'utf8');
        console.log(`[${clusterName}/${entityType}] Profile written (took: ${took}ms)`);
      }

      // Load baseline + previous for comparison
      const baselinePath = path.join(
        PROFILES_DIR,
        'baseline',
        clusterName,
        entityType,
        'profile.json'
      );
      const baselineOps = loadProfileOps(baselinePath);

      const prevPath = findPreviousRunProfile(runId, clusterName, entityType);
      const prevOps = prevPath ? loadProfileOps(prevPath) : null;

      // Generate analysis
      const currentOps = extractOperators({ profile: profileBlock });
      const analysisText = buildAnalysis(
        entityType,
        clusterName,
        currentOps,
        baselineOps,
        prevOps,
        took
      );
      fs.writeFileSync(analysisPath, analysisText, 'utf8');
      console.log(
        `[${clusterName}/${entityType}] Analysis written → ${path.relative(
          PLUGIN_ROOT,
          analysisPath
        )}`
      );
      console.log('');
    }
  }

  console.log(`\nDone. All output under: profiles/${runId}/`);
}

// Resolve an ES-style date expression (now, now-1d, now-2h, ISO string) to an ISO date string.
function resolveDateISO(expr) {
  if (expr === 'now') return new Date().toISOString();
  const relMatch = expr.match(/^now-(\d+)(d|h|m|s)$/);
  if (relMatch) {
    const [, n, unit] = relMatch;
    const ms = { d: 86400000, h: 3600000, m: 60000, s: 1000 };
    return new Date(Date.now() - parseInt(n, 10) * ms[unit]).toISOString();
  }
  // assume it's already an ISO date
  return expr;
}

main().catch((err) => {
  console.error('\nFatal error:', err.message ?? err);
  process.exit(1);
});
