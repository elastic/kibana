/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Collapse duplicated Insights security alerts to one doc per original endpoint event.
 *
 * Dhrumil's AD harness uses 95 canonical alerts. The Insights detection rule re-emits
 * signals on every run (95 → 190 → …); this script dedups using `event.id` (endpoint
 * source) / `kibana.alert.original_event.id` (post-detection-rule).
 *
 * Usage (from canonical episode NDJSONs — RECOMMENDED, yields exactly 95):
 *   node .../dedup_insights_alerts.mjs --from-episodes ~/path/to/Insights_Testing \
 *     --out /path/to/insights_alerts_deduped_gold.ndjson
 *
 * Usage (from ES — Dhrumil cluster or golden stack):
 *   ES_URL=... ES_AUTH='user:pass' \
 *     node .../dedup_insights_alerts.mjs --from-es \
 *     --out /path/to/insights_alerts_deduped_gold.ndjson
 *
 * Usage (from a prior _search export JSON):
 *   node .../dedup_insights_alerts.mjs --from-export ./insights_alerts_export.json --out ./out.ndjson
 */

/* eslint-disable no-console, no-process-exit */

import Fs from 'fs';
import Path from 'path';
import { fileURLToPath } from 'url';

const __dirname = Path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_GOLD_HOSTS = [
  'SRVMAC08',
  'SRVWIN07',
  'SRVWIN06',
  'SRVWIN04',
  'SRVNIX05',
  'SRVWIN03',
  'SRVWIN02',
  'SRVWIN01',
  'SRVWIN03-PRIV',
  'SRVWIN04-PRIV',
];

const DEFAULT_INDEX = '.alerts-security.alerts-default';
const DEFAULT_SEED_LABEL = 'dhrumil-insights-gold-v0';

const parseArgs = () => {
  const args = process.argv.slice(2);
  const opts = {
    mode: null,
    exportPath: null,
    episodesDir: null,
    out: Path.resolve(__dirname, '../data/dhrumil/insights_alerts_deduped_gold.ndjson'),
    seedLabel: process.env.DHRUMIL_INSIGHTS_SEED_LABEL ?? DEFAULT_SEED_LABEL,
    index: process.env.DHRUMIL_INSIGHTS_ALERTS_INDEX ?? DEFAULT_INDEX,
    goldHosts: DEFAULT_GOLD_HOSTS,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--from-es') opts.mode = 'es';
    else if (arg === '--from-export') opts.mode = 'export';
    else if (arg === '--from-episodes') opts.mode = 'episodes';
    else if (arg === '--out') opts.out = Path.resolve(args[++i]);
    else if (arg === '--export') opts.exportPath = Path.resolve(args[++i]);
    else if (arg === '--episodes-dir') opts.episodesDir = Path.resolve(args[++i]);
    else if (arg === '--seed-label') opts.seedLabel = args[++i];
  }

  if (!opts.mode) {
    throw new Error('Pass --from-episodes <dir> | --from-es | --from-export <path>');
  }
  if (opts.mode === 'export' && !opts.exportPath) {
    throw new Error('--from-export requires --export <path>');
  }
  if (opts.mode === 'episodes' && !opts.episodesDir) {
    throw new Error('--from-episodes requires --episodes-dir <path>');
  }

  return opts;
};

const origEventId = (source) =>
  source['kibana.alert.original_event.id'] ?? source.event?.id ?? null;

const loadFromEpisodes = async (episodesDir) => {
  const entries = await Fs.promises.readdir(episodesDir);
  const files = entries
    .filter((f) => /^ep\d+alerts\.ndjson$/.test(f))
    .sort()
    .map((f) => Path.resolve(episodesDir, f));

  if (files.length === 0) {
    throw new Error(`No ep*alerts.ndjson files found in ${episodesDir}`);
  }

  const hits = [];
  for (const file of files) {
    const content = await Fs.promises.readFile(file, 'utf8');
    for (const line of content.split('\n')) {
      if (line.trim()) {
        try {
          const source = JSON.parse(line);
          // Wrap in the { _source } shape that dedupeHits expects.
          hits.push({ _source: source, _index: DEFAULT_INDEX });
        } catch {
          // skip malformed lines
        }
      }
    }
  }
  return hits;
};

const dedupeHits = (hits, seedLabel) => {
  const byOrig = new Map();

  for (const hit of hits) {
    const source = hit._source ?? hit;
    const oid = origEventId(source);
    if (oid) {
      const ts = source['@timestamp'] ?? source.event?.start ?? '';
      const prev = byOrig.get(oid);
      if (!prev || ts > (prev._source?.['@timestamp'] ?? prev['@timestamp'] ?? '')) {
        byOrig.set(oid, hit._source ? hit : { _source: hit });
      }
    }
  }

  const deduped = [...byOrig.values()].sort((a, b) => {
    const hostA = a._source?.host?.name ?? a.host?.name ?? '';
    const hostB = b._source?.host?.name ?? b.host?.name ?? '';
    if (hostA !== hostB) return hostA.localeCompare(hostB);
    const tsA = a._source?.['@timestamp'] ?? a['@timestamp'] ?? '';
    const tsB = b._source?.['@timestamp'] ?? b['@timestamp'] ?? '';
    return tsA.localeCompare(tsB);
  });

  const hostCounts = {};
  const lines = [];

  deduped.forEach((hit, index) => {
    const src = { ...(hit._source ?? hit) };
    const host = src.host?.name ?? 'unknown';
    hostCounts[host] = (hostCounts[host] ?? 0) + 1;

    src.labels = { ...(src.labels ?? {}), dhrumil_insights_eval: seedLabel };
    const tags = Array.isArray(src.tags) ? [...src.tags] : [];
    if (!tags.includes(seedLabel)) tags.push(seedLabel);
    src.tags = tags;

    const docId = `${seedLabel}-${String(index).padStart(3, '0')}-${host}`;
    lines.push(JSON.stringify({ index: { _index: DEFAULT_INDEX, _id: docId } }));
    lines.push(JSON.stringify(src));
  });

  return { lines, dedupedCount: deduped.length, hostCounts, rawCount: hits.length };
};

const fetchFromEs = async (opts) => {
  const esUrl = process.env.ES_URL;
  const esAuth = process.env.ES_AUTH;
  if (!esUrl || !esAuth) {
    throw new Error('Set ES_URL and ES_AUTH (user:pass) for --from-es');
  }

  const authHeader = `Basic ${Buffer.from(esAuth).toString('base64')}`;
  const hits = [];

  let scrollId;
  const body = {
    size: 500,
    query: { terms: { 'host.name': opts.goldHosts } },
    sort: [{ '@timestamp': 'desc' }],
    _source: true,
  };

  let res = await fetch(`${esUrl}/${encodeURIComponent(opts.index)}/_search?scroll=2m`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authHeader },
    body: JSON.stringify(body),
  });
  let json = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(json));

  scrollId = json._scroll_id;
  hits.push(...(json.hits?.hits ?? []));

  while (scrollId) {
    res = await fetch(`${esUrl}/_search/scroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify({ scroll: '2m', scroll_id: scrollId }),
    });
    json = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(json));
    scrollId = json._scroll_id;
    const batch = json.hits?.hits ?? [];
    if (batch.length === 0) break;
    hits.push(...batch);
  }

  return hits;
};

const loadFromExport = async (exportPath) => {
  const json = JSON.parse(await Fs.promises.readFile(exportPath, 'utf8'));
  return json.hits?.hits ?? json;
};

const main = async () => {
  const opts = parseArgs();
  let hits;
  if (opts.mode === 'es') {
    hits = await fetchFromEs(opts);
  } else if (opts.mode === 'episodes') {
    hits = await loadFromEpisodes(opts.episodesDir);
  } else {
    hits = await loadFromExport(opts.exportPath);
  }

  const { lines, dedupedCount, hostCounts, rawCount } = dedupeHits(hits, opts.seedLabel);

  await Fs.promises.mkdir(Path.dirname(opts.out), { recursive: true });
  await Fs.promises.writeFile(opts.out, `${lines.join('\n')}\n`);

  const metaPath = opts.out.replace(/\.ndjson$/, '.meta.json');
  await Fs.promises.writeFile(
    metaPath,
    `${JSON.stringify(
      {
        seed_label: opts.seedLabel,
        dedup_key: 'event.id / kibana.alert.original_event.id',
        source: opts.mode,
        raw_hits: rawCount,
        unique_alerts: dedupedCount,
        host_counts: hostCounts,
        methodology_expected_unique: 95,
        note:
          opts.mode === 'episodes'
            ? 'Generated from canonical ep*alerts.ndjson (8 episodes). Yields exactly 95 unique endpoint alert events.'
            : 'Generated from ES/export. The methodology expects 95; use --from-episodes for the canonical gold set.',
      },
      null,
      2
    )}\n`
  );

  console.log(`Wrote ${dedupedCount} alerts (${rawCount} raw) → ${opts.out}`);
  console.log(`Meta → ${metaPath}`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
