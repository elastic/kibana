/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ribbonPriorsFromOverviewResponse } from './dashboard_overview';

describe('ribbonPriorsFromOverviewResponse', () => {
  it('maps prior-window totals, critical count, and distinct sources', () => {
    expect(
      ribbonPriorsFromOverviewResponse({
        hits: { total: { value: 14 } },
        aggregations: {
          by_severity: {
            buckets: [
              { key: 'critical', doc_count: 3 },
              { key: 'high', doc_count: 5 },
            ],
          },
          distinct_source_count: { value: 4.2 },
        },
      })
    ).toEqual({
      total_reports_prior: 14,
      critical_reports_prior: 3,
      distinct_source_count_prior: 4,
    });
  });

  it('defaults missing aggregations to zero', () => {
    expect(
      ribbonPriorsFromOverviewResponse({
        hits: { total: 0 },
      })
    ).toEqual({
      total_reports_prior: 0,
      critical_reports_prior: 0,
      distinct_source_count_prior: 0,
    });
  });
});
