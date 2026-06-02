/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { EntityType } from '@kbn/entity-store/common';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import type { EntityAnomalies } from './fetch_anomalies';
import { fetchBaselineBehavior } from './fetch_baseline_behavior';
import { getMlAdDetailsIndexName } from './constants';
import type { EnrichedAnomalyRecord } from './types';

interface EnrichAndPersistAnomaliesOpts {
  abortSignal: AbortSignal;
  anomaliesByEntity: Map<string, EntityAnomalies>;
  entityType: EntityType;
  esClient: ElasticsearchClient;
  logger: Logger;
  ml: MlPluginSetup;
  namespace: string;
  soClient: SavedObjectsClientContract;
}
export const enrichAndPersistAnomalies = async ({
  abortSignal,
  anomaliesByEntity,
  entityType,
  esClient,
  logger,
  ml,
  namespace,
  soClient,
}: EnrichAndPersistAnomaliesOpts) => {
  const fetchTasks = [...anomaliesByEntity.entries()].flatMap(([entityId, entityAnomalies]) =>
    Object.entries(entityAnomalies).map(([jobId, jobData]) => ({ entityId, jobId, jobData }))
  );

  const fetchResults = await Promise.all(
    fetchTasks.map(({ entityId, jobId, jobData }) =>
      fetchBaselineBehavior({
        abortSignal,
        anomalies: jobData.anomalies,
        entityId,
        entityType,
        esClient,
        jobId,
        logger,
        ml,
        soClient,
      })
        .then((baselinesBehaviors) => ({ entityId, jobId, jobData, baselinesBehaviors }))
        .catch((err) => {
          logger.warn(
            `Failed to fetch baseline behavior for entity ${entityId}, job ${jobId}: ${err}`
          );
          return { entityId, jobId, jobData, baselinesBehaviors: null };
        })
    )
  );

  const enrichedRecords: EnrichedAnomalyRecord[] = fetchResults.flatMap(
    ({ entityId, jobId, jobData, baselinesBehaviors }) =>
      jobData.anomalies.map((anomaly) => ({
        entity: {
          id: entityId,
          type: entityType,
        },
        anomaly: {
          _id: anomaly._id,
          job_id: jobId,
          detector_index: anomaly.detectorIndex,
          timestamp: anomaly.timestamp,
          record_score: anomaly.recordScore,
          field_name: anomaly.fieldName,
          actual: anomaly.actual,
          typical: anomaly.typical,
          by_field_name: anomaly.byFieldName,
          by_field_value: anomaly.byFieldValue,
          over_field_name: anomaly.overFieldName,
          over_field_value: anomaly.overFieldValue,
          partition_field_name: anomaly.partitionFieldName,
          partition_field_value: anomaly.partitionFieldValue,
        },
        baseline: (baselinesBehaviors ?? []).map((bb) => ({
          value: bb.value,
          doc_count: bb.doc_count,
          top_hits: bb.topHits,
        })),
      }))
  );

  if (enrichedRecords.length === 0) return;

  const detailsIndex = getMlAdDetailsIndexName(namespace);
  const operations = enrichedRecords.flatMap((record) => [
    { create: { _index: detailsIndex } },
    { '@timestamp': new Date().toISOString(), ...record },
  ]);

  const resp = await esClient.bulk({ operations, refresh: false });
  if (resp.errors) {
    const errors = resp.items.filter((item) => Object.values(item)[0]?.error);
    logger.warn(
      `Bulk-index of enriched anomaly records returned errors. ${JSON.stringify(errors)}`
    );
  }
};
