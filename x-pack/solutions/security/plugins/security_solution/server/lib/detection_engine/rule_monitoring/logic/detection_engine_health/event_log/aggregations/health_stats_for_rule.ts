/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

import type { HealthIntervalGranularity } from '../../../../../../../../common/api/detection_engine/rule_monitoring';

import * as f from '../../../event_log/event_log_fields';
import { getRuleExecutionStatsAggregation } from './rule_execution_stats';

export const getRuleHealthAggregation = (
  granularity: HealthIntervalGranularity
): Record<string, estypes.AggregationsAggregationContainer> => {
  return {
    ...getRuleExecutionStatsAggregation('whole-interval'),
    ...getRuleExecutionStatsHistoryAggregation(granularity),
  };
};

const getRuleExecutionStatsHistoryAggregation = (
  granularity: HealthIntervalGranularity
): Record<string, estypes.AggregationsAggregationContainer> => {
  return {
    statsHistory: {
      date_histogram: {
        field: f.TIMESTAMP,
        calendar_interval: granularity,
      },
      aggs: getRuleExecutionStatsAggregation('histogram'),
    },
  };
};
