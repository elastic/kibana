/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React from 'react';
import { useSearchEntities } from './use_search_entities';
import { useEntitiesListQuery } from '../../entity_store/hooks/use_entities_list_query';

jest.mock('../../entity_store/hooks/use_entities_list_query');

const mockUseEntitiesListQuery = useEntitiesListQuery as jest.Mock;

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  Wrapper.displayName = 'Wrapper';
  return Wrapper;
};

const defaultParams = {
  entityType: 'user' as const,
  excludeEntityIds: [] as string[],
  searchQuery: '',
  page: 1,
  perPage: 10,
};

describe('useSearchEntities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEntitiesListQuery.mockReturnValue({ data: null, isLoading: false });
  });

  it('excludes alias entities and golden entities with resolution risk scores', () => {
    renderHook(() => useSearchEntities(defaultParams), { wrapper: createWrapper() });

    const call = mockUseEntitiesListQuery.mock.calls[0][0];
    const filterQuery = JSON.parse(call.filterQuery);

    expect(filterQuery.bool.must_not).toEqual(
      expect.arrayContaining([
        { exists: { field: 'entity.relationships.resolution.resolved_to' } },
        { exists: { field: 'entity.relationships.resolution.risk.calculated_score' } },
      ])
    );
  });

  it('excludes specific entity IDs via must_not.terms', () => {
    renderHook(
      () =>
        useSearchEntities({
          ...defaultParams,
          excludeEntityIds: ['id-1', 'id-2'],
        }),
      { wrapper: createWrapper() }
    );

    const call = mockUseEntitiesListQuery.mock.calls[0][0];
    const filterQuery = JSON.parse(call.filterQuery);

    expect(filterQuery.bool.must_not).toEqual(
      expect.arrayContaining([{ terms: { 'entity.id': ['id-1', 'id-2'] } }])
    );
  });

  it('adds wildcard clause when searchQuery is provided', () => {
    renderHook(
      () =>
        useSearchEntities({
          ...defaultParams,
          searchQuery: 'alice',
        }),
      { wrapper: createWrapper() }
    );

    const call = mockUseEntitiesListQuery.mock.calls[0][0];
    const filterQuery = JSON.parse(call.filterQuery);

    expect(filterQuery.bool.must).toEqual([
      {
        bool: {
          should: [
            { wildcard: { 'entity.name': { value: '*alice*', case_insensitive: true } } },
            { wildcard: { 'entity.id': { value: '*alice*', case_insensitive: true } } },
          ],
        },
      },
    ]);
  });

  it('escapes wildcard metacharacters in searchQuery', () => {
    renderHook(
      () =>
        useSearchEntities({
          ...defaultParams,
          searchQuery: 'al*ce?',
        }),
      { wrapper: createWrapper() }
    );

    const call = mockUseEntitiesListQuery.mock.calls[0][0];
    const filterQuery = JSON.parse(call.filterQuery);

    expect(filterQuery.bool.must).toEqual([
      {
        bool: {
          should: [
            { wildcard: { 'entity.name': { value: '*al\\*ce\\?*', case_insensitive: true } } },
            { wildcard: { 'entity.id': { value: '*al\\*ce\\?*', case_insensitive: true } } },
          ],
        },
      },
    ]);
  });

  it('omits must clause when searchQuery is empty', () => {
    renderHook(() => useSearchEntities(defaultParams), { wrapper: createWrapper() });

    const call = mockUseEntitiesListQuery.mock.calls[0][0];
    const filterQuery = JSON.parse(call.filterQuery);

    expect(filterQuery.bool.must).toBeUndefined();
  });

  it('passes entityType, page, and perPage to useEntitiesListQuery', () => {
    renderHook(
      () =>
        useSearchEntities({
          ...defaultParams,
          entityType: 'host' as const,
          page: 3,
          perPage: 25,
        }),
      { wrapper: createWrapper() }
    );

    const call = mockUseEntitiesListQuery.mock.calls[0][0];
    expect(call.entityTypes).toEqual(['host']);
    expect(call.page).toBe(3);
    expect(call.perPage).toBe(25);
    expect(call.skip).toBe(false);
  });

  it('stabilizes exclude IDs — same content, different reference produces same query', () => {
    const { rerender } = renderHook(
      ({ ids }: { ids: string[] }) =>
        useSearchEntities({ ...defaultParams, excludeEntityIds: ids }),
      {
        wrapper: createWrapper(),
        initialProps: { ids: ['a', 'b'] },
      }
    );

    const firstFilterQuery = mockUseEntitiesListQuery.mock.calls[0][0].filterQuery;

    rerender({ ids: ['b', 'a'] }); // same content, different order/reference

    const secondFilterQuery = mockUseEntitiesListQuery.mock.calls[1][0].filterQuery;
    expect(firstFilterQuery).toBe(secondFilterQuery);
  });
});
