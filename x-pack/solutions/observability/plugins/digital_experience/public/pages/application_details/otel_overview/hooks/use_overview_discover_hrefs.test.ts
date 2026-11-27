/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { OverviewDiscoverQueries } from '../../../../../common/types/overview';
import { useDiscoverHrefOf } from '../../../../hooks/use_discover_href';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { useOverviewDiscoverHrefs } from './use_overview_discover_hrefs';

jest.mock('../../../../hooks/use_discover_href');
jest.mock('../../../../hooks/use_time_range');

const QUERIES: OverviewDiscoverQueries = {
  sessions: 'sessions-query',
  errorFreeSessions: 'error-free-query',
  pageLoads: 'page-loads-query',
  loadTime: 'load-time-query',
  jsErrors: 'js-errors-query',
  failedHttpRequests: 'failed-requests-query',
  requestLatency: 'latency-query',
};

const NOW = Date.parse('2026-11-26T12:00:00.000Z');

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(NOW);
  jest
    .mocked(useDiscoverHrefOf)
    .mockReturnValue((esql) => (esql ? `/discover/${esql}` : undefined));
  jest.mocked(useTimeRange).mockReturnValue({
    timeRange: { rangeFrom: 'now-3d', rangeTo: 'now' },
    isTimeRangeInUrl: true,
    setTimeRange: jest.fn(),
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useOverviewDiscoverHrefs', () => {
  it('links each tile to its query', () => {
    const { result } = renderHook(() => useOverviewDiscoverHrefs(QUERIES));

    expect(result.current.pageLoads).toBe('/discover/page-loads-query');
    expect(result.current.requestLatency).toBe('/discover/latency-query');
  });

  it('has no links without queries', () => {
    const { result } = renderHook(() => useOverviewDiscoverHrefs(undefined));

    expect(result.current).toEqual({});
  });

  it('opens Discover over the absolute bounds of a relative range, so a later click shows the same window', () => {
    renderHook(() => useOverviewDiscoverHrefs(QUERIES));

    expect(useDiscoverHrefOf).toHaveBeenLastCalledWith({
      from: '2026-11-23T12:00:00.000Z',
      to: '2026-11-26T12:00:00.000Z',
    });
  });

  it('resolves the range again for the queries of the next response', () => {
    const { rerender } = renderHook(({ queries }) => useOverviewDiscoverHrefs(queries), {
      initialProps: { queries: QUERIES },
    });

    jest.setSystemTime(NOW + 60_000);
    rerender({ queries: { ...QUERIES } });

    expect(useDiscoverHrefOf).toHaveBeenLastCalledWith({
      from: '2026-11-23T12:01:00.000Z',
      to: '2026-11-26T12:01:00.000Z',
    });
  });
});
