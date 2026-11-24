/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';
import { act, renderHook, waitFor } from '@testing-library/react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { EntityInventoryApiClient } from '../../inventory_api/client';
import { createFixtureEntityInventoryApiClient } from '../../__fixtures__/inventory_client';
import { createScenarioEntityInventoryApiClient } from '../../__fixtures__/inventory_scenarios';
import { createAppServicesMock } from '../../mocks';
import { DEFAULT_TIME_RANGE } from '../constants';
import { EntityInventorySearchProvider, useEntityInventorySearch } from '../context/search_context';
import { INITIAL_LIST_RESPONSE, useEntityList } from './use_entity_list';

const createClientMock = (
  client: EntityInventoryApiClient = createFixtureEntityInventoryApiClient()
) => ({
  getTypes: jest.fn(client.getTypes),
  getEntities: jest.fn(client.getEntities),
});

const renderUseEntityList = (inventoryApi: EntityInventoryApiClient, entityType = 'host') => {
  const history = createMemoryHistory();

  return renderHook(
    () => ({ search: useEntityInventorySearch(), result: useEntityList(entityType) }),
    {
      wrapper: ({ children }) => (
        <KibanaContextProvider services={createAppServicesMock({ inventoryApi })}>
          <Router history={history}>
            <EntityInventorySearchProvider entityCategory="hosts">
              {children}
            </EntityInventorySearchProvider>
          </Router>
        </KibanaContextProvider>
      ),
    }
  );
};

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
    expect(result.current.result.data.rows.length).toBeGreaterThan(0);
    expect(result.current.result.error).toBeUndefined();
  });

  it('surfaces a failed request as the error', async () => {
    const failWith = new Error('Request failed');
    const { result } = renderUseEntityList(createScenarioEntityInventoryApiClient({ failWith }));

    await waitFor(() => expect(result.current.result.error).toBe(failWith));
    expect(result.current.result.data).toBe(INITIAL_LIST_RESPONSE);
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

  it('lists again when the same search is submitted again', async () => {
    const inventoryApi = createClientMock();
    const { result } = renderUseEntityList(inventoryApi);
    await waitFor(() => expect(result.current.result.loading).toBe(false));
    const submission = { dateRange: { from: 'now-1h', to: 'now' } };

    act(() => {
      result.current.search.submit(submission);
    });
    await waitFor(() => expect(inventoryApi.getEntities).toHaveBeenCalledTimes(2));
    act(() => {
      result.current.search.submit(submission);
    });

    await waitFor(() => expect(inventoryApi.getEntities).toHaveBeenCalledTimes(3));
  });

  it('aborts the pending request when the time range changes', async () => {
    const inventoryApi = createClientMock();
    // The first request never settles, so only an abort can end it.
    inventoryApi.getEntities.mockImplementationOnce(() => new Promise(() => {}));
    const { result } = renderUseEntityList(inventoryApi);
    await waitFor(() => expect(inventoryApi.getEntities).toHaveBeenCalledTimes(1));
    const [[, , { signal: firstSignal }]] = inventoryApi.getEntities.mock.calls;
    expect(firstSignal?.aborted).toBe(false);

    act(() => {
      result.current.search.submit({ dateRange: { from: 'now-1h', to: 'now' } });
    });

    await waitFor(() => expect(inventoryApi.getEntities).toHaveBeenCalledTimes(2));
    expect(firstSignal?.aborted).toBe(true);
    await waitFor(() => expect(result.current.result.loading).toBe(false));
    expect(result.current.result.data.rows.length).toBeGreaterThan(0);
  });

  it('does not list again when a submitted time range is invalid', async () => {
    const inventoryApi = createClientMock();
    const { result } = renderUseEntityList(inventoryApi);
    await waitFor(() => expect(result.current.result.loading).toBe(false));

    act(() => {
      result.current.search.submit({ dateRange: { from: 'now-5x', to: 'now' } });
    });

    expect(result.current.search.dateRange).toEqual(DEFAULT_TIME_RANGE);
    expect(inventoryApi.getEntities).toHaveBeenCalledTimes(1);
  });

  it('lists again on refresh', async () => {
    const inventoryApi = createClientMock();
    const { result } = renderUseEntityList(inventoryApi);
    await waitFor(() => expect(result.current.result.loading).toBe(false));

    act(() => result.current.result.refresh());

    await waitFor(() => expect(inventoryApi.getEntities).toHaveBeenCalledTimes(2));
  });

  it('stops reporting loading once the request fails, and reports it again on retry', async () => {
    const failWith = new Error('Request failed');
    const inventoryApi = createClientMock();
    // The retry never settles, so `loading` stays true for the assertion after it.
    inventoryApi.getEntities
      .mockRejectedValueOnce(failWith)
      .mockImplementation(() => new Promise<never>(() => {}));
    const { result } = renderUseEntityList(inventoryApi);

    await waitFor(() => expect(result.current.result.error).toBe(failWith));
    expect(result.current.result.loading).toBe(false);

    act(() => result.current.result.refresh());

    await waitFor(() => expect(result.current.result.loading).toBe(true));
    expect(result.current.result.data).toBe(INITIAL_LIST_RESPONSE);
  });

  it('starts with the initial response, loading, before the request is sent', () => {
    const inventoryApi = createClientMock();
    // Never settles, so every render of this test happens before a response.
    inventoryApi.getEntities.mockImplementation(() => new Promise<never>(() => {}));
    const states: Array<{ loading: boolean; rowCount: number }> = [];

    renderHook(
      () => {
        const { loading, data } = useEntityList('host');
        states.push({ loading, rowCount: data.rows.length });
        return null;
      },
      {
        wrapper: ({ children }) => (
          <KibanaContextProvider services={createAppServicesMock({ inventoryApi })}>
            <Router history={createMemoryHistory()}>
              <EntityInventorySearchProvider entityCategory="hosts">
                {children}
              </EntityInventorySearchProvider>
            </Router>
          </KibanaContextProvider>
        ),
      }
    );

    expect(states[0]).toEqual({ loading: true, rowCount: 0 });
    expect(states.every(({ loading }) => loading)).toBe(true);
  });

  it('keeps the rows of the previous range while the next one loads', async () => {
    const inventoryApi = createClientMock();
    const { result } = renderUseEntityList(inventoryApi);
    await waitFor(() => expect(result.current.result.loading).toBe(false));
    const firstRows = result.current.result.data.rows;
    expect(firstRows.length).toBeGreaterThan(0);
    // The reload never settles, so it stays in flight for the assertions below.
    inventoryApi.getEntities.mockImplementationOnce(() => new Promise<never>(() => {}));

    act(() => {
      result.current.search.submit({ dateRange: { from: 'now-1h', to: 'now' } });
    });

    await waitFor(() => expect(result.current.result.loading).toBe(true));
    expect(result.current.result.data.rows).toBe(firstRows);
  });

  it('replaces the rows with the initial response when a reload fails', async () => {
    const failWith = new Error('Request failed');
    const inventoryApi = createClientMock();
    const { result } = renderUseEntityList(inventoryApi);
    await waitFor(() => expect(result.current.result.loading).toBe(false));
    expect(result.current.result.data.rows.length).toBeGreaterThan(0);
    inventoryApi.getEntities.mockRejectedValueOnce(failWith);

    act(() => result.current.result.refresh());

    await waitFor(() => expect(result.current.result.error).toBe(failWith));
    expect(result.current.result.loading).toBe(false);
    expect(result.current.result.data).toBe(INITIAL_LIST_RESPONSE);
  });
});

describe('useEntityList when it is not enabled', () => {
  const renderLazyEntityList = (inventoryApi: EntityInventoryApiClient, enabled: boolean) => {
    // Created once: the committed range lives in the URL, so a history per render would reset it.
    const history = createMemoryHistory();

    return renderHook(
      ({ isEnabled }: { isEnabled: boolean }) => ({
        search: useEntityInventorySearch(),
        result: useEntityList('host', { enabled: isEnabled }),
      }),
      {
        initialProps: { isEnabled: enabled },
        wrapper: ({ children }) => (
          <KibanaContextProvider services={createAppServicesMock({ inventoryApi })}>
            <Router history={history}>
              <EntityInventorySearchProvider entityCategory="hosts">
                {children}
              </EntityInventorySearchProvider>
            </Router>
          </KibanaContextProvider>
        ),
      }
    );
  };

  it('does not list until it is enabled, and reports loading with no rows meanwhile', () => {
    const inventoryApi = createClientMock();
    const { result } = renderLazyEntityList(inventoryApi, false);

    expect(inventoryApi.getEntities).not.toHaveBeenCalled();
    expect(result.current.result.loading).toBe(true);
    expect(result.current.result.data).toBe(INITIAL_LIST_RESPONSE);
  });

  it('lists once when it becomes enabled, and not again when it is disabled and enabled again', async () => {
    const inventoryApi = createClientMock();
    const { result, rerender } = renderLazyEntityList(inventoryApi, false);

    rerender({ isEnabled: true });
    await waitFor(() => expect(result.current.result.loading).toBe(false));
    expect(inventoryApi.getEntities).toHaveBeenCalledTimes(1);
    const loadedRows = result.current.result.data.rows;

    rerender({ isEnabled: false });
    rerender({ isEnabled: true });

    expect(inventoryApi.getEntities).toHaveBeenCalledTimes(1);
    expect(result.current.result.data.rows).toBe(loadedRows);
  });

  it('does not list when the range changes before it was ever enabled, and lists once it is', async () => {
    const inventoryApi = createClientMock();
    const { result, rerender } = renderLazyEntityList(inventoryApi, false);

    act(() => {
      result.current.search.submit({ dateRange: { from: 'now-1h', to: 'now' } });
    });
    expect(inventoryApi.getEntities).not.toHaveBeenCalled();

    rerender({ isEnabled: true });

    await waitFor(() => expect(inventoryApi.getEntities).toHaveBeenCalledTimes(1));
    const [[, request]] = inventoryApi.getEntities.mock.calls;
    expect(Date.parse(request.to) - Date.parse(request.from)).toBe(60 * 60 * 1000);
  });

  it('keeps its rows and does not list when the range changes while it is disabled, and lists when it is enabled again', async () => {
    const inventoryApi = createClientMock();
    const { result, rerender } = renderLazyEntityList(inventoryApi, true);
    await waitFor(() => expect(result.current.result.loading).toBe(false));
    const loadedRows = result.current.result.data.rows;
    expect(loadedRows.length).toBeGreaterThan(0);

    rerender({ isEnabled: false });
    act(() => {
      result.current.search.submit({ dateRange: { from: 'now-1h', to: 'now' } });
    });

    expect(inventoryApi.getEntities).toHaveBeenCalledTimes(1);
    expect(result.current.result.data.rows).toBe(loadedRows);

    rerender({ isEnabled: true });

    await waitFor(() => expect(inventoryApi.getEntities).toHaveBeenCalledTimes(2));
    const [, request] = inventoryApi.getEntities.mock.calls[1];
    expect(Date.parse(request.to) - Date.parse(request.from)).toBe(60 * 60 * 1000);
  });

  it('lists again when the range changes while it is enabled', async () => {
    const inventoryApi = createClientMock();
    const { result } = renderLazyEntityList(inventoryApi, true);
    await waitFor(() => expect(result.current.result.loading).toBe(false));

    act(() => {
      result.current.search.submit({ dateRange: { from: 'now-1h', to: 'now' } });
    });

    await waitFor(() => expect(inventoryApi.getEntities).toHaveBeenCalledTimes(2));
  });

  it('aborts the pending request and lists again when the range changes mid-load', async () => {
    const inventoryApi = createClientMock();
    inventoryApi.getEntities.mockImplementationOnce(() => new Promise(() => {}));
    const { result } = renderLazyEntityList(inventoryApi, true);
    await waitFor(() => expect(inventoryApi.getEntities).toHaveBeenCalledTimes(1));
    const [[, , { signal: firstSignal }]] = inventoryApi.getEntities.mock.calls;

    act(() => {
      result.current.search.submit({ dateRange: { from: 'now-1h', to: 'now' } });
    });

    await waitFor(() => expect(inventoryApi.getEntities).toHaveBeenCalledTimes(2));
    expect(firstSignal?.aborted).toBe(true);
  });
});
