/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { withSpan } from '@kbn/apm-utils';
import { get } from 'lodash';
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

interface CandidatesAggResults {
  instances?: {
    after_key?: EvaluationAfterKey;
    buckets?: Array<Pick<EvaluationBucket, 'key'>>;
  };
}

export type BurnRateEvaluationResult = ReturnType<typeof transformBucketToResults>[number];

interface EvaluateOptions {
  maxResults?: number;
}

export interface EvaluationResult {
  results: BurnRateEvaluationResult[];
  hasReachedLimit: boolean;
}

type SpanName = (typeof BURN_RATE_EXECUTOR_SPAN_NAMES)[keyof typeof BURN_RATE_EXECUTOR_SPAN_NAMES];

interface EvaluationContext {
  esClient: ElasticsearchClient;
  slo: SLODefinition;
  params: BurnRateRuleParams;
  startedAt: Date;
}

async function searchInstances<TBucket>(
  { esClient }: EvaluationContext,
  spanName: SpanName,
  request: Omit<SearchRequest, 'index'>
): Promise<InstancesAggResults<TBucket>['instances']> {
  const results = await withSpan({ name: spanName, type: 'rule' }, () =>
    esClient.search<undefined, InstancesAggResults<TBucket>>({
      index: SLI_DESTINATION_INDEX_PATTERN,
      ...request,
    })
  );

  if (!results.aggregations) {
    throw new Error('Elasticsearch query failed to return a valid aggregation');
  }
  return results.aggregations.instances;
}

async function* searchPages<TBucket>(
  context: EvaluationContext,
  spanName: SpanName,
  buildRequest: (afterKey?: EvaluationAfterKey) => Omit<SearchRequest, 'index'>
): AsyncGenerator<TBucket[]> {
  let afterKey: EvaluationAfterKey | undefined;
  do {
    const instances = await searchInstances<TBucket>(context, spanName, buildRequest(afterKey));
    yield instances.buckets;
    afterKey = instances.after_key;
  } while (afterKey);
}

async function searchCandidates(
  { esClient, slo, params, startedAt }: EvaluationContext,
  afterKey?: EvaluationAfterKey
): Promise<{ instanceIds: string[]; afterKey?: EvaluationAfterKey }> {
  const results = await withSpan(
    { name: BURN_RATE_EXECUTOR_SPAN_NAMES.CANDIDATES_QUERY, type: 'rule' },
    () =>
      esClient.search<undefined, CandidatesAggResults>({
        index: SLI_DESTINATION_INDEX_PATTERN,
        ...buildCandidatesQuery(startedAt, slo, params, afterKey),
      })
  );

  // The filter_path drops the empty objects, so an empty page can come without its buckets or aggregations.
  const instances = results.aggregations?.instances;
  return {
    instanceIds: (instances?.buckets ?? []).map(({ key }) => key.instanceId),
    afterKey: instances?.after_key,
  };
}

async function* evaluateCandidatePages(
  context: EvaluationContext
): AsyncGenerator<EvaluationBucket[]> {
  const { slo, params, startedAt } = context;
  let afterKey: EvaluationAfterKey | undefined;
  do {
    const candidates = await searchCandidates(context, afterKey);
    if (candidates.instanceIds.length > 0) {
      // Candidates pages match the composite page size, so each page is evaluated in a single query.
      const instances = await searchInstances<EvaluationBucket>(
        context,
        BURN_RATE_EXECUTOR_SPAN_NAMES.ES_QUERY,
        buildQuery(startedAt, slo, params, undefined, candidates.instanceIds)
      );
      yield instances.buckets;
    }
    afterKey = candidates.afterKey;
  } while (afterKey);
}

/**
 * Evaluates the SLO instances breaching the burn rate windows, stopping once more than `maxResults` breach.
 */
export async function evaluate(
  esClient: ElasticsearchClient,
  slo: SLODefinition,
  params: BurnRateRuleParams,
  startedAt: Date,
  { maxResults = Number.POSITIVE_INFINITY }: EvaluateOptions = {}
): Promise<EvaluationResult> {
  if (params.windows.length === 0) {
    return { results: [], hasReachedLimit: false };
  }

  const context: EvaluationContext = { esClient, slo, params, startedAt };
  // A threshold <= 0 is reached by instances without bad events in the short windows, which the candidates query may not return.
  const canPrefilterCandidates = params.windows.every(
    ({ burnRateThreshold }) => burnRateThreshold > 0
  );
  const pages = canPrefilterCandidates
    ? evaluateCandidatePages(context)
    : searchPages<EvaluationBucket>(context, BURN_RATE_EXECUTOR_SPAN_NAMES.ES_QUERY, (afterKey) =>
        buildQuery(startedAt, slo, params, afterKey)
      );

  const results: BurnRateEvaluationResult[] = [];
  for await (const buckets of pages) {
    results.push(...transformBucketToResults(buckets, params));
    if (results.length > maxResults) {
      break;
    }
  }

  return {
    results: results.slice(0, maxResults),
    hasReachedLimit: results.length > maxResults,
  };
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
