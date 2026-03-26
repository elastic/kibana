/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import { createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { createInterface } from 'readline';
import { PassThrough } from 'stream';
import crypto from 'crypto';
import { faker } from '@faker-js/faker';
import { isRecord, isString } from './type_guards';

export interface EpisodeFileSet {
  episodeId: string; // e.g. ep1
  dataPath: string;
  alertsPath: string;
}

export interface LoadEpisodeOptions {
  validateFixtures?: boolean;
}

export interface EpisodeDocs {
  episodeId: string;
  dataDocs: Array<Record<string, unknown>>;
  alertDocs: Array<Record<string, unknown>>;
  minTimestampMs: number;
  maxTimestampMs: number;
}

const parseIsoMillis = (value: unknown): number | undefined => {
  if (typeof value !== 'string') return undefined;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : undefined;
};

const getTimestampMs = (doc: Record<string, unknown>): number | undefined => {
  return parseIsoMillis(doc['@timestamp']) ?? parseIsoMillis(getNested(doc, ['event', 'created']));
};

const getNested = (obj: unknown, path: string[]): unknown => {
  let cur: unknown = obj;
  for (const key of path) {
    if (!isRecord(cur)) return undefined;
    cur = cur[key];
  }
  return cur;
};

const setNested = (obj: Record<string, unknown>, path: string[], value: unknown) => {
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    const next = cur[key];
    if (!isRecord(next)) {
      const created: Record<string, unknown> = {};
      cur[key] = created;
      cur = created;
    } else {
      cur = next;
    }
  }
  cur[path[path.length - 1]] = value;
};

const truncateLine = (line: string, maxChars: number = 200): string => {
  const singleLine = line.replace(/\s+/g, ' ').trim();
  if (singleLine.length <= maxChars) return singleLine;
  return `${singleLine.slice(0, maxChars)}…`;
};

export interface NdjsonValidationContext {
  filePath: string;
  line: number;
  rawLine: string;
}

export interface ReadNdjsonOptions {
  validate?: (doc: Record<string, unknown>, ctx: NdjsonValidationContext) => void;
}

export const readNdjson = async (
  filePath: string,
  options: ReadNdjsonOptions = {}
): Promise<Array<Record<string, unknown>>> => {
  const fileStream = fs.createReadStream(filePath);
  const out = new PassThrough();
  const docs: Array<Record<string, unknown>> = [];

  const isPlainObject = (value: unknown): value is Record<string, unknown> => {
    return isRecord(value) && !Array.isArray(value);
  };

  const rl = createInterface({ input: out, crlfDelay: Infinity });
  const reader = (async () => {
    let lineNumber = 0;
    for await (const line of rl) {
      lineNumber++;
      if (line) {
        let parsed: unknown;
        try {
          parsed = JSON.parse(line);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          throw new Error(
            `Invalid JSON in ${filePath}:${lineNumber}: ${msg}. Line: "${truncateLine(line)}"`
          );
        }
        if (!isPlainObject(parsed)) {
          throw new Error(
            `Invalid NDJSON line (expected object) in ${filePath}:${lineNumber}. Line: "${truncateLine(
              line
            )}"`
          );
        }
        const doc = parsed;

        try {
          options.validate?.(doc, { filePath, line: lineNumber, rawLine: line });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          throw new Error(
            `Invalid fixture in ${filePath}:${lineNumber}: ${msg}. Line: "${truncateLine(line)}"`
          );
        }

        docs.push(doc);
      }
    }
  })();
  // IMPORTANT: handle rejections immediately to avoid PromiseRejectionHandledWarning in Node.
  let readerError: unknown;
  const readerHandled = reader.catch((e) => {
    readerError = e;
  });

  if (filePath.endsWith('.gz')) {
    const gunzip = createGunzip();
    await pipeline(fileStream, gunzip, out);
  } else {
    await pipeline(fileStream, out);
  }
  await readerHandled;
  if (readerError) {
    throw readerError;
  }

  return docs;
};

export const loadEpisode = async (
  files: EpisodeFileSet,
  options: LoadEpisodeOptions = {}
): Promise<EpisodeDocs> => {
  const validateFixtures = options.validateFixtures ?? true;
  const dataDocs = await readNdjson(
    files.dataPath,
    validateFixtures
      ? { validate: createEndpointAwareValidator({ expectedEventKind: 'event' }) }
      : {}
  );
  const alertDocs = await readNdjson(
    files.alertsPath,
    validateFixtures
      ? { validate: createEndpointAwareValidator({ expectedEventKind: 'alert' }) }
      : {}
  );

  const timestamps = [...dataDocs, ...alertDocs]
    .map((d) => getTimestampMs(d))
    .filter((t): t is number => typeof t === 'number');

  if (timestamps.length === 0) {
    throw new Error(
      `Episode ${files.episodeId} has no parseable timestamps. Expected @timestamp or event.created in fixtures: data=${files.dataPath} alerts=${files.alertsPath}`
    );
  }

  const minTimestampMs = Math.min(...timestamps);
  const maxTimestampMs = Math.max(...timestamps);

  return { episodeId: files.episodeId, dataDocs, alertDocs, minTimestampMs, maxTimestampMs };
};

const looksLikeEndpointDoc = (doc: Record<string, unknown>): boolean => {
  const module = getNested(doc, ['event', 'module']);
  if (module === 'endpoint') return true;

  const eventDataset = getNested(doc, ['event', 'dataset']);
  if (typeof eventDataset === 'string' && eventDataset.startsWith('endpoint.')) return true;

  const dsDataset = getNested(doc, ['data_stream', 'dataset']);
  if (typeof dsDataset === 'string' && dsDataset.startsWith('endpoint.')) return true;

  return false;
};

const isParseableIsoTimestamp = (value: unknown): boolean => {
  if (!isString(value)) return false;
  const ms = Date.parse(value);
  return Number.isFinite(ms);
};

const createEndpointAwareValidator = ({
  expectedEventKind,
}: {
  expectedEventKind: 'event' | 'alert';
}): ReadNdjsonOptions['validate'] => {
  return (doc) => {
    // Always: require a parseable timestamp.
    const ts = doc['@timestamp'];
    const created = getNested(doc, ['event', 'created']);
    if (!isParseableIsoTimestamp(ts) && !isParseableIsoTimestamp(created)) {
      throw new Error('missing/invalid @timestamp (or event.created)');
    }

    // Endpoint-aware: validate a minimal set of stable invariants.
    if (!looksLikeEndpointDoc(doc)) return;

    const kind = getNested(doc, ['event', 'kind']);
    if (!isString(kind)) {
      throw new Error('missing/invalid event.kind (expected string)');
    }
    if (kind !== expectedEventKind) {
      throw new Error(`unexpected event.kind="${kind}" (expected "${expectedEventKind}")`);
    }

    const dataset = getNested(doc, ['event', 'dataset']);
    if (!isString(dataset) || dataset.length === 0) {
      throw new Error('missing/invalid event.dataset (expected string)');
    }

    const dataStream = getNested(doc, ['data_stream']);
    if (dataStream == null) return;
    if (!isRecord(dataStream)) {
      throw new Error('invalid data_stream (expected object)');
    }

    const dsType = dataStream.type;
    const dsDataset = dataStream.dataset;
    const dsNamespace = dataStream.namespace;
    if (!isString(dsType) || !isString(dsDataset) || !isString(dsNamespace)) {
      throw new Error('missing/invalid data_stream.type/dataset/namespace (expected strings)');
    }
  };
};

export interface ScaleEpisodesOptions {
  startMs: number;
  endMs: number;
  targetEvents: number;
  hostCount: number;
  userCount: number;
  /**
   * Concentrate most events on a small subset of risky hosts/users.
   * The remaining hosts/users still receive some benign/noisy activity.
   */
  riskyHostCount?: number;
  riskyUserCount?: number;
  /**
   * Probability (0..1) that a clone will be assigned a risky host+user pair.
   */
  riskyProbability?: number;
  /**
   * If defined, every clone uses this fixed seed for deterministic distribution.
   * Useful for reproducible datasets.
   */
  seed?: string;
}

export interface ScaledDoc {
  doc: Record<string, unknown>;
  kind: 'data' | 'endpoint_alert' | 'insights_alert';
  episodeId: string;
}

const hash = (input: string): string =>
  crypto.createHash('sha256').update(input).digest('hex').slice(0, 16);

const hashToUnitFloat = (input: string): number => {
  const h = crypto.createHash('sha256').update(input).digest('hex').slice(0, 8);
  const n = parseInt(h, 16);
  // 0..1 inclusive-ish
  return n / 0xffffffff;
};

const shiftIso = (iso: string, deltaMs: number): string => {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return iso;
  return new Date(ms + deltaMs).toISOString();
};

const normalizeTimestampsInPlace = (doc: Record<string, unknown>) => {
  const ts = doc['@timestamp'];
  if (typeof ts !== 'string') return;
  const baseMs = Date.parse(ts);
  if (!Number.isFinite(baseMs)) return;

  // Normalize to a consistent relationship:
  // - event.created matches @timestamp
  // - event.ingested is 1s after @timestamp
  setNested(doc, ['event', 'created'], new Date(baseMs).toISOString());
  setNested(doc, ['event', 'ingested'], new Date(baseMs + 1000).toISOString());
};

const shiftTimeFieldsInPlace = (doc: Record<string, unknown>, deltaMs: number) => {
  const topLevel = ['@timestamp'];
  const nested = [
    ['event', 'created'],
    ['event', 'ingested'],
    ['event', 'start'],
    ['event', 'end'],
  ];

  for (const k of topLevel) {
    const v = doc[k];
    if (typeof v === 'string') doc[k] = shiftIso(v, deltaMs);
  }

  for (const p of nested) {
    const v = getNested(doc, p);
    if (typeof v === 'string') setNested(doc, p, shiftIso(v, deltaMs));
  }

  normalizeTimestampsInPlace(doc);
};

const rewriteEntityIdsInPlace = (doc: Record<string, unknown>, cloneKey: string) => {
  const replacements = new Map<string, string>();

  const rewrite = (value: unknown): unknown => {
    if (typeof value !== 'string') return value;
    if (value.length < 8) return value;
    if (replacements.has(value)) return replacements.get(value);
    // Heuristic: rewrite looks-like-IDs used in endpoint docs (base64-ish, uuid-ish, hex-ish)
    if (!/[A-Za-z0-9+/=_-]{8,}/.test(value)) return value;
    const next = `${cloneKey}:${hash(value)}`;
    replacements.set(value, next);
    return next;
  };

  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(walk);
    if (!node || typeof node !== 'object') return rewrite(node);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const o: any = node;
    for (const k of Object.keys(o)) {
      const v = o[k];
      // Keep this intentionally narrow: avoid rewriting generic `id` fields which are common across ECS
      // and may represent stable identifiers that should not be mutated.
      if (k === 'entity_id' || k === 'ancestry') {
        o[k] = walk(v);
      } else if (typeof v === 'object') {
        o[k] = walk(v);
      }
    }
    return o;
  };

  walk(doc);
};

const setHostAndUserInPlace = ({
  doc,
  hostName,
  userName,
  hostId,
  agentId,
}: {
  doc: Record<string, unknown>;
  hostName: string;
  userName: string;
  hostId: string;
  agentId: string;
}) => {
  // Host
  setNested(doc, ['host', 'name'], hostName);
  setNested(doc, ['host', 'hostname'], hostName);
  setNested(doc, ['host', 'id'], hostId);

  // Agent
  setNested(doc, ['agent', 'id'], agentId);
  setNested(doc, ['elastic', 'agent', 'id'], agentId);
  setNested(doc, ['user', 'name'], userName);
};

const normalizeMockNameToken = (value: string): string => {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'unknown';
};

const deterministicIntFromHash = (input: string): number => {
  const h = hash(input).slice(0, 8);
  const n = Number.parseInt(h, 16);
  return Number.isFinite(n) ? n : 0;
};

const buildDeterministicMockName = ({
  kind,
  seed,
  index,
  existing,
}: {
  kind: 'host' | 'user';
  seed: string;
  index: number;
  existing: Set<string>;
}): string => {
  // Avoid consuming faker's global RNG state in an order-dependent way by seeding per name.
  for (let attempt = 0; attempt < 25; attempt++) {
    const attemptSeed = `${seed}:${kind}:${index}:${attempt}`;
    faker.seed(deterministicIntFromHash(attemptSeed));

    const token =
      kind === 'user'
        ? normalizeMockNameToken(faker.person.fullName())
        : normalizeMockNameToken(faker.word.noun());

    // Suffix format requested: 1..99, deterministic per (seed, kind, index, attempt)
    const suffix = (deterministicIntFromHash(`${attemptSeed}:suffix`) % 99) + 1;
    const name = `${token}-${suffix}`;

    if (!existing.has(name)) {
      existing.add(name);
      return name;
    }
  }

  // Deterministic fallback in the extremely unlikely case we can't find a unique name quickly.
  const fallback = `${kind}-${index + 1}`;
  existing.add(fallback);
  return fallback;
};

const generateHostPool = ({ count, seed }: { count: number; seed: string }): string[] => {
  const existing = new Set<string>();
  return Array.from({ length: count }, (_, i) =>
    buildDeterministicMockName({ kind: 'host', seed, index: i, existing })
  );
};

const generateUserPool = ({ count, seed }: { count: number; seed: string }): string[] => {
  const existing = new Set<string>();
  return Array.from({ length: count }, (_, i) =>
    buildDeterministicMockName({ kind: 'user', seed, index: i, existing })
  );
};

export async function* scaleEpisodes(
  episodes: EpisodeDocs[],
  opts: ScaleEpisodesOptions
): AsyncGenerator<ScaledDoc> {
  const rangeMs = opts.endMs - opts.startMs;
  if (rangeMs <= 0) throw new Error('Invalid time range: end must be after start');

  const seed = opts.seed ?? 'seed';
  const hosts = generateHostPool({ count: opts.hostCount, seed });
  const users = generateUserPool({ count: opts.userCount, seed });

  const riskyHostCount = Math.min(Math.max(opts.riskyHostCount ?? 2, 0), hosts.length);
  const riskyUserCount = Math.min(Math.max(opts.riskyUserCount ?? 2, 0), users.length);
  const riskyProbability = Math.min(Math.max(opts.riskyProbability ?? 0.7, 0), 1);

  const riskyHosts = hosts.slice(0, riskyHostCount);
  const riskyUsers = users.slice(0, riskyUserCount);
  const nonRiskyHosts = hosts.slice(riskyHostCount);
  const nonRiskyUsers = users.slice(riskyUserCount);

  const baseDocs: Array<{
    episodeId: string;
    kind: ScaledDoc['kind'];
    doc: Record<string, unknown>;
  }> = [];
  for (const ep of episodes) {
    for (const d of ep.dataDocs) baseDocs.push({ episodeId: ep.episodeId, kind: 'data', doc: d });
    for (const a of ep.alertDocs)
      baseDocs.push({ episodeId: ep.episodeId, kind: 'endpoint_alert', doc: a });
  }

  // We scale based on data docs only (source events). Alerts are carried alongside each episode clone.
  const baseDataDocs = episodes.flatMap((e) =>
    e.dataDocs.map((d) => ({ episodeId: e.episodeId, doc: d }))
  );
  const baseDataCount = baseDataDocs.length;
  if (baseDataCount === 0) throw new Error('No episode data docs found');

  // Ensure we actually exercise the requested host/user pools even when targetEvents is small
  // relative to the available base dataset.
  const minCloneCount = Math.min(
    opts.targetEvents,
    Math.max(1, Math.max(opts.hostCount, opts.userCount))
  );
  const cloneCount = Math.max(minCloneCount, Math.ceil(opts.targetEvents / baseDataCount));
  const perCloneTargetEvents = Math.max(1, Math.ceil(opts.targetEvents / cloneCount));

  let producedDataDocs = 0;

  for (let cloneIdx = 0; cloneIdx < cloneCount; cloneIdx++) {
    const cloneKey = `clone:${cloneIdx}:${hash(seed)}`;

    const riskRoll = hashToUnitFloat(`${cloneKey}:risk`);
    const isRisky = riskyHosts.length > 0 && riskyUsers.length > 0 && riskRoll < riskyProbability;

    const pickFrom = (pool: string[], salt: string, fallback: string[]): string => {
      const effective = pool.length > 0 ? pool : fallback;
      const idx =
        Math.floor(hashToUnitFloat(`${cloneKey}:${salt}`) * effective.length) % effective.length;
      return effective[idx];
    };

    const hostName = isRisky
      ? pickFrom(riskyHosts, 'host', hosts)
      : pickFrom(nonRiskyHosts, 'host', hosts);
    const userName = isRisky
      ? pickFrom(riskyUsers, 'user', users)
      : pickFrom(nonRiskyUsers, 'user', users);

    const hostId = `host-${hash(`${cloneKey}:${hostName}`)}`;
    const agentId = `agent-${hash(`${cloneKey}:${hostName}:${userName}`)}`;

    // Place the episode clone in the time window. We spread clones evenly across the range.
    const anchor = opts.startMs + Math.floor((rangeMs * cloneIdx) / cloneCount);

    let producedThisClone = 0;

    // Rotate episode order per clone so we don't always take from the first episode(s).
    for (let i = 0; i < episodes.length; i++) {
      const ep = episodes[(cloneIdx + i) % episodes.length];
      const episodeDurationMs = ep.maxTimestampMs - ep.minTimestampMs;
      const latestAllowedStart = Math.max(opts.startMs, opts.endMs - episodeDurationMs - 1);
      const targetStart = Math.min(anchor, latestAllowedStart);
      const deltaMs = targetStart - ep.minTimestampMs;

      for (const doc of ep.dataDocs) {
        if (producedDataDocs >= opts.targetEvents) break;
        if (producedThisClone >= perCloneTargetEvents) break;

        const cloned: Record<string, unknown> = structuredClone(doc);
        shiftTimeFieldsInPlace(cloned, deltaMs);
        setHostAndUserInPlace({ doc: cloned, hostName, userName, hostId, agentId });
        rewriteEntityIdsInPlace(cloned, `${cloneKey}:${ep.episodeId}`);
        producedDataDocs++;
        producedThisClone++;
        yield { doc: cloned, kind: 'data', episodeId: ep.episodeId };
      }

      for (const doc of ep.alertDocs) {
        const cloned: Record<string, unknown> = structuredClone(doc);
        shiftTimeFieldsInPlace(cloned, deltaMs);
        setHostAndUserInPlace({ doc: cloned, hostName, userName, hostId, agentId });
        rewriteEntityIdsInPlace(cloned, `${cloneKey}:${ep.episodeId}`);
        yield { doc: cloned, kind: 'endpoint_alert', episodeId: ep.episodeId };

        // Also write a copy into insights-alerts-* (Insights rule sources from there)
        const insightsCopy: Record<string, unknown> = structuredClone(cloned);
        yield { doc: insightsCopy, kind: 'insights_alert', episodeId: ep.episodeId };
      }

      if (producedDataDocs >= opts.targetEvents || producedThisClone >= perCloneTargetEvents) {
        break;
      }
    }
  }
}
