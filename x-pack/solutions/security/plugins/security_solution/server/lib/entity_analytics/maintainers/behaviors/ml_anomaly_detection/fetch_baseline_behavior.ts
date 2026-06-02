/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupBy, zipWith } from 'lodash';
import type {
  ElasticsearchClient,
  Logger,
  KibanaRequest,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type {
  MappingRuntimeFields,
  MlDetector,
  MsearchRequestItem,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import type { EntityType } from '@kbn/entity-store/common';
import { euid } from '@kbn/entity-store/common/euid_helpers';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import { parseDuration } from '@kbn/alerting-plugin/common/parse_duration';
import { ML_AD_LOOKBACK } from './constants';
import type { AnomalyHit, EnrichedAnomalyHit } from './types';

export interface JobConfig {
  sourceIndex: string[];
  datafeedQuery: QueryDslQueryContainer;
  detectors: MlDetector[];
  bucketSpanMs: number;
}

// Exclude cold and frozen tiers for query performance
const MUST_NOT_CLAUSE: QueryDslQueryContainer[] = [
  { terms: { _tier: ['data_cold', 'data_frozen'] } },
];

/**
 * ML AD job function types
 *
 * --- Metric functions ---
 * The actual and typical values in the anomaly record represent
 * the anomalous metric value and the baseline metric value.
 * No need to reach back into the source documents
 * ------------------------
 * high_mean
 * high_median
 * high_sum
 * high_varp
 * high_non_zero_count
 * high_distinct_count
 * high_info_content
 * high_count
 * low_count
 * ------------------------
 *
 * -- Occurence functions --
 * Observed occurrence rate of the by_field_value
 * This function requires reaching back into the source documents
 * to get the baseline values and counts.
 * ------------------------
 * rare
 * ------------------------
 *
 * -- Temporal functions --
 * The actual and typical values in the anomaly record represent the
 * anomalous and baseline temporal patterns
 * These functions require reaching back into the source documents to
 * get a count of documents in the anomalous time bucket (+/- 1 hr)
 * ------------------------
 * time_of_day - seconds since midnight
 * time_of_week - seconds since Sunday midnight
 * ------------------------
 */

// Collect detector field names that are not entity-type identifiers (e.g. user.name, host.name)
const getNonEntityGroupFields = (detector: MlDetector, entityType: string): string[] =>
  [
    detector.field_name,
    detector.by_field_name,
    detector.over_field_name,
    detector.partition_field_name,
  ].filter((f): f is string => f != null && !f.startsWith(`${entityType}.`));

// For each by/over/partition field that made it into groupFields, collect the anomalous value
const buildGroupFieldValues = (
  detector: MlDetector,
  groupFields: string[],
  anomaly: AnomalyHit
): Record<string, string[]> => {
  const dimensionalFields: Array<[string | undefined, string | undefined]> = [
    [detector.by_field_name, anomaly.byFieldValue],
    [detector.over_field_name, anomaly.overFieldValue],
    [detector.partition_field_name, anomaly.partitionFieldValue],
  ];
  return Object.fromEntries(
    dimensionalFields
      .filter(
        (entry): entry is [string, string] =>
          entry[0] != null && groupFields.includes(entry[0]) && entry[1] != null
      )
      .map(([fieldName, value]) => [fieldName, [value]])
  );
};

interface GetJobConfigOpts {
  jobId: string;
  logger: Logger;
  ml: MlPluginSetup;
  soClient: SavedObjectsClientContract;
}

const jobConfigCache = new Map<string, JobConfig | null>();

export const clearJobConfigCacheForTest = () => jobConfigCache.clear();

export const getJobConfig = async ({
  jobId,
  logger,
  ml,
  soClient,
}: GetJobConfigOpts): Promise<JobConfig | null> => {
  // try retrieving from cache first
  if (jobConfigCache.has(jobId)) return jobConfigCache.get(jobId) ?? null;

  try {
    const resp = await ml.anomalyDetectorsProvider({} as KibanaRequest, soClient).jobs(jobId);
    const job = resp.jobs?.[0];
    if (!job) {
      jobConfigCache.set(jobId, null);
      return null;
    }
    const bucketSpanStr = job.analysis_config?.bucket_span;
    let bucketSpanMs = 60 * 60 * 1000; // default to 1h
    if (typeof bucketSpanStr === 'string') {
      try {
        bucketSpanMs = parseDuration(bucketSpanStr);
      } catch {
        logger.warn(`Invalid bucket_span "${bucketSpanStr}" for job ${jobId}`);
      }
    }

    const config: JobConfig = {
      sourceIndex: (job.datafeed_config?.indices ?? []) as string[],
      datafeedQuery: (job.datafeed_config?.query as QueryDslQueryContainer) ?? { match_all: {} },
      detectors: job.analysis_config?.detectors ?? [],
      bucketSpanMs,
    };
    jobConfigCache.set(jobId, config);
    return config;
  } catch (err) {
    logger.warn(`Failed to load job config for ${jobId}: ${err}`);
    jobConfigCache.set(jobId, null);
    return null;
  }
};

/**
 * For a batch of anomaly records sharing the same entityId and jobId, queries
 * the datafeed's source index to collect:
 *   - baseline: top values of the detector's target field for this entity BEFORE
 *     the latest anomaly bucket, with anomalous field values excluded so they do
 *     not dilute the normal distribution.
 *   - topHits: source documents that match the anomalous field values, used as
 *     supporting evidence.
 *
 * The target field is resolved from the detector function type:
 *   - rare              → byFieldName (required)
 *   - metric w/ field   → fieldName (high_sum, high_mean, high_median, etc.)
 *   - count / time_of_* → no baseline (no categorical field to aggregate)
 */

interface RareBucket {
  key: string;
  doc_count: number;
}

interface BaselineAggType {
  baseline: { buckets: RareBucket[] };
  anomaly: { doc_count: number };
  time_bucket: { doc_count: number };
}

interface QuerySharedOpts {
  abortSignal: AbortSignal;
  anomalies: AnomalyHit[];
  detector: MlDetector;
  entityId: string;
  entityType: EntityType;
  esClient: ElasticsearchClient;
  jobConfig: JobConfig;
  jobId: string;
  logger: Logger;
  runtimeMappings: MappingRuntimeFields;
}

const fetchRareBaselineForAnomalies = async ({
  abortSignal,
  anomalies,
  entityId,
  esClient,
  jobConfig,
  jobId,
  logger,
  runtimeMappings,
}: QuerySharedOpts): Promise<EnrichedAnomalyHit[]> => {
  try {
    // For each anomaly, reach back into the source indices to determine the baseline
    // behavior for this job at this point in time. This is required because for "rare"
    // detectors, the actual and typical values in the anomaly record represent probabilities
    // and not the actual and typical anomalous values.
    const searches: MsearchRequestItem[] = anomalies.flatMap((anomaly) => {
      const additionalFilters = anomaly.byFieldName
        ? [{ exists: { field: anomaly.byFieldName } }]
        : [];

      return [
        {},
        {
          size: 0,
          runtime_mappings: runtimeMappings,
          query: {
            bool: {
              filter: [
                // Mirror the datafeed's own filter so the baseline is over the
                // same population the model trained on.
                jobConfig.datafeedQuery,

                // Filter to this entity
                { term: { entity_id: entityId } },

                // Add additional filters
                ...additionalFilters,

                // Limit time range to anomaly lookback window
                {
                  range: {
                    '@timestamp': {
                      lte: anomaly.timestamp + jobConfig.bucketSpanMs,
                      gte: `now-${ML_AD_LOOKBACK}`,
                    },
                  },
                },
              ],
              must_not: MUST_NOT_CLAUSE,
            },
          },
          aggs: {
            baseline: {
              terms: {
                field: anomaly.byFieldName,
                size: 3,
                order: { _count: 'desc' },
                exclude: anomaly.byFieldValue != null ? [anomaly.byFieldValue] : [],
              },
            },
            anomaly: {
              filter:
                anomaly.byFieldName && anomaly.byFieldValue != null
                  ? { term: { [anomaly.byFieldName]: anomaly.byFieldValue } }
                  : { match_none: {} },
            },
          },
        },
      ];
    });

    const resp = await esClient.msearch<unknown, BaselineAggType>(
      {
        index: jobConfig.sourceIndex,
        ignore_unavailable: true,
        searches,
      },
      {
        signal: abortSignal,
      }
    );

    if (resp.responses == null || resp.responses.length !== anomalies.length) {
      logger.warn(
        `Unexpected msearch response for job ${jobId}, entity ${entityId}: ${JSON.stringify(resp)}`
      );
      return anomalies;
    }

    return zipWith(anomalies, resp.responses, (anomaly, searchResp) => {
      if ('error' in searchResp) {
        return {
          ...anomaly,
          anomalousValue: anomaly.byFieldValue,
        };
      }
      const aggs = searchResp.aggregations as unknown as BaselineAggType | undefined;
      const baselineValues = (aggs?.baseline?.buckets ?? []).map((b) => b.key);
      const anomalousValueCount = aggs?.anomaly?.doc_count ?? 0;
      return {
        ...anomaly,
        baselineValues,
        anomalousValue: anomaly.byFieldValue,
        anomalousValueCount,
      };
    });
  } catch (err) {
    logger.warn(`Baseline agg failed for job ${jobId}, entity ${entityId}: ${err}`);
    return anomalies;
  }
};

const defaultBaselineForAnomalies = async ({
  anomalies,
}: QuerySharedOpts): Promise<EnrichedAnomalyHit[]> => {
  return anomalies.map((anomaly) => ({
    ...anomaly,
    anomalousValue: anomaly.actual,
    baselineValues: [anomaly.typical],
  }));
};

const fetchTimeBaselineForAnomalies = async ({
  abortSignal,
  anomalies,
  detector,
  entityId,
  entityType,
  esClient,
  jobConfig,
  jobId,
  logger,
  runtimeMappings,
}: QuerySharedOpts): Promise<EnrichedAnomalyHit[]> => {
  try {
    const termsFields = getNonEntityGroupFields(detector, entityType);

    const isTimeOfWeek = detector.function === 'time_of_week';

    // For each anomaly, query the full lookback window and use a filter agg to count
    // how many source docs fall in the same hour-of-day (or day+hour for time_of_week)
    // as the anomalous actual value.
    const searches: MsearchRequestItem[] = anomalies.flatMap((anomaly) => {
      const groupFieldValues = buildGroupFieldValues(detector, termsFields, anomaly);
      const additionalFilters = termsFields.map((field) => {
        const values = groupFieldValues[field] ?? [];
        return values && values.length > 0 ? { terms: { [field]: values } } : { exists: { field } };
      });

      // Derive the anomalous hour and day from actual (seconds since midnight / week-start)
      const anomalousHour = Math.floor(
        (isTimeOfWeek ? anomaly.actual % 86400 : anomaly.actual) / 3600
      );
      const anomalousDay = isTimeOfWeek ? Math.floor(anomaly.actual / 86400) : null;

      const timeBucketFilter: QueryDslQueryContainer =
        isTimeOfWeek && anomalousDay != null
          ? {
              bool: {
                filter: [
                  { term: { day_of_week: anomalousDay } },
                  { term: { hour_of_day: anomalousHour } },
                ],
              },
            }
          : { term: { hour_of_day: anomalousHour } };

      return [
        {},
        {
          size: 0,
          runtime_mappings: {
            ...runtimeMappings,
            hour_of_day: {
              type: 'long' as const,
              script: { source: "emit(doc['@timestamp'].value.getHour())" },
            },
            // Java DayOfWeek: Mon=1…Sun=7; mod 7 gives Sun=0…Sat=6
            day_of_week: {
              type: 'long' as const,
              script: { source: "emit(doc['@timestamp'].value.getDayOfWeekEnum().getValue() % 7)" },
            },
          },
          query: {
            bool: {
              filter: [
                // Mirror the datafeed's own filter so the baseline is over the
                // same population the model trained on.
                jobConfig.datafeedQuery,

                // Filter to this entity
                { term: { entity_id: entityId } },

                // Add additional filters
                ...additionalFilters,

                // Limit time range to anomaly lookback window
                {
                  range: {
                    '@timestamp': {
                      lte: anomaly.timestamp + jobConfig.bucketSpanMs,
                      gte: `now-${ML_AD_LOOKBACK}`,
                    },
                  },
                },
              ],
              must_not: MUST_NOT_CLAUSE,
            },
          },
          aggs: {
            time_bucket: { filter: timeBucketFilter },
          },
        },
      ];
    });

    const resp = await esClient.msearch<unknown, BaselineAggType>(
      {
        index: jobConfig.sourceIndex,
        ignore_unavailable: true,
        searches,
      },
      { signal: abortSignal }
    );

    if (resp.responses == null || resp.responses.length !== anomalies.length) {
      logger.warn(
        `Unexpected msearch response for job ${jobId}, entity ${entityId}: ${JSON.stringify(resp)}`
      );
      return anomalies;
    }

    return zipWith(anomalies, resp.responses, (anomaly, searchResp) => {
      if ('error' in searchResp) {
        return { ...anomaly };
      }
      const aggs = searchResp.aggregations as unknown as BaselineAggType | undefined;
      return {
        ...anomaly,
        baselineValues: [anomaly.typical],
        anomalousValue: anomaly.actual,
        anomalousValueCount: aggs?.time_bucket?.doc_count ?? 0,
      };
    });
  } catch (err) {
    logger.warn(`Baseline agg failed for job ${jobId}, entity ${entityId}: ${err}`);
    return anomalies;
  }
};

interface FetchBaselineBehaviorOpts {
  abortSignal: AbortSignal;
  anomalies: AnomalyHit[];
  entityId: string;
  entityType: EntityType;
  esClient: ElasticsearchClient;
  jobId: string;
  logger: Logger;
  ml: MlPluginSetup;
  soClient: SavedObjectsClientContract;
}

export const fetchBaselineBehavior = async ({
  abortSignal,
  anomalies,
  entityId,
  entityType,
  esClient,
  jobId,
  logger,
  ml,
  soClient,
}: FetchBaselineBehaviorOpts): Promise<EnrichedAnomalyHit[]> => {
  if (anomalies.length === 0) return [];

  const jobConfig = await getJobConfig({ ml, jobId, soClient, logger });
  if (!jobConfig || jobConfig.sourceIndex.length === 0 || jobConfig.detectors.length === 0) {
    return anomalies;
  }

  // group by detector index
  const byDetector = groupBy(anomalies, (a) => a.detectorIndex);

  const runtimeMappings: MappingRuntimeFields = {
    entity_id: euid.painless.getEuidRuntimeMapping(entityType),
  };
  const sharedOpts = {
    abortSignal,
    entityId,
    entityType,
    esClient,
    jobConfig,
    jobId,
    logger,
    runtimeMappings,
  };

  const result = await Promise.all(
    Object.entries(byDetector).flatMap(([detectorIndexStr, detectorAnomalies]) => {
      const detectorIndex = Number(detectorIndexStr);
      const detector = jobConfig.detectors?.[detectorIndex];

      const opts = { ...sharedOpts, detector, anomalies: detectorAnomalies };

      if (detector?.function === 'rare') {
        return fetchRareBaselineForAnomalies(opts);
      } else if (detector?.function?.startsWith('time_')) {
        return fetchTimeBaselineForAnomalies(opts);
      } else {
        return defaultBaselineForAnomalies(opts);
      }
    })
  );

  return result.flat();
};
