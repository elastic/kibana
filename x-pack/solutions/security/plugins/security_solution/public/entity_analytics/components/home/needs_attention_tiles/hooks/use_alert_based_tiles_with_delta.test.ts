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
import { useAlertBasedTilesWithDelta } from './use_alert_based_tiles_with_delta';
import { parseAlertBasedTilesResponse, useAlertBasedTiles } from './use_entities_with_alerts_tiles';

jest.mock('@kbn/react-query', () => ({ useQuery: jest.fn() }));
jest.mock('../../../../../common/lib/kibana', () => ({ useKibana: jest.fn() }));
jest.mock('../../../../../common/hooks/use_resolved_latest_entities_index_name', () => ({
  useResolvedLatestEntitiesIndexName: jest.fn(),
}));
jest.mock('./use_entities_with_alerts_tiles', () => ({
  ...jest.requireActual('./use_entities_with_alerts_tiles'),
  useAlertBasedTiles: jest.fn(),
}));

const mockUseQuery = useQuery as jest.Mock;
const mockUseKibana = useKibana as jest.Mock;
const mockUseIndexName = useResolvedLatestEntitiesIndexName as jest.Mock;
const mockMain = useAlertBasedTiles as jest.Mock;
const mockSearch = jest.fn();

const counts = (severe: number, watchlisted: number) => ({
  severeAlertsCount: severe,
  severeAlertsEntityIds: [],
  watchlistedCount: watchlisted,
  watchlistedEntityIds: [],
  newAlertingCount: 0,
  newAlertingEntityIds: [],
});

const mainResult = (overrides = {}) => ({
  ...counts(50, 5),
  isLoading: false,
  error: undefined,
  ...overrides,
});

const queryResult = (overrides = {}) => ({
  data: counts(40, 4),
  isFetching: false,
  isError: false,
  ...overrides,
});

const opts = { spaceId: 'default', timeRange: '30d' as const };
const lastCall = () => mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1];

describe('useAlertBasedTilesWithDelta', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({ services: { data: { search: { search: mockSearch } } } });
    mockUseIndexName.mockReturnValue({ data: { indexName: '.entities-v1' }, isLoading: false });
    mockMain.mockReturnValue(mainResult());
    mockUseQuery.mockReturnValue(queryResult());
  });

  it('computes each delta as the count minus the previous period', () => {
    const { result } = renderHook(() => useAlertBasedTilesWithDelta(opts));
    expect(result.current.severeAlertsDelta).toBe(10);
    expect(result.current.watchlistedDelta).toBe(1);
    expect(result.current.isDeltaLoading).toBe(false);
  });

  it('keeps everything the count hook returns', () => {
    const { result } = renderHook(() => useAlertBasedTilesWithDelta(opts));
    expect(result.current.severeAlertsCount).toBe(50);
    expect(result.current.watchlistedCount).toBe(5);
  });

  it('holds the previous-period query back until the count has loaded', () => {
    mockMain.mockReturnValue(mainResult({ isLoading: true }));
    renderHook(() => useAlertBasedTilesWithDelta(opts));
    expect(lastCall()[2].enabled).toBe(false);

    mockMain.mockReturnValue(mainResult());
    renderHook(() => useAlertBasedTilesWithDelta(opts));
    expect(lastCall()[2].enabled).toBe(true);
  });

  it('does not run when the tiles are skipped', () => {
    renderHook(() => useAlertBasedTilesWithDelta({ ...opts, skip: true }));
    expect(lastCall()[2].enabled).toBe(false);
  });

  it('shows no delta and a spinner while the previous period loads', () => {
    mockUseQuery.mockReturnValue(queryResult({ data: undefined, isFetching: true }));
    const { result } = renderHook(() => useAlertBasedTilesWithDelta(opts));
    expect(result.current.severeAlertsDelta).toBeUndefined();
    expect(result.current.watchlistedDelta).toBeUndefined();
    expect(result.current.isDeltaLoading).toBe(true);
  });

  it("does not show the old range's delta while the new range loads", () => {
    mockUseQuery.mockReturnValue(queryResult({ isFetching: true }));
    const { result } = renderHook(() => useAlertBasedTilesWithDelta(opts));
    expect(result.current.severeAlertsDelta).toBeUndefined();
    expect(result.current.isDeltaLoading).toBe(true);
  });

  it('shows neither a delta nor a spinner when the previous-period query fails, and keeps the count', () => {
    mockUseQuery.mockReturnValue(queryResult({ data: undefined, isError: true }));
    const { result } = renderHook(() => useAlertBasedTilesWithDelta(opts));
    expect(result.current.severeAlertsDelta).toBeUndefined();
    expect(result.current.isDeltaLoading).toBe(false);
    expect(result.current.severeAlertsCount).toBe(50);
  });

  it('runs the same alerts query as the count, for the previous period and with the entity filters', async () => {
    mockSearch.mockReturnValue(
      of({
        rawResponse: {
          columns: [{ name: 'severe_alerts_count' }, { name: 'watchlisted_count' }],
          values: [[7, 2]],
        },
      })
    );
    renderHook(() => useAlertBasedTilesWithDelta(opts));
    const [key, queryFn] = lastCall();
    expect(key[0]).toBe('alertBasedTilesPrevPeriod');
    expect(key[1]).toContain('@timestamp >= NOW() - 60 days AND @timestamp < NOW() - 30 days');

    const parsed = await queryFn({ signal: undefined });
    expect(parsed).toEqual(
      parseAlertBasedTilesResponse({
        columns: [{ name: 'severe_alerts_count' }, { name: 'watchlisted_count' }],
        values: [[7, 2]],
      } as never)
    );
    expect(mockSearch).toHaveBeenCalledWith(
      { params: { query: key[1] } },
      expect.objectContaining({ strategy: 'esql_async' })
    );
  });

  it('keeps the previous period fresh for 30 minutes', () => {
    renderHook(() => useAlertBasedTilesWithDelta(opts));
    expect(lastCall()[2].staleTime).toBe(30 * 60_000);
  });
});
