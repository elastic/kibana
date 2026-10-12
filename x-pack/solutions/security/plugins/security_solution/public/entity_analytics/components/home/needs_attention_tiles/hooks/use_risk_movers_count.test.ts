/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useQuery } from '@kbn/react-query';
import { useKibana } from '../../../../../common/lib/kibana';
import { useResolvedLatestEntitiesIndexName } from '../../../../../common/hooks/use_resolved_latest_entities_index_name';
import { useRiskMoversCount, useRiskMoversCountWithDelta } from './use_risk_movers_count';
import { useTrailingTileSeries } from './use_trailing_tile_series';

jest.mock('@kbn/react-query', () => ({ useQuery: jest.fn() }));
jest.mock('../../../../../common/hooks/use_error_toast', () => ({ useErrorToast: jest.fn() }));
jest.mock('../../../../../common/lib/kibana', () => ({ useKibana: jest.fn() }));
jest.mock('../../../../../common/hooks/use_resolved_latest_entities_index_name', () => ({
  useResolvedLatestEntitiesIndexName: jest.fn(),
}));
jest.mock('./use_trailing_tile_series', () => ({ useTrailingTileSeries: jest.fn() }));

const mockUseQuery = useQuery as jest.Mock;
const mockUseKibana = useKibana as jest.Mock;
const mockUseIndex = useResolvedLatestEntitiesIndexName as jest.Mock;
const mockUseTrailing = useTrailingTileSeries as jest.Mock;

const loadedQuery = {
  data: { count: 4, entityIds: ['a'] },
  isLoading: false,
  isFetching: false,
  error: undefined,
};
const opts = { spaceId: 'default', timeRange: '30d' as const };
const lastTrailingArgs = () => mockUseTrailing.mock.calls[mockUseTrailing.mock.calls.length - 1][0];

describe('useRiskMoversCountWithDelta trend', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({ services: { data: { search: { search: jest.fn() } } } });
    mockUseIndex.mockReturnValue({ data: { indexName: '.entities-v1' }, isLoading: false });
    mockUseQuery.mockReturnValue(loadedQuery);
    mockUseTrailing.mockReturnValue({ values: [1, 2, 3], isLoading: false });
  });

  it('returns the series values and its loading state', () => {
    mockUseTrailing.mockReturnValue({ values: [5, 6], isLoading: true });
    const { result } = renderHook(() => useRiskMoversCountWithDelta(opts));
    expect(result.current.trend).toEqual([5, 6]);
    expect(result.current.isTrendLoading).toBe(true);
  });

  it('builds the trailing query for the selected range and space', () => {
    renderHook(() => useRiskMoversCountWithDelta(opts));
    const { query, timeRange, enabled, tileKey } = lastTrailingArgs();
    expect(tileKey).toBe('riskMovers');
    expect(timeRange).toBe('30d');
    expect(enabled).toBe(true);
    expect(query).toContain('FROM risk-score.risk-score-default');
    expect(query.match(/COUNT_DISTINCT\(effective_id\)/g)).toHaveLength(30);
  });

  it('waits for the count and the delta before it starts', () => {
    mockUseQuery.mockReturnValue({ ...loadedQuery, isFetching: true });
    renderHook(() => useRiskMoversCountWithDelta(opts));
    expect(lastTrailingArgs().enabled).toBe(false);
  });

  it('does not run when asked to skip, or when the risk score index is missing', () => {
    renderHook(() => useRiskMoversCountWithDelta({ ...opts, skip: true }));
    expect(lastTrailingArgs().enabled).toBe(false);

    mockUseQuery.mockReturnValue({
      ...loadedQuery,
      data: undefined,
      error: new Error('Unknown index [risk-score.risk-score-default]'),
    });
    renderHook(() => useRiskMoversCountWithDelta(opts));
    expect(lastTrailingArgs().enabled).toBe(false);
  });

  it('has no query until the entities index is known', () => {
    mockUseIndex.mockReturnValue({ data: undefined, isLoading: false });
    renderHook(() => useRiskMoversCountWithDelta(opts));
    expect(lastTrailingArgs().query).toBeNull();
  });
});

describe('useRiskMoversCount loading state', () => {
  // What react-query v4 reports for a query that is switched off and has no data yet.
  const switchedOffQuery = {
    data: undefined,
    isLoading: true,
    isInitialLoading: false,
    isFetching: false,
    error: undefined,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({ services: { data: { search: { search: jest.fn() } } } });
    mockUseIndex.mockReturnValue({ data: undefined, isLoading: false });
    mockUseTrailing.mockReturnValue({ values: undefined, isLoading: false });
  });

  it('is not loading while its query is switched off, so the tile does not keep its spinner', () => {
    mockUseQuery.mockReturnValue(switchedOffQuery);
    const { result } = renderHook(() => useRiskMoversCount(opts));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.count).toBe(0);
  });

  it('does not keep the delta loading while the queries are switched off', () => {
    mockUseQuery.mockReturnValue(switchedOffQuery);
    const { result } = renderHook(() => useRiskMoversCountWithDelta(opts));
    expect(result.current.isDeltaLoading).toBe(false);
  });

  it('is loading while the entities index is resolving, or while the query runs', () => {
    mockUseQuery.mockReturnValue(switchedOffQuery);
    mockUseIndex.mockReturnValue({ data: undefined, isLoading: true });
    expect(renderHook(() => useRiskMoversCount(opts)).result.current.isLoading).toBe(true);

    mockUseIndex.mockReturnValue({ data: { indexName: '.entities-v1' }, isLoading: false });
    mockUseQuery.mockReturnValue({ ...switchedOffQuery, isInitialLoading: true, isFetching: true });
    expect(renderHook(() => useRiskMoversCount(opts)).result.current.isLoading).toBe(true);
  });
});
