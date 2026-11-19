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

export interface EvalutionAggResults {
  instances: {
    after_key?: EvaluationAfterKey;
    buckets: EvaluationBucket[];
  };
}

interface CandidatesAggResults {
  instances: {
    after_key?: EvaluationAfterKey;
    buckets: Array<Pick<EvaluationBucket, 'key'>>;
  };
}

interface EvaluationContext {
  esClient: ElasticsearchClient;
  slo: SLODefinition;
  params: BurnRateRuleParams;
  startedAt: Date;
  projectRouting?: string;
}

async function searchInstances<TAggregations>(
  { esClient, projectRouting }: EvaluationContext,
  spanName: string,
  request: Omit<SearchRequest, 'index'>
): Promise<TAggregations> {
  const results = await withSpan({ name: spanName, type: 'rule' }, () =>
    esClient.search<undefined, TAggregations>({
      index: SLI_DESTINATION_INDEX_PATTERN,
      ...(projectRouting ? { project_routing: projectRouting } : {}),
      ...request,
    })
  );

  if (!results.aggregations) {
    throw new Error('Elasticsearch query failed to return a valid aggregation');
  }
  return results.aggregations;
}

async function findCandidateInstanceIds(context: EvaluationContext): Promise<string[]> {
  const { slo, params, startedAt } = context;
  const instanceIds: string[] = [];
  let afterKey: EvaluationAfterKey | undefined;
  do {
    const { instances } = await searchInstances<CandidatesAggResults>(
      context,
      BURN_RATE_EXECUTOR_SPAN_NAMES.CANDIDATES_QUERY,
      buildCandidatesQuery(startedAt, slo, params, afterKey)
    );
    instanceIds.push(...instances.buckets.map(({ key }) => key.instanceId));
    afterKey = instances.after_key;
  } while (afterKey);

  return instanceIds;
}

async function evaluateCandidates(context: EvaluationContext): Promise<EvaluationBucket[]> {
  const { slo, params, startedAt } = context;
  const candidateIds = await findCandidateInstanceIds(context);
  const buckets: EvaluationBucket[] = [];
  // Chunks match the composite page size, so each chunk is evaluated in a single page.
  for (const instanceIds of chunk(candidateIds, EVALUATION_PAGE_SIZE)) {
    const { instances } = await searchInstances<EvalutionAggResults>(
      context,
      BURN_RATE_EXECUTOR_SPAN_NAMES.ES_QUERY,
      buildQuery(startedAt, slo, params, undefined, instanceIds)
    );
    buckets.push(...instances.buckets);
  }

  return buckets;
}

async function evaluateAllInstances(context: EvaluationContext): Promise<EvaluationBucket[]> {
  const { slo, params, startedAt } = context;
  const buckets: EvaluationBucket[] = [];
  let afterKey: EvaluationAfterKey | undefined;
  do {
    const { instances } = await searchInstances<EvalutionAggResults>(
      context,
      BURN_RATE_EXECUTOR_SPAN_NAMES.ES_QUERY,
      buildQuery(startedAt, slo, params, afterKey)
    );
    buckets.push(...instances.buckets);
    afterKey = instances.after_key;
  } while (afterKey);

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
  // Instances without bad events in the short windows are not candidates, yet can reach a threshold that is not positive.
  const canPrefilterCandidates = params.windows.every(
    ({ burnRateThreshold }) => burnRateThreshold > 0
  );
  const buckets = canPrefilterCandidates
    ? await evaluateCandidates(context)
    : await evaluateAllInstances(context);
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
