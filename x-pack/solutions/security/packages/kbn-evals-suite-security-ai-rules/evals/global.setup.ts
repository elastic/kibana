/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Global setup for security-ai-rules eval suite.
 *
 * Seeds realistic ECS sample documents from the elastic/integrations repository
 * (raw GitHub) into the Scout-managed Elasticsearch.  Documents are cached
 * locally and cloned deterministically with varied timestamps, host names and
 * entity IDs so that `resolveResourceForEsqlWithSamplingStats` discovers real
 * field mappings and the LLM never has to hallucinate columns.
 *
 * Endpoint samples are *also* read from the built-in data-generator episodes
 * shipped inside Kibana so that file/process/network/registry events mirror
 * the same shape used in security_solution internal tests.
 */

import { globalSetupHook, tags } from '@kbn/scout';
import https from 'node:https';
import zlib from 'node:zlib';
import fs, { createReadStream, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createInterface } from 'node:readline';
import { PassThrough } from 'node:stream';

/* ────────────────────────────────────────────────────────────────────── */
/* Constants
/* ────────────────────────────────────────────────────────────────────── */

const GITHUB_RAW =
  'https://raw.githubusercontent.com/elastic/integrations/main/packages';

/**
 * Where to cache downloaded sample_event.json files on disk so that repeated
 * runs of the suite do not re-fetch from GitHub.
 */
const CACHE_DIR = path.resolve(
  __dirname,
  '..',
  '.cache',
  'integration-samples'
);

const EPISODE_DIR = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'plugins',
  'security_solution',
  'scripts',
  'data',
  'episodes',
  'attacks'
);

/**
 * These concrete indices are used with Scout’s default index templates.
 * Fleet/ECS mappings auto-create when the first document arrives.
 */
interface SourceDef {
  /** integration package name in elastic/integrations */
  pkg: string;
  /** data_stream inside that package */
  stream: string;
  /** how many cloned documents to index */
  cloneCount: number;
  /** concrete index name to write to */
  index: string;
}

const INTEGRATION_SOURCES: SourceDef[] = [
  { pkg: 'o365', stream: 'audit', cloneCount: 80, index: 'logs-o365.audit-default' },
  {
    pkg: 'azure',
    stream: 'auditlogs',
    cloneCount: 80,
    index: 'logs-azure.auditlogs-default',
  },
  { pkg: 'gcp', stream: 'audit', cloneCount: 80, index: 'logs-gcp.audit-default' },
  {
    pkg: 'windows',
    stream: 'sysmon_operational',
    cloneCount: 80,
    index: 'logs-windows.sysmon_operational-default',
  },
  {
    pkg: 'network_traffic',
    stream: 'http',
    cloneCount: 80,
    index: 'logs-network_traffic.http-default',
  },
  {
    pkg: 'aws',
    stream: 'cloudtrail',
    cloneCount: 80,
    index: 'logs-aws.cloudtrail-default',
  },
  {
    pkg: 'google_workspace',
    stream: 'admin',
    cloneCount: 80,
    index: 'logs-google_workspace.admin-default',
  },
  {
    pkg: 'okta',
    stream: 'system',
    cloneCount: 80,
    index: 'logs-okta.system-default',
  },
  {
    pkg: 'windows',
    stream: 'powershell_operational',
    cloneCount: 80,
    index: 'logs-windows.powershell_operational-default',
  },
  {
    pkg: 'network_traffic',
    stream: 'flow',
    cloneCount: 80,
    index: 'logs-network_traffic.flow-default',
  },
];

/**
 * Number of data docs to extract from each endpoint episode ndjson.gz.
 */
const EPISODE_SAMPLE_SIZE = 200;

/* ────────────────────────────────────────────────────────────────────── */
/* Deterministic variation helpers
/* ────────────────────────────────────────────────────────────────────── */

const HOST_POOL = [
  'WIN-ITADMIN01',
  'WIN-DEV03',
  'WIN-ANALYST01',
  'DC-CORP01',
  'WS-WEB01',
  'WS-DB01',
  'MAC-ENG01',
  'LNX-SRV01',
  'LNX-PROXY02',
  'WIN-SRE04',
  'WIN-FIN05',
  'WIN-HR06',
];

const USER_POOL = [
  'alice.chen',
  'bob.martinez',
  'carol.white',
  'david.lee',
  'eve.johnson',
  'frank.brown',
  'grace.kim',
  'henry.davis',
  'SYSTEM',
  'LOCAL SERVICE',
  'NETWORK SERVICE',
  'admin@elastic.co',
];

const djb2 = (str: string): number => {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) & 0xffffffff;
  }
  return h >>> 0;
};

const deterministicFloat = (seed: string): number => {
  const h = djb2(seed);
  return h / 0xffffffff;
};

const pickFrom = <T>(arr: T[], seed: string): T => {
  const idx = Math.floor(deterministicFloat(seed) * arr.length);
  return arr[idx % arr.length];
};

const shiftTimestamp = (iso: string, deltaMs: number): string => {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return iso;
  return new Date(ms + deltaMs).toISOString();
};

/**
 * Deep-clone a sample document and deterministically vary host, user,
 * entity_id-style strings and the @timestamp.
 */
function variate(
  original: Record<string, unknown>,
  variationIdx: number,
  baseTimeMs: number,
  timeSpreadMs: number
): Record<string, unknown> {
  const clone: Record<string, unknown> = JSON.parse(JSON.stringify(original));

  const host = pickFrom(HOST_POOL, `h:${variationIdx}`);
  const user = pickFrom(USER_POOL, `u:${variationIdx}`);

  // Shift timestamp over the requested window
  const delta = Math.floor(deterministicFloat(`t:${variationIdx}`) * timeSpreadMs);
  const shifted = shiftTimestamp(
    (clone['@timestamp'] as string) ?? new Date(baseTimeMs).toISOString(),
    delta - timeSpreadMs / 2
  );
  clone['@timestamp'] = shifted;

  // Normalise ECS nested fields
  if (!clone.host) clone.host = {};
  const hostObj = clone.host as Record<string, unknown>;
  hostObj.name = host;
  if (!hostObj.os) hostObj.os = {};
  const hostOs = hostObj.os as Record<string, unknown>;
  if (!hostOs.type) {
    const procPath = ((clone.process as Record<string, unknown>)?.executable as string) ?? '';
    const isWindows = !!(
      clone.winlog ||
      procPath.includes('.exe') ||
      procPath.includes('C:\\\\') ||
      (hostOs.Ext as Record<string, unknown>)?.variant?.toString().toLowerCase().includes('windows')
    );
    hostOs.type = isWindows ? 'windows' : 'linux';
  }
  if (!clone.user) clone.user = {};
  (clone.user as Record<string, unknown>).name = user;
  if (!clone.agent) clone.agent = {};
  (clone.agent as Record<string, unknown>).id = `agent-${djb2(`a:${variationIdx}`).toString(36).slice(0, 8)}`;

  // Walk strings and rewrite any field called `entity_id` or `id` inside
  // process / file / registry / network to avoid exact duplicates.
  const rewriteIds = (node: unknown, salt: string): unknown => {
    if (Array.isArray(node)) return node.map((v, i) => rewriteIds(v, `${salt}:${i}`));
    if (!node || typeof node !== 'object') {
      if (typeof node === 'string' && node.length >= 8) {
        // Touch only opaque-looking IDs (hex, base64-ish)
        if (/^[a-f0-9-]{8,}$/i.test(node) || /^[A-Za-z0-9+/=_-]{10,}$/.test(node)) {
          return `${node.slice(0, 4)}${djb2(`${salt}:${node}`).toString(36).slice(0, 12)}${node.slice(-4)}`;
        }
      }
      return node;
    }
    const o = node as Record<string, unknown>;
    for (const k of Object.keys(o)) {
      const v = o[k];
      if (k === 'entity_id' || k === 'id' || k === 'unique_id') {
        if (typeof v === 'string') {
          o[k] = `${v.slice(0, 4)}${djb2(`${salt}:${v}`).toString(36).slice(0, 12)}${v.slice(-4)}`;
        }
      } else if (k === '@timestamp' || k === 'event' || k === 'host' || k === 'user' || k === 'agent') {
        // host/user/agent already handled above; event.timestamp will be shifted naturally
        if (typeof v === 'object' && v !== null) {
          (v as Record<string, unknown>)['created'] = shifted;
          (v as Record<string, unknown>)['ingested'] = shifted;
        }
      } else {
        o[k] = rewriteIds(v, `${salt}:${k}`);
      }
    }
    return o;
  };

  rewriteIds(clone, `v:${variationIdx}`);
  return clone;
}

/* ────────────────────────────────────────────────────────────────────── */
/* HTTP fetch helpers  (no extra deps – just built-in node:https)
/* ────────────────────────────────────────────────────────────────────── */

function fetchBuffer(url: string, timeoutMs = 30000): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: timeoutMs }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchBuffer(res.headers.location, timeoutMs).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${url}`));
    });
  });
}

async function fetchJson<T = Record<string, unknown>>(url: string): Promise<T> {
  const buf = await fetchBuffer(url);
  return JSON.parse(buf.toString('utf-8')) as T;
}

/* ────────────────────────────────────────────────────────────────────── */
/* Caching
/* ────────────────────────────────────────────────────────────────────── */

function cachePath(pkg: string, stream: string): string {
  return path.join(CACHE_DIR, `${pkg}__${stream}.json`);
}

function ensureCacheDir() {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function readCachedOrNull(pkg: string, stream: string): Record<string, unknown> | null {
  const p = cachePath(pkg, stream);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function writeCache(pkg: string, stream: string, doc: Record<string, unknown>) {
  const p = cachePath(pkg, stream);
  fs.writeFileSync(p, JSON.stringify(doc, null, 0));
}

/* ────────────────────────────────────────────────────────────────────── */
/* Read a sample from elastic/integrations (with caching)
/* ────────────────────────────────────────────────────────────────────── */

async function getSampleEvent(pkg: string, stream: string): Promise<Record<string, unknown>> {
  ensureCacheDir();
  const cached = readCachedOrNull(pkg, stream);
  if (cached) return cached;

  const url = `${GITHUB_RAW}/${pkg}/data_stream/${stream}/sample_event.json`;
  const doc = await fetchJson(url);
  writeCache(pkg, stream, doc);
  return doc;
}

/* ────────────────────────────────────────────────────────────────────── */
/* Read endpoint episode data from Kibana data-generator episodes
/* ────────────────────────────────────────────────────────────────────── */

/**
 * Read the first N documents from an episode's data ndjson.gz.
 */
async function readEpisodeSample(
  dataPath: string,
  sampleCount: number
): Promise<Record<string, unknown>[]> {
  const fileStream = createReadStream(dataPath);
  const out = new PassThrough();
  const docs: Record<string, unknown>[] = [];

  if (dataPath.endsWith('.gz')) {
    const gunzip = zlib.createGunzip();
    pipeline(fileStream, gunzip, out).catch(() => {}); // ignore stream errors after reader done
  } else {
    pipeline(fileStream, out).catch(() => {});
  }

  const rl = createInterface({ input: out, crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line || docs.length >= sampleCount) break;
    try {
      const parsed = JSON.parse(line);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        docs.push(parsed as Record<string, unknown>);
      }
    } catch {
      // skip bad lines
    }
  }

  return docs;
}

/**
 * Return a map from ECS dataset name (e.g. endpoint.events.file) to
 * representative sample docs.
 */
async function loadEndpointSamples(sampleCount: number): Promise<
  Record<string, Record<string, unknown>[]>
> {
  const result: Record<string, Record<string, unknown>[]> = {};

  // Episode mapping: each episode file contains mixed datasets, so we
  // bucket by `event.dataset` or `data_stream.dataset`.
  const episodeFiles = [
    path.join(EPISODE_DIR, 'ep1data.ndjson.gz'),
    path.join(EPISODE_DIR, 'ep2data.ndjson.gz'),
    path.join(EPISODE_DIR, 'ep3data.ndjson.gz'),
    path.join(EPISODE_DIR, 'ep4data.ndjson.gz'),
    path.join(EPISODE_DIR, 'ep5data.ndjson.gz'),
    path.join(EPISODE_DIR, 'ep6data.ndjson.gz'),
    path.join(EPISODE_DIR, 'ep7data.ndjson.gz'),
    path.join(EPISODE_DIR, 'ep8data.ndjson.gz'),
  ];

  for (const fp of episodeFiles) {
    if (!existsSync(fp)) continue;
    const docs = await readEpisodeSample(fp, sampleCount);
    for (const doc of docs) {
      const ds: string | undefined =
        ((doc.data_stream as Record<string, unknown>)?.dataset as string) ??
        ((doc.event as Record<string, unknown>)?.dataset as string);
      if (!ds) continue;
      result[ds] = result[ds] ?? [];
      if (result[ds].length < sampleCount) {
        result[ds].push(doc);
      }
    }
  }

  return result;
}

/* ────────────────────────────────────────────────────────────────────── */
/* Bulk indexing helpers
/* ────────────────────────────────────────────────────────────────────── */

async function bulkIndex(
  esClient: any,
  index: string,
  docs: Record<string, unknown>[],
  batchSize = 500,
  log?: { warning: (msg: string) => void }
) {
  for (let i = 0; i < docs.length; i += batchSize) {
    const slice = docs.slice(i, i + batchSize);
    // Data streams only accept `create` ops (not `index`).
    const body = slice.flatMap((doc) => [{ create: { _index: index } }, doc]);
    const resp = await esClient.bulk({ refresh: false, body });
    if (resp.errors) {
      const firstErr = resp.items?.find((it: any) => it.create?.error)?.create?.error;
      if (log && firstErr) {
        log.warning(`[security-ai-rules eval setup] bulk errors into ${index}: ${firstErr.type}: ${firstErr.reason}`);
      }
    }
  }
}

/* ────────────────────────────────────────────────────────────────────── */
/* Main seeding routine
/* ────────────────────────────────────────────────────────────────────── */

globalSetupHook(
  'Security AI Rules eval seed data',
  { tag: tags.stateful.classic },
  async ({ esClient, log }) => {
    log.info('[security-ai-rules eval setup] seeding security indices with realistic data');

    const baseTimeMs = Date.now();
    const timeSpreadMs = 14 * 24 * 60 * 60 * 1000; // ± 1 week

    /* ── Integration samples (non-endpoint) ────────────────────────── */

    for (const source of INTEGRATION_SOURCES) {
      try {
        const sample = await getSampleEvent(source.pkg, source.stream);

        const clones: Record<string, unknown>[] = [];
        for (let i = 0; i < source.cloneCount; i++) {
          clones.push(variate(sample, i, baseTimeMs, timeSpreadMs));
        }

        await bulkIndex(esClient, source.index, clones, 500, log);
        log.info(`[security-ai-rules eval setup] indexed ${clones.length} docs into ${source.index}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.warning(
          `[security-ai-rules eval setup] failed seeding ${source.index}: ${msg}`
        );
      }
    }

    /* ── Endpoint events from data-generator episodes ──────────────── */

    try {
      const endpointSamples = await loadEndpointSamples(EPISODE_SAMPLE_SIZE);
      const datasetToIndex: Record<string, string> = {
        'endpoint.events.file': 'logs-endpoint.events.file-default',
        'endpoint.events.process': 'logs-endpoint.events.process-default',
        'endpoint.events.network': 'logs-endpoint.events.network-default',
        'endpoint.events.registry': 'logs-endpoint.events.registry-default',
      };

      for (const [dataset, index] of Object.entries(datasetToIndex)) {
        const originals = endpointSamples[dataset];
        if (!originals || originals.length === 0) {
          log.warning(`[security-ai-rules eval setup] no endpoint samples for ${dataset}`);
          continue;
        }

        const clones: Record<string, unknown>[] = [];
        for (let i = 0; i < EPISODE_SAMPLE_SIZE; i++) {
          const base = originals[i % originals.length];
          clones.push(variate(base, i, baseTimeMs, timeSpreadMs));
        }

        await bulkIndex(esClient, index, clones, 500, log);
        log.info(`[security-ai-rules eval setup] indexed ${clones.length} endpoint docs into ${index}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.warning(
        `[security-ai-rules eval setup] endpoint seeding failed: ${msg}`
      );
    }

    /* ── Refresh so mappings are immediately queryable ─────────────── */

    try {
      await esClient.indices.refresh({ index: 'logs-*' });
      log.info('[security-ai-rules eval setup] refreshed logs-* indices');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.warning(`[security-ai-rules eval setup] refresh failed: ${msg}`);
    }

    /* ── Verify all expected indices are queryable (prevents race skips) ─ */

    const expectedIndices = [
      ...INTEGRATION_SOURCES.map((s) => s.index),
      'logs-endpoint.events.file-default',
      'logs-endpoint.events.process-default',
      'logs-endpoint.events.network-default',
      'logs-endpoint.events.registry-default',
    ];

    for (let attempt = 1; attempt <= 10; attempt++) {
      const missing: string[] = [];
      for (const idx of expectedIndices) {
        try {
          const { count } = await esClient.count({ index: idx });
          if (count === 0) missing.push(idx);
        } catch {
          missing.push(idx);
        }
      }
      if (missing.length === 0) {
        log.info('[security-ai-rules eval setup] all expected indices verified');
        break;
      }
      if (attempt === 10) {
        log.warning(
          `[security-ai-rules eval setup] indices still missing after 10 attempts: ${missing.join(', ')}`
        );
      } else {
        log.info(
          `[security-ai-rules eval setup] waiting for indices (attempt ${attempt}): ${missing.join(', ')}`
        );
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    log.info('[security-ai-rules eval setup] done');
  }
);
