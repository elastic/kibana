/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { withSpan } from '@kbn/apm-utils';
import { chunk, get } from 'lodash';
import type { SearchRequest, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { BURN_RATE_EXECUTOR_SPAN_NAMES } from '../constants';
import type { SLODefinition } from '../../../../domain/models';
import { Duration, toDurationUnit } from '../../../../domain/models';
import type { BurnRateRuleParams } from '../types';
import { SLI_DESTINATION_INDEX_PATTERN } from '../../../../../common/constants';
import type { EvaluationAfterKey } from './build_query';
import {
  buildCandidatesQuery,
  buildQuery,
  generateAboveThresholdKey,
  generateBurnRateKey,
  generateWindowId,
  INSTANCES_PAGE_SIZE,
  LONG_WINDOW,
  SHORT_WINDOW,
} from './build_query';

export interface EvaluationWindowStats {
  doc_count: number;
  good: { value: number };
  total: { value: number };
}

export interface TopHitsAggResults {
  slo: {
    groupings: Record<string, unknown>;
  };
}

export interface EvaluationBucket {
  key: EvaluationAfterKey;
  groupings: SearchResponse<TopHitsAggResults>;
  doc_count: number;
  WINDOW_0_SHORT?: EvaluationWindowStats;
  WINDOW_1_SHORT?: EvaluationWindowStats;
  WINDOW_2_SHORT?: EvaluationWindowStats;
  WINDOW_3_SHORT?: EvaluationWindowStats;
  WINDOW_0_LONG?: EvaluationWindowStats;
  WINDOW_1_LONG?: EvaluationWindowStats;
  WINDOW_2_LONG?: EvaluationWindowStats;
  WINDOW_3_LONG?: EvaluationWindowStats;
  WINDOW_0_SHORT_BURN_RATE?: { value: number };
  WINDOW_1_SHORT_BURN_RATE?: { value: number };
  WINDOW_2_SHORT_BURN_RATE?: { value: number };
  WINDOW_3_SHORT_BURN_RATE?: { value: number };
  WINDOW_0_LONG_BURN_RATE?: { value: number };
  WINDOW_1_LONG_BURN_RATE?: { value: number };
  WINDOW_2_LONG_BURN_RATE?: { value: number };
  WINDOW_3_LONG_BURN_RATE?: { value: number };
  WINDOW_0_SHORT_ABOVE_THRESHOLD?: { value: number };
  WINDOW_1_SHORT_ABOVE_THRESHOLD?: { value: number };
  WINDOW_2_SHORT_ABOVE_THRESHOLD?: { value: number };
  WINDOW_3_SHORT_ABOVE_THRESHOLD?: { value: number };
  WINDOW_0_LONG_ABOVE_THRESHOLD?: { value: number };
  WINDOW_1_LONG_ABOVE_THRESHOLD?: { value: number };
  WINDOW_2_LONG_ABOVE_THRESHOLD?: { value: number };
  WINDOW_3_LONG_ABOVE_THRESHOLD?: { value: number };
}

interface InstancesPage<TBucket> {
  after_key?: EvaluationAfterKey;
  buckets: TBucket[];
}

export interface EvalutionAggResults {
  instances: InstancesPage<EvaluationBucket>;
}

async function queryAllPages<TBucket>(
  queryPage: (afterKey?: EvaluationAfterKey) => Promise<InstancesPage<TBucket>>,
  afterKey?: EvaluationAfterKey,
  collected: TBucket[] = []
): Promise<TBucket[]> {
  const { buckets, after_key: nextAfterKey } = await queryPage(afterKey);
  const allBuckets = [...collected, ...buckets];

  // A page can be empty because the bucket_selector removed all of its instances, so only a missing
  // after_key marks the last page.
  return nextAfterKey ? queryAllPages(queryPage, nextAfterKey, allBuckets) : allBuckets;
}

// A window can only trigger for an instance with bad events in its short window when its threshold
// is positive. With a threshold of 0 or less, instances without bad events can trigger too.
const allThresholdsArePositive = ({ windows }: BurnRateRuleParams): boolean =>
  windows.every(({ burnRateThreshold }) => burnRateThreshold > 0);

export async function evaluate(
  esClient: ElasticsearchClient,
  slo: SLODefinition,
  params: BurnRateRuleParams,
  startedAt: Date,
  projectRouting?: string
) {
  const searchInstances = async <TBucket>(
    request: Omit<SearchRequest, 'index'>
  ): Promise<InstancesPage<TBucket>> => {
    const results = await withSpan(
      { name: BURN_RATE_EXECUTOR_SPAN_NAMES.ES_QUERY, type: 'rule' },
      () =>
        esClient.search<undefined, { instances: InstancesPage<TBucket> }>({
          index: SLI_DESTINATION_INDEX_PATTERN,
          ...(projectRouting ? { project_routing: projectRouting } : {}),
          ...request,
        })
    );
    if (!results.aggregations) {
      throw new Error('Elasticsearch query failed to return a valid aggregation');
    }
    return results.aggregations.instances;
  };

  const evaluateInstances = (instanceIds?: string[]) =>
    queryAllPages<EvaluationBucket>((afterKey) =>
      searchInstances(buildQuery(startedAt, slo, params, afterKey, instanceIds))
    );

  if (!allThresholdsArePositive(params)) {
    return transformBucketToResults(await evaluateInstances(), params);
  }

  const candidates = await queryAllPages<{ key: EvaluationAfterKey }>((afterKey) =>
    searchInstances(buildCandidatesQuery(startedAt, slo, params, afterKey))
  );
  const buckets = await chunk(
    candidates.map(({ key }) => key.instanceId),
    INSTANCES_PAGE_SIZE
  ).reduce<Promise<EvaluationBucket[]>>(
    async (evaluated, instanceIds) => [
      ...(await evaluated),
      ...(await evaluateInstances(instanceIds)),
    ],
    Promise.resolve([])
  );

  return transformBucketToResults(buckets, params);
}

function transformBucketToResults(buckets: EvaluationBucket[], params: BurnRateRuleParams) {
  return buckets.map((bucket) => {
    for (const index in params.windows) {
      if (params.windows[index]) {
        const winDef = params.windows[index];
        const windowId = generateWindowId(index);
        const shortWindowThresholdKey = generateAboveThresholdKey(windowId, SHORT_WINDOW);
        const longWindowThresholdKey = generateAboveThresholdKey(windowId, LONG_WINDOW);
        const isShortWindowTriggering = get(bucket, [shortWindowThresholdKey, 'value'], 0);
        const isLongWindowTriggering = get(bucket, [longWindowThresholdKey, 'value'], 0);

        if (isShortWindowTriggering && isLongWindowTriggering) {
          return {
            instanceId: bucket.key.instanceId,
            groupings: transformGroupings(bucket.groupings),
            shouldAlert: true,
            longWindowBurnRate: get(
              bucket,
              [generateBurnRateKey(windowId, LONG_WINDOW), 'value'],
              0
            ) as number,
            shortWindowBurnRate: get(
              bucket,
              [generateBurnRateKey(windowId, SHORT_WINDOW), 'value'],
              0
            ) as number,
            shortWindowDuration: new Duration(
              winDef.shortWindow.value,
              toDurationUnit(winDef.shortWindow.unit)
            ),
            longWindowDuration: new Duration(
              winDef.longWindow.value,
              toDurationUnit(winDef.longWindow.unit)
            ),
            window: winDef,
          };
        }
      }
    }
    throw new Error(`Evaluation query for ${bucket.key.instanceId} failed.`);
  });
}

function transformGroupings(
  groupings: SearchResponse<TopHitsAggResults>
): Record<string, unknown> | undefined {
  if (groupings && groupings.hits && groupings.hits.hits && groupings.hits.hits.length > 0) {
    const topHit = groupings.hits.hits[0];
    return topHit._source?.slo?.groupings;
  }
}
