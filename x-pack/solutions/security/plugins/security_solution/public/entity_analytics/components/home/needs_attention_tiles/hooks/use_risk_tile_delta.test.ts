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
import { getRiskTileDelta } from './use_previous_period_risk_tile';
import { useNewlyHighCriticalCount } from './use_newly_high_critical_count';
import { useNewlyHighCriticalCountWithDelta } from './use_newly_high_critical_count_with_delta';
import { useRiskMoversCount } from './use_risk_movers_count';
import { useRiskMoversCountWithDelta } from './use_risk_movers_count_with_delta';

jest.mock('@kbn/react-query', () => ({ useQuery: jest.fn() }));
jest.mock('../../../../../common/lib/kibana', () => ({ useKibana: jest.fn() }));
jest.mock('../../../../../common/hooks/use_resolved_latest_entities_index_name', () => ({
  useResolvedLatestEntitiesIndexName: jest.fn(),
}));
jest.mock('./use_risk_movers_count', () => ({ useRiskMoversCount: jest.fn() }));
jest.mock('./use_newly_high_critical_count', () => ({ useNewlyHighCriticalCount: jest.fn() }));

const mockUseQuery = useQuery as jest.Mock;
const mockSearch = jest.fn();

const HISTORY_KEY = 'riskHistoryAtPreviousPeriodStart';

const mainResult = (overrides = {}) => ({
  count: 50,
  entityIds: [],
  isLoading: false,
  isMissingIndex: false,
  error: undefined,
  ...overrides,
});

const idle = { data: undefined, isFetching: false, isError: false };

/** Sets what the previous-period query and the risk history check return. */
const setQueries = ({
  previous = { ...idle, data: 40 },
  history = { ...idle, data: true },
}: { previous?: object; history?: object } = {}) => {
  mockUseQuery.mockImplementation(([key]: [string]) => (key === HISTORY_KEY ? history : previous));
};

const callOf = (key: string) =>
  mockUseQuery.mock.calls.filter(([queryKey]: [string[]]) => queryKey[0] === key).pop();

const opts = { spaceId: 'default', timeRange: '30d' as const };

describe.each([
  ['risk movers', 'riskMovers', useRiskMoversCountWithDelta, useRiskMoversCount],
  [
    'newly high/critical',
    'newlyHighCritical',
    useNewlyHighCriticalCountWithDelta,
    useNewlyHighCriticalCount,
  ],
] as const)('%s with delta', (_name, tileKey, useWithDelta, useMain) => {
  const mockMain = useMain as unknown as jest.Mock;
  const prevKey = `${tileKey}PrevPeriod`;

  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: { data: { search: { search: mockSearch } } },
    });
    (useResolvedLatestEntitiesIndexName as jest.Mock).mockReturnValue({
      data: { indexName: '.entities-v1' },
      isLoading: false,
    });
    mockMain.mockReturnValue(mainResult());
    setQueries();
  });

  it('computes the delta as the count minus the previous period', () => {
    const { result } = renderHook(() => useWithDelta(opts));
    expect(result.current.delta).toBe(10);
    expect(result.current.isDeltaLoading).toBe(false);
    expect(result.current.count).toBe(50);
    expect(result.current.isMissingIndex).toBe(false);
  });

  it('holds the previous-period queries back until the count has loaded', () => {
    mockMain.mockReturnValue(mainResult({ isLoading: true }));
    renderHook(() => useWithDelta(opts));
    expect(callOf(prevKey)[2].enabled).toBe(false);
    expect(callOf(HISTORY_KEY)[2].enabled).toBe(false);

    mockMain.mockReturnValue(mainResult());
    renderHook(() => useWithDelta(opts));
    expect(callOf(prevKey)[2].enabled).toBe(true);
    expect(callOf(HISTORY_KEY)[2].enabled).toBe(true);
  });

  it('does not run when skipped or while the index is not resolved', () => {
    renderHook(() => useWithDelta({ ...opts, skip: true }));
    expect(callOf(prevKey)[2].enabled).toBe(false);

    (useResolvedLatestEntitiesIndexName as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
    });
    renderHook(() => useWithDelta(opts));
    expect(callOf(prevKey)[2].enabled).toBe(false);
  });

  it('shows no delta and a spinner while either query loads, also for a stale range', () => {
    setQueries({ previous: { ...idle, isFetching: true } });
    const first = renderHook(() => useWithDelta(opts));
    expect(first.result.current.delta).toBeUndefined();
    expect(first.result.current.isDeltaLoading).toBe(true);

    setQueries({ previous: { ...idle, data: 40, isFetching: true } });
    const stale = renderHook(() => useWithDelta(opts));
    expect(stale.result.current.delta).toBeUndefined();
    expect(stale.result.current.isDeltaLoading).toBe(true);

    setQueries({ history: { ...idle, isFetching: true } });
    const history = renderHook(() => useWithDelta(opts));
    expect(history.result.current.delta).toBeUndefined();
    expect(history.result.current.isDeltaLoading).toBe(true);
  });

  it('leaves the delta out, without a spinner, when the risk history does not reach the previous period', () => {
    setQueries({ history: { ...idle, data: false } });
    const { result } = renderHook(() => useWithDelta(opts));
    expect(result.current.delta).toBeUndefined();
    expect(result.current.isDeltaLoading).toBe(false);
    expect(result.current.count).toBe(50);
  });

  it.each([
    ['the previous-period query', { previous: { ...idle, isError: true } }],
    ['the risk history check', { history: { ...idle, isError: true } }],
  ])(
    'shows neither a delta nor a spinner when %s fails, and keeps the count',
    (_label, failing) => {
      setQueries(failing);
      const { result } = renderHook(() => useWithDelta(opts));
      expect(result.current.delta).toBeUndefined();
      expect(result.current.isDeltaLoading).toBe(false);
      expect(result.current.count).toBe(50);
    }
  );

  it('runs the previous-period query and the history check on the risk score index', async () => {
    mockSearch.mockReturnValue(
      of({ rawResponse: { columns: [{ name: 'value' }], values: [[7]] } })
    );
    renderHook(() => useWithDelta(opts));
    const [prevCall, historyCall] = [callOf(prevKey), callOf(HISTORY_KEY)];
    expect(prevCall[0][1]).toContain(
      '@timestamp >= NOW() - 60 days - 2 hours AND @timestamp <= NOW() - 60 days'
    );
    expect(prevCall[0][1]).toContain(
      '@timestamp >= NOW() - 30 days - 2 hours AND @timestamp <= NOW() - 30 days'
    );
    expect(await prevCall[1]({ signal: undefined })).toBe(7);

    mockSearch.mockReturnValue(
      of({ rawResponse: { columns: [{ name: 'boundary_docs' }], values: [[12]] } })
    );
    expect(await historyCall[1]({ signal: undefined })).toBe(true);
    mockSearch.mockReturnValue(
      of({ rawResponse: { columns: [{ name: 'boundary_docs' }], values: [[0]] } })
    );
    expect(await historyCall[1]({ signal: undefined })).toBe(false);
    expect(mockSearch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ strategy: 'esql_async' })
    );
  });

  it('applies the entity filters to the previous-period query, as it does to the count', () => {
    const entityFilters = { ...EMPTY_ENTITY_FILTERS, assetCriticality: ['high_impact'] };
    const clauses = buildEntityFilterClauses(entityFilters);
    expect(clauses.length).toBeGreaterThan(0);

    renderHook(() => useWithDelta({ ...opts, entityFilters }));
    clauses.forEach((clause) => expect(callOf(prevKey)[0][1]).toContain(clause));

    renderHook(() => useWithDelta(opts));
    clauses.forEach((clause) => expect(callOf(prevKey)[0][1]).not.toContain(clause));
  });

  it('keeps both previous-period results fresh for 30 minutes', () => {
    renderHook(() => useWithDelta(opts));
    expect(callOf(prevKey)[2].staleTime).toBe(30 * 60_000);
    expect(callOf(HISTORY_KEY)[2].staleTime).toBe(30 * 60_000);
  });
});

describe('getRiskTileDelta', () => {
  const ready = { count: 50, previous: 40, hasHistory: true, isFetching: false, isError: false };

  it('is the count minus the previous period once everything has loaded', () => {
    expect(getRiskTileDelta(ready)).toEqual({ delta: 10, isDeltaLoading: false });
    expect(getRiskTileDelta({ ...ready, previous: 0 })).toEqual({
      delta: 50,
      isDeltaLoading: false,
    });
  });

  it('shows no spinner when the previous period can never be queried', () => {
    expect(
      getRiskTileDelta({
        ...ready,
        previous: undefined,
        hasHistory: undefined,
        isUnavailable: true,
      })
    ).toEqual({ delta: undefined, isDeltaLoading: false });
  });

  it('shows no spinner for a skipped tile', () => {
    expect(getRiskTileDelta({ ...ready, previous: undefined, skip: true })).toEqual({
      delta: undefined,
      isDeltaLoading: false,
    });
  });
});
