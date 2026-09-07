/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SETTINGS } from '../slo_settings_repository';
import { excludeStaleSummaryFilter } from './summary_stale_filter';

describe('excludeStaleSummaryFilter', () => {
  it('returns empty array when kqlFilter contains summaryUpdatedAt', () => {
    const res = excludeStaleSummaryFilter({
      settings: DEFAULT_SETTINGS,
      kqlFilter: 'summaryUpdatedAt > now-1d',
    });
    expect(res).toEqual([]);
  });

  it('returns empty array when kqlFilter contains summaryUpdatedAt and forceExclude is true', () => {
    const res = excludeStaleSummaryFilter({
      settings: DEFAULT_SETTINGS,
      kqlFilter: 'summaryUpdatedAt > now-1d',
      forceExclude: true,
    });
    expect(res).toEqual([]);
  });

  it('returns empty array when kqlFilter does not contain summaryUpdatedAt and forceExclude is false', () => {
    const res = excludeStaleSummaryFilter({
      settings: DEFAULT_SETTINGS,
      kqlFilter: 'other.field: value',
      forceExclude: false,
    });
    expect(res).toEqual([]);
  });

  it('returns the summaryUpdatedAt filter when kqlFilter does not contain summaryUpdatedAt but forceExclude is true', () => {
    const res = excludeStaleSummaryFilter({
      settings: DEFAULT_SETTINGS,
      kqlFilter: 'other.field: value',
      forceExclude: true,
    });
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
