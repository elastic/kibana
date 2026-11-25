/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { MitreAttackDataClient } from '@kbn/mitre-attack-plugin/server';
import type { Entity, EntityType } from '@kbn/entity-store/common';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import { compact } from 'lodash';
import {
  buildEntitiesFilter,
  getMatchedEntityId,
} from '../ml_anomaly_detection/build_entities_filter';
import { ENTITY_ANOMALY_DEFAULT_LOOKBACK_DAYS } from '../../../../common/constants';
import {
  deriveBucketInterval,
  formatAnomalousValue,
} from '../../../../common/entity_analytics/anomalies';
import type {
  AnomalyOverviewEntry,
  AnomalyOverviewHit,
  AnomalyScoreRange,
} from '../../../../common/api/entity_analytics';
import {
  buildScoreRangeFilter,
  getIdentityFieldsByEntityId,
  getJobConfig,
  getSecurityMlJobIds,
  resolveRecordFields,
} from '../ml_anomaly_detection';
import type { RawAnomalyRecord } from '../ml_anomaly_detection/types';

const NUM_RECENT_ANOMALIES = 3;
export const DEFAULT_OVERVIEW_LOOKBACK_MS =
  ENTITY_ANOMALY_DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;

interface TimeBucket {
  key_as_string: string;
  key: number;
  doc_count: number;
  max_score: { value: number | null };
  jobs: { buckets: Array<{ key: string; doc_count: number }> };
}

interface OverviewAggs {
  by_time: { buckets: TimeBucket[] };
  all_jobs: { buckets: Array<{ key: string }> };
}

interface GetEntityAnomalyOverviewParams {
  entityIds: string[];
  entityType: EntityType;
  entityRecords: Entity[];
  fromMs?: number;
  toMs?: number;
  scoreRanges?: AnomalyScoreRange[];
  threatTactics?: string[];
  logger: Logger;
  ml: MlPluginSetup;
  request: KibanaRequest;
  soClient: SavedObjectsClientContract;
  mitreDataClient?: MitreAttackDataClient;
}

const buildTacticCounts = (
  buckets: TimeBucket[],
  tacticsByJob: Map<string, string[]>
): Record<string, number> =>
  buckets
    .flatMap((b) => b.jobs.buckets)
    .flatMap(({ key, doc_count }) =>
      (tacticsByJob.get(key) ?? []).map((tactic) => ({ tactic, doc_count }))
    )
    .reduce<Record<string, number>>((acc, { tactic, doc_count }) => {
      acc[tactic] = (acc[tactic] ?? 0) + doc_count;
      return acc;
    }, {});

interface AnomalyOverview {
  anomalyByTimeBucket: AnomalyOverviewEntry[];
  recentAnomalies: AnomalyOverviewHit[];
  tacticCounts: Record<string, number>;
  totalAnomaliesCount: number;
  from: number;
  to: number;
  hasJobsMissingThreatTactics: boolean;
}

export const getEntityAnomalyOverview = async ({
  entityIds,
  entityType,
  entityRecords,
  fromMs,
  toMs,
  scoreRanges,
  threatTactics,
  logger,
  ml,
  request,
  soClient,
  mitreDataClient,
}: GetEntityAnomalyOverviewParams): Promise<AnomalyOverview> => {
  const effectiveToMs = toMs ?? Date.now();
  const effectiveFromMs = fromMs ?? effectiveToMs - DEFAULT_OVERVIEW_LOOKBACK_MS;
  const bucketInterval = deriveBucketInterval(effectiveFromMs, effectiveToMs);
  const empty: AnomalyOverview = {
    anomalyByTimeBucket: [],
    recentAnomalies: [],
    tacticCounts: {},
    totalAnomaliesCount: 0,
    from: effectiveFromMs,
    to: effectiveToMs,
    hasJobsMissingThreatTactics: false,
  };

  const mlSystem = ml.mlSystemProvider(request, soClient);
  const allSecurityJobIds = await getSecurityMlJobIds({ ml, request, soClient });

  if (allSecurityJobIds.length === 0) return empty;

  const allJobConfigs = await getJobConfig({
    jobIds: allSecurityJobIds,
    logger,
    ml,
    request,
    soClient,
    mitreDataClient,
  });

  // getJobConfig uses the space-aware anomalyDetectorsProvider and silently drops any job
  // not installed in the current space, so its keys are the installed security job IDs.
  // Using template IDs from getSecurityMlJobIds directly would match anomaly records from
  // other spaces whose jobs share the same template-defined IDs.
  const installedSecurityJobIds = [...allJobConfigs.keys()];
  if (installedSecurityJobIds.length === 0) return empty;

  let resolvedJobIds = installedSecurityJobIds;
  if (threatTactics && threatTactics.length > 0) {
    const tacticMatchedIds = installedSecurityJobIds.filter((id) =>
      allJobConfigs.get(id)?.threatTactics.some((t) => threatTactics.includes(t))
    );
    resolvedJobIds = tacticMatchedIds;
  }

  if (threatTactics && threatTactics.length > 0 && resolvedJobIds.length === 0) return empty;

  const entityFilter = buildEntitiesFilter(entityType, entityRecords);
  if (!entityFilter) {
    logger.warn(
      `Cannot build entity filter for "${entityIds.join(
        ', '
      )}" (type: ${entityType}): entity records lack identity fields`
    );
    return empty;
  }

  let aggs: OverviewAggs | undefined;
  let rawHits: Array<RawAnomalyRecord & { matched_queries?: string[] | Record<string, number> }> =
    [];
  let totalAnomaliesCount = 0;

  try {
    const resp = await mlSystem.mlAnomalySearch<RawAnomalyRecord>(
      {
        size: NUM_RECENT_ANOMALIES,
        track_total_hits: true,
        query: {
          bool: {
            filter: [
              { term: { result_type: 'record' } },
              { term: { is_interim: false } },
              { exists: { field: 'detector_index' } },
              buildScoreRangeFilter(scoreRanges),
              { range: { timestamp: { gte: effectiveFromMs, lte: effectiveToMs } } },
              entityFilter,
              ...(resolvedJobIds.length > 0 ? [{ terms: { job_id: resolvedJobIds } }] : []),
            ],
          },
        },
        sort: [{ timestamp: { order: 'desc' } }, { record_score: { order: 'desc' } }],
        aggs: {
          by_time: {
            date_histogram: {
              field: 'timestamp',
              fixed_interval: `${bucketInterval.value}${bucketInterval.unit}`,
            },
            aggs: {
              max_score: { max: { field: 'record_score' } },
              jobs: { terms: { field: 'job_id', size: 200 } },
            },
          },
          all_jobs: {
            terms: { field: 'job_id', size: 200 },
          },
        },
      },
      []
    );

    aggs = resp.aggregations as unknown as OverviewAggs | undefined;
    rawHits = compact(
      resp.hits.hits.map((h) =>
        h._source ? { ...h._source, _id: h._id, matched_queries: h.matched_queries } : undefined
      )
    );
    const total = resp.hits.total;
    totalAnomaliesCount = total == null ? 0 : typeof total === 'number' ? total : total.value;
  } catch (err) {
    logger.warn(`Error fetching anomaly overview for "${entityIds.join(', ')}": ${err}`);
    return empty;
  }

  const presentJobIds = (aggs?.all_jobs?.buckets ?? []).map((b) => b.key);
  if (presentJobIds.length === 0) return empty;

  // Build jobId → tactics lookup once, reused per bucket.
  const tacticsByJob = new Map(
    presentJobIds.map((id) => [id, allJobConfigs.get(id)?.threatTactics ?? []])
  );

  const hasJobsMissingThreatTactics = presentJobIds.some(
    (id) => !allJobConfigs.get(id)?.hasThreatTactics
  );

  const anomalyByTimeBucket: AnomalyOverviewEntry[] = (aggs?.by_time?.buckets ?? [])
    .filter((b) => b.doc_count > 0 && b.max_score.value !== null)
    .map((b) => {
      const jobsBucket = b?.jobs?.buckets ?? [];
      const bucketJobIds = jobsBucket.map((j) => j.key);
      const tactics = [...new Set(bucketJobIds.flatMap((id) => tacticsByJob.get(id) ?? []))];
      const tacticCounts = jobsBucket.reduce<Record<string, number>>((acc, { key, doc_count }) => {
        for (const tactic of tacticsByJob.get(key) ?? []) {
          acc[tactic] = (acc[tactic] ?? 0) + doc_count;
        }
        return acc;
      }, {});
      return {
        timestamp: new Date(b.key).toISOString(),
        maxScore: b.max_score.value as number,
        threatTactics: tactics,
        tacticCounts,
      };
    });

  const tacticCounts = buildTacticCounts(aggs?.by_time?.buckets ?? [], tacticsByJob);

  // Resolve causes against the group member each hit matched (same attribution as the summary).
  const identityFieldsByEntityId = getIdentityFieldsByEntityId(entityType, entityRecords);
  const recentAnomalies: AnomalyOverviewHit[] = rawHits.map((anomaly) => {
    const jobConfig = allJobConfigs.get(anomaly.job_id);
    const detector = jobConfig?.detectors[anomaly.detector_index];
    const matchedEntityId = getMatchedEntityId(anomaly.matched_queries, entityIds) ?? entityIds[0];
    const record = resolveRecordFields(anomaly, identityFieldsByEntityId.get(matchedEntityId));
    const detectorFunction = detector?.function ?? record.detectorFunction;
    const { actual } = record;

    const anomalousValue = detectorFunction
      ? formatAnomalousValue({
          detectorFunction,
          fieldName: detector?.field_name ?? record.fieldName,
          actual: actual !== undefined ? [actual] : undefined,
          byFieldValue: record.byFieldValue,
        })
      : actual !== undefined
      ? String(actual)
      : null;

    return {
      recordId: anomaly._id ?? '',
      jobId: anomaly.job_id,
      jobName: jobConfig?.jobName ?? anomaly.job_id,
      timestamp: new Date(anomaly.timestamp).toISOString(),
      anomalousValue,
    };
  });

  return {
    anomalyByTimeBucket,
    recentAnomalies,
    tacticCounts,
    totalAnomaliesCount,
    from: effectiveFromMs,
    to: effectiveToMs,
    hasJobsMissingThreatTactics,
  };
};
