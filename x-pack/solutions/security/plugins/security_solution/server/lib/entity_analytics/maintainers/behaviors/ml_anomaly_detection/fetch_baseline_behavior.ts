/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupBy } from 'lodash';
import type {
  ElasticsearchClient,
  Logger,
  KibanaRequest,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type {
  MappingRuntimeFields,
  MlDetector,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import type { EntityType } from '@kbn/entity-store/common';
import { euid } from '@kbn/entity-store/common/euid_helpers';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import { BASELINE_BUCKET_SIZE, ML_AD_LOOKBACK, TOP_SOURCE_HITS } from './constants';
import type { AnomalyHit, BaselineBucket } from './types';

export interface JobConfig {
  sourceIndex: string[];
  datafeedQuery: QueryDslQueryContainer;
  detectors: MlDetector[];
  influencers: string[];
}

/**
 * ML AD job function types
 *
 * --- Metric functions ---
 * The actual and typical values in the anomaly record represent
 * the anomalous metric value and the baseline metric value.
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
 * Only this function requires reaching back into the source documents
 * to get the baseline values.
 * ------------------------
 * rare
 * ------------------------
 *
 * -- Temporal functions --
 * The actual and typical values in the anomaly record represent the
 * anomalous and baseline temporal patterns
 * ------------------------
 * time_of_day - seconds since midnight
 * time_of_week - seconds since Sunday midnight
 * ------------------------
 */

export interface BaselineConfig {
  detectorIndex: number;
  func: string;
  anomalies: AnomalyHit[];
  /** rare detectors only: field to aggregate and values to exclude */
  targetField: string | null;
  exclusionValues: string[];
  /** non-rare detectors: fields that must exist */
  groupFields: string[];
  /** non-rare detectors: anomalous field values seen per groupField (by/over/partition only) */
  groupFieldValues: Record<string, string[]>;
}

const uniqueNonNullValues = (
  anomalies: AnomalyHit[],
  selector: (a: AnomalyHit) => string | undefined
): string[] => [...new Set(anomalies.map(selector).filter((v): v is string => v != null))];

const buildRareConfig = (
  func: string,
  detector: MlDetector,
  detectorAnomalies: AnomalyHit[],
  detectorIndex: number
): BaselineConfig | null => {
  if (!detector.by_field_name) return null;
  return {
    detectorIndex,
    func,
    targetField: detector.by_field_name,
    exclusionValues: uniqueNonNullValues(detectorAnomalies, (a) => a.byFieldValue),
    groupFields: [],
    groupFieldValues: {},
    anomalies: detectorAnomalies,
  };
};

// Collect detector field names that are not entity-type identifiers (e.g. user.name, host.name)
const getNonEntityGroupFields = (detector: MlDetector, entityType: string): string[] =>
  [
    detector.field_name,
    detector.by_field_name,
    detector.over_field_name,
    detector.partition_field_name,
  ].filter((f): f is string => f != null && !f.startsWith(`${entityType}.`));

// For each by/over/partition field that made it into groupFields, collect the unique anomalous values
const buildGroupFieldValues = (
  detector: MlDetector,
  groupFields: string[],
  detectorAnomalies: AnomalyHit[]
): Record<string, string[]> => {
  const dimensionalFields: Array<[string | undefined, (a: AnomalyHit) => string | undefined]> = [
    [detector.by_field_name, (a) => a.byFieldValue],
    [detector.over_field_name, (a) => a.overFieldValue],
    [detector.partition_field_name, (a) => a.partitionFieldValue],
  ];
  return Object.fromEntries(
    dimensionalFields
      .filter(
        (entry): entry is [string, (a: AnomalyHit) => string | undefined] =>
          entry[0] != null && groupFields.includes(entry[0])
      )
      .map(([fieldName, selector]) => [fieldName, uniqueNonNullValues(detectorAnomalies, selector)])
  );
};

const buildMetricConfig = (
  func: string,
  detector: MlDetector,
  detectorAnomalies: AnomalyHit[],
  detectorIndex: number,
  entityType: string
): BaselineConfig => {
  const groupFields = getNonEntityGroupFields(detector, entityType);
  return {
    detectorIndex,
    func,
    targetField: null,
    exclusionValues: [],
    groupFields,
    groupFieldValues: buildGroupFieldValues(detector, groupFields, detectorAnomalies),
    anomalies: detectorAnomalies,
  };
};

/**
 * Gets the config to query for baseline behavior
 *
 * Groups anomalies by detectorIndex, looks up each detector's function and
 * field config from the job definition, and returns one BaselineConfig per
 * detector that has a meaningful categorical field to aggregate:
 *
 * - rare                       → byFieldName from detector (required)
 * - count and metric functions → groupFields (if any) from by/over/partition field names (excluding user.* and host.*)
 */
export const getBaselineConfigs = (
  job: JobConfig,
  anomalies: AnomalyHit[],
  entityType: string
): BaselineConfig[] => {
  const byDetector = groupBy(anomalies, (a) => a.detectorIndex);

  return Object.entries(byDetector).flatMap(([detectorIndexStr, detectorAnomalies]) => {
    const detectorIndex = Number(detectorIndexStr);
    const detector = job.detectors?.[detectorIndex];
    const { function: func } = detector ?? {};
    if (!func) return [];

    const config =
      func === 'rare'
        ? buildRareConfig(func, detector, detectorAnomalies, detectorIndex)
        : buildMetricConfig(func, detector, detectorAnomalies, detectorIndex, entityType);

    return config != null ? [config] : [];
  });
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
    const config: JobConfig = {
      sourceIndex: (job.datafeed_config?.indices ?? []) as string[],
      datafeedQuery: (job.datafeed_config?.query as QueryDslQueryContainer) ?? { match_all: {} },
      detectors: job.analysis_config?.detectors ?? [],
      influencers: (job.analysis_config?.influencers ?? []) as string[],
    };
    jobConfigCache.set(jobId, config);
    return config;
  } catch (err) {
    logger.warn(`Failed to load job config for ${jobId}: ${err}`);
    jobConfigCache.set(jobId, null);
    return null;
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

interface SampleHits {
  hits: { hits: unknown[] };
}

interface RareBucket {
  key: string;
  doc_count: number;
  sample_hits: SampleHits;
}

interface QuerySharedOpts {
  abortSignal: AbortSignal;
  config: BaselineConfig;
  entityId: string;
  esClient: ElasticsearchClient;
  jobConfig: JobConfig;
  jobId: string;
  logger: Logger;
  runtimeMappings: MappingRuntimeFields;
  sourceIncludes: string[] | undefined;
}

const fetchRareBaseline = async ({
  abortSignal,
  config,
  entityId,
  esClient,
  jobConfig,
  jobId,
  logger,
  runtimeMappings,
  sourceIncludes,
}: QuerySharedOpts): Promise<BaselineBucket[]> => {
  try {
    const anomalyLatest = config.anomalies[config.anomalies.length - 1];
    const { targetField } = config;
    if (!targetField) return [];

    // Exclude cold and frozen tiers for query performance
    const mustNot: QueryDslQueryContainer[] = [{ terms: { _tier: ['data_cold', 'data_frozen'] } }];

    // Exclude the anomalous values from the baseline aggregation
    if (config.exclusionValues.length > 0) {
      mustNot.push({ terms: { [targetField]: config.exclusionValues } });
    }

    const resp = await esClient.search<unknown, { baseline: { buckets: RareBucket[] } }>(
      {
        index: jobConfig.sourceIndex,
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

              // Field that triggered anomalous value must exist
              { exists: { field: targetField } },

              // Limit time range to anomaly lookback window
              {
                range: {
                  '@timestamp': {
                    lt: anomalyLatest.timestamp,
                    gte: `now-${ML_AD_LOOKBACK}`,
                  },
                },
              },
            ],
            must_not: mustNot,
          },
        },
        aggs: {
          baseline: {
            terms: {
              field: targetField,
              size: BASELINE_BUCKET_SIZE,
              order: { _count: 'desc' },
            },
            aggs: {
              sample_hits: {
                top_hits: {
                  size: TOP_SOURCE_HITS,
                  ...(sourceIncludes ? { _source: { includes: sourceIncludes } } : {}),
                },
              },
            },
          },
        },
      },
      { signal: abortSignal }
    );

    return (resp.aggregations?.baseline?.buckets ?? []).map((bucket) => ({
      value: bucket.key,
      doc_count: bucket.doc_count,
      topHits: bucket.sample_hits?.hits?.hits ?? [],
    }));
  } catch (err) {
    logger.warn(`Baseline agg failed for job ${jobId}, entity ${entityId}: ${err}`);
    return [];
  }
};

const fetchMetricBaseline = async ({
  abortSignal,
  config,
  entityId,
  esClient,
  jobConfig,
  jobId,
  logger,
  runtimeMappings,
  sourceIncludes,
}: QuerySharedOpts): Promise<BaselineBucket[]> => {
  try {
    const anomalyLatest = config.anomalies[config.anomalies.length - 1];
    const termsFields = config.groupFields;

    const additionalFilters = termsFields.map((field) => {
      const values = config.groupFieldValues[field] ?? [];
      return values && values.length > 0 ? { terms: { [field]: values } } : { exists: { field } };
    });

    const resp = await esClient.search<unknown, { sample_hits: SampleHits }>(
      {
        index: jobConfig.sourceIndex,
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

              // Add additional filters to filter the data down to the specific
              // value that triggered the anomaly record
              ...additionalFilters,

              // Limit time range to anomaly lookback window
              {
                range: {
                  '@timestamp': {
                    lt: anomalyLatest.timestamp,
                    gte: `now-${ML_AD_LOOKBACK}`,
                  },
                },
              },

              // Exclude cold and frozen tiers for query performance
              { bool: { must_not: [{ terms: { _tier: ['data_cold', 'data_frozen'] } }] } },
            ],
          },
        },
        aggs: {
          sample_hits: {
            top_hits: {
              size: TOP_SOURCE_HITS,
              ...(sourceIncludes ? { _source: { includes: sourceIncludes } } : {}),
            },
          },
        },
      },
      { signal: abortSignal }
    );

    return [
      {
        value: '',
        doc_count: 0,
        topHits: resp.aggregations?.sample_hits?.hits?.hits ?? [],
      },
    ];
  } catch (err) {
    logger.warn(`Baseline agg failed for job ${jobId}, entity ${entityId}: ${err}`);
    return [];
  }
};

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
}: FetchBaselineBehaviorOpts): Promise<BaselineBucket[] | null> => {
  if (anomalies.length === 0) return null;

  const jobConfig = await getJobConfig({ ml, jobId, soClient, logger });
  if (!jobConfig || jobConfig.sourceIndex.length === 0 || jobConfig.detectors.length === 0) {
    return null;
  }

  const baselineConfigs = getBaselineConfigs(jobConfig, anomalies, entityType);
  if (baselineConfigs.length === 0) return null;

  const runtimeMappings = {
    entity_id: euid.painless.getEuidRuntimeMapping(entityType),
  };

  const sourceIncludes = jobConfig.influencers.length > 0 ? jobConfig.influencers : undefined;
  const sharedOpts = {
    abortSignal,
    entityId,
    esClient,
    jobConfig,
    jobId,
    logger,
    runtimeMappings,
    sourceIncludes,
  };

  const bucketsByConfig = await Promise.all(
    baselineConfigs.map((config) =>
      config.func === 'rare'
        ? fetchRareBaseline({ ...sharedOpts, config })
        : fetchMetricBaseline({ ...sharedOpts, config })
    )
  );

  return bucketsByConfig.flat();
};
