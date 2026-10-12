/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { of } from 'rxjs';
import { useQuery } from '@kbn/react-query';
import { useKibana } from '../../../../../common/lib/kibana';
import { useErrorToast } from '../../../../../common/hooks/use_error_toast';
import { useTrailingTileSeries } from './use_trailing_tile_series';

jest.mock('@kbn/react-query', () => ({ useQuery: jest.fn() }));
jest.mock('../../../../../common/hooks/use_error_toast', () => ({ useErrorToast: jest.fn() }));
jest.mock('../../../../../common/lib/kibana', () => ({ useKibana: jest.fn() }));

const mockUseQuery = useQuery as jest.Mock;
const mockUseKibana = useKibana as jest.Mock;
const mockUseErrorToast = useErrorToast as jest.Mock;
const mockSearch = jest.fn();

const columnOf = (k: number) => `dot_${k}`;
const baseOpts = {
  tileKey: 'tile',
  query: 'FROM idx | STATS dot_0 = COUNT(*)',
  timeRange: '24h' as const,
  columnOf,
  enabled: true,
  errorMessage: 'trend failed',
};

const queryResult = (overrides = {}) => ({
  data: undefined,
  isLoading: false,
  isFetching: false,
  error: undefined,
  ...overrides,
});

describe('useTrailingTileSeries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({ services: { data: { search: { search: mockSearch } } } });
    mockSearch.mockReturnValue(
      of({ rawResponse: { columns: [{ name: 'dot_0' }, { name: 'dot_1' }], values: [[5, 3]] } })
    );
    mockUseQuery.mockReturnValue(queryResult());
  });

  const lastQueryOptions = () => mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1][2];
  const runQueryFn = async () =>
    mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1][1]({ signal: undefined });

  it('is enabled only when asked to and a query exists', () => {
    renderHook(() => useTrailingTileSeries(baseOpts));
    expect(lastQueryOptions().enabled).toBe(true);

    renderHook(() => useTrailingTileSeries({ ...baseOpts, enabled: false }));
    expect(lastQueryOptions().enabled).toBe(false);

    renderHook(() => useTrailingTileSeries({ ...baseOpts, query: null }));
    expect(lastQueryOptions().enabled).toBe(false);
  });

  it('is not loading while the query is switched off, even if react-query reports loading', () => {
    mockUseQuery.mockReturnValue(queryResult({ isLoading: true }));
    const { result } = renderHook(() => useTrailingTileSeries({ ...baseOpts, enabled: false }));
    expect(result.current.isLoading).toBe(false);
  });

  it('is loading while the enabled query is loading or refetching', () => {
    mockUseQuery.mockReturnValue(queryResult({ isLoading: true }));
    expect(renderHook(() => useTrailingTileSeries(baseOpts)).result.current.isLoading).toBe(true);

    mockUseQuery.mockReturnValue(queryResult({ isFetching: true }));
    expect(renderHook(() => useTrailingTileSeries(baseOpts)).result.current.isLoading).toBe(true);
  });

  it('runs the query through the async ES|QL strategy and returns the dots oldest first', async () => {
    renderHook(() => useTrailingTileSeries(baseOpts));
    const dots = await runQueryFn();

    expect(mockSearch).toHaveBeenCalledWith(
      { params: { query: baseOpts.query } },
      expect.objectContaining({ strategy: 'esql_async' })
    );
    expect(dots).toHaveLength(24);
    expect(dots.slice(-2)).toEqual([3, 5]);
  });

  it('reads the response with the parser the tile supplies', async () => {
    const parse = jest.fn().mockReturnValue([9, 8]);
    renderHook(() => useTrailingTileSeries({ ...baseOpts, parse }));
    expect(await runQueryFn()).toEqual([9, 8]);
    expect(parse).toHaveBeenCalledWith(expect.objectContaining({ values: [[5, 3]] }), '24h');
  });

  it('routes the query to the local cluster only when asked to', async () => {
    renderHook(() => useTrailingTileSeries(baseOpts));
    await runQueryFn();
    expect(mockSearch.mock.calls[0][1]).not.toHaveProperty('projectRouting');

    mockSearch.mockClear();
    renderHook(() => useTrailingTileSeries({ ...baseOpts, localOnly: true }));
    await runQueryFn();
    expect(mockSearch.mock.calls[0][1]).toEqual(
      expect.objectContaining({ projectRouting: '_alias:_origin' })
    );
  });

  it('shows an error toast for a failing query, but not for a missing index', () => {
    const error = new Error('boom');
    mockUseQuery.mockReturnValue(queryResult({ error }));
    renderHook(() => useTrailingTileSeries(baseOpts));
    expect(mockUseErrorToast).toHaveBeenLastCalledWith('trend failed', error);

    mockUseQuery.mockReturnValue(queryResult({ error: new Error('Unknown index [x]') }));
    renderHook(() => useTrailingTileSeries(baseOpts));
    expect(mockUseErrorToast).toHaveBeenLastCalledWith('trend failed', undefined);
  });
});
