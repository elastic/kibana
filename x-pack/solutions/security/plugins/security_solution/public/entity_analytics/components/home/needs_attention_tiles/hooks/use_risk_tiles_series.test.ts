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
import { useResolvedLatestEntitiesIndexName } from '../../../../../common/hooks/use_resolved_latest_entities_index_name';
import { EMPTY_ENTITY_FILTERS } from '../../entities_grid/common';
import { buildEntityFilterClauses } from '../../entities_grid/queries/entity_filters';
import {
  newlyHighCriticalSeriesColumn,
  riskMoversSeriesColumn,
} from '../queries/risk_series_query';
import { useRiskTilesSeries } from './use_risk_tiles_series';

jest.mock('@kbn/react-query', () => ({ useQuery: jest.fn() }));
jest.mock('../../../../../common/lib/kibana', () => ({ useKibana: jest.fn() }));
jest.mock('../../../../../common/hooks/use_resolved_latest_entities_index_name', () => ({
  useResolvedLatestEntitiesIndexName: jest.fn(),
}));

const mockUseQuery = useQuery as jest.Mock;
const mockSearch = jest.fn();
const DOTS_24H = 24;
const series = {
  riskMovers: Array.from({ length: DOTS_24H }, (_, i) => 10 + i),
  newlyHighCritical: Array.from({ length: DOTS_24H }, (_, i) => 100 + i),
};
const queryResult = (overrides = {}) => ({
  data: series,
  isFetching: false,
  isError: false,
  ...overrides,
});
const opts = {
  spaceId: 'default',
  timeRange: '24h' as const,
  isReady: true,
  riskMoversReachesBack: true as boolean | undefined,
  newlyHighCriticalReachesBack: true as boolean | undefined,
  riskMoversCount: 7,
  newlyHighCriticalCount: 3,
};
const lastCall = () => mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1];
const NO_LINE = { riskMoversTrend: undefined, newlyHighCriticalTrend: undefined };

describe('useRiskTilesSeries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: { data: { search: { search: mockSearch } } },
    });
    (useResolvedLatestEntitiesIndexName as jest.Mock).mockReturnValue({
      data: { indexName: '.entities-v1' },
      isLoading: false,
    });
    mockUseQuery.mockReturnValue(queryResult());
  });

  it('returns the dots of each tile, ending on its live count', () => {
    const { result } = renderHook(() => useRiskTilesSeries(opts));
    expect(result.current.riskMoversTrend?.slice(0, -1)).toEqual(series.riskMovers.slice(0, -1));
    expect(result.current.riskMoversTrend?.[DOTS_24H - 1]).toBe(7);
    expect(result.current.newlyHighCriticalTrend?.slice(0, -1)).toEqual(
      series.newlyHighCritical.slice(0, -1)
    );
    expect(result.current.newlyHighCriticalTrend?.[DOTS_24H - 1]).toBe(3);
    expect(result.current.isTrendLoading).toBe(false);
  });

  it('sends one query for both tiles', () => {
    renderHook(() => useRiskTilesSeries(opts));
    const calls = mockUseQuery.mock.calls;
    expect(calls).toHaveLength(1);
    expect(calls[0][0][0]).toBe('riskTilesSeries');
  });

  it('holds the query back until the counts and deltas have loaded, when skipped and while the index loads', () => {
    renderHook(() => useRiskTilesSeries({ ...opts, isReady: false }));
    expect(lastCall()[2].enabled).toBe(false);
    renderHook(() => useRiskTilesSeries({ ...opts, skip: true }));
    expect(lastCall()[2].enabled).toBe(false);
    (useResolvedLatestEntitiesIndexName as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
    });
    renderHook(() => useRiskTilesSeries(opts));
    expect(lastCall()[2].enabled).toBe(false);
  });

  it('leaves both lines out, with no spinner and no query, when the history is too short', () => {
    mockUseQuery.mockReturnValue(queryResult({ data: undefined }));
    const { result } = renderHook(() =>
      useRiskTilesSeries({
        ...opts,
        riskMoversReachesBack: false,
        newlyHighCriticalReachesBack: false,
      })
    );
    expect(lastCall()[2].enabled).toBe(false);
    expect(result.current).toEqual({ ...NO_LINE, isTrendLoading: false });
  });

  it('leaves both lines out, with no spinner and no query, when both counts are 0', () => {
    mockUseQuery.mockReturnValue(queryResult({ data: undefined }));
    const { result } = renderHook(() =>
      useRiskTilesSeries({ ...opts, riskMoversCount: 0, newlyHighCriticalCount: 0 })
    );
    expect(lastCall()[2].enabled).toBe(false);
    expect(result.current).toEqual({ ...NO_LINE, isTrendLoading: false });
  });

  it('hides only the tile that does not qualify, and runs while the other does', () => {
    const zero = renderHook(() => useRiskTilesSeries({ ...opts, newlyHighCriticalCount: 0 }));
    expect(lastCall()[2].enabled).toBe(true);
    expect(zero.result.current.riskMoversTrend?.[DOTS_24H - 1]).toBe(7);
    expect(zero.result.current.newlyHighCriticalTrend).toBeUndefined();

    const short = renderHook(() => useRiskTilesSeries({ ...opts, riskMoversReachesBack: false }));
    expect(lastCall()[2].enabled).toBe(true);
    expect(short.result.current.riskMoversTrend).toBeUndefined();
    expect(short.result.current.newlyHighCriticalTrend?.[DOTS_24H - 1]).toBe(3);
  });

  it('waits for the history check before it decides, with the spinner on', () => {
    mockUseQuery.mockReturnValue(queryResult({ data: undefined }));
    const { result } = renderHook(() =>
      useRiskTilesSeries({
        ...opts,
        isReady: false,
        riskMoversReachesBack: undefined,
        newlyHighCriticalReachesBack: undefined,
      })
    );
    expect(lastCall()[2].enabled).toBe(false);
    expect(result.current.isTrendLoading).toBe(true);
  });

  it('stops the spinner when no index resolves, but not while it loads', () => {
    mockUseQuery.mockReturnValue(queryResult({ data: undefined }));
    (useResolvedLatestEntitiesIndexName as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
    });
    expect(renderHook(() => useRiskTilesSeries(opts)).result.current.isTrendLoading).toBe(false);
    (useResolvedLatestEntitiesIndexName as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
    });
    expect(renderHook(() => useRiskTilesSeries(opts)).result.current.isTrendLoading).toBe(true);
  });

  it('shows no line and a spinner while loading, none and no spinner after an error', () => {
    mockUseQuery.mockReturnValue(queryResult({ data: undefined, isFetching: true }));
    expect(renderHook(() => useRiskTilesSeries(opts)).result.current).toEqual({
      ...NO_LINE,
      isTrendLoading: true,
    });
    mockUseQuery.mockReturnValue(queryResult({ data: undefined, isError: true }));
    expect(renderHook(() => useRiskTilesSeries(opts)).result.current).toEqual({
      ...NO_LINE,
      isTrendLoading: false,
    });
  });

  it('runs the one risk series query and reads both tiles from its columns', async () => {
    const columns = [
      ...Array.from({ length: DOTS_24H }, (_, k) => ({ name: riskMoversSeriesColumn(k) })),
      ...Array.from({ length: DOTS_24H }, (_, k) => ({ name: newlyHighCriticalSeriesColumn(k) })),
    ];
    mockSearch.mockReturnValue(
      of({ rawResponse: { columns, values: [columns.map((_c, i) => i)] } })
    );
    renderHook(() => useRiskTilesSeries(opts));
    const [key, queryFn] = lastCall();
    expect(key[0]).toBe('riskTilesSeries');
    const got = await queryFn({ signal: undefined });
    // Oldest first: the first value is dot 23, the last is dot 0.
    expect(got.riskMovers[0]).toBe(23);
    expect(got.riskMovers[DOTS_24H - 1]).toBe(0);
    expect(got.newlyHighCritical[0]).toBe(DOTS_24H + 23);
    expect(mockSearch).toHaveBeenCalledWith(
      { params: { query: key[1] } },
      expect.objectContaining({ strategy: 'esql_async' })
    );
  });

  it('fails the query, and so leaves the lines out, when a column is missing', async () => {
    mockSearch.mockReturnValue(
      of({ rawResponse: { columns: [{ name: 'other' }], values: [[1]] } })
    );
    renderHook(() => useRiskTilesSeries(opts));
    await expect(lastCall()[1]({ signal: undefined })).rejects.toThrow(/risk_movers_23/);
  });

  it('applies the entity filters, as the counts do', () => {
    const entityFilters = { ...EMPTY_ENTITY_FILTERS, assetCriticality: ['high_impact'] };
    const clauses = buildEntityFilterClauses(entityFilters);
    expect(clauses.length).toBeGreaterThan(0);
    renderHook(() => useRiskTilesSeries({ ...opts, entityFilters }));
    clauses.forEach((clause) => expect(lastCall()[0][1]).toContain(clause));
    renderHook(() => useRiskTilesSeries(opts));
    clauses.forEach((clause) => expect(lastCall()[0][1]).not.toContain(clause));
  });
});
