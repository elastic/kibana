/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EqlSearchRequest } from '@elastic/elasticsearch/lib/api/types';

import { logEqlRequest } from './log_eql';

describe('logEqlRequest', () => {
  const request: EqlSearchRequest = {
    index: ['close_alerts*'],
    allow_no_indices: true,
    size: 100,
    query: 'any where true',
    filter: {
      bool: {
        filter: [
          {
            range: {
              '@timestamp': {
                lte: '2025-01-29T10:43:43.817Z',
                gte: '2013-09-02T17:43:43.817Z',
                format: 'strict_date_optional_time',
              },
            },
          },
          { bool: { must: [], filter: [], should: [], must_not: [] } },
        ],
      },
    },
    runtime_mappings: {},
    fields: [
      { field: '*', include_unmapped: true },
      { field: '@timestamp', format: 'strict_date_optional_time' },
    ],
  };
  it('should match inline snapshot', () => {
    expect(logEqlRequest(request)).toMatchInlineSnapshot(`
      "POST /close_alerts*/_eql/search?allow_no_indices=true
      {
        \\"size\\": 100,
        \\"query\\": \\"any where true\\",
        \\"filter\\": {
          \\"bool\\": {
            \\"filter\\": [
              {
                \\"range\\": {
                  \\"@timestamp\\": {
                    \\"lte\\": \\"2025-01-29T10:43:43.817Z\\",
                    \\"gte\\": \\"2013-09-02T17:43:43.817Z\\",
                    \\"format\\": \\"strict_date_optional_time\\"
                  }
                }
              },
              {
                \\"bool\\": {
                  \\"must\\": [],
                  \\"filter\\": [],
                  \\"should\\": [],
                  \\"must_not\\": []
                }
              }
            ]
          }
        },
        \\"runtime_mappings\\": {},
        \\"fields\\": [
          {
            \\"field\\": \\"*\\",
            \\"include_unmapped\\": true
          },
          {
            \\"field\\": \\"@timestamp\\",
            \\"format\\": \\"strict_date_optional_time\\"
          }
        ]
      }"
    `);
  });
});
