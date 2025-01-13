/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { logSearchRequest } from './log_search_request';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

describe('logSearchRequest', () => {
  it('should match inline snapshot when deprecated search request used', () => {
    const searchRequest = {
      allow_no_indices: true,
      index: ['close_alerts*'],
      ignore_unavailable: true,
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              {
                bool: {
                  must: [],
                  filter: [{ query_string: { query: '*' } }, { bool: { must_not: [] } }],
                  should: [],
                  must_not: [],
                },
              },
              {
                range: {
                  '@timestamp': {
                    lte: '2024-12-09T17:26:48.786Z',
                    gte: '2013-07-14T00:26:48.786Z',
                    format: 'strict_date_optional_time',
                  },
                },
              },
            ],
          },
        },
        fields: [
          { field: '*', include_unmapped: true },
          { field: '@timestamp', format: 'strict_date_optional_time' },
        ],
        aggregations: {
          thresholdTerms: {
            composite: {
              sources: [
                { 'agent.name': { terms: { field: 'agent.name' } } },
                { 'destination.ip': { terms: { field: 'destination.ip' } } },
              ],
              after: { 'agent.name': 'test-6', 'destination.ip': '127.0.0.1' },
              size: 10000,
            },
            aggs: {
              max_timestamp: { max: { field: '@timestamp' } },
              min_timestamp: { min: { field: '@timestamp' } },
              count_check: {
                bucket_selector: {
                  buckets_path: { docCount: '_count' },
                  script: 'params.docCount >= 1',
                },
              },
            },
          },
        },
        runtime_mappings: {},
        sort: [{ '@timestamp': { order: 'desc', unmapped_type: 'date' } }],
      },
    };

    expect(logSearchRequest(searchRequest as unknown as estypes.SearchRequest))
      .toMatchInlineSnapshot(`
      "POST /close_alerts*/_search?allow_no_indices=true&ignore_unavailable=true
      {
        \\"size\\": 0,
        \\"query\\": {
          \\"bool\\": {
            \\"filter\\": [
              {
                \\"bool\\": {
                  \\"must\\": [],
                  \\"filter\\": [
                    {
                      \\"query_string\\": {
                        \\"query\\": \\"*\\"
                      }
                    },
                    {
                      \\"bool\\": {
                        \\"must_not\\": []
                      }
                    }
                  ],
                  \\"should\\": [],
                  \\"must_not\\": []
                }
              },
              {
                \\"range\\": {
                  \\"@timestamp\\": {
                    \\"lte\\": \\"2024-12-09T17:26:48.786Z\\",
                    \\"gte\\": \\"2013-07-14T00:26:48.786Z\\",
                    \\"format\\": \\"strict_date_optional_time\\"
                  }
                }
              }
            ]
          }
        },
        \\"fields\\": [
          {
            \\"field\\": \\"*\\",
            \\"include_unmapped\\": true
          },
          {
            \\"field\\": \\"@timestamp\\",
            \\"format\\": \\"strict_date_optional_time\\"
          }
        ],
        \\"aggregations\\": {
          \\"thresholdTerms\\": {
            \\"composite\\": {
              \\"sources\\": [
                {
                  \\"agent.name\\": {
                    \\"terms\\": {
                      \\"field\\": \\"agent.name\\"
                    }
                  }
                },
                {
                  \\"destination.ip\\": {
                    \\"terms\\": {
                      \\"field\\": \\"destination.ip\\"
                    }
                  }
                }
              ],
              \\"after\\": {
                \\"agent.name\\": \\"test-6\\",
                \\"destination.ip\\": \\"127.0.0.1\\"
              },
              \\"size\\": 10000
            },
            \\"aggs\\": {
              \\"max_timestamp\\": {
                \\"max\\": {
                  \\"field\\": \\"@timestamp\\"
                }
              },
              \\"min_timestamp\\": {
                \\"min\\": {
                  \\"field\\": \\"@timestamp\\"
                }
              },
              \\"count_check\\": {
                \\"bucket_selector\\": {
                  \\"buckets_path\\": {
                    \\"docCount\\": \\"_count\\"
                  },
                  \\"script\\": \\"params.docCount >= 1\\"
                }
              }
            }
          }
        },
        \\"runtime_mappings\\": {},
        \\"sort\\": [
          {
            \\"@timestamp\\": {
              \\"order\\": \\"desc\\",
              \\"unmapped_type\\": \\"date\\"
            }
          }
        ]
      }"
    `);
  });
});
