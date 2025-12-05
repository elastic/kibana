/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { excludeStaleSummaryFilter } from './summary_stale_filter';

describe('excludeStaleSummaryFilter', () => {
  it('returns empty array when kqlFilter contains summaryUpdatedAt and forceExclude is false', () => {
    const settings = { staleThresholdInHours: 24 } as any;
    const res = excludeStaleSummaryFilter({ settings, kqlFilter: 'summaryUpdatedAt:>now-1d' });
    expect(res).toEqual([]);
  });

  it('returns the filter when forceExclude is true even if kqlFilter contains summaryUpdatedAt', () => {
    const settings = { staleThresholdInHours: 24 } as any;
    const res = excludeStaleSummaryFilter({
      settings,
      kqlFilter: 'summaryUpdatedAt:>now-1d',
      forceExclude: true,
    });
    expect(res).toEqual([
      {
        bool: {
          should: [
            { term: { isTempDoc: true } },
            { range: { summaryUpdatedAt: { gte: 'now-24h' } } },
          ],
        },
      },
    ]);
  });

  it('returns the expected bool/should filter when no kqlFilter is provided', () => {
    const settings = { staleThresholdInHours: 48 } as any;
    const res = excludeStaleSummaryFilter({ settings });
    expect(res).toEqual([
      {
        bool: {
          should: [
            { term: { isTempDoc: true } },
            { range: { summaryUpdatedAt: { gte: 'now-48h' } } },
          ],
        },
      },
    ]);
  });
});
