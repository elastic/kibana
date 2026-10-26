/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { of } from 'rxjs';
import { useQuery } from '@kbn/react-query';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { useKibana } from '../../../../../common/lib/kibana';
import { getSeriesGate, getTileTrend, useTileSeriesQuery } from './use_tile_series_query';
import { retryUnlessTimedOut } from './tile_query_timeout';

jest.mock('@kbn/react-query', () => ({ useQuery: jest.fn() }));
jest.mock('../../../../../common/lib/kibana', () => ({ useKibana: jest.fn() }));

const mockUseQuery = useQuery as jest.Mock;
const mockSearch = jest.fn();
const lastCall = () => mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1];
const parse = (raw: ESQLSearchResponse) => raw.values?.[0]?.length;

describe('useTileSeriesQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: { data: { search: { search: mockSearch } } },
    });
    mockUseQuery.mockReturnValue({
      data: 3,
      isFetching: false,
      isPreviousData: false,
      isError: false,
    });
  });

  it('returns the parsed series and the query state', () => {
    const { result } = renderHook(() =>
      useTileSeriesQuery({ tileKey: 'tile', query: 'FROM x', enabled: true, parse })
    );
    expect(result.current).toEqual({ series: 3, isFetching: false, isError: false });
  });

  it('reports the query as pending while the cache still shows the answer of another range', () => {
    // keepPreviousData keeps the last range's dots while the new range waits for its counts.
    mockUseQuery.mockReturnValue({
      data: 3,
      isFetching: false,
      isPreviousData: true,
      isError: false,
    });
    const { result } = renderHook(() =>
      useTileSeriesQuery({ tileKey: 'tile', query: 'FROM x', enabled: false, parse })
    );
    expect(result.current.isFetching).toBe(true);

    mockUseQuery.mockReturnValue({
      data: 3,
      isFetching: false,
      isPreviousData: false,
      isError: false,
    });
    expect(
      renderHook(() =>
        useTileSeriesQuery({ tileKey: 'tile', query: 'FROM x', enabled: true, parse })
      ).result.current.isFetching
    ).toBe(false);
  });

  it('keys the cache by the tile and the query, so a range change refetches', () => {
    renderHook(() =>
      useTileSeriesQuery({ tileKey: 'tile', query: 'FROM x', enabled: true, parse })
    );
    expect(lastCall()[0]).toEqual(['tile', 'FROM x']);
  });

  it('runs only when enabled and the query is built', () => {
    renderHook(() =>
      useTileSeriesQuery({ tileKey: 'tile', query: 'FROM x', enabled: false, parse })
    );
    expect(lastCall()[2].enabled).toBe(false);
    renderHook(() => useTileSeriesQuery({ tileKey: 'tile', query: null, enabled: true, parse }));
    expect(lastCall()[2].enabled).toBe(false);
    renderHook(() =>
      useTileSeriesQuery({ tileKey: 'tile', query: 'FROM x', enabled: true, parse })
    );
    expect(lastCall()[2].enabled).toBe(true);
  });

  it('keeps the series for an hour and does not refetch on focus', () => {
    renderHook(() =>
      useTileSeriesQuery({ tileKey: 'tile', query: 'FROM x', enabled: true, parse })
    );
    expect(lastCall()[2]).toEqual(
      expect.objectContaining({
        staleTime: 60 * 60_000,
        cacheTime: 60 * 60_000,
        refetchOnWindowFocus: false,
        keepPreviousData: true,
        // One retry, but none after a timeout.
        retry: retryUnlessTimedOut,
      })
    );
  });

  it('searches with the ES|QL strategy and parses the response', async () => {
    mockSearch.mockReturnValue(of({ rawResponse: { columns: [{ name: 'a' }], values: [[1, 2]] } }));
    renderHook(() =>
      useTileSeriesQuery({ tileKey: 'tile', query: 'FROM x', enabled: true, parse })
    );
    expect(await lastCall()[1]({ signal: undefined })).toBe(2);
    expect(mockSearch).toHaveBeenCalledWith(
      { params: { query: 'FROM x' } },
      expect.objectContaining({ strategy: 'esql_async' })
    );
    expect(mockSearch.mock.calls[0][1].projectRouting).toBeUndefined();
  });

  it('can run on the local cluster only, like the count', async () => {
    mockSearch.mockReturnValue(of({ rawResponse: { columns: [], values: [] } }));
    renderHook(() =>
      useTileSeriesQuery({
        tileKey: 'tile',
        query: 'FROM x',
        enabled: true,
        parse,
        localOnly: true,
      })
    );
    await lastCall()[1]({ signal: undefined });
    expect(mockSearch.mock.calls[0][1].projectRouting).toBe('_alias:_origin');
  });

  it('fails when the parser throws, so the line is left out', async () => {
    mockSearch.mockReturnValue(of({ rawResponse: { columns: [], values: [] } }));
    renderHook(() =>
      useTileSeriesQuery({
        tileKey: 'tile',
        query: 'FROM x',
        enabled: true,
        parse: () => {
          throw new Error('no column');
        },
      })
    );
    await expect(lastCall()[1]({ signal: undefined })).rejects.toThrow('no column');
  });
});

describe('getTileTrend', () => {
  const base = { dots: [1, 2, 3], liveCount: 9, isFetching: false, isError: false };

  it('ends the dots on the live count', () => {
    expect(getTileTrend(base)).toEqual({ trend: [1, 2, 9], isTrendLoading: false });
  });

  it('shows a spinner and no line while loading, also for a stale range', () => {
    expect(getTileTrend({ ...base, dots: undefined })).toEqual({
      trend: undefined,
      isTrendLoading: true,
    });
    expect(getTileTrend({ ...base, isFetching: true })).toEqual({
      trend: undefined,
      isTrendLoading: true,
    });
  });

  it('shows neither a line nor a spinner after an error, when skipped, or when it cannot run', () => {
    const none = { trend: undefined, isTrendLoading: false };
    expect(getTileTrend({ ...base, dots: undefined, isError: true })).toEqual(none);
    expect(getTileTrend({ ...base, dots: undefined, skip: true })).toEqual(none);
    expect(getTileTrend({ ...base, dots: undefined, isUnavailable: true })).toEqual(none);
  });

  it('shows neither a line nor a spinner when the series is left out on purpose', () => {
    const none = { trend: undefined, isTrendLoading: false };
    expect(getTileTrend({ ...base, isHidden: true })).toEqual(none);
    expect(getTileTrend({ ...base, dots: undefined, isHidden: true })).toEqual(none);
  });
});

describe('getSeriesGate', () => {
  const ready = { isReady: true, reachesBack: true, count: 5 };

  it('runs when everything has settled, the history reaches back and the count is above 0', () => {
    expect(getSeriesGate(ready)).toEqual({ canRun: true, isHidden: false });
  });

  it('hides the line once settled when the history is too short, unknown or the count is 0', () => {
    const hidden = { canRun: false, isHidden: true };
    expect(getSeriesGate({ ...ready, reachesBack: false })).toEqual(hidden);
    expect(getSeriesGate({ ...ready, reachesBack: undefined })).toEqual(hidden);
    expect(getSeriesGate({ ...ready, count: 0 })).toEqual(hidden);
  });

  it('neither runs nor hides while the counts and the delta are still loading', () => {
    expect(getSeriesGate({ ...ready, isReady: false })).toEqual({ canRun: false, isHidden: false });
  });
});
