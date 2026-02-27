/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

import { RuleExecutionEventTypeEnum } from '../../../../../../../../common/api/detection_engine/rule_monitoring';

import {
  ALERTING_PROVIDER,
  RULE_EXECUTION_LOG_PROVIDER,
} from '../../../event_log/event_log_constants';
import * as f from '../../../event_log/event_log_fields';
import {
  DEFAULT_BASE_RULE_FIELDS,
  DEFAULT_PERCENTILES,
} from '../../../utils/es_aggregations';

const RULE_ID_FIELD = 'rule.id';

const executeEventsFilter = {
  bool: {
    filter: [
      { term: { [f.EVENT_PROVIDER]: ALERTING_PROVIDER } },
      { term: { [f.EVENT_ACTION]: 'execute' } },
      { term: { [f.EVENT_CATEGORY]: 'siem' } },
    ],
  },
};

const executionMetricsEventsFilter = {
  bool: {
    filter: [
      { term: { [f.EVENT_PROVIDER]: RULE_EXECUTION_LOG_PROVIDER } },
      { term: { [f.EVENT_ACTION]: RuleExecutionEventTypeEnum['execution-metrics'] } },
    ],
  },
};

const buildTopRulesAggregation = (
  filter: object,
  metricField: string,
  size: number
): estypes.AggregationsAggregationContainer => ({
  filter,
  aggs: {
    by_rule: {
      terms: {
        field: RULE_ID_FIELD,
        size,
        order: { [`percentiles.${DEFAULT_PERCENTILES[1]}`]: 'desc' },
      },
      aggs: {
        percentiles: {
          percentiles: {
            field: metricField,
            missing: 0,
            percents: DEFAULT_PERCENTILES,
          },
        },
        rule_metadata: {
          top_hits: {
            size: 1,
            _source: DEFAULT_BASE_RULE_FIELDS,
          },
        },
      },
    },
  },
});

export const getTopRulesByMetricsAggregation = (
  numOfTopRules: number
): Record<string, estypes.AggregationsAggregationContainer> => {
  const topRulesByExecutionDurationMs = buildTopRulesAggregation(
    executeEventsFilter,
    f.RULE_EXECUTION_TOTAL_DURATION_MS,
    numOfTopRules
  );

  const topRulesByScheduleDelay = buildTopRulesAggregation(
    executeEventsFilter,
    f.RULE_EXECUTION_SCHEDULE_DELAY_NS,
    numOfTopRules
  );

  const topRulesBySearchDurationMs = buildTopRulesAggregation(
    executionMetricsEventsFilter,
    f.RULE_EXECUTION_SEARCH_DURATION_MS,
    numOfTopRules
  );

  const topRulesByIndexingDurationMs = buildTopRulesAggregation(
    executionMetricsEventsFilter,
    f.RULE_EXECUTION_INDEXING_DURATION_MS,
    numOfTopRules
  );

  const topRulesByEnrichmentDurationMs = buildTopRulesAggregation(
    executionMetricsEventsFilter,
    f.RULE_EXECUTION_TOTAL_ENRICHMENT_DURATION_MS,
    numOfTopRules
  );

  return {
    topRulesByExecutionDurationMs,
    topRulesByScheduleDelay,
    topRulesBySearchDurationMs,
    topRulesByIndexingDurationMs,
    topRulesByEnrichmentDurationMs,
  };
};
