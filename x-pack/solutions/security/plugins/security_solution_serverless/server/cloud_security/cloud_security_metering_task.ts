/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import {
  AGGREGATION_PRECISION_THRESHOLD,
  ASSETS_SAMPLE_GRANULARITY,
  CDR_METERING_STATE_INDEX,
  CLOUD_SECURITY_TASK_TYPE,
  CNVM,
  CSPM,
  KSPM,
  METERING_CONFIGS,
  BILLABLE_ASSETS_CONFIG,
} from './constants';
import { CSPM_METERING_WINDOW, getCspmStateAggQuery } from './cspm_metering_state_query';
import type { ResourceSubtypeCounter, Tier, UsageRecord } from '../types';
import type {
  CloudSecurityMeteringCallbackInput,
  CloudSecuritySolutions,
  AssetCountAggregation,
  ResourceSubtypeAggregationBucket,
} from './types';

export const getUsageRecords = (
  assetCountAggregation: AssetCountAggregation,
  cloudSecuritySolution: CloudSecuritySolutions,
  taskId: string,
  tier: Tier,
  projectId: string,
  periodSeconds: number,
  logger: Logger
): UsageRecord => {
  let assetCount;
  let resourceSubtypeCounterMap;

  if (cloudSecuritySolution === CSPM || cloudSecuritySolution === KSPM) {
    const resourceSubtypeBuckets: ResourceSubtypeAggregationBucket[] =
      assetCountAggregation.resource_sub_type.buckets;

    const billableAssets = BILLABLE_ASSETS_CONFIG[cloudSecuritySolution].values;
    assetCount = resourceSubtypeBuckets
      .filter((bucket) => billableAssets.includes(bucket.key))
      .reduce((acc, bucket) => acc + bucket.unique_assets.value, 0);

    resourceSubtypeCounterMap = assetCountAggregation.resource_sub_type.buckets.reduce(
      (resourceMap, item) => {
        // By the usage spec, the resource subtype counter should be a string // https://github.com/elastic/usage-api/blob/main/api/user-v1-spec.yml
        resourceMap[item.key] = String(item.unique_assets.value);
        return resourceMap;
      },
      {} as ResourceSubtypeCounter
    );
  } else {
    assetCount = assetCountAggregation.unique_assets.value;
  }

  if (assetCount > AGGREGATION_PRECISION_THRESHOLD) {
    logger.warn(
      `The number of unique resources for {${cloudSecuritySolution}} is ${assetCount}, which is higher than the AGGREGATION_PRECISION_THRESHOLD of ${AGGREGATION_PRECISION_THRESHOLD}.`
    );
  }

  const minTimestamp = new Date(assetCountAggregation.min_timestamp.value_as_string).toISOString();

  const creationTimestamp = new Date();
  const minutes = creationTimestamp.getMinutes();
  if (minutes >= 30) {
    creationTimestamp.setMinutes(30, 0, 0);
  } else {
    creationTimestamp.setMinutes(0, 0, 0);
  }
  const roundedCreationTimestamp = creationTimestamp.toISOString();

  const usageRecord: UsageRecord = {
    id: `${CLOUD_SECURITY_TASK_TYPE}_${cloudSecuritySolution}_${projectId}_${roundedCreationTimestamp}`,
    usage_timestamp: minTimestamp,
    creation_timestamp: creationTimestamp.toISOString(),
    usage: {
      type: CLOUD_SECURITY_TASK_TYPE,
      sub_type: cloudSecuritySolution,
      quantity: assetCount,
      period_seconds: periodSeconds,
      ...(resourceSubtypeCounterMap && { metadata: resourceSubtypeCounterMap }),
    },
    source: {
      id: taskId,
      instance_group_id: projectId,
      metadata: { tier },
    },
  };

  return usageRecord;
};

export const getAggregationByCloudSecuritySolution = (
  cloudSecuritySolution: CloudSecuritySolutions
) => {
  if (cloudSecuritySolution === CSPM || cloudSecuritySolution === KSPM)
    return {
      resource_sub_type: {
        terms: {
          field: BILLABLE_ASSETS_CONFIG[cloudSecuritySolution].filter_attribute,
        },
        aggs: {
          unique_assets: {
            cardinality: {
              field: METERING_CONFIGS[cloudSecuritySolution].assets_identifier,
              precision_threshold: AGGREGATION_PRECISION_THRESHOLD,
            },
          },
        },
      },
      min_timestamp: {
        min: {
          field: '@timestamp',
        },
      },
    };

  return {
    unique_assets: {
      cardinality: {
        field: METERING_CONFIGS[cloudSecuritySolution].assets_identifier,
        precision_threshold: AGGREGATION_PRECISION_THRESHOLD,
      },
    },
    min_timestamp: {
      min: {
        field: '@timestamp',
      },
    },
  };
};

export const getSearchQueryByCloudSecuritySolution = (
  cloudSecuritySolution: CloudSecuritySolutions
) => {
  const mustFilters = [];

  if (
    cloudSecuritySolution === CSPM ||
    cloudSecuritySolution === KSPM ||
    cloudSecuritySolution === CNVM
  ) {
    mustFilters.push({
      range: {
        '@timestamp': {
          gte: `now-${ASSETS_SAMPLE_GRANULARITY}`,
        },
      },
    });
  }

  if (cloudSecuritySolution === CSPM || cloudSecuritySolution === KSPM) {
    mustFilters.push({
      term: {
        'rule.benchmark.posture_type': cloudSecuritySolution,
      },
    });
  }

  return {
    bool: {
      must: mustFilters,
    },
  };
};

export const getAssetAggQueryByCloudSecuritySolution = (
  cloudSecuritySolution: CloudSecuritySolutions
) => {
  const query = getSearchQueryByCloudSecuritySolution(cloudSecuritySolution);
  const aggs = getAggregationByCloudSecuritySolution(cloudSecuritySolution);

  return {
    index: METERING_CONFIGS[cloudSecuritySolution].index,
    query,
    size: 0,
    aggs,
  };
};

/**
 * Answers one question each metering run: is the state-index billing path
 * ready to use, or should CSPM keep billing the legacy way this cycle?
 *
 * WHY THE CHECK EXISTS. The state index is only populated once two things
 * are true, neither of them instant or under our control: (1) the customer's
 * cloud_security_posture package is >=3.6.0, whose ingest pipeline writes the
 * resource.lifecycle fields, and (2) the metering_state transform has run at
 * least once against those fields. Until both hold, the index is empty and
 * CSPM must bill via the legacy latest-index query — which is why this code
 * can ship before the package does: the new path stays dormant until the
 * data exists.
 *
 * WHY IT FAILS OPEN. If the probe itself errors (ES hiccup, permissions),
 * failing closed would skip the billing cycle — the customer bills nothing
 * for 30 minutes because of an infrastructure blip. Failing open (return
 * false) bills the customer exactly as they were billed yesterday. Nothing
 * is lost, so a probe failure is designed behavior, not an emergency: that
 * is why no error is logged here. The caller logs one debug line with the
 * selected path, so an investigation can still see which query billed any
 * given cycle.
 *
 * KNOWN IMPERFECTION, ACCEPTED ON PURPOSE. Right after a package upgrade the
 * transform fills the state index incrementally, and this probe only asks
 * "is there at least ONE fresh doc?". For a short window the index may hold
 * a partial asset set, so CSPM bills from an incomplete picture — a slight
 * undercharge, in the customer's favor, for typically one or two 30-minute
 * cycles, once, at upgrade time. The alternative is an "enough docs" check,
 * but "enough" depends on fleet size and becomes a per-project tunable that
 * can be mis-tuned into worse problems. If you found this comment while
 * investigating an underbilling report around a package upgrade: this is
 * that gap, it was sized and chosen deliberately.
 */
const stateIndexHasFreshData = async (esClient: ElasticsearchClient): Promise<boolean> => {
  try {
    const response = await esClient.search(
      {
        index: CDR_METERING_STATE_INDEX,
        size: 1,
        _source: false,
        query: {
          bool: {
            must: [
              { term: { posture_type: CSPM } },
              { range: { last_seen: { gte: CSPM_METERING_WINDOW } } },
            ],
          },
        },
      },
      { ignore: [404] }
    );

    return (response.hits?.hits?.length ?? 0) > 0;
  } catch {
    return false;
  }
};

export const getAssetAggByCloudSecuritySolution = async (
  esClient: ElasticsearchClient,
  cloudSecuritySolution: CloudSecuritySolutions,
  logger: Logger
): Promise<AssetCountAggregation | undefined> => {
  const useStateIndex = cloudSecuritySolution === CSPM && (await stateIndexHasFreshData(esClient));

  if (cloudSecuritySolution === CSPM) {
    logger.debug(`CSPM metering path: ${useStateIndex ? 'state-index' : 'legacy'}`);
  }

  const assetsAggQuery = useStateIndex
    ? getCspmStateAggQuery()
    : getAssetAggQueryByCloudSecuritySolution(cloudSecuritySolution);

  // @ts-expect-error elasticsearch@9.0.0 The types are tripping because of the dynamic aggs
  const response = await esClient.search<unknown, AssetCountAggregation>(assetsAggQuery);

  if (!response.aggregations) return;

  // Guard the state path against an empty result set: the fresh-data probe can
  // pass while the billing query matches nothing (e.g. only GCP instances
  // failing the two-scan rule), leaving min_timestamp null. This does not
  // change the billing outcome — getUsageRecords would throw a RangeError on
  // min_timestamp.value_as_string, and the catch-all in
  // getCloudSecurityUsageRecord returns undefined where this returns [];
  // neither emits a usage record. What it avoids is the throw itself and the
  // recurring error-level log it produces every cycle, which reads to on-call
  // as a real metering failure rather than a legitimately empty result.
  if (useStateIndex && response.aggregations.min_timestamp?.value_as_string == null) {
    return;
  }

  return response.aggregations as AssetCountAggregation;
};

const indexHasDataInDateRange = async (
  esClient: ElasticsearchClient,
  cloudSecuritySolution: CloudSecuritySolutions
) => {
  const response = await esClient.search(
    {
      index: METERING_CONFIGS[cloudSecuritySolution].index,
      size: 1,
      _source: false,
      query: getSearchQueryByCloudSecuritySolution(cloudSecuritySolution),
    },
    { ignore: [404] }
  );

  return response.hits?.hits.length > 0;
};

export const getCloudSecurityUsageRecord = async ({
  esClient,
  projectId,
  taskId,
  cloudSecuritySolution,
  tier,
  logger,
}: CloudSecurityMeteringCallbackInput): Promise<UsageRecord[] | undefined> => {
  try {
    if (!(await indexHasDataInDateRange(esClient, cloudSecuritySolution))) return;

    // const periodSeconds = Math.floor((new Date().getTime() - searchFrom.getTime()) / 1000);
    const periodSeconds = 1800; // Workaround to prevent overbilling by charging for a constant time window. The issue should be resolved in https://github.com/elastic/security-team/issues/9424.

    const assetCountAggregation = await getAssetAggByCloudSecuritySolution(
      esClient,
      cloudSecuritySolution,
      logger
    );

    if (!assetCountAggregation) return [];

    const usageRecords = await getUsageRecords(
      assetCountAggregation,
      cloudSecuritySolution,
      taskId,
      tier,
      projectId,
      periodSeconds,
      logger
    );

    return [usageRecords];
  } catch (err) {
    logger.error(`Failed to fetch ${cloudSecuritySolution} metering data ${err}`);
  }
};
