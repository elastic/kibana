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
import { EMPTY_ENTITY_FILTERS, getEntityFilterESQL } from '../../use_entity_filters_param';
import { useNewEntityCountWithDelta } from './use_new_entity_count_with_delta';
import { useNewEntityCount } from './use_new_entity_count';

jest.mock('@kbn/react-query', () => ({ useQuery: jest.fn() }));
jest.mock('../../../../../common/lib/kibana', () => ({ useKibana: jest.fn() }));
jest.mock('../../../../../common/hooks/use_resolved_latest_entities_index_name', () => ({
  useResolvedLatestEntitiesIndexName: jest.fn(),
}));
jest.mock('./use_new_entity_count', () => ({ useNewEntityCount: jest.fn() }));

const mockUseQuery = useQuery as jest.Mock;
const mockMain = useNewEntityCount as jest.Mock;
const mockSearch = jest.fn();

const mainResult = (overrides = {}) => ({
  count: 50,
  entityIds: [],
  isLoading: false,
  error: undefined,
  ...overrides,
});

const queryResult = (overrides = {}) => ({
  data: 40,
  isFetching: false,
  isError: false,
  ...overrides,
});

const opts = { spaceId: 'default', timeRange: '30d' as const };
const lastCall = () => mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1];

describe('useNewEntityCountWithDelta', () => {
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
    mockUseQuery.mockReturnValue(queryResult());
  });

  it('computes the delta as the count minus the previous period', () => {
    const { result } = renderHook(() => useNewEntityCountWithDelta(opts));
    expect(result.current.delta).toBe(10);
    expect(result.current.isDeltaLoading).toBe(false);
    expect(result.current.count).toBe(50);
  });

  it('holds the previous-period query back until the count has loaded', () => {
    mockMain.mockReturnValue(mainResult({ isLoading: true }));
    renderHook(() => useNewEntityCountWithDelta(opts));
    expect(lastCall()[2].enabled).toBe(false);

    mockMain.mockReturnValue(mainResult());
    renderHook(() => useNewEntityCountWithDelta(opts));
    expect(lastCall()[2].enabled).toBe(true);
  });

  it('does not run when skipped or while the index is not resolved', () => {
    renderHook(() => useNewEntityCountWithDelta({ ...opts, skip: true }));
    expect(lastCall()[2].enabled).toBe(false);

    (useResolvedLatestEntitiesIndexName as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
    });
    renderHook(() => useNewEntityCountWithDelta(opts));
    expect(lastCall()[2].enabled).toBe(false);
  });

  it('shows no delta and a spinner while the previous period loads, also for a stale range', () => {
    mockUseQuery.mockReturnValue(queryResult({ data: undefined, isFetching: true }));
    const first = renderHook(() => useNewEntityCountWithDelta(opts));
    expect(first.result.current.delta).toBeUndefined();
    expect(first.result.current.isDeltaLoading).toBe(true);

    mockUseQuery.mockReturnValue(queryResult({ isFetching: true }));
    const stale = renderHook(() => useNewEntityCountWithDelta(opts));
    expect(stale.result.current.delta).toBeUndefined();
    expect(stale.result.current.isDeltaLoading).toBe(true);
  });

  it('stops the spinner when no entities index resolves', () => {
    mockUseQuery.mockReturnValue(queryResult({ data: undefined }));
    (useResolvedLatestEntitiesIndexName as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
    });
    const { result } = renderHook(() => useNewEntityCountWithDelta(opts));
    expect(result.current.isDeltaLoading).toBe(false);
  });

  it('keeps the spinner while the entities index resolves', () => {
    mockUseQuery.mockReturnValue(queryResult({ data: undefined }));
    (useResolvedLatestEntitiesIndexName as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
    });
    const { result } = renderHook(() => useNewEntityCountWithDelta(opts));
    expect(result.current.isDeltaLoading).toBe(true);
  });

  it('shows neither a delta nor a spinner when the previous-period query fails, and keeps the count', () => {
    mockUseQuery.mockReturnValue(queryResult({ data: undefined, isError: true }));
    const { result } = renderHook(() => useNewEntityCountWithDelta(opts));
    expect(result.current.delta).toBeUndefined();
    expect(result.current.isDeltaLoading).toBe(false);
    expect(result.current.count).toBe(50);
  });

  it('runs the New entity query for the previous period, on the local cluster only like the count', async () => {
    mockSearch.mockReturnValue(
      of({
        rawResponse: { columns: [{ name: 'value' }, { name: 'entity_ids' }], values: [[7, ['x']]] },
      })
    );
    renderHook(() => useNewEntityCountWithDelta(opts));
    const [key, queryFn] = lastCall();
    expect(key[0]).toBe('newEntityCountPrevPeriod');
    expect(key[1]).toContain(
      'entity.lifecycle.first_seen >= NOW() - 60 days AND entity.lifecycle.first_seen < NOW() - 30 days'
    );
    expect(await queryFn({ signal: undefined })).toBe(7);
    expect(mockSearch).toHaveBeenCalledWith(
      { params: { query: key[1] } },
      expect.objectContaining({ strategy: 'esql_async', projectRouting: '_alias:_origin' })
    );
  });

  it('counts an empty result as 0', async () => {
    mockSearch.mockReturnValue(of({ rawResponse: { columns: [], values: [] } }));
    renderHook(() => useNewEntityCountWithDelta(opts));
    expect(await lastCall()[1]({ signal: undefined })).toBe(0);
  });

  it('applies the entity filters to the previous-period query, as it does to the count', () => {
    const entityFilters = { ...EMPTY_ENTITY_FILTERS, assetCriticality: ['high_impact'] };
    const clauses = getEntityFilterESQL(entityFilters);
    expect(clauses.length).toBeGreaterThan(0);

    renderHook(() => useNewEntityCountWithDelta({ ...opts, entityFilters }));
    clauses.forEach((clause) => expect(lastCall()[0][1]).toContain(clause));

    renderHook(() => useNewEntityCountWithDelta(opts));
    clauses.forEach((clause) => expect(lastCall()[0][1]).not.toContain(clause));
  });

  it('keeps the previous period fresh for 30 minutes', () => {
    renderHook(() => useNewEntityCountWithDelta(opts));
    expect(lastCall()[2].staleTime).toBe(30 * 60_000);
  });
});
