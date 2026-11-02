/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { httpServiceMock } from '@kbn/core/public/mocks';
import type { GridContext } from './use_entity_grid_context';
import { useGridContext } from './use_entity_grid_context';
import { useResolvedValueGroups } from './use_resolved_value_groups';
import type { UseResolvedValueGroupsOptions } from './use_resolved_value_groups';

const mockRunQuery = jest.fn();
const mockFetchResolvedEntityFilterOverrides = jest.fn();

jest.mock('../../../../../common/hooks/use_error_toast');
jest.mock('./use_entity_grid_context', () => ({
  ...jest.requireActual('./use_entity_grid_context'),
  useGridContext: jest.fn(),
}));
jest.mock('../queries/esql', () => ({
  ...jest.requireActual('../queries/esql'),
  createEsqlRunner: () => mockRunQuery,
}));
jest.mock('../queries/resolved_entities', () => ({
  ...jest.requireActual('../queries/resolved_entities'),
  fetchResolvedEntityFilterOverrides: (...args: unknown[]) =>
    mockFetchResolvedEntityFilterOverrides(...args),
}));

const OPTIONS: UseResolvedValueGroupsOptions = {
  selectedGroup: 'asset.criticality',
  rowsMode: 'resolved',
  pageIndex: 0,
  pageSize: 2,
};

const getQueries = (): string[] => mockRunQuery.mock.calls.map(([steps]) => steps.join('\n'));

describe('useResolvedValueGroups', () => {
  let queryClient: QueryClient;

  const renderGroups = (options: UseResolvedValueGroupsOptions = OPTIONS) =>
    renderHook(() => useResolvedValueGroups(options), {
      wrapper: ({ children }: PropsWithChildren) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    jest.mocked(useGridContext).mockReturnValue({
      queryClient,
      searchService: {} as GridContext['searchService'],
      http: httpServiceMock.createSetupContract(),
      spaceId: 'default',
      concreteEntityIndexName: 'entities-index',
      isEntitiesIndexLoading: false,
      entitiesIndexError: undefined,
      anomalyJobIds: [],
      isAnomalyJobsLoading: false,
    });
    mockFetchResolvedEntityFilterOverrides.mockResolvedValue({ include: ['host:h9'], exclude: [] });
    mockRunQuery.mockImplementation(async (steps: string[]) => {
      const query = steps.join('\n');
      if (query.includes('STATS total')) return [{ total: 5 }];
      if (query.includes('BY group_value')) {
        return [
          { group_value: 'high_impact', n: 2 },
          { group_value: 'low_impact', n: 1 },
          { group_value: null, n: 2 },
        ];
      }
      if (query.includes('FORK')) {
        return [
          { change_field: 'asset.criticality', change_value: 'extreme_impact', change: 1 },
          { change_field: 'asset.criticality', change_value: 'high_impact', change: -1 },
        ];
      }
      return [];
    });
  });

  afterEach(() => queryClient.clear());

  it('reads the buckets by the group values, a page of them', async () => {
    const { result } = renderGroups();

    expect(result.current.isEnabled).toBe(true);
    await waitFor(() => expect(result.current.groupData.groupsCount).toBeDefined());

    expect(result.current.groupData).toEqual({
      groupByFields: {
        buckets: [
          {
            key: ['unassigned'],
            key_as_string: 'unassigned',
            selectedGroup: 'asset.criticality',
            doc_count: 2,
          },
          {
            key: ['extreme_impact'],
            key_as_string: 'extreme_impact',
            selectedGroup: 'asset.criticality',
            doc_count: 1,
          },
        ],
      },
      groupsCount: { value: 4 },
      unitsCount: { value: 5 },
    });
  });

  it('marks the "no value" bucket of other fields as the null group', async () => {
    const { result } = renderGroups({ ...OPTIONS, selectedGroup: 'entity.source', pageSize: 10 });

    await waitFor(() => expect(result.current.groupData.groupsCount).toBeDefined());

    expect(result.current.groupData.groupByFields?.buckets).toContainEqual({
      key: ['—'],
      key_as_string: '—',
      selectedGroup: 'entity.source',
      doc_count: 2,
      isNullGroup: true,
    });
    expect(result.current.groupData.nullGroupItems).toEqual({ doc_count: 2 });
  });

  it('reads the rows in view with the overrides of the entity filters', async () => {
    const entityExpression = 'MV_CONTAINS(entity.source, "aws")';
    const { result } = renderGroups({ ...OPTIONS, entityExpression });

    await waitFor(() => expect(result.current.groupData.groupsCount).toBeDefined());

    expect(mockFetchResolvedEntityFilterOverrides).toHaveBeenCalledWith(
      expect.objectContaining({ entityExpression }),
      expect.anything()
    );
    expect(getQueries().find((query) => query.includes('BY group_value'))).toContain(
      `(${entityExpression}) OR entity.id IN ("host:h9")`
    );
  });

  it.each([
    ['individual rows', { rowsMode: 'individual' as const }],
    ['a field without group values', { selectedGroup: 'entity.EngineMetadata.Type' }],
  ])('reads nothing for %s', async (_name, options) => {
    const { result } = renderGroups({ ...OPTIONS, ...options });

    expect(result.current.isEnabled).toBe(false);
    expect(result.current.isFetching).toBe(false);
    expect(result.current.groupData).toEqual({});
    expect(mockRunQuery).not.toHaveBeenCalled();
  });

  it('waits for the query to be ready', () => {
    renderGroups({ ...OPTIONS, isQueryReady: false });

    expect(mockRunQuery).not.toHaveBeenCalled();
  });
});
