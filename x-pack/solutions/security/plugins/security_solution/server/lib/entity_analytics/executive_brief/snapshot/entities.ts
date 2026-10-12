/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';
import { euid } from '@kbn/entity-store/common/euid_helpers';
import { CDR_VULNERABILITIES_INDEX_PATTERN } from '@kbn/cloud-security-posture-common';
import type {
  BriefEntity,
  BriefTimeRange,
  TimePoint,
} from '../../../../../common/entity_analytics/executive_brief/types';
import { getRiskScoreTimeSeriesIndex } from '../../../../../common/entity_analytics/risk_engine/indices';
import { ResolutionIndex } from '../storylines/expand';
import { PRIVILEGED_USERS_LABEL } from '../storylines/entity_docs';
import type { EntityDoc } from '../storylines/entity_docs';
import { asBucketArray } from '../storylines/alert_queries';
import { classifyError, errorMessage } from '../storylines/source';
import type { SnapshotContext, SnapshotSources } from './context';

const RISK_TYPES = ['host', 'user', 'service'] as const;
const CRITICALITY_RANK: Record<string, number> = {
  low_impact: 1,
  medium_impact: 2,
  high_impact: 3,
  extreme_impact: 4,
};
const VULNERABILITY_ENTITY_FIELD = 'entity_id';

const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

// ---------------------------------------------------------------------------------------------
// Risk history (daily max)
// ---------------------------------------------------------------------------------------------

interface DayBucket {
  key_as_string?: string;
  key: number;
  score?: { value?: number | null };
}
interface RiskEntityBucket {
  key: string;
  days?: { buckets?: DayBucket[] };
}

/**
 * Daily max of the normalised risk score per entity over the window, oldest first. One size:0
 * search with one terms aggregation per entity type; an unmapped type simply has no buckets.
 * Entities are matched by `<type>.risk.id_value` (golden euid; alias and golden series are not
 * merged, so a golden entity with a resolution score uses its own series).
 */
export const fetchRiskSeries = async ({
  esClient,
  spaceId,
  timeRange,
  euids,
  signal,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  timeRange: BriefTimeRange;
  euids: string[];
  signal?: AbortSignal;
}): Promise<Map<string, TimePoint[]>> => {
  const ids = [...new Set(euids)].sort(compare);
  const result = new Map<string, TimePoint[]>();
  if (ids.length === 0) {
    return result;
  }
  const aggs: Record<string, estypes.AggregationsAggregationContainer> = {};
  for (const type of RISK_TYPES) {
    aggs[type] = {
      terms: { field: `${type}.risk.id_value`, include: ids, size: ids.length },
      aggs: {
        days: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: '1d',
            time_zone: 'UTC',
            min_doc_count: 1,
          },
          aggs: { score: { max: { field: `${type}.risk.calculated_score_norm` } } },
        },
      },
    };
  }
  const response = await esClient.search<unknown>(
    {
      index: getRiskScoreTimeSeriesIndex(spaceId),
      size: 0,
      query: {
        bool: {
          filter: [
            { range: { '@timestamp': { gte: timeRange.from, lte: timeRange.to } } },
            {
              bool: {
                should: RISK_TYPES.map((type) => ({ terms: { [`${type}.risk.id_value`]: ids } })),
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
      aggs,
    },
    { signal }
  );
  const aggregations = (response.aggregations ?? {}) as Record<string, unknown>;
  for (const type of RISK_TYPES) {
    for (const bucket of asBucketArray<RiskEntityBucket>(aggregations[type])) {
      const points: TimePoint[] = (bucket.days?.buckets ?? []).flatMap((day) =>
        typeof day.score?.value === 'number'
          ? [
              {
                t: day.key_as_string ?? new Date(day.key).toISOString(),
                v: Math.round(day.score.value * 100) / 100,
              },
            ]
          : []
      );
      const merged = [...(result.get(String(bucket.key)) ?? []), ...points].sort((a, b) =>
        compare(a.t, b.t)
      );
      if (merged.length > 0) {
        result.set(String(bucket.key), merged);
      }
    }
  }
  return result;
};

// ---------------------------------------------------------------------------------------------
// Vulnerabilities (hosts, batched)
// ---------------------------------------------------------------------------------------------

interface SeverityBucket {
  key: string;
  doc_count: number;
}
interface HostVulnBucket {
  key: string;
  severity?: { buckets?: SeverityBucket[] };
}

/** Critical / high vulnerability counts per host euid, in one search over the CDR indices. */
export const fetchHostVulnerabilities = async ({
  esClient,
  hostEuids,
  signal,
}: {
  esClient: ElasticsearchClient;
  hostEuids: string[];
  signal?: AbortSignal;
}): Promise<Map<string, { critical: number; high: number }>> => {
  const ids = [...new Set(hostEuids)].sort(compare);
  const result = new Map<string, { critical: number; high: number }>();
  if (ids.length === 0) {
    return result;
  }
  const response = await esClient.search<unknown>(
    {
      index: CDR_VULNERABILITIES_INDEX_PATTERN,
      ignore_unavailable: true,
      allow_no_indices: true,
      size: 0,
      runtime_mappings: {
        [VULNERABILITY_ENTITY_FIELD]: euid.painless.getEuidRuntimeMapping('host'),
      },
      query: { terms: { [VULNERABILITY_ENTITY_FIELD]: ids } },
      aggs: {
        hosts: {
          terms: { field: VULNERABILITY_ENTITY_FIELD, size: ids.length },
          aggs: { severity: { terms: { field: 'vulnerability.severity', size: 10 } } },
        },
      },
    },
    { signal }
  );
  for (const bucket of asBucketArray<HostVulnBucket>(
    (response.aggregations as Record<string, unknown> | undefined)?.hosts
  )) {
    const count = (severity: string): number =>
      (bucket.severity?.buckets ?? [])
        .filter((entry) => String(entry.key).toUpperCase() === severity)
        .reduce((sum, entry) => sum + entry.doc_count, 0);
    result.set(String(bucket.key), { critical: count('CRITICAL'), high: count('HIGH') });
  }
  return result;
};

// ---------------------------------------------------------------------------------------------
// Brief entities
// ---------------------------------------------------------------------------------------------

const watchlistLabel = (id: string): string =>
  id.startsWith('privileged-user-monitoring-watchlist-id') ? PRIVILEGED_USERS_LABEL : id;

const pickCriticality = (docs: Array<EntityDoc | undefined>): string | undefined =>
  docs
    .flatMap((doc) => (doc?.criticality ? [doc.criticality] : []))
    .sort((a, b) => (CRITICALITY_RANK[b] ?? 0) - (CRITICALITY_RANK[a] ?? 0) || compare(a, b))[0];

/** Pure assembly of one golden entity from its group's docs (golden first). */
export const assembleBriefEntity = ({
  evidenceId,
  golden,
  goldenDoc,
  aliasDocs,
  aliases,
  name,
  type,
  vulnerabilities,
  riskTrend,
  isHub,
}: {
  evidenceId: `ENT-${string}`;
  golden: string;
  goldenDoc?: EntityDoc;
  aliasDocs: EntityDoc[];
  aliases: string[];
  name: string;
  type: BriefEntity['type'];
  vulnerabilities?: { critical: number; high: number };
  riskTrend?: TimePoint[];
  isHub?: boolean;
}): BriefEntity => {
  const group = [goldenDoc, ...aliasDocs];
  const watchlistIds = [...new Set(group.flatMap((doc) => doc?.watchlistIds ?? []))].sort(compare);
  const riskScoreNorm = goldenDoc?.resolutionRiskScoreNorm ?? goldenDoc?.riskScoreNorm;
  const riskLevel =
    goldenDoc?.resolutionRiskScoreNorm !== undefined
      ? goldenDoc.resolutionRiskLevel
      : goldenDoc?.riskLevel;
  return {
    evidenceId,
    euid: golden,
    type,
    name,
    ...(riskScoreNorm !== undefined ? { riskScoreNorm } : {}),
    ...(riskLevel !== undefined ? { riskLevel } : {}),
    ...(pickCriticality(group) ? { criticality: pickCriticality(group) } : {}),
    watchlists: [...new Set(watchlistIds.map(watchlistLabel))],
    isPrivileged: group.some((doc) => doc?.isPrivileged === true),
    aliases,
    ...(vulnerabilities ? { vulnerabilities } : {}),
    ...(riskTrend && riskTrend.length > 0 ? { riskTrend } : {}),
    ...(isHub ? { isHub: true } : {}),
  };
};

/**
 * Resolution-aware brief entities, keyed by golden euid, registered in the order the golden
 * entities first appear in `euids`. Entity docs are mandatory (errors propagate to the caller's
 * source status); vulnerabilities and risk history are enrichments whose failure is recorded in
 * `options.sources` and logged, leaving the field unset.
 */
export const fetchBriefEntities = async (
  ctx: SnapshotContext,
  euids: string[],
  options: { sources?: SnapshotSources; hubEuids?: string[] } = {}
): Promise<Record<string, BriefEntity>> => {
  const { esClient, spaceId, timeRange, abortSignal: signal } = ctx;
  const index = new ResolutionIndex(esClient, spaceId, signal);
  await index.ensure(euids);

  const goldens: string[] = [];
  for (const id of euids) {
    const golden = index.golden(id);
    if (!goldens.includes(golden)) {
      goldens.push(golden);
    }
  }
  if (goldens.length === 0) {
    return {};
  }

  const hostGoldens = goldens.filter((golden) => index.type(golden) === 'host');
  const enrich = async <T>(name: string, fn: () => Promise<T>, fallback: T): Promise<T> => {
    const start = Date.now();
    try {
      const value = await fn();
      if (options.sources) options.sources[name] = { status: 'ok', tookMs: Date.now() - start };
      return value;
    } catch (error) {
      ctx.logger.warn(`[ExecutiveBrief] ${name} failed: ${errorMessage(error)}`);
      if (options.sources) {
        options.sources[name] = {
          status: classifyError(error),
          tookMs: Date.now() - start,
          message: errorMessage(error),
        };
      }
      return fallback;
    }
  };
  const [series, vulnerabilities] = await Promise.all([
    enrich(
      'entities.riskTrend',
      () => fetchRiskSeries({ esClient, spaceId, timeRange, euids: goldens, signal }),
      new Map<string, TimePoint[]>()
    ),
    enrich(
      'entities.vulnerabilities',
      () => fetchHostVulnerabilities({ esClient, hostEuids: hostGoldens, signal }),
      new Map<string, { critical: number; high: number }>()
    ),
  ]);

  const hubs = new Set(options.hubEuids ?? []);
  const result: Record<string, BriefEntity> = {};
  for (const golden of goldens) {
    const aliases = index.aliasesOf(golden);
    result[golden] = assembleBriefEntity({
      evidenceId: ctx.registry.entity(golden),
      golden,
      goldenDoc: index.doc(golden),
      aliasDocs: aliases.flatMap((alias) => {
        const doc = index.doc(alias);
        return doc ? [doc] : [];
      }),
      aliases,
      name: index.name(golden),
      type: index.type(golden),
      vulnerabilities: vulnerabilities.get(golden),
      riskTrend: series.get(golden),
      isHub: hubs.has(golden),
    });
  }
  return result;
};
