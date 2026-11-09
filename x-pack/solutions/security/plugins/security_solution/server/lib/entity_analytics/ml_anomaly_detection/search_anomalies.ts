/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { KibanaRequest, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { Entity, EntityType } from '@kbn/entity-store/common';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import { buildEntitiesFilter, getMatchedEntityId } from './build_entities_filter';
import { ENTITY_ANOMALY_DEFAULT_LOOKBACK } from '../../../../common/constants';
import type { AnomalyScoreRange } from '../../../../common/api/entity_analytics';
import { getSecurityMlJobIds } from './get_security_ml_job_ids';
import type { AnomalyHit, RawAnomalyRecord } from './types';
import { getIdentityFieldsByEntityId, resolveRecordFields } from './resolve_record_fields';
import type { EntityIdentityFields } from './resolve_record_fields';

// A missing/empty selection means "no severity filter", which defaults to the
// standard threshold of 1 rather than truly unbounded (record_score 0 anomalies are noise).
export const buildScoreRangeFilter = (
  scoreRanges?: AnomalyScoreRange[]
): QueryDslQueryContainer => {
  if (!scoreRanges || scoreRanges.length === 0) {
    return { range: { record_score: { gte: 1 } } };
  }

  return {
    bool: {
      should: scoreRanges.map(({ min_score: min, max_score: max }) => ({
        range: {
          record_score: { gte: Math.max(min, 1), ...(max !== undefined ? { lt: max } : {}) },
        },
      })),
      minimum_should_match: 1,
    },
  };
};

interface RequiredHit {
  _id: string;
  _source: RawAnomalyRecord;
}

const mapToAnomalyHit = (
  hit: RequiredHit,
  entityId: string,
  identityFields?: EntityIdentityFields
): AnomalyHit => {
  const { _id: id, _source: src } = hit;
  const { actual, typical, detectorFunction, ...dimensions } = resolveRecordFields(
    src,
    identityFields
  );
  return {
    _id: id,
    entityId,
    jobId: src.job_id,
    detectorIndex: src.detector_index,
    detectorFunction: detectorFunction ?? '',
    timestamp: src.timestamp,
    recordScore: src.record_score,
    ...(actual !== undefined && { actual }),
    ...(typical !== undefined && { typical }),
    ...dimensions,
  };
};

export interface EntityAnomalies {
  [jobId: string]: AnomalyHit[];
}

export type AnomalySortField = 'timestamp' | 'record_score' | 'job_id';
export type AnomalySortOrder = 'asc' | 'desc';

const ANOMALY_SORT_FIELD_MAP: Record<AnomalySortField, string> = {
  timestamp: 'timestamp',
  record_score: 'record_score',
  job_id: 'job_id',
};

const DEFAULT_SORT_SPEC: Array<{ field: AnomalySortField; order: AnomalySortOrder }> = [
  { field: 'timestamp', order: 'desc' },
];

export interface SearchEntityAnomaliesOpts {
  entityType: EntityType;
  entityIds: string[];
  entityRecords: Entity[];
  fromMs?: number;
  toMs?: number;
  scoreRanges?: AnomalyScoreRange[];
  jobIds?: string[];
  sort?: Array<{ field: AnomalySortField; order: AnomalySortOrder }>;
  from?: number;
  size?: number;
  logger: Logger;
  ml: MlPluginSetup;
  request: KibanaRequest;
  securityJobIds?: string[];
  soClient: SavedObjectsClientContract;
}

export interface SearchEntityAnomaliesResult {
  hits: AnomalyHit[];
  total: number;
}

export const searchEntityAnomalies = async ({
  entityType,
  entityIds,
  entityRecords,
  fromMs,
  toMs,
  scoreRanges,
  jobIds: filterJobIds,
  sort = DEFAULT_SORT_SPEC,
  from = 0,
  size = 100,
  logger,
  ml,
  request,
  securityJobIds,
  soClient,
}: SearchEntityAnomaliesOpts): Promise<SearchEntityAnomaliesResult> => {
  const mlSystem = ml.mlSystemProvider(request, soClient);
  const jobIds = securityJobIds ?? (await getSecurityMlJobIds({ ml, request, soClient }));

  const empty: SearchEntityAnomaliesResult = { hits: [], total: 0 };

  if (jobIds.length === 0) return empty;

  // Intersect the caller-supplied job filter with the known security job IDs.
  const effectiveJobIds = filterJobIds?.length
    ? jobIds.filter((id) => filterJobIds.includes(id))
    : jobIds;

  if (effectiveJobIds.length === 0) return empty;

  const entityFilter = buildEntitiesFilter(entityType, entityRecords);
  if (!entityFilter) {
    logger.warn(
      `Cannot build entity filter for "${entityIds.join(
        ', '
      )}" (type: ${entityType}): entity records lack identity fields`
    );
    return empty;
  }

  try {
    const resp = await mlSystem.mlAnomalySearch<RawAnomalyRecord>(
      {
        from,
        size,
        track_total_hits: true,
        query: {
          bool: {
            filter: [
              { term: { result_type: 'record' } },
              { term: { is_interim: false } },
              { exists: { field: 'detector_index' } },
              buildScoreRangeFilter(scoreRanges),
              {
                range: {
                  timestamp: {
                    gte: fromMs ?? `now-${ENTITY_ANOMALY_DEFAULT_LOOKBACK}`,
                    ...(toMs !== undefined ? { lte: toMs } : {}),
                  },
                },
              },
              entityFilter,
              { terms: { job_id: effectiveJobIds } },
            ],
          },
        },
        sort: sort.map(({ field, order }) => ({ [ANOMALY_SORT_FIELD_MAP[field]]: { order } })),
      },
      []
    );

    const rawTotal = resp.hits.total;
    const total = rawTotal == null ? 0 : typeof rawTotal === 'number' ? rawTotal : rawTotal.value;

    // Every record the query counted in `total` is returned; the guard only narrows the client's
    // optional `_id` / `_source` typing, which search hits always carry.
    const identityFieldsByEntityId = getIdentityFieldsByEntityId(entityType, entityRecords);
    const hits = resp.hits.hits
      .filter((hit): hit is typeof hit & RequiredHit => hit._id != null && hit._source != null)
      .map((hit) => {
        const entityId = getMatchedEntityId(hit.matched_queries, entityIds) ?? entityIds[0];
        return mapToAnomalyHit(hit, entityId, identityFieldsByEntityId.get(entityId));
      });

    return { hits, total };
  } catch (error) {
    logger.warn(
      `Error searching anomalies for entity "${entityIds.join(', ')}" (type: ${entityType}): ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return empty;
  }
};
