/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React from 'react';
import {
  useEntityStoreStatus,
  useInstallEntityStoreMutation,
  useStartEntityStoreMutation,
  useStopEntityStoreMutation,
  useDeleteEntityStoreMutation,
} from './use_entity_store';
import { useEntityStoreRoutes } from '../../../api/entity_store';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';

jest.mock('../../../api/entity_store');
jest.mock('../../../../common/lib/kibana/kibana_react');

/** Expected child shape for entity_analytics:entity_store_management labels. */
const contextFor = (id: string) => ({
  child: {
    type: 'security_solution',
    name: 'entity_analytics:entity_store_management',
    id,
  },
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  Wrapper.displayName = 'Wrapper';
  return Wrapper;
};

describe('use_entity_store hooks — execution context wiring', () => {
  const getEntityStoreStatus = jest.fn();
  const installEntityStore = jest.fn();
  const startEntityStore = jest.fn();
  const stopEntityStore = jest.fn();
  const deleteEntityStore = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useEntityStoreRoutes as jest.Mock).mockReturnValue({
      getEntityStoreStatus,
      installEntityStore,
      startEntityStore,
      stopEntityStore,
      deleteEntityStore,
    });

    (useKibana as jest.Mock).mockReturnValue({
      services: { telemetry: { reportEvent: jest.fn() } },
    });
  });

  it('useEntityStoreStatus threads entity_store_status context to getEntityStoreStatus', async () => {
    getEntityStoreStatus.mockResolvedValueOnce({ status: 'running' });

    renderHook(() => useEntityStoreStatus(), { wrapper: createWrapper() });

    await waitFor(() =>
      expect(getEntityStoreStatus).toHaveBeenCalledWith(
        undefined,
        contextFor('entity_store_status')
      )
    );
  });

  it('useInstallEntityStoreMutation threads entity_store_install context to installEntityStore', async () => {
    installEntityStore.mockResolvedValueOnce({});

    const { result } = renderHook(() => useInstallEntityStoreMutation(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate();
    });

    await waitFor(() =>
      expect(installEntityStore).toHaveBeenCalledWith(contextFor('entity_store_install'))
    );
  });

  it('useStartEntityStoreMutation threads entity_store_start context to startEntityStore', async () => {
    startEntityStore.mockResolvedValueOnce({});

    const { result } = renderHook(() => useStartEntityStoreMutation(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate();
    });

    await waitFor(() =>
      expect(startEntityStore).toHaveBeenCalledWith(contextFor('entity_store_start'))
    );
  });

  it('useStopEntityStoreMutation threads entity_store_stop context to stopEntityStore', async () => {
    stopEntityStore.mockResolvedValueOnce({});

    const { result } = renderHook(() => useStopEntityStoreMutation(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate();
    });

    await waitFor(() =>
      expect(stopEntityStore).toHaveBeenCalledWith(contextFor('entity_store_stop'))
    );
  });

  it('useDeleteEntityStoreMutation threads entity_store_delete context to deleteEntityStore', async () => {
    deleteEntityStore.mockResolvedValueOnce({});

    const { result } = renderHook(() => useDeleteEntityStoreMutation(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate();
    });

    await waitFor(() =>
      expect(deleteEntityStore).toHaveBeenCalledWith(contextFor('entity_store_delete'))
    );
  });
});
