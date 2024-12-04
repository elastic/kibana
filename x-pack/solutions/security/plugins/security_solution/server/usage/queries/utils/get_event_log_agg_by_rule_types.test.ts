/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { getEventLogAggByRuleTypes } from './get_event_log_agg_by_rule_types';

describe('get_event_log_agg_by_rule_types', () => {
  test('it returns empty object if the array is empty', () => {
    const result = getEventLogAggByRuleTypes({ ruleTypes: [], ruleStatus: 'succeeded' });
    expect(result).toEqual<Record<string, AggregationsAggregationContainer>>({});
  });

  test('it returns 1 aggregation if the array has a single element', () => {
    const result = getEventLogAggByRuleTypes({
      ruleTypes: ['siem.eqlRule'],
      ruleStatus: 'succeeded',
    });
    expect(result).toEqual<Record<string, AggregationsAggregationContainer>>({
      'siem.eqlRule': {
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
      },
    });
  });

  test('it returns 2 aggregations if the array has 2 elements', () => {
    const result = getEventLogAggByRuleTypes({
      ruleTypes: ['siem.eqlRule', 'siem.mlRule'],
      ruleStatus: 'succeeded',
    });
    expect(result).toEqual<Record<string, AggregationsAggregationContainer>>({
      'siem.eqlRule': {
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
      },
      'siem.mlRule': {
        filter: {
          term: {
            'rule.category': 'siem.mlRule',
          },
        },
        aggs: {
          cardinality: {
            cardinality: {
              field: 'rule.id',
            },
          },
        },
      },
    });
  });

  test('it returns the same aggregation if the array has the same 2 elements of the same type for some reason.', () => {
    const result = getEventLogAggByRuleTypes({
      ruleTypes: ['siem.eqlRule', 'siem.eqlRule'],
      ruleStatus: 'succeeded',
    });
    expect(result).toEqual<Record<string, AggregationsAggregationContainer>>({
      'siem.eqlRule': {
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
      },
    });
  });

  test('it returns 6 aggregations if the array has 6 elements', () => {
    const result = getEventLogAggByRuleTypes({
      ruleTypes: [
        'siem.eqlRule',
        'siem.mlRule',
        'siem.indicatorRule',
        'siem.queryRule',
        'siem.savedQueryRule',
        'siem.thresholdRule',
      ],
      ruleStatus: 'succeeded',
    });
    expect(result).toEqual<Record<string, AggregationsAggregationContainer>>({
      'siem.eqlRule': {
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
      },
      'siem.mlRule': {
        filter: {
          term: {
            'rule.category': 'siem.mlRule',
          },
        },
        aggs: {
          cardinality: {
            cardinality: {
              field: 'rule.id',
            },
          },
        },
      },
      'siem.indicatorRule': {
        filter: {
          term: {
            'rule.category': 'siem.indicatorRule',
          },
        },
        aggs: {
          cardinality: {
            cardinality: {
              field: 'rule.id',
            },
          },
        },
      },
      'siem.queryRule': {
        filter: {
          term: {
            'rule.category': 'siem.queryRule',
          },
        },
        aggs: {
          cardinality: {
            cardinality: {
              field: 'rule.id',
            },
          },
        },
      },
      'siem.savedQueryRule': {
        filter: {
          term: {
            'rule.category': 'siem.savedQueryRule',
          },
        },
        aggs: {
          cardinality: {
            cardinality: {
              field: 'rule.id',
            },
          },
        },
      },
      'siem.thresholdRule': {
        filter: {
          term: {
            'rule.category': 'siem.thresholdRule',
          },
        },
        aggs: {
          cardinality: {
            cardinality: {
              field: 'rule.id',
            },
          },
        },
      },
    });
  });

  test('it returns 6 aggregations if the array has 6 elements and will have "categorization" if the ruleStatus is "failed"', () => {
    const result = getEventLogAggByRuleTypes({
      ruleTypes: [
        'siem.eqlRule',
        'siem.mlRule',
        'siem.indicatorRule',
        'siem.queryRule',
        'siem.savedQueryRule',
        'siem.thresholdRule',
      ],
      ruleStatus: 'failed',
    });
    expect(result).toEqual<Record<string, AggregationsAggregationContainer>>({
      'siem.eqlRule': {
        filter: {
          term: {
            'rule.category': 'siem.eqlRule',
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
      },
      'siem.mlRule': {
        filter: {
          term: {
            'rule.category': 'siem.mlRule',
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
      },
      'siem.indicatorRule': {
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
      },
      'siem.queryRule': {
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
      },
      'siem.savedQueryRule': {
        filter: {
          term: {
            'rule.category': 'siem.savedQueryRule',
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
      },
      'siem.thresholdRule': {
        filter: {
          term: {
            'rule.category': 'siem.thresholdRule',
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
      },
    });
  });

  test('it returns 6 aggregations if the array has 6 elements and will have "categorization" if the ruleStatus is "partial failure"', () => {
    const result = getEventLogAggByRuleTypes({
      ruleTypes: [
        'siem.eqlRule',
        'siem.mlRule',
        'siem.indicatorRule',
        'siem.queryRule',
        'siem.savedQueryRule',
        'siem.thresholdRule',
      ],
      ruleStatus: 'partial failure',
    });
    expect(result).toEqual<Record<string, AggregationsAggregationContainer>>({
      'siem.eqlRule': {
        filter: {
          term: {
            'rule.category': 'siem.eqlRule',
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
      },
      'siem.mlRule': {
        filter: {
          term: {
            'rule.category': 'siem.mlRule',
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
      },
      'siem.indicatorRule': {
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
      },
      'siem.queryRule': {
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
      },
      'siem.savedQueryRule': {
        filter: {
          term: {
            'rule.category': 'siem.savedQueryRule',
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
      },
      'siem.thresholdRule': {
        filter: {
          term: {
            'rule.category': 'siem.thresholdRule',
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
      },
    });
  });
});
