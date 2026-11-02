/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type {
  HuntAvailability,
  HuntAvailabilityFailure,
  HuntAvailabilityIdentity,
} from '../../common/hunt_library';
import { isIndexExclusion } from '../../common/remote_cluster';
import { statusCodeOf } from '../lib/es_error';
import { unresolvedPatterns } from '../services/watches/hunt/common/resolve_index_scope';
import { patternCovers } from '../services/watches/hunt/common/role_pattern_coverage';
import type { HuntDefinition } from './hunt_definition';

export const PROBE_TIMEOUT_MS = 5000;
const MAX_DETAILS = 20;
const MAX_DETAIL_LENGTH = 200;

/** Field types that ES|QL treats as one searchable keyword family, so a mix is not a conflict. */
const KEYWORD_FAMILY = new Set(['keyword', 'constant_keyword', 'wildcard']);
const normalizeType = (type: string): string => (KEYWORD_FAMILY.has(type) ? 'keyword' : type);

const cap = (details: string[]): string[] =>
  details.slice(0, MAX_DETAILS).map((detail) => detail.slice(0, MAX_DETAIL_LENGTH));

/** The required patterns no pattern of the identity's scope covers. Exclusions never grant scope. */
export const uncoveredByScope = (scopePatterns: string[], required: string[]): string[] => {
  const granted = scopePatterns.filter((pattern) => !isIndexExclusion(pattern));
  return required.filter((pattern) => !granted.some((scope) => patternCovers(scope, pattern)));
};

interface ScopeCheckResult {
  /** Patterns outside the scope, or marker details when scope could not be determined. */
  details: string[];
}

export interface CheckHuntAvailabilityParams {
  /** Runs the index, mapping and probe checks; always the caller's client. */
  esClient: ElasticsearchClient;
  definition: HuntDefinition;
  identity: HuntAvailabilityIdentity;
  /** Returns what falls outside the identity's scope; empty when everything is inside. */
  checkScope: (requiredPatterns: string[]) => ScopeCheckResult | Promise<ScopeCheckResult>;
  /** The worker cannot be probed as itself from a caller request, so it is not probed. */
  probe: boolean;
  logger: Logger;
}

const checkIndices = async (
  esClient: ElasticsearchClient,
  patterns: string[]
): Promise<HuntAvailabilityFailure | undefined> => {
  try {
    const resolved = await esClient.indices.resolveIndex({
      name: patterns,
      allow_no_indices: true,
      expand_wildcards: ['open'],
    });
    // The patterns are the alternative sources of one query's FROM clause, so a hunt can run when
    // any of them resolves; it is unavailable only when none does.
    const missing = unresolvedPatterns(patterns, resolved);
    return missing.length === patterns.length
      ? { reason: 'unavailable_index', details: cap(missing) }
      : undefined;
  } catch (err) {
    return statusCodeOf(err) === 403
      ? { reason: 'unavailable_scope', details: cap(patterns) }
      : { reason: 'unavailable_index', details: ['resolve_failed'] };
  }
};

const checkMappings = async (
  esClient: ElasticsearchClient,
  patterns: string[],
  fields: string[]
): Promise<HuntAvailabilityFailure | undefined> => {
  let response;
  try {
    response = await esClient.fieldCaps({
      index: patterns,
      fields,
      allow_no_indices: true,
      ignore_unavailable: true,
      expand_wildcards: ['open'],
    });
  } catch {
    return { reason: 'unavailable_mapping', details: ['field_caps_failed'] };
  }

  const details: string[] = [];
  for (const field of fields) {
    const byType = response.fields[field];
    const types = byType ? Object.keys(byType).filter((type) => type !== 'unmapped') : [];
    if (types.length === 0) {
      details.push(`missing:${field}`);
      continue;
    }
    if (types.includes('nested')) {
      details.push(`nested:${field}`);
      continue;
    }
    if (new Set(types.map(normalizeType)).size > 1) {
      details.push(`conflict:${field}`);
      continue;
    }
    if (types.every((type) => byType[type].searchable === false)) {
      details.push(`unsearchable:${field}`);
    }
  }
  return details.length > 0 ? { reason: 'unavailable_mapping', details: cap(details) } : undefined;
};

const probeQuery = async (
  esClient: ElasticsearchClient,
  definition: HuntDefinition
): Promise<HuntAvailabilityFailure | undefined> => {
  const { query, defaultTimeRange } = definition.query;
  const run = (limit: number) =>
    esClient.esql.query(
      {
        query: `${query}\n| LIMIT ${limit}`,
        format: 'json',
        filter: {
          range: { '@timestamp': { gte: defaultTimeRange.from, lte: defaultTimeRange.to } },
        },
      },
      { requestTimeout: PROBE_TIMEOUT_MS }
    );
  try {
    try {
      await run(0);
    } catch (err) {
      // `LIMIT 0` is not accepted everywhere; a one-row probe is the documented fallback.
      if (statusCodeOf(err) !== 400) throw err;
      await run(1);
    }
    return undefined;
  } catch (err) {
    const name = (err as { name?: string })?.name;
    if (name === 'TimeoutError') return { reason: 'probe_failed', details: ['probe_timeout'] };
    const reason = (err as { message?: string })?.message ?? 'probe_error';
    return { reason: 'probe_failed', details: cap([reason.split('\n')[0]]) };
  }
};

/**
 * Whether a hunt is runnable for one identity. Checks run in the order the catalog badge reports
 * them (scope, index match, field mapping, probe); a hunt with nothing to match skips the checks
 * that would only repeat the failure, and the failures that did run are all kept for the flyout.
 */
export const checkHuntAvailability = async ({
  esClient,
  definition,
  identity,
  checkScope,
  probe,
  logger,
}: CheckHuntAvailabilityParams): Promise<HuntAvailability> => {
  const { requiredIndexPatterns, requiredFields } = definition.query;
  const failures: HuntAvailabilityFailure[] = [];

  const scope = await checkScope(requiredIndexPatterns);
  if (scope.details.length > 0) {
    failures.push({ reason: 'unavailable_scope', details: cap(scope.details) });
  }

  let probeState: HuntAvailability['probe'] = 'skipped';
  if (failures.length === 0) {
    const indexFailure = await checkIndices(esClient, requiredIndexPatterns);
    if (indexFailure) {
      failures.push(indexFailure);
    } else {
      const mappingFailure = await checkMappings(esClient, requiredIndexPatterns, requiredFields);
      if (mappingFailure) {
        failures.push(mappingFailure);
      } else if (probe) {
        const probeFailure = await probeQuery(esClient, definition);
        probeState = probeFailure ? 'failed' : 'passed';
        if (probeFailure) failures.push(probeFailure);
      }
    }
  }

  logger.debug(
    `Hunt ${definition.id} v${definition.version} availability for ${identity}: ${
      failures.length === 0 ? 'available' : failures.map(({ reason }) => reason).join(',')
    }`
  );
  return {
    identity,
    available: failures.length === 0,
    firstFailure: failures[0]?.reason ?? null,
    failures,
    probe: probeState,
  };
};

interface CacheEntry {
  expiresAt: number;
  value: Promise<HuntAvailability>;
}

/**
 * Per-process 60 second cache for availability results, which also shares one in-flight check
 * between concurrent callers. The key carries the user for the caller identity so one analyst's
 * permissions never answer for another's.
 */
export class HuntAvailabilityCache {
  private readonly entries = new Map<string, CacheEntry>();

  constructor(
    private readonly ttlMs = 60_000,
    private readonly maxEntries = 500,
    private readonly now: () => number = Date.now
  ) {}

  get(key: string, compute: () => Promise<HuntAvailability>): Promise<HuntAvailability> {
    const current = this.now();
    const hit = this.entries.get(key);
    if (hit && hit.expiresAt > current) return hit.value;

    this.prune(current);
    const value = compute();
    this.entries.set(key, { expiresAt: current + this.ttlMs, value });
    // A throw must not be remembered for a minute.
    value.catch(() => this.entries.delete(key));
    return value;
  }

  private prune(current: number): void {
    if (this.entries.size < this.maxEntries) return;
    for (const [key, { expiresAt }] of this.entries) {
      if (expiresAt <= current) this.entries.delete(key);
    }
    if (this.entries.size >= this.maxEntries) this.entries.clear();
  }
}

export const buildAvailabilityCacheKey = ({
  spaceId,
  definition,
  identity,
  userKey,
}: {
  spaceId: string;
  definition: Pick<HuntDefinition, 'id' | 'version'>;
  identity: HuntAvailabilityIdentity;
  userKey?: string;
}): string =>
  [spaceId, definition.id, definition.version, identity, identity === 'caller' ? userKey : '']
    .map(String)
    .join('|');
