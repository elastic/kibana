/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { getEventLogAggByRuleType } from './get_event_log_agg_by_rule_type';

describe('get_event_log_agg_by_rule_type', () => {
  test('returns aggregation that does NOT have "categorize_text" when status is "succeeded"', () => {
    const result = getEventLogAggByRuleType({ ruleType: 'siem.eqlRule', ruleStatus: 'succeeded' });
    expect(result).toEqual<AggregationsAggregationContainer>({
      filter: {
        term: {
          'rule.category': 'siem.eqlRule',
        },
      },
      aggs: {
        cardinality: {
          cardinality: {
            field: 'rule.id',
          },
        },
      },
    });
  });

  test('returns aggregation that has "categorize_text" when status is "failed"', () => {
    const result = getEventLogAggByRuleType({ ruleType: 'siem.queryRule', ruleStatus: 'failed' });
    expect(result).toEqual<AggregationsAggregationContainer>({
      filter: {
        term: {
          'rule.category': 'siem.queryRule',
        },
      },
      aggs: {
        categories: {
          categorize_text: {
            size: 10,
            field: 'message',
          },
        },
        cardinality: {
          cardinality: {
            field: 'rule.id',
          },
        },
      },
    });
  });

  test('returns aggregation that has "categorize_text" when status is "partial failure"', () => {
    const result = getEventLogAggByRuleType({
      ruleType: 'siem.indicatorRule',
      ruleStatus: 'partial failure',
    });
    expect(result).toEqual<AggregationsAggregationContainer>({
      filter: {
        term: {
          'rule.category': 'siem.indicatorRule',
        },
      },
      aggs: {
        categories: {
          categorize_text: {
            size: 10,
            field: 'message',
          },
        },
        cardinality: {
          cardinality: {
            field: 'rule.id',
          },
        },
      },
    });
  });
});
