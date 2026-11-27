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
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { useErrorToast } from '../../../../../common/hooks/use_error_toast';
import { useGridContext } from './use_entity_grid_context';
import { useResolvedValueGroups } from './use_resolved_value_groups';
import type { UseResolvedValueGroupsOptions } from './use_resolved_value_groups';

const mockRunQuery = jest.fn();
const mockFetchResolvedEntityOverrides = jest.fn();

jest.mock('../../../../../common/hooks/use_error_toast');
jest.mock('../../../../../common/hooks/use_app_toasts');
const mockAddWarning = jest.fn();
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
  fetchResolvedEntityOverrides: (...args: unknown[]) => mockFetchResolvedEntityOverrides(...args),
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
    jest.mocked(useAppToasts).mockReturnValue({ addWarning: mockAddWarning } as never);
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
    mockFetchResolvedEntityOverrides.mockResolvedValue({ include: ['host:h9'], exclude: [] });
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

    expect(mockFetchResolvedEntityOverrides).toHaveBeenCalledWith(
      expect.objectContaining({ own: entityExpression, group: entityExpression }),
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

  it('shows no groups, and the error, when the entities index is unavailable', async () => {
    const error = new Error('The entities index is not available.');
    jest.mocked(useGridContext).mockReturnValue({
      ...jest.mocked(useGridContext)(),
      spaceId: 'default',
      concreteEntityIndexName: null,
      entitiesIndexError: error,
    });
    const { result } = renderGroups();

    expect(result.current.isFetching).toBe(false);
    expect(result.current.groupData).toEqual({
      groupByFields: { buckets: [] },
      groupsCount: { value: 0 },
      unitsCount: { value: 0 },
    });
    expect(useErrorToast).toHaveBeenCalledWith(expect.any(String), error);
    expect(mockRunQuery).not.toHaveBeenCalled();
  });

  it('keeps more than 200 values and warns when the read is cut at the row limit', async () => {
    mockRunQuery.mockImplementation(async (steps: string[]) => {
      const query = steps.join('\n');
      if (query.includes('STATS total')) return [{ total: 10_000 }];
      if (query.includes('BY group_value')) {
        return Array.from({ length: 10_000 }, (_, i) => ({ group_value: `wl-${i}`, n: 1 }));
      }
      return [];
    });
    const { result } = renderGroups({ ...OPTIONS, selectedGroup: 'entity.source' });

    await waitFor(() => expect(result.current.groupData.groupsCount).toBeDefined());

    expect(result.current.groupData.groupsCount).toEqual({ value: 10_000 });
    expect(mockAddWarning).toHaveBeenCalledTimes(1);
  });

  it('does not warn when every value is listed', async () => {
    const { result } = renderGroups();

    await waitFor(() => expect(result.current.groupData.groupsCount).toBeDefined());

    expect(mockAddWarning).not.toHaveBeenCalled();
  });
});
