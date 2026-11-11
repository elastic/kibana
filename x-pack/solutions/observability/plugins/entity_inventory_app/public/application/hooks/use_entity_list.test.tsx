/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { EntityInventoryApiClient } from '../../inventory_api/client';
import { createFixtureEntityInventoryApiClient } from '../../inventory_api/fixture_client';
import { createScenarioEntityInventoryApiClient } from '../../inventory_api/fixture_scenarios';
import { createAppServicesMock } from '../../mocks';
import { EntityInventorySearchProvider, useEntityInventorySearch } from '../context/search_context';
import { useEntityList } from './use_entity_list';

const createClientMock = (
  client: EntityInventoryApiClient = createFixtureEntityInventoryApiClient()
) => ({
  getTypes: jest.fn(client.getTypes),
  getEntities: jest.fn(client.getEntities),
});

const renderUseEntityList = (inventoryApi: EntityInventoryApiClient, entityType = 'host') =>
  renderHook(() => ({ search: useEntityInventorySearch(), result: useEntityList(entityType) }), {
    wrapper: ({ children }) => (
      <KibanaContextProvider services={createAppServicesMock({ inventoryApi })}>
        <EntityInventorySearchProvider entityCategory="hosts">
          {children}
        </EntityInventorySearchProvider>
      </KibanaContextProvider>
    ),
  });

describe('useEntityList', () => {
  it('lists the entities of the type over the committed range resolved to absolute bounds', async () => {
    const inventoryApi = createClientMock();
    const { result } = renderUseEntityList(inventoryApi);

    await waitFor(() => expect(result.current.result.loading).toBe(false));

    expect(inventoryApi.getEntities).toHaveBeenCalledTimes(1);
    const [[type, request]] = inventoryApi.getEntities.mock.calls;
    expect(type).toBe('host');
    expect(Date.parse(request.to) - Date.parse(request.from)).toBe(15 * 60 * 1000);
    expect(new Date(request.from).toISOString()).toBe(request.from);
    expect(inventoryApi.getTypes).not.toHaveBeenCalled();
    expect(result.current.result.list?.rows.length).toBeGreaterThan(0);
    expect(result.current.result.error).toBeUndefined();
  });

  it('surfaces a failed request as the error', async () => {
    const failWith = new Error('Request failed');
    const { result } = renderUseEntityList(createScenarioEntityInventoryApiClient({ failWith }));

    await waitFor(() => expect(result.current.result.error).toBe(failWith));
    expect(result.current.result.list).toBeUndefined();
  });

  it('lists again when a search is submitted', async () => {
    const inventoryApi = createClientMock();
    const { result } = renderUseEntityList(inventoryApi);
    await waitFor(() => expect(result.current.result.loading).toBe(false));

    act(() => {
      result.current.search.submit({ dateRange: { from: 'now-1h', to: 'now' } });
    });

    await waitFor(() => expect(inventoryApi.getEntities).toHaveBeenCalledTimes(2));
    const [, request] = inventoryApi.getEntities.mock.calls[1];
    expect(Date.parse(request.to) - Date.parse(request.from)).toBe(60 * 60 * 1000);
  });

  it('lists again on refresh', async () => {
    const inventoryApi = createClientMock();
    const { result } = renderUseEntityList(inventoryApi);
    await waitFor(() => expect(result.current.result.loading).toBe(false));

    act(() => result.current.result.refresh());

    await waitFor(() => expect(inventoryApi.getEntities).toHaveBeenCalledTimes(2));
  });
});
