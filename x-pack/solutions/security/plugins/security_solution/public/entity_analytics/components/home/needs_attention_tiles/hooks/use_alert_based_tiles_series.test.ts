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
  severeAlertsSeriesColumn,
  watchlistedSeriesColumn,
} from '../queries/entities_with_alerts_series_query';
import { useAlertBasedTilesSeries } from './use_alert_based_tiles_series';

jest.mock('@kbn/react-query', () => ({ useQuery: jest.fn() }));
jest.mock('../../../../../common/lib/kibana', () => ({ useKibana: jest.fn() }));
jest.mock('../../../../../common/hooks/use_resolved_latest_entities_index_name', () => ({
  useResolvedLatestEntitiesIndexName: jest.fn(),
}));

const mockUseQuery = useQuery as jest.Mock;
const mockSearch = jest.fn();

const DOTS_24H = 24;

const series = {
  severe: Array.from({ length: DOTS_24H }, (_, i) => 100 + i),
  watchlisted: [] as number[],
};
series.watchlisted = series.severe.map((value) => value / 10);

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
  reachesBack: true,
  severeAlertsCount: 7,
  watchlistedCount: 3,
};
const lastCall = () => mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1];

describe('useAlertBasedTilesSeries', () => {
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

  it('returns the dots of each tile, with the newest dot replaced by the live count', () => {
    const { result } = renderHook(() => useAlertBasedTilesSeries(opts));
    expect(result.current.alertsTrend).toHaveLength(DOTS_24H);
    expect(result.current.alertsTrend?.slice(0, -1)).toEqual(series.severe.slice(0, -1));
    expect(result.current.alertsTrend?.[DOTS_24H - 1]).toBe(7);
    expect(result.current.watchlistedTrend?.slice(0, -1)).toEqual(series.watchlisted.slice(0, -1));
    expect(result.current.watchlistedTrend?.[DOTS_24H - 1]).toBe(3);
    expect(result.current.isTrendLoading).toBe(false);
  });

  it('holds the query back until the count and the delta have loaded', () => {
    renderHook(() => useAlertBasedTilesSeries({ ...opts, isReady: false }));
    expect(lastCall()[2].enabled).toBe(false);

    renderHook(() => useAlertBasedTilesSeries(opts));
    expect(lastCall()[2].enabled).toBe(true);
  });

  it('leaves the lines out, with no spinner and no query, when the history is too short', () => {
    mockUseQuery.mockReturnValue(queryResult({ data: undefined }));
    const { result } = renderHook(() => useAlertBasedTilesSeries({ ...opts, reachesBack: false }));
    expect(lastCall()[2].enabled).toBe(false);
    expect(result.current.alertsTrend).toBeUndefined();
    expect(result.current.watchlistedTrend).toBeUndefined();
    expect(result.current.isTrendLoading).toBe(false);
  });

  it('hides only the tile whose count is 0, and runs while the other has a count', () => {
    const { result } = renderHook(() => useAlertBasedTilesSeries({ ...opts, watchlistedCount: 0 }));
    expect(lastCall()[2].enabled).toBe(true);
    expect(result.current.alertsTrend?.[DOTS_24H - 1]).toBe(7);
    expect(result.current.watchlistedTrend).toBeUndefined();
  });

  it('does not run when both counts are 0', () => {
    mockUseQuery.mockReturnValue(queryResult({ data: undefined }));
    const { result } = renderHook(() =>
      useAlertBasedTilesSeries({ ...opts, severeAlertsCount: 0, watchlistedCount: 0 })
    );
    expect(lastCall()[2].enabled).toBe(false);
    expect(result.current.isTrendLoading).toBe(false);
  });

  it('waits for the history check before it decides, with the spinner on', () => {
    mockUseQuery.mockReturnValue(queryResult({ data: undefined }));
    const { result } = renderHook(() =>
      useAlertBasedTilesSeries({ ...opts, isReady: false, reachesBack: undefined })
    );
    expect(lastCall()[2].enabled).toBe(false);
    expect(result.current.isTrendLoading).toBe(true);
  });

  it('does not run when skipped or while the entities index loads', () => {
    renderHook(() => useAlertBasedTilesSeries({ ...opts, skip: true }));
    expect(lastCall()[2].enabled).toBe(false);

    (useResolvedLatestEntitiesIndexName as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
    });
    renderHook(() => useAlertBasedTilesSeries(opts));
    expect(lastCall()[2].enabled).toBe(false);
  });

  it('shows no line and a spinner while the series loads, also for a stale range', () => {
    mockUseQuery.mockReturnValue(queryResult({ data: undefined, isFetching: true }));
    const first = renderHook(() => useAlertBasedTilesSeries(opts));
    expect(first.result.current.alertsTrend).toBeUndefined();
    expect(first.result.current.isTrendLoading).toBe(true);

    mockUseQuery.mockReturnValue(queryResult({ isFetching: true }));
    const stale = renderHook(() => useAlertBasedTilesSeries(opts));
    expect(stale.result.current.alertsTrend).toBeUndefined();
    expect(stale.result.current.isTrendLoading).toBe(true);
  });

  it('keeps the spinner while it waits for the count and the delta', () => {
    mockUseQuery.mockReturnValue(queryResult({ data: undefined }));
    const { result } = renderHook(() => useAlertBasedTilesSeries({ ...opts, isReady: false }));
    expect(result.current.isTrendLoading).toBe(true);
  });

  it('shows neither a line nor a spinner when the series query fails', () => {
    mockUseQuery.mockReturnValue(queryResult({ data: undefined, isError: true }));
    const { result } = renderHook(() => useAlertBasedTilesSeries(opts));
    expect(result.current.alertsTrend).toBeUndefined();
    expect(result.current.watchlistedTrend).toBeUndefined();
    expect(result.current.isTrendLoading).toBe(false);
  });

  it('shows no spinner when the series can never run, and none for a skipped tile', () => {
    mockUseQuery.mockReturnValue(queryResult({ data: undefined }));
    (useResolvedLatestEntitiesIndexName as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
    });
    const none = renderHook(() => useAlertBasedTilesSeries(opts));
    expect(none.result.current.isTrendLoading).toBe(false);

    const skipped = renderHook(() => useAlertBasedTilesSeries({ ...opts, skip: true }));
    expect(skipped.result.current.isTrendLoading).toBe(false);
  });

  it('runs the series query of the range and reads both tiles from its columns', async () => {
    const columns = [
      ...Array.from({ length: DOTS_24H }, (_, k) => ({ name: severeAlertsSeriesColumn(k) })),
      ...Array.from({ length: DOTS_24H }, (_, k) => ({ name: watchlistedSeriesColumn(k) })),
    ];
    const row = columns.map((_, i) => i);
    mockSearch.mockReturnValue(of({ rawResponse: { columns, values: [row] } }));
    renderHook(() => useAlertBasedTilesSeries(opts));
    const [key, queryFn] = lastCall();
    expect(key[0]).toBe('alertBasedTilesSeries');
    expect(key[1]).toContain('severe_alerts_0 = MIN(bucket) WHERE has_severe_alert');
    const got = await queryFn({ signal: undefined });
    expect(got.severe).toHaveLength(DOTS_24H);
    // Oldest first: the first value is dot 23, the last is dot 0.
    expect(got.severe[0]).toBe(23);
    expect(got.severe[DOTS_24H - 1]).toBe(0);
    expect(got.watchlisted[0]).toBe(DOTS_24H + 23);
    expect(mockSearch).toHaveBeenCalledWith(
      { params: { query: key[1] } },
      expect.objectContaining({ strategy: 'esql_async' })
    );
  });

  it('fails the query, and so leaves the line out, when a column is missing', async () => {
    mockSearch.mockReturnValue(
      of({ rawResponse: { columns: [{ name: 'other' }], values: [[1]] } })
    );
    renderHook(() => useAlertBasedTilesSeries(opts));
    await expect(lastCall()[1]({ signal: undefined })).rejects.toThrow(/severe_alerts_23/);
  });

  it('applies the entity filters to the series query, as it does to the count', () => {
    const entityFilters = { ...EMPTY_ENTITY_FILTERS, assetCriticality: ['high_impact'] };
    const clauses = buildEntityFilterClauses(entityFilters);
    expect(clauses.length).toBeGreaterThan(0);

    renderHook(() => useAlertBasedTilesSeries({ ...opts, entityFilters }));
    clauses.forEach((clause) => expect(lastCall()[0][1]).toContain(clause));

    renderHook(() => useAlertBasedTilesSeries(opts));
    clauses.forEach((clause) => expect(lastCall()[0][1]).not.toContain(clause));
  });

  it('keeps the series fresh for an hour', () => {
    renderHook(() => useAlertBasedTilesSeries(opts));
    expect(lastCall()[2].staleTime).toBe(60 * 60_000);
    expect(lastCall()[2].cacheTime).toBe(60 * 60_000);
  });
});
