/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useOverviewPercentile, useOverviewSearchParams } from './use_overview_search';
import { useTimeRange } from './use_time_range';
import { useUpdateUrlQuery } from './use_update_url_query';
import { useApplyView, useCurrentView } from './use_view_state';

jest.mock('./use_overview_search');
jest.mock('./use_time_range');
jest.mock('./use_update_url_query');

const updateUrlQuery = jest.fn();

beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(useUpdateUrlQuery).mockReturnValue(updateUrlQuery);
});

describe('useCurrentView', () => {
  it('reads the filters, query and percentile of the URL, and its time range apart', () => {
    jest.mocked(useOverviewSearchParams).mockReturnValue({ filters: '!((f))', kuery: 'a: b' });
    jest
      .mocked(useOverviewPercentile)
      .mockReturnValue({ percentile: 95, percentileParam: '95', setPercentile: jest.fn() });
    jest.mocked(useTimeRange).mockReturnValue({
      timeRange: { rangeFrom: 'now-7d', rangeTo: 'now' },
      isTimeRangeInUrl: true,
      setTimeRange: jest.fn(),
    });

    expect(renderHook(() => useCurrentView()).result.current).toEqual({
      state: { filters: '!((f))', kuery: 'a: b', percentile: '95' },
      timeRange: { rangeFrom: 'now-7d', rangeTo: 'now' },
    });
  });
});

describe('useApplyView', () => {
  const apply = (view: Parameters<ReturnType<typeof useApplyView>>[0]) => {
    renderHook(() => useApplyView()).result.current(view);
    return updateUrlQuery.mock.calls[0][0];
  };

  it('replaces the filters, query and percentile in one URL update, and leaves the time alone', () => {
    expect(apply({ name: 'a', filters: '!((f))', kuery: 'a: b', percentile: '95' })).toEqual({
      filters: '!((f))',
      kuery: 'a: b',
      percentile: '95',
    });
    expect(updateUrlQuery).toHaveBeenCalledTimes(1);
  });

  it('removes what the view lacks, so the filters of before are not kept', () => {
    expect(apply({ name: 'a' })).toEqual({
      filters: undefined,
      kuery: undefined,
      percentile: undefined,
    });
  });

  it('keeps the default percentile out of the URL', () => {
    expect(apply({ name: 'a', percentile: '75' })).toMatchObject({ percentile: undefined });
  });

  it('sets the time range when the view kept one', () => {
    expect(apply({ name: 'a', rangeFrom: 'now-7d', rangeTo: 'now' })).toMatchObject({
      rangeFrom: 'now-7d',
      rangeTo: 'now',
    });
  });
});
