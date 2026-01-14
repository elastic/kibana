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

export interface EpisodeFileSet {
  episodeId: string; // e.g. ep1
  dataPath: string;
  alertsPath: string;
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
    if (!cur || typeof cur !== 'object') return undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cur = (cur as any)[key];
  }
  return cur;
};

const setNested = (obj: Record<string, unknown>, path: string[], value: unknown) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cur: any = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (cur[key] == null || typeof cur[key] !== 'object') cur[key] = {};
    cur = cur[key];
  }
  cur[path[path.length - 1]] = value;
};

export const readNdjson = async (filePath: string): Promise<Array<Record<string, unknown>>> => {
  const fileStream = fs.createReadStream(filePath);
  const out = new PassThrough();
  const docs: Array<Record<string, unknown>> = [];

  const rl = createInterface({ input: out, crlfDelay: Infinity });
  const reader = (async () => {
    for await (const line of rl) {
      if (line) {
        docs.push(JSON.parse(line) as Record<string, unknown>);
      }
    }
  })();

  if (filePath.endsWith('.gz')) {
    const gunzip = createGunzip();
    await pipeline(fileStream, gunzip, out);
  } else {
    await pipeline(fileStream, out);
  }
  await reader;

  return docs;
};

export const loadEpisode = async (files: EpisodeFileSet): Promise<EpisodeDocs> => {
  const dataDocs = await readNdjson(files.dataPath);
  const alertDocs = await readNdjson(files.alertsPath);

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

  // User (best effort)
  setNested(doc, ['user', 'name'], userName);
};

const generatePool = (prefix: string, count: number): string[] =>
  Array.from({ length: count }, (_, i) => `${prefix}${String(i + 1).padStart(3, '0')}`);

export async function* scaleEpisodes(
  episodes: EpisodeDocs[],
  opts: ScaleEpisodesOptions
): AsyncGenerator<ScaledDoc> {
  const rangeMs = opts.endMs - opts.startMs;
  if (rangeMs <= 0) throw new Error('Invalid time range: end must be after start');

  const hosts = generatePool('host-', opts.hostCount);
  const users = generatePool('user-', opts.userCount);

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
    const seed = opts.seed ?? 'seed';
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

        const cloned = structuredClone(doc) as Record<string, unknown>;
        shiftTimeFieldsInPlace(cloned, deltaMs);
        setHostAndUserInPlace({ doc: cloned, hostName, userName, hostId, agentId });
        rewriteEntityIdsInPlace(cloned, `${cloneKey}:${ep.episodeId}`);
        producedDataDocs++;
        producedThisClone++;
        yield { doc: cloned, kind: 'data', episodeId: ep.episodeId };
      }

      for (const doc of ep.alertDocs) {
        const cloned = structuredClone(doc) as Record<string, unknown>;
        shiftTimeFieldsInPlace(cloned, deltaMs);
        setHostAndUserInPlace({ doc: cloned, hostName, userName, hostId, agentId });
        rewriteEntityIdsInPlace(cloned, `${cloneKey}:${ep.episodeId}`);
        yield { doc: cloned, kind: 'endpoint_alert', episodeId: ep.episodeId };

        // Also write a copy into insights-alerts-* (Insights rule sources from there)
        const insightsCopy = structuredClone(cloned) as Record<string, unknown>;
        yield { doc: insightsCopy, kind: 'insights_alert', episodeId: ep.episodeId };
      }

      if (producedDataDocs >= opts.targetEvents || producedThisClone >= perCloneTargetEvents) {
        break;
      }
    }
  }
}
