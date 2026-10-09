/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import type { EntityType } from '@kbn/entity-store/common';
import { euid } from '@kbn/entity-store/common/euid_helpers';
import type { LeadEntity } from '../../types';
import { errorMessage, groupEntitiesByType } from '../utils';
import { getSecurityMlJobIds } from '../../../ml_anomaly_detection/get_security_ml_job_ids';
import type { RawAnomalyRecord } from '../../../ml_anomaly_detection/types';
import {
  ANOMALY_ENTITY_TYPES,
  ANOMALY_LOOKBACK,
  ENTITY_BUCKET_LIMIT,
  MIN_RECORD_SCORE,
  MODULE_ID,
  TOP_ANOMALIES_PER_ENTITY,
  type AnomalyDetail,
  type EntityAnomalySummary,
} from './config';

interface FetchAnomalySummariesDeps {
  readonly ml: MlPluginSetup;
  readonly request: KibanaRequest;
  readonly soClient: SavedObjectsClientContract;
  readonly entities: readonly LeadEntity[];
  readonly logger: Logger;
}

interface AnomalyEntityBucket {
  key: string;
  doc_count: number;
  max_score?: { value: number | null };
  top: { hits: { hits: Array<{ _source?: RawAnomalyRecord }> } };
}

const isSupportedType = (type: string): type is EntityType =>
  (ANOMALY_ENTITY_TYPES as readonly string[]).includes(type);

const toAnomalyDetail = (src: RawAnomalyRecord): AnomalyDetail => ({
  jobId: src.job_id,
  detectorFunction: src.function ?? '',
  recordScore: src.record_score,
  timestamp: src.timestamp,
  fieldName: src.field_name,
  byFieldName: src.by_field_name,
  byFieldValue: src.by_field_value,
  partitionFieldName: src.partition_field_name,
  partitionFieldValue: src.partition_field_value,
  actual: src.actual?.[0],
  typical: src.typical?.[0],
});

/**
 * Fetches high-scoring ML anomaly records for a batch of entities in a single
 * search per entity type. Entities are matched by a computed EUID runtime field
 * (`entity_id`) so results join to the Entity Store identity, not a raw name.
 * Returns a map keyed by EUID; entities without anomalies are absent.
 */
export const fetchAnomalySummariesForEntities = async ({
  ml,
  request,
  soClient,
  entities,
  logger,
}: FetchAnomalySummariesDeps): Promise<Map<string, EntityAnomalySummary>> => {
  const result = new Map<string, EntityAnomalySummary>();

  const jobIds = await getSecurityMlJobIds({ ml, request, soClient });
  if (jobIds.length === 0) {
    logger.debug(`[${MODULE_ID}] No security ML jobs found — skipping anomaly collection`);
    return result;
  }

  const mlSystem = ml.mlSystemProvider(request, soClient);

  const typedGroups = [...groupEntitiesByType([...entities]).entries()].filter(
    (entry): entry is [EntityType, LeadEntity[]] => isSupportedType(entry[0]) && entry[1].length > 0
  );

  for (const [entityType, group] of typedGroups) {
    const euids = group.map((e) => e.id);
    try {
      const buckets = await searchAnomalyBucketsForType({
        mlSystem,
        entityType,
        euids,
        jobIds,
      });
      for (const [key, summary] of buckets) {
        result.set(key, summary);
      }
    } catch (error) {
      logger.warn(
        `[${MODULE_ID}] Failed to fetch anomalies for ${entityType}: ${errorMessage(error)}`
      );
    }
  }

  return result;
};

interface SearchAnomalyBucketsDeps {
  readonly mlSystem: ReturnType<MlPluginSetup['mlSystemProvider']>;
  readonly entityType: EntityType;
  readonly euids: string[];
  readonly jobIds: string[];
}

/** Runs a single batched anomaly aggregation for one entity type. */
const searchAnomalyBucketsForType = async ({
  mlSystem,
  entityType,
  euids,
  jobIds,
}: SearchAnomalyBucketsDeps): Promise<Array<[string, EntityAnomalySummary]>> => {
  const response = await mlSystem.mlAnomalySearch<RawAnomalyRecord>(
    {
      size: 0,
      track_total_hits: false,
      runtime_mappings: {
        entity_id: euid.painless.getEuidRuntimeMapping(entityType),
      },
      query: {
        bool: {
          filter: [
            { term: { result_type: 'record' } },
            { term: { is_interim: false } },
            { range: { record_score: { gte: MIN_RECORD_SCORE } } },
            { range: { timestamp: { gte: ANOMALY_LOOKBACK } } },
            { terms: { entity_id: euids } },
            { terms: { job_id: jobIds } },
          ],
        },
      },
      aggs: {
        by_entity: {
          terms: {
            field: 'entity_id',
            size: Math.min(euids.length, ENTITY_BUCKET_LIMIT),
          },
          aggs: {
            max_score: { max: { field: 'record_score' } },
            top: {
              top_hits: {
                size: TOP_ANOMALIES_PER_ENTITY,
                sort: [{ record_score: { order: 'desc' as const } }],
                _source: [
                  'job_id',
                  'function',
                  'record_score',
                  'timestamp',
                  'field_name',
                  'by_field_name',
                  'by_field_value',
                  'partition_field_name',
                  'partition_field_value',
                  'actual',
                  'typical',
                ],
              },
            },
          },
        },
      },
    },
    []
  );

  const buckets = ((
    response.aggregations?.by_entity as { buckets?: AnomalyEntityBucket[] } | undefined
  )?.buckets ?? []) as AnomalyEntityBucket[];

  return buckets.flatMap((bucket): Array<[string, EntityAnomalySummary]> => {
    const topAnomalies = bucket.top.hits.hits
      .map((hit) => hit._source)
      .filter((src): src is RawAnomalyRecord => src != null)
      .map(toAnomalyDetail);

    if (topAnomalies.length === 0) return [];

    return [
      [
        bucket.key,
        {
          maxRecordScore: bucket.max_score?.value ?? topAnomalies[0].recordScore,
          // Full-bucket total of qualifying anomaly records, not the capped
          // top-hits detail list — keeps scope consistent with maxRecordScore.
          anomalyCount: bucket.doc_count,
          topAnomalies,
        },
      ],
    ];
  });
};
