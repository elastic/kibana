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
import { useNewlyHighCriticalSeries, useRiskMoversSeries } from './use_risk_tile_series';

jest.mock('@kbn/react-query', () => ({ useQuery: jest.fn() }));
jest.mock('../../../../../common/lib/kibana', () => ({ useKibana: jest.fn() }));
jest.mock('../../../../../common/hooks/use_resolved_latest_entities_index_name', () => ({
  useResolvedLatestEntitiesIndexName: jest.fn(),
}));

const mockUseQuery = useQuery as jest.Mock;
const mockSearch = jest.fn();
const DOTS = Array.from({ length: 24 }, (_, i) => 10 + i);
const queryResult = (overrides = {}) => ({
  data: DOTS,
  isFetching: false,
  isError: false,
  ...overrides,
});
const opts = { spaceId: 'default', timeRange: '24h' as const, isReady: true, count: 7 };
const lastCall = () => mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1];

describe.each([
  ['useRiskMoversSeries', useRiskMoversSeries, 'riskMoversSeries', riskMoversSeriesColumn],
  [
    'useNewlyHighCriticalSeries',
    useNewlyHighCriticalSeries,
    'newlyHighCriticalSeries',
    newlyHighCriticalSeriesColumn,
  ],
])('%s', (_name, useSeries, tileKey, column) => {
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

  it('returns the dots, ending on the live count', () => {
    const { result } = renderHook(() => useSeries(opts));
    expect(result.current.trend?.slice(0, -1)).toEqual(DOTS.slice(0, -1));
    expect(result.current.trend?.[DOTS.length - 1]).toBe(7);
    expect(result.current.isTrendLoading).toBe(false);
  });

  it('holds the query back until the count and delta have loaded, when skipped and while the index loads', () => {
    renderHook(() => useSeries({ ...opts, isReady: false }));
    expect(lastCall()[2].enabled).toBe(false);
    renderHook(() => useSeries({ ...opts, skip: true }));
    expect(lastCall()[2].enabled).toBe(false);
    (useResolvedLatestEntitiesIndexName as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
    });
    renderHook(() => useSeries(opts));
    expect(lastCall()[2].enabled).toBe(false);
  });

  it('stops the spinner when no index resolves, but not while it loads', () => {
    mockUseQuery.mockReturnValue(queryResult({ data: undefined }));
    (useResolvedLatestEntitiesIndexName as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
    });
    expect(renderHook(() => useSeries(opts)).result.current.isTrendLoading).toBe(false);
    (useResolvedLatestEntitiesIndexName as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
    });
    expect(renderHook(() => useSeries(opts)).result.current.isTrendLoading).toBe(true);
  });

  it('shows no line and a spinner while loading, none and no spinner after an error', () => {
    mockUseQuery.mockReturnValue(queryResult({ data: undefined, isFetching: true }));
    expect(renderHook(() => useSeries(opts)).result.current).toEqual({
      trend: undefined,
      isTrendLoading: true,
    });
    mockUseQuery.mockReturnValue(queryResult({ data: undefined, isError: true }));
    expect(renderHook(() => useSeries(opts)).result.current).toEqual({
      trend: undefined,
      isTrendLoading: false,
    });
  });

  it('runs the risk series query of the tile and reads its columns', async () => {
    const columns = Array.from({ length: 24 }, (_, k) => ({ name: column(k) }));
    mockSearch.mockReturnValue(
      of({ rawResponse: { columns, values: [columns.map((_c, i) => i)] } })
    );
    renderHook(() => useSeries(opts));
    const [key, queryFn] = lastCall();
    expect(key[0]).toBe(tileKey);
    expect(key[1]).toContain('risk-score');
    const dots = await queryFn({ signal: undefined });
    expect(dots[0]).toBe(23);
    expect(dots[23]).toBe(0);
  });

  it('applies the entity filters, as the count does', () => {
    const entityFilters = { ...EMPTY_ENTITY_FILTERS, assetCriticality: ['high_impact'] };
    const clauses = buildEntityFilterClauses(entityFilters);
    expect(clauses.length).toBeGreaterThan(0);
    renderHook(() => useSeries({ ...opts, entityFilters }));
    clauses.forEach((clause) => expect(lastCall()[0][1]).toContain(clause));
    renderHook(() => useSeries(opts));
    clauses.forEach((clause) => expect(lastCall()[0][1]).not.toContain(clause));
  });
});
