/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { AggregateEventsBySavedObjectResult } from '@kbn/event-log-plugin/server';
import type { RawData } from '../../../utils/normalization';
import type { HealthHistory, HealthOverInterval, HealthOverviewStats } from '../aggregations/types';
import { normalizeRuleExecutionStatsAggregationResult } from './normalize_rule_execution_stats_aggregation_result';

export const normalizeRuleHealthAggregationResult = (
  result: AggregateEventsBySavedObjectResult,
  requestAggs: Record<string, estypes.AggregationsAggregationContainer>
): HealthOverInterval => {
  const aggregations = result.aggregations ?? {};
  return {
    stats_over_interval: normalizeRuleExecutionStatsAggregationResult(
      aggregations,
      'whole-interval'
    ),
    history_over_interval: normalizeRuleHistoryOverInterval(aggregations),
    debug: {
      eventLog: {
        request: { aggs: requestAggs },
        response: { aggregations },
      },
    },
  };
};

const normalizeRuleHistoryOverInterval = (
  aggregations: Record<string, RawData>
): HealthHistory<HealthOverviewStats> => {
  const statsHistory = aggregations.statsHistory || {};

  return {
    buckets: (statsHistory.buckets || []).map((rawBucket: RawData) => {
      const timestamp: string = String(rawBucket.key_as_string);
      const stats = normalizeRuleExecutionStatsAggregationResult(rawBucket, 'histogram');
      return { timestamp, stats };
    }),
  };
};
