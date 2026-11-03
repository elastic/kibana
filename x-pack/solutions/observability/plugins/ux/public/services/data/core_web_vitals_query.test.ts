/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreWebVitalsQuery, transformCoreWebVitalsResponse } from './core_web_vitals_query';

describe('core web vitals query', () => {
  it('fetches rum core vitals', async () => {
    expect(
      coreWebVitalsQuery(
        0,
        5000,
        '',
        {
          environment: 'ENVIRONMENT_ALL',
        },
        50
      )
    ).toMatchSnapshot();
  });
});

describe('transformCoreWebVitalsResponse', () => {
  it('uses EDOT Browser web-vital logs when classic page-load vitals are empty', () => {
    const result = transformCoreWebVitalsResponse({
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: { total: { value: 3, relation: 'eq' }, max_score: null, hits: [] },
      aggregations: {
        classic: {
          doc_count: 0,
          coreVitalPages: { doc_count: 0 },
          lcp: { values: { '50.0': null } },
        },
        otelVitals: {
          doc_count: 3,
          byName: {
            buckets: [
              {
                key: 'lcp',
                doc_count: 1,
                value: { values: { '50.0': 412 } },
                lcpRanks: { values: [{ value: 100 }, { value: 100 }] },
              },
              {
                key: 'fcp',
                doc_count: 1,
                value: { values: { '50.0': 412 } },
              },
            ],
          },
        },
      },
    } as Parameters<typeof transformCoreWebVitalsResponse>[0]);

    expect(result?.lcp).toBe(412);
    expect(result?.fcp).toBe(412);
    expect(result?.coreVitalPages).toBe(1);
  });
});

describe('coreWebVitalsQuery parent filter', () => {
  it('does not AND page-load onto web-vital logs', () => {
    const { query } = coreWebVitalsQuery(0, 5000, '', { environment: 'ENVIRONMENT_ALL' }, 50);
    const boolQuery = query?.bool as {
      filter?: unknown;
      should?: Array<{ bool?: { filter?: unknown[] } }>;
    };
    expect(boolQuery.filter).toBeUndefined();
    expect(boolQuery.should).toHaveLength(2);
  });
});
