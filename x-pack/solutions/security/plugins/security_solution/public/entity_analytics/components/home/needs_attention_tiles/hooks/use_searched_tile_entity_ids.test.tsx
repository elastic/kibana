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
import { ENTITY_GRID_QUERY_KEY } from '../../entities_grid/common';
import {
  fetchSearchedTileEntityIds,
  useSearchedTileEntityIds,
} from './use_searched_tile_entity_ids';
import type { TileEntityIds } from './use_searched_tile_entity_ids';

const mockRunQuery = jest.fn();

jest.mock('../../../../../common/lib/kibana', () => ({
  useKibana: () => ({ services: { data: { search: {} } } }),
}));
jest.mock('../../../../../common/hooks/use_error_toast', () => ({ useErrorToast: jest.fn() }));
jest.mock('../../entities_grid/queries/esql', () => ({
  ...jest.requireActual('../../entities_grid/queries/esql'),
  createEsqlRunner: () => mockRunQuery,
}));

const tileEntityIds: TileEntityIds = {
  entitiesWithAlerts: ['host:a', 'user:b'],
  entitiesWithAnomalies: ['user:b'],
  riskMovers: [],
  newlyHighCritical: ['host:c'],
  watchlisted: ['user:b', 'host:c'],
  newEntity: [],
};

const searchArgs = { namespace: 'default', searchExpression: 'KQL("host.name: a")' };

describe('fetchSearchedTileEntityIds', () => {
  it("keeps each tile's ids the search matches", async () => {
    const runQuery = jest.fn().mockResolvedValue([{ 'entity.id': 'user:b' }]);

    const searched = await fetchSearchedTileEntityIds(runQuery, searchArgs, tileEntityIds);

    expect(searched).toEqual({
      entitiesWithAlerts: ['user:b'],
      entitiesWithAnomalies: ['user:b'],
      riskMovers: [],
      newlyHighCritical: [],
      watchlisted: ['user:b'],
      newEntity: [],
    });
  });

  it("searches every tile's ids once, on main entities, right after the search", async () => {
    const runQuery = jest.fn().mockResolvedValue([]);

    await fetchSearchedTileEntityIds(runQuery, searchArgs, tileEntityIds);

    expect(runQuery).toHaveBeenCalledTimes(1);
    const query = runQuery.mock.calls[0][0].join('\n');
    expect(query).toContain('entity.relationships.resolution.resolved_to IS NULL');
    expect(query).toContain('KQL("host.name: a")');
    expect(query).toContain('entity.id IN ("host:a", "user:b", "host:c")');
  });

  it('runs no query when the tiles have no entities', async () => {
    const runQuery = jest.fn();
    const noEntityIds: TileEntityIds = {
      entitiesWithAlerts: [],
      entitiesWithAnomalies: [],
      riskMovers: [],
      newlyHighCritical: [],
      watchlisted: [],
      newEntity: [],
    };

    expect(await fetchSearchedTileEntityIds(runQuery, searchArgs, noEntityIds)).toEqual(
      noEntityIds
    );
    expect(runQuery).not.toHaveBeenCalled();
  });
});

describe('useSearchedTileEntityIds', () => {
  it('searches the tiles again when the grid queries are invalidated', async () => {
    mockRunQuery.mockResolvedValue([{ 'entity.id': 'user:b' }]);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(
      () =>
        useSearchedTileEntityIds({
          spaceId: 'default',
          searchExpression: searchArgs.searchExpression,
          isReady: true,
          tileEntityIds,
        }),
      {
        wrapper: ({ children }: PropsWithChildren<{}>) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      }
    );
    await waitFor(() => expect(result.current.searchedTileEntityIds).toBeDefined());
    expect(mockRunQuery).toHaveBeenCalledTimes(1);

    await queryClient.invalidateQueries({ queryKey: [ENTITY_GRID_QUERY_KEY] });

    await waitFor(() => expect(mockRunQuery).toHaveBeenCalledTimes(2));
  });
});
