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
  EVALUATION_PAGE_SIZE,
  generateAboveThresholdKey,
  generateBurnRateKey,
  generateWindowId,
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

interface InstancesAggResults<TBucket> {
  instances: {
    after_key?: EvaluationAfterKey;
    buckets: TBucket[];
  };
}
type SpanName = (typeof BURN_RATE_EXECUTOR_SPAN_NAMES)[keyof typeof BURN_RATE_EXECUTOR_SPAN_NAMES];

interface EvaluationContext {
  esClient: ElasticsearchClient;
  slo: SLODefinition;
  params: BurnRateRuleParams;
  startedAt: Date;
  projectRouting?: string;
}

async function searchInstances<TBucket>(
  { esClient, projectRouting }: EvaluationContext,
  spanName: SpanName,
  request: Omit<SearchRequest, 'index'>
): Promise<InstancesAggResults<TBucket>['instances']> {
  const results = await withSpan({ name: spanName, type: 'rule' }, () =>
    esClient.search<undefined, InstancesAggResults<TBucket>>({
      index: SLI_DESTINATION_INDEX_PATTERN,
      ...(projectRouting ? { project_routing: projectRouting } : {}),
      ...request,
    })
  );

  if (!results.aggregations) {
    throw new Error('Elasticsearch query failed to return a valid aggregation');
  }
  return results.aggregations.instances;
}

async function searchAllPages<TBucket>(
  context: EvaluationContext,
  spanName: SpanName,
  buildRequest: (afterKey?: EvaluationAfterKey) => Omit<SearchRequest, 'index'>
): Promise<TBucket[]> {
  const buckets: TBucket[] = [];
  let afterKey: EvaluationAfterKey | undefined;
  do {
    const instances = await searchInstances<TBucket>(context, spanName, buildRequest(afterKey));
    buckets.push(...instances.buckets);
    afterKey = instances.after_key;
  } while (afterKey);

  return buckets;
}

async function evaluateCandidates(context: EvaluationContext): Promise<EvaluationBucket[]> {
  const { slo, params, startedAt } = context;
  const candidates = await searchAllPages<Pick<EvaluationBucket, 'key'>>(
    context,
    BURN_RATE_EXECUTOR_SPAN_NAMES.CANDIDATES_QUERY,
    (afterKey) => buildCandidatesQuery(startedAt, slo, params, afterKey)
  );
  const candidateIds = candidates.map(({ key }) => key.instanceId);
  const buckets: EvaluationBucket[] = [];
  // Chunks match the composite page size, so each chunk is evaluated in a single page.
  for (const instanceIds of chunk(candidateIds, EVALUATION_PAGE_SIZE)) {
    const instances = await searchInstances<EvaluationBucket>(
      context,
      BURN_RATE_EXECUTOR_SPAN_NAMES.ES_QUERY,
      buildQuery(startedAt, slo, params, undefined, instanceIds)
    );
    buckets.push(...instances.buckets);
  }

  return buckets;
}

export async function evaluate(
  esClient: ElasticsearchClient,
  slo: SLODefinition,
  params: BurnRateRuleParams,
  startedAt: Date,
  projectRouting?: string
) {
  if (params.windows.length === 0) {
    return [];
  }

  const context: EvaluationContext = { esClient, slo, params, startedAt, projectRouting };
  // A threshold <= 0 is reached by instances without bad events in the short windows, which the candidates query may not return.
  const canPrefilterCandidates = params.windows.every(
    ({ burnRateThreshold }) => burnRateThreshold > 0
  );
  const buckets = canPrefilterCandidates
    ? await evaluateCandidates(context)
    : await searchAllPages<EvaluationBucket>(
        context,
        BURN_RATE_EXECUTOR_SPAN_NAMES.ES_QUERY,
        (afterKey) => buildQuery(startedAt, slo, params, afterKey)
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
