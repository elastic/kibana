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
import { isDeltaStillComing, parseReachesBack, usePreviousPeriod } from './use_previous_period';
import { retryUnlessTimedOut } from './tile_query_timeout';

jest.mock('@kbn/react-query', () => ({ useQuery: jest.fn() }));
jest.mock('../../../../../common/lib/kibana', () => ({ useKibana: jest.fn() }));

const mockUseQuery = useQuery as jest.Mock;
const mockSearch = jest.fn();

const settled = (data: unknown) => ({
  data,
  isFetching: false,
  isPreviousData: false,
  isError: false,
});
const idle = { data: undefined, isFetching: false, isPreviousData: false, isError: false };

/** What each of the two queries returns, by its cache key. */
const setQueries = ({ guard = idle, previous = idle }: { guard?: object; previous?: object }) => {
  mockUseQuery.mockImplementation(([key]: [string]) =>
    key.endsWith('HistoryReachesBack') ? guard : previous
  );
};

const callOf = (suffix: string) =>
  mockUseQuery.mock.calls.filter(([key]: [string[]]) => key[0].endsWith(suffix)).pop();

const options = {
  tileKey: 'tile',
  guardQuery: 'FROM guard',
  previousQuery: 'FROM previous',
  enabled: true,
  parse: (raw: ESQLSearchResponse) => Number(raw.values?.[0]?.[0] ?? 0),
};

describe('usePreviousPeriod', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: { data: { search: { search: mockSearch } } },
    });
    setQueries({});
  });

  it('runs nothing while it is not enabled', () => {
    renderHook(() => usePreviousPeriod({ ...options, enabled: false }));
    expect(callOf('HistoryReachesBack')[2].enabled).toBe(false);
    expect(callOf('PrevPeriod')[2].enabled).toBe(false);
  });

  it('keys the history check by the tile, or by the guard key when tiles share one check', () => {
    renderHook(() => usePreviousPeriod(options));
    expect(callOf('HistoryReachesBack')[0][0]).toBe('tileHistoryReachesBack');

    renderHook(() => usePreviousPeriod({ ...options, guardKey: 'shared' }));
    expect(callOf('HistoryReachesBack')[0][0]).toBe('sharedHistoryReachesBack');
    // The previous period stays per tile.
    expect(callOf('PrevPeriod')[0][0]).toBe('tilePrevPeriod');
  });

  it('checks the history first, and runs the previous period only once the history reaches back', () => {
    renderHook(() => usePreviousPeriod(options));
    expect(callOf('HistoryReachesBack')[2].enabled).toBe(true);
    expect(callOf('PrevPeriod')[2].enabled).toBe(false);

    setQueries({ guard: settled(true) });
    renderHook(() => usePreviousPeriod(options));
    expect(callOf('PrevPeriod')[2].enabled).toBe(true);
  });

  it('never runs the previous period when the history does not reach back, and says so', () => {
    setQueries({ guard: settled(false) });
    const { result } = renderHook(() => usePreviousPeriod(options));
    expect(callOf('PrevPeriod')[2].enabled).toBe(false);
    expect(result.current).toEqual({
      previous: undefined,
      reachesBack: false,
      isHistoryMissing: true,
      isError: false,
    });
  });

  it('returns the previous period once both queries have settled', () => {
    setQueries({ guard: settled(true), previous: settled(40) });
    const { result } = renderHook(() => usePreviousPeriod(options));
    expect(result.current).toEqual({
      previous: 40,
      reachesBack: true,
      isHistoryMissing: false,
      isError: false,
    });
  });

  it('decides nothing while the history check is in flight or shows another range', () => {
    setQueries({ guard: { ...settled(false), isFetching: true } });
    expect(renderHook(() => usePreviousPeriod(options)).result.current).toEqual({
      previous: undefined,
      reachesBack: undefined,
      isHistoryMissing: false,
      isError: false,
    });

    // The cache still holds the previous range's answer while the new range loads.
    setQueries({ guard: { ...settled(false), isPreviousData: true } });
    expect(renderHook(() => usePreviousPeriod(options)).result.current.isHistoryMissing).toBe(
      false
    );

    setQueries({ guard: { ...settled(true), isPreviousData: true }, previous: settled(40) });
    renderHook(() => usePreviousPeriod(options));
    expect(callOf('PrevPeriod')[2].enabled).toBe(false);
  });

  it('does not return the previous period while it is in flight or shows another range', () => {
    setQueries({ guard: settled(true), previous: { ...settled(40), isFetching: true } });
    expect(renderHook(() => usePreviousPeriod(options)).result.current.previous).toBeUndefined();

    setQueries({ guard: settled(true), previous: { ...settled(40), isPreviousData: true } });
    expect(renderHook(() => usePreviousPeriod(options)).result.current.previous).toBeUndefined();
  });

  it('shows no delta after an error, even when the cache still holds data (a failed refetch)', () => {
    // The history check answered, so the sparkline can still follow it: only the delta is lost.
    setQueries({ guard: settled(true), previous: { ...settled(40), isError: true } });
    expect(renderHook(() => usePreviousPeriod(options)).result.current).toEqual({
      previous: undefined,
      reachesBack: true,
      isHistoryMissing: false,
      isError: true,
    });

    // A failed history check leaves nothing to follow.
    setQueries({ guard: { ...settled(false), isError: true } });
    expect(renderHook(() => usePreviousPeriod(options)).result.current).toEqual({
      previous: undefined,
      reachesBack: undefined,
      isHistoryMissing: false,
      isError: true,
    });
  });

  it('keeps both queries for an hour and does not refetch on focus', () => {
    renderHook(() => usePreviousPeriod(options));
    [callOf('HistoryReachesBack'), callOf('PrevPeriod')].forEach((call) =>
      expect(call[2]).toEqual(
        expect.objectContaining({
          staleTime: 60 * 60_000,
          cacheTime: 60 * 60_000,
          refetchOnWindowFocus: false,
          keepPreviousData: true,
          // One retry, but none after a timeout.
          retry: retryUnlessTimedOut,
        })
      )
    );
  });

  it('keys each query by the tile and its query text, so a range change refetches', () => {
    renderHook(() => usePreviousPeriod(options));
    expect(callOf('HistoryReachesBack')[0]).toEqual(['tileHistoryReachesBack', 'FROM guard']);
    expect(callOf('PrevPeriod')[0]).toEqual(['tilePrevPeriod', 'FROM previous']);
  });

  it('runs each query with the ES|QL strategy, on the local cluster only when asked', async () => {
    mockSearch.mockReturnValue(
      of({ rawResponse: { columns: [{ name: 'value' }], values: [[7]] } })
    );
    renderHook(() => usePreviousPeriod({ ...options, localOnly: true }));
    expect(await callOf('PrevPeriod')[1]({ signal: undefined })).toBe(7);
    expect(mockSearch).toHaveBeenCalledWith(
      { params: { query: 'FROM previous' } },
      expect.objectContaining({ strategy: 'esql_async', projectRouting: '_alias:_origin' })
    );

    mockSearch.mockClear();
    renderHook(() => usePreviousPeriod(options));
    await callOf('PrevPeriod')[1]({ signal: undefined });
    expect(mockSearch.mock.calls[0][1].projectRouting).toBeUndefined();
  });

  it('fails the previous query when its parser throws, so the delta is left out', async () => {
    mockSearch.mockReturnValue(of({ rawResponse: { columns: [], values: [] } }));
    renderHook(() =>
      usePreviousPeriod({
        ...options,
        parse: () => {
          throw new Error('no column');
        },
      })
    );
    await expect(callOf('PrevPeriod')[1]({ signal: undefined })).rejects.toThrow('no column');
  });
});

describe('parseReachesBack', () => {
  const response = (columns: string[], values: unknown[][]) =>
    ({ columns: columns.map((name) => ({ name })), values } as unknown as ESQLSearchResponse);

  it('reads the boolean of the reaches_back column', () => {
    expect(parseReachesBack(response(['reaches_back'], [[true]]))).toBe(true);
    expect(parseReachesBack(response(['reaches_back'], [[false]]))).toBe(false);
  });

  it('reads an empty or null answer as not reaching back', () => {
    expect(parseReachesBack(response(['reaches_back'], [[null]]))).toBe(false);
    expect(parseReachesBack(response([], []))).toBe(false);
  });

  it('throws when the column is missing, so the delta is left out', () => {
    expect(() => parseReachesBack(response(['other'], [[true]]))).toThrow(/reaches_back/);
  });
});

describe('isDeltaStillComing', () => {
  const base = {
    skip: false,
    count: 5,
    isUnavailable: false,
    isError: false,
    isHistoryMissing: false,
    hasDelta: false,
  };

  it('is true while a delta can still arrive, also while the page waits for the other counts', () => {
    expect(isDeltaStillComing(base)).toBe(true);
  });

  it.each([
    ['skipped', { skip: true }],
    ['a zero count (the pill is hidden then)', { count: 0 }],
    ['the query can never run', { isUnavailable: true }],
    ['a failed query', { isError: true }],
    ['the history is too short (the tile says so)', { isHistoryMissing: true }],
    ['the delta is known', { hasDelta: true }],
  ])('is false for %s', (_name, override) => {
    expect(isDeltaStillComing({ ...base, ...override })).toBe(false);
  });
});
