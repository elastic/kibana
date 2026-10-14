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
import { getEntityFilterESQL } from '../../use_entity_filters_param';
import { newEntitySeriesColumn } from '../queries/new_entity_series_query';
import { useNewEntitySeries } from './use_new_entity_series';

jest.mock('@kbn/react-query', () => ({ useQuery: jest.fn() }));
jest.mock('../../../../../common/lib/kibana', () => ({ useKibana: jest.fn() }));
jest.mock('../../../../../common/hooks/use_resolved_latest_entities_index_name', () => ({
  useResolvedLatestEntitiesIndexName: jest.fn(),
}));

const mockUseQuery = useQuery as jest.Mock;
const mockSearch = jest.fn();
const DOTS = Array.from({ length: 28 }, (_, i) => 10 + i);
const queryResult = (overrides = {}) => ({
  data: DOTS,
  isFetching: false,
  isError: false,
  ...overrides,
});
const opts = {
  spaceId: 'default',
  timeRange: '7d' as const,
  isReady: true,
  reachesBack: true,
  count: 4,
};
const lastCall = () => mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1];

describe('useNewEntitySeries', () => {
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
    const { result } = renderHook(() => useNewEntitySeries(opts));
    expect(result.current.trend?.slice(0, -1)).toEqual(DOTS.slice(0, -1));
    expect(result.current.trend?.[DOTS.length - 1]).toBe(4);
    expect(result.current.isTrendLoading).toBe(false);
  });

  it('holds the query back until the count and delta have loaded, when skipped and while the index loads', () => {
    renderHook(() => useNewEntitySeries({ ...opts, isReady: false }));
    expect(lastCall()[2].enabled).toBe(false);
    renderHook(() => useNewEntitySeries({ ...opts, skip: true }));
    expect(lastCall()[2].enabled).toBe(false);
    (useResolvedLatestEntitiesIndexName as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
    });
    renderHook(() => useNewEntitySeries(opts));
    expect(lastCall()[2].enabled).toBe(false);
  });

  it('leaves the line out, with no spinner and no query, when the history is too short', () => {
    mockUseQuery.mockReturnValue(queryResult({ data: undefined }));
    const { result } = renderHook(() => useNewEntitySeries({ ...opts, reachesBack: false }));
    expect(lastCall()[2].enabled).toBe(false);
    expect(result.current).toEqual({ trend: undefined, isTrendLoading: false });
  });

  it('leaves the line out, with no spinner and no query, when the count is 0', () => {
    mockUseQuery.mockReturnValue(queryResult({ data: undefined }));
    const { result } = renderHook(() => useNewEntitySeries({ ...opts, count: 0 }));
    expect(lastCall()[2].enabled).toBe(false);
    expect(result.current).toEqual({ trend: undefined, isTrendLoading: false });
  });

  it('waits for the history check before it decides, with the spinner on', () => {
    mockUseQuery.mockReturnValue(queryResult({ data: undefined }));
    const { result } = renderHook(() =>
      useNewEntitySeries({ ...opts, isReady: false, reachesBack: undefined })
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
    expect(renderHook(() => useNewEntitySeries(opts)).result.current.isTrendLoading).toBe(false);
    (useResolvedLatestEntitiesIndexName as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
    });
    expect(renderHook(() => useNewEntitySeries(opts)).result.current.isTrendLoading).toBe(true);
  });

  it('shows no line and a spinner while loading, none and no spinner after an error', () => {
    mockUseQuery.mockReturnValue(queryResult({ data: undefined, isFetching: true }));
    expect(renderHook(() => useNewEntitySeries(opts)).result.current).toEqual({
      trend: undefined,
      isTrendLoading: true,
    });
    mockUseQuery.mockReturnValue(queryResult({ data: undefined, isError: true }));
    expect(renderHook(() => useNewEntitySeries(opts)).result.current).toEqual({
      trend: undefined,
      isTrendLoading: false,
    });
  });

  it('runs on the local cluster only, like the count, and reads its columns', async () => {
    const columns = Array.from({ length: 28 }, (_, k) => ({ name: newEntitySeriesColumn(k) }));
    mockSearch.mockReturnValue(
      of({ rawResponse: { columns, values: [columns.map((_, i) => i)] } })
    );
    renderHook(() => useNewEntitySeries(opts));
    const [key, queryFn] = lastCall();
    expect(key[0]).toBe('newEntitySeries');
    const dots = await queryFn({ signal: undefined });
    expect(dots[0]).toBe(27);
    expect(mockSearch).toHaveBeenCalledWith(
      { params: { query: key[1] } },
      expect.objectContaining({ strategy: 'esql_async', projectRouting: '_alias:_origin' })
    );
  });

  it('applies the entity filters, as the count does', () => {
    const entityFilters = { ...EMPTY_ENTITY_FILTERS, assetCriticality: ['high_impact'] };
    const clauses = getEntityFilterESQL(entityFilters);
    expect(clauses.length).toBeGreaterThan(0);
    renderHook(() => useNewEntitySeries({ ...opts, entityFilters }));
    clauses.forEach((clause) => expect(lastCall()[0][1]).toContain(clause));
    renderHook(() => useNewEntitySeries(opts));
    clauses.forEach((clause) => expect(lastCall()[0][1]).not.toContain(clause));
  });
});
