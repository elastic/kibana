/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { get } from 'lodash';
import { Duration, SLODefinition, toDurationUnit } from '../../../../domain/models';
import { BurnRateRuleParams } from '../types';
import { SLI_DESTINATION_INDEX_PATTERN } from '../../../../../common/constants';
import {
  buildQuery,
  EvaluationAfterKey,
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

export interface EvaluationBucket {
  key: EvaluationAfterKey;
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

async function queryAllResults(
  esClient: ElasticsearchClient,
  slo: SLODefinition,
  params: BurnRateRuleParams,
  startedAt: Date,
  buckets: EvaluationBucket[] = [],
  lastAfterKey?: { instanceId: string }
): Promise<EvaluationBucket[]> {
  const queryAndAggs = buildQuery(startedAt, slo, params, lastAfterKey);
  const results = await esClient.search<undefined, EvalutionAggResults>({
    index: SLI_DESTINATION_INDEX_PATTERN,
    ...queryAndAggs,
  });

  if (!results.aggregations) {
    throw new Error('Elasticsearch query failed to return a valid aggregation');
  }
  if (results.aggregations.instances.buckets.length === 0) {
    return buckets;
  }

  return queryAllResults(
    esClient,
    slo,
    params,
    startedAt,
    [...buckets, ...results.aggregations.instances.buckets],
    results.aggregations.instances.after_key
  );
}

export async function evaluate(
  esClient: ElasticsearchClient,
  slo: SLODefinition,
  params: BurnRateRuleParams,
  startedAt: Date
) {
  const buckets = await queryAllResults(esClient, slo, params, startedAt);
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
