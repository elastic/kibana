/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import { getSearchForElasticRules } from './get_search_for_elastic_rules';

describe('get_search_for_elastic_rules', () => {
  test('it returns query merged with an aggregation sent in and list of elastic ids', () => {
    const result = getSearchForElasticRules({
      elasticRuleIds: ['test-123', 'test-456'],
      eventLogIndex: 'test-123',
      aggs: {
        eventActionStatusChange: {
          filter: {
            term: {
              'event.action': 'status-change',
            },
          },
        },
      },
    });
    expect(result).toEqual<SearchRequest>({
      index: 'test-123',
      size: 0,
      track_total_hits: false,
      aggs: {
        eventActionStatusChange: {
          filter: {
            term: {
              'event.action': 'status-change',
            },
          },
        },
      },
      query: {
        bool: {
          filter: {
            bool: {
              must: [
                {
                  range: {
                    '@timestamp': {
                      gte: 'now-24h',
                      lte: 'now',
                    },
                  },
                },
                {
                  term: {
                    'event.provider': 'securitySolution.ruleExecution',
                  },
                },
                {
                  terms: {
                    'rule.id': ['test-123', 'test-456'],
                  },
                },
              ],
            },
          },
        },
      },
    });
  });
});
