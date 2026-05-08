/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type {
  AnomalyDetectorsProvider,
  MlSystemProvider,
} from '@kbn/ml-plugin/server/shared_services/providers';
import type { Entity, EntityType } from '@kbn/entity-store/common';
import { euid } from '@kbn/entity-store/common/euid_helpers';
import type { AnomalySummaryEntry } from '../../../../common/api/entity_analytics/behavioral_summary/behavioral_summary.gen';

export type { Entity as EntityRecord };

interface GetBehavioralSummaryArgs {
  entity: Entity;
  anomalyThreshold: number;
  from: string;
  baselineSize: number;
  esClient: ElasticsearchClient;
  mlAnomalySearch: ReturnType<MlSystemProvider['mlSystemProvider']>['mlAnomalySearch'];
  mlAnomalyDetectors: ReturnType<AnomalyDetectorsProvider['anomalyDetectorsProvider']>;
  logger: Logger;
}

/**
 * For each anomaly_job_id on the entity:
 *   1. Read the job + datafeed configs.
 *   2. Translate the entity → partition_field_value via the EUID layer.
 *   3. Find the MOST RECENT anomaly record (record_score >= threshold).
 *   4. Aggregate the source index for that record's by_field_name to get
 *      the baseline distribution, scoped to this entity, ending at the
 *      anomaly's bucket so the rare value isn't counted as baseline.
 *
 * Errors per job are caught and surfaced on the entry's `error` field; one
 * bad job does not sink the whole response.
 */
export const getBehavioralSummary = async ({
  entity,
  anomalyThreshold,
  from,
  baselineSize,
  esClient,
  mlAnomalySearch,
  mlAnomalyDetectors,
  logger,
}: GetBehavioralSummaryArgs): Promise<AnomalySummaryEntry[]> => {
  logger.info(
    `getBehavioralSummary called for entity ${entity.entity?.id} with record ${JSON.stringify(
      entity
    )}`
  );
  const jobIds = entity.entity?.behaviors?.anomaly_job_ids ?? [
    'pad_windows_rare_region_name_by_user_ea',
  ];
  if (jobIds.length === 0) return [];
  const settled = await Promise.allSettled(
    jobIds.map((jobId) =>
      summarizeJob({
        jobId,
        entity,
        anomalyThreshold,
        from,
        baselineSize,
        esClient,
        mlAnomalySearch,
        mlAnomalyDetectors,
        logger,
      })
    )
  );
  return settled.flatMap((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    logger.warn(`[behavioral_summary] job ${jobIds[i]} failed: ${String(r.reason)}`);
    return [makeErrorEntry(jobIds[i], String(r.reason))];
  });
};

interface SummarizeArgs extends Omit<GetBehavioralSummaryArgs, 'entity'> {
  jobId: string;
  entity: Entity;
}

/**
 * One job can declare multiple detectors. We produce one summary entry
 * per (jobId, detectorIndex) so jobs with >1 detector aren't half-represented.
 */
const summarizeJob = async ({
  jobId,
  entity,
  anomalyThreshold,
  from,
  baselineSize,
  esClient,
  mlAnomalyDetectors,
  logger,
}: SummarizeArgs): Promise<AnomalySummaryEntry[]> => {
  // Step 1: get job config
  const jobsResp = await mlAnomalyDetectors.jobs(jobId);
  const job = jobsResp.jobs?.[0];
  if (!job) throw new Error(`job ${jobId} not found`);

  const sourceIndex = (job.datafeed_config?.indices ?? []) as string[];
  const datafeedQuery = job.datafeed_config?.query ?? { match_all: {} };
  const detectors = job.analysis_config?.detectors ?? [];
  if (detectors.length === 0) {
    return [makeErrorEntry(jobId, 'no detectors on job')];
  }

  // Step 2-3 per detector
  const perDetector = await Promise.all(
    detectors.map(async (detector, detectorIndex) => {
      const byFieldName = detector.by_field_name ?? null;

      // Step 2: most recent anomaly record above threshold
      const entityId = entity.entity?.id;
      const entityType = entity.entity?.EngineMetadata?.Type as EntityType | undefined;
      if (!entityId || !entityType) {
        return makeErrorEntry(jobId, 'entity has no id or type', { detectorIndex });
      }

      const record = await fetchMostRecentAnomalyRecord({
        esClient,
        jobId,
        entityId,
        entityType,
        anomalyThreshold,
        from,
        logger,
        detectorIndex,
      });

      if (!record) {
        return {
          jobId,
          detectorIndex,
          byFieldName,
          byFieldValue: null,
          recordScore: 0,
          timestamp: new Date(0).toISOString(),
          actual: [],
          typical: [],
          baseline: [],
          sourceIndex,
          error: 'no anomaly records matched threshold',
        };
      }

      // Step 4: baseline aggregation
      let baseline: { value: string; docCount: number }[] = [];
      if (byFieldName) {
        try {
          baseline = await fetchBaseline({
            esClient,
            sourceIndex,
            byFieldName,
            datafeedQuery,
            entityId,
            entityType,
            from,
            ltTimestamp: record.timestamp,
            baselineSize,
            logger,
          });
        } catch (err) {
          logger.warn(`[behavioral_summary] baseline aggregation failed for ${jobId}: ${err}`);
        }
      }

      return {
        jobId,
        detectorIndex,
        byFieldName,
        byFieldValue: record.byFieldValue,
        recordScore: record.recordScore,
        timestamp: new Date(record.timestamp).toISOString(),
        actual: record.actual,
        typical: record.typical,
        baseline,
        sourceIndex,
      };
    })
  );

  return perDetector;
};

// ----- helpers --------------------------------------------------------------

interface AnomalyRecord {
  timestamp: number;
  recordScore: number;
  byFieldValue: string | null;
  partitionFieldName: string | null;
  partitionFieldValue: string | null;
  actual: number[];
  typical: number[];
}

const fetchMostRecentAnomalyRecord = async ({
  esClient,
  jobId,
  entityId,
  entityType,
  anomalyThreshold,
  from,
  detectorIndex,
  logger,
}: {
  esClient: ElasticsearchClient;
  jobId: string;
  entityId: string;
  entityType: EntityType;
  anomalyThreshold: number;
  from: string;
  detectorIndex: number;
  logger: Logger;
}): Promise<AnomalyRecord | null> => {
  const query = {
    index: '.ml-anomalies*',
    size: 1,
    sort: [{ timestamp: 'desc' }],
    runtime_mappings: {
      entity_id: euid.painless.getEuidRuntimeMapping(entityType),
    },
    query: {
      bool: {
        filter: [
          { term: { result_type: 'record' } },
          { term: { job_id: jobId } },
          { term: { detector_index: detectorIndex } },
          { term: { entity_id: entityId } },
          { range: { record_score: { gte: anomalyThreshold } } },
          { range: { timestamp: { gte: from } } },
        ],
      },
    },
  };

  logger.info(`query ${JSON.stringify(query)}`);
  const resp = await esClient.search<{
    timestamp: number;
    record_score: number;
    by_field_value?: string;
    partition_field_name?: string;
    partition_field_value?: string;
    actual?: number[];
    typical?: number[];
  }>(query);

  logger.info(
    `fetchMostRecentAnomalyRecord response for jobId ${jobId}, entityId ${entityId}, detectorIndex ${detectorIndex}: ${JSON.stringify(
      resp
    )}`
  );

  const hit = resp.hits.hits[0]?._source;
  if (!hit) return null;

  return {
    timestamp: hit.timestamp,
    recordScore: hit.record_score,
    byFieldValue: hit.by_field_value ?? null,
    partitionFieldName: hit.partition_field_name ?? null,
    partitionFieldValue: hit.partition_field_value ?? null,
    actual: hit.actual ?? [],
    typical: hit.typical ?? [],
  };
};

const fetchBaseline = async ({
  esClient,
  sourceIndex,
  entityId,
  entityType,
  byFieldName,
  datafeedQuery,
  from,
  ltTimestamp,
  baselineSize,
  logger,
}: {
  esClient: ElasticsearchClient;
  sourceIndex: string[];
  entityId: string;
  entityType: EntityType;
  byFieldName: string;
  datafeedQuery: unknown;
  from: string;
  ltTimestamp: number;
  baselineSize: number;
  logger: Logger;
}): Promise<{ value: string; docCount: number }[]> => {
  const query = {
    index: sourceIndex,
    size: 0,
    runtime_mappings: {
      entity_id: euid.painless.getEuidRuntimeMapping(entityType),
    },
    query: {
      bool: {
        filter: [
          // Mirror the datafeed's own filter so the baseline is over the
          // same population the model trained on.
          datafeedQuery,
          { term: { entity_id: entityId } },
          { exists: { field: byFieldName } },
          // ML buckets are right-open. Excluding [ltTimestamp, ...) means
          // the rare value triggering the anomaly doesn't dilute the baseline.
          { range: { '@timestamp': { gte: from, lt: ltTimestamp } } },
        ],
      },
    },
    aggs: {
      baseline: {
        terms: { field: byFieldName, size: baselineSize, order: { _count: 'desc' } },
      },
    },
  };
  logger.info(`fetchBaseline query ${JSON.stringify(query)}`);
  const resp = await esClient.search<
    unknown,
    { baseline: { buckets: { key: string; doc_count: number }[] } }
  >(query);

  logger.info(`fetchBaseline response ${JSON.stringify(resp)}`);

  const buckets = resp.aggregations?.baseline?.buckets ?? [];
  return buckets.map((b) => ({ value: b.key, docCount: b.doc_count }));
};

const makeErrorEntry = (
  jobId: string,
  error: string,
  partial?: Partial<AnomalySummaryEntry>
): AnomalySummaryEntry => ({
  jobId,
  detectorIndex: 0,
  byFieldName: null,
  byFieldValue: null,
  partitionFieldName: null,
  partitionFieldValue: null,
  recordScore: 0,
  timestamp: new Date(0).toISOString(),
  actual: [],
  typical: [],
  baseline: [],
  sourceIndex: [],
  error,
  ...partial,
});
