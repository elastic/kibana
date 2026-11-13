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
import { createFixtureEntityInventoryApiClient } from '../../__fixtures__/inventory_client';
import { createAppServicesMock } from '../../mocks';
import { EntityTypesProvider, useEntityTypes } from './entity_types_context';

const createClientMock = (
  client: EntityInventoryApiClient = createFixtureEntityInventoryApiClient()
) => ({
  getTypes: jest.fn(client.getTypes),
  getEntities: jest.fn(client.getEntities),
});

const createWrapper =
  (inventoryApi: EntityInventoryApiClient) =>
  ({ children }: { children: React.ReactNode }) =>
    (
      <KibanaContextProvider services={createAppServicesMock({ inventoryApi })}>
        <EntityTypesProvider>{children}</EntityTypesProvider>
      </KibanaContextProvider>
    );

const renderUseEntityTypes = (inventoryApi: EntityInventoryApiClient) =>
  renderHook(() => useEntityTypes(), { wrapper: createWrapper(inventoryApi) });

describe('useEntityTypes', () => {
  it('stops reporting loading once the types arrive', async () => {
    const inventoryApi = createClientMock();
    const { result } = renderUseEntityTypes(inventoryApi);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data.length).toBeGreaterThan(0);
    expect(result.current.error).toBeUndefined();
  });

  it('stops reporting loading once the request fails, and reports it again on retry', async () => {
    const failWith = new Error('Request failed');
    const inventoryApi = createClientMock();
    // The retry never settles, so `loading` stays true for the assertion after it.
    inventoryApi.getTypes
      .mockRejectedValueOnce(failWith)
      .mockImplementation(() => new Promise<never>(() => {}));
    const { result } = renderUseEntityTypes(inventoryApi);

    await waitFor(() => expect(result.current.error).toBe(failWith));
    expect(result.current.loading).toBe(false);

    act(() => result.current.refresh());

    await waitFor(() => expect(result.current.loading).toBe(true));
  });
});
