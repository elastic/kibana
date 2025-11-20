/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { excludeStaleSummaryFilter } from './summary_utils';

describe('excludeStaleSummaryFilter', () => {
  it('returns empty array when kqlFilter contains summaryUpdatedAt', () => {
    const settings = { staleThresholdInHours: 24 } as any;
    const res = excludeStaleSummaryFilter(settings, 'summaryUpdatedAt:>now-1d', true);
    expect(res).toEqual([]);
  });

  it('returns empty array when staleThresholdInHours is falsy', () => {
    const settings = { staleThresholdInHours: 0 } as any;
    const res = excludeStaleSummaryFilter(settings, '', true);
    expect(res).toEqual([]);
  });

  it('returns empty array when hideStale is false', () => {
    const settings = { staleThresholdInHours: 12 } as any;
    const res = excludeStaleSummaryFilter(settings, '', false);
    expect(res).toEqual([]);
  });

  it('returns the expected bool/should filter when conditions met', () => {
    const settings = { staleThresholdInHours: 48 } as any;
    const res = excludeStaleSummaryFilter(settings, '', true);
    expect(res).toHaveLength(1);
    const filt = res[0] as any;
    expect(filt.bool).toBeDefined();
    expect(Array.isArray(filt.bool.should)).toBe(true);
    const [termClause, rangeClause] = filt.bool.should;
    expect(termClause).toEqual({ term: { isTempDoc: true } });
    expect(rangeClause).toHaveProperty(
      'range.summaryUpdatedAt.gte',
      `now-${settings.staleThresholdInHours}h`
    );
  });
});
