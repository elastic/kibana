/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { EntityType } from '@kbn/entity-store/common';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import { euid } from '@kbn/entity-store/common/euid_helpers';
import { ANOMALY_SEARCH_PAGE_SIZE, MAX_ALLOWED_ITERS, ML_AD_LOOKBACK } from './constants';
import { getSecurityMlJobIds } from './get_security_ml_job_ids';
import type { AnomalyHit } from './types';

interface RawAnomalyRecord {
  _id?: string;
  timestamp: number;
  job_id: string;
  detector_index: number;
  function?: string;
  record_score: number;
  field_name?: string;
  by_field_name?: string;
  by_field_value?: string;
  over_field_name?: string;
  over_field_value?: string;
  partition_field_name?: string;
  partition_field_value?: string;
  actual?: number[];
  typical?: number[];
}

interface StreamAnomaliesForEntityBatchOpts {
  entityType: EntityType;
  entityIds: string[];
  logger: Logger;
  ml: MlPluginSetup;
  soClient: SavedObjectsClientContract;
}

export async function* streamAnomaliesForEntityBatch({
  entityType,
  entityIds,
  logger,
  ml,
  soClient,
}: StreamAnomaliesForEntityBatchOpts): AsyncGenerator<AnomalyHit[]> {
  if (entityIds.length === 0) return;

  const mlSystem = ml.mlSystemProvider({} as KibanaRequest, soClient);
  const jobIds = await getSecurityMlJobIds({ ml, soClient });
  let searchAfter: unknown[] | undefined;
  let iters = 0;

  do {
    if (iters++ > MAX_ALLOWED_ITERS) {
      logger.debug(
        `Maintainer run short-circuited during processing of entity type "${entityType}" - max iterations reached`
      );
      break;
    }
    try {
      const resp = await mlSystem.mlAnomalySearch<RawAnomalyRecord>(
        {
          size: ANOMALY_SEARCH_PAGE_SIZE,
          runtime_mappings: {
            entity_id: euid.painless.getEuidRuntimeMapping(entityType),
          },
          fields: ['entity_id'],
          query: {
            bool: {
              filter: [
                { term: { result_type: 'record' } },
                { terms: { entity_id: entityIds } },
                { term: { is_interim: false } },
                { range: { record_score: { gte: 1 } } },
                { range: { timestamp: { gte: `now-${ML_AD_LOOKBACK}` } } },
              ],
            },
          },
          sort: [{ timestamp: 'asc' }, { job_id: 'asc' }, { detector_index: 'asc' }],
          ...(searchAfter ? { search_after: searchAfter } : {}),
        },
        []
      );

      const hits = resp.hits.hits;
      const page = hits
        .filter(
          (hit): hit is typeof hit & { _source: Required<RawAnomalyRecord> } =>
            hit._id != null &&
            hit._source?.actual?.[0] != null &&
            hit._source?.typical?.[0] != null &&
            hit._source?.detector_index != null &&
            hit._source?.job_id != null &&
            jobIds.includes(hit._source.job_id) &&
            (hit.fields?.entity_id as string[] | undefined)?.[0] != null
        )
        .map((hit) => {
          const id = hit._id;
          const src = hit._source;
          const entityId = (hit.fields?.entity_id as string[] | undefined)?.[0];
          if (!id || !src || !entityId) return undefined;
          return {
            _id: id,
            entityId,
            jobId: src.job_id,
            detectorIndex: src.detector_index,
            detectorFunction: src.function ?? '',
            timestamp: src.timestamp,
            recordScore: src.record_score,
            actual: src.actual[0],
            typical: src.typical[0],
            fieldName: src.field_name,
            byFieldName: src.by_field_name,
            byFieldValue: src.by_field_value,
            overFieldName: src.over_field_name,
            overFieldValue: src.over_field_value,
            partitionFieldName: src.partition_field_name,
            partitionFieldValue: src.partition_field_value,
          };
        })
        .filter((hit) => hit != null);

      if (page.length > 0) {
        yield page;
      }

      if (hits.length < ANOMALY_SEARCH_PAGE_SIZE) break;
      searchAfter = hits[hits.length - 1].sort as unknown[];
    } catch (error) {
      logger.warn(
        `Error encountered searching for anomalies for entity type "${entityType}": ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      searchAfter = undefined;
    }
  } while (searchAfter != null);
}

export interface EntityAnomalies {
  [jobId: string]: AnomalyHit[];
}

/**
 * Fetches all anomaly records for a batch of entity IDs and returns them grouped by entity and job.
 *
 * Result shape:
 * {
 *   "user:alice": {
 *     "job-A": [anomalies...],
 *     "job-B": [anomalies...],
 *   },
 *   "user:bob": { ... },
 * }
 *
 * Anomalies are sorted in ascending order by timestamp,
 */
export async function fetchAnomaliesForEntityBatch(
  opts: StreamAnomaliesForEntityBatchOpts
): Promise<Map<string, EntityAnomalies>> {
  const result = new Map<string, EntityAnomalies>();

  for await (const page of streamAnomaliesForEntityBatch(opts)) {
    for (const anomaly of page) {
      const byJob = result.get(anomaly.entityId) ?? {};
      const existing = byJob[anomaly.jobId] ?? [];
      byJob[anomaly.jobId] = [...existing, anomaly];
      result.set(anomaly.entityId, byJob);
    }
  }

  return result;
}
