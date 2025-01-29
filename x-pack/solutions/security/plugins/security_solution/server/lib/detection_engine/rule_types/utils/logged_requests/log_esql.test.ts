/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { logEsqlRequest } from './log_esql';

describe('logEsqlRequest', () => {
  const request = {
    query:
      'from .alerts-security.alerts-default METADATA _id | WHERE kibana.alert.rule.name == "test esql" | limit 101',
    filter: {
      bool: {
        filter: [
          {
            range: {
              '@timestamp': {
                lte: '2025-01-29T09:53:47.014Z',
                gte: '2025-01-29T09:47:47.014Z',
                format: 'strict_date_optional_time',
              },
            },
          },
          { bool: { must: [], filter: [], should: [], must_not: [] } },
        ],
      },
    },
  };
  it('should match inline snapshot', () => {
    expect(logEsqlRequest(request)).toMatchInlineSnapshot(`
      "POST _query
      {
        \\"query\\": \\"from .alerts-security.alerts-default METADATA _id | WHERE kibana.alert.rule.name == \\\\\\"test esql\\\\\\" | limit 101\\",
        \\"filter\\": {
          \\"bool\\": {
            \\"filter\\": [
              {
                \\"range\\": {
                  \\"@timestamp\\": {
                    \\"lte\\": \\"2025-01-29T09:53:47.014Z\\",
                    \\"gte\\": \\"2025-01-29T09:47:47.014Z\\",
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
        }
      }"
    `);
  });
});
