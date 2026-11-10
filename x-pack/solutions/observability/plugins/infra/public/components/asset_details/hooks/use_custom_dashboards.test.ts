/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import {
  useCreateCustomDashboard,
  useDeleteCustomDashboard,
  useUpdateCustomDashboard,
} from './use_custom_dashboards';

jest.mock('../../../hooks/use_kibana', () => ({
  useKibanaContextForPlugin: jest.fn(),
}));

const useKibanaContextForPluginMock = useKibanaContextForPlugin as jest.Mock;

const dashboardPayload = {
  dashboardSavedObjectId: 'dashboard-1',
  dashboardFilterAssetIdEnabled: true,
};

describe('custom dashboards hooks', () => {
  let fetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    fetch = jest.fn().mockResolvedValue({});
    useKibanaContextForPluginMock.mockReturnValue({
      services: {
        http: { fetch },
        notifications: { toasts: { addDanger: jest.fn() } },
      },
    });
  });

  describe('useCreateCustomDashboard', () => {
    it('posts to the collection url for the asset type', async () => {
      const { result } = renderHook(() => useCreateCustomDashboard());

      await act(async () => {
        await result.current.createCustomDashboard({ assetType: 'host', ...dashboardPayload });
      });

      await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
      expect(fetch).toHaveBeenCalledWith(
        '/api/infra/host/custom-dashboards',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('useUpdateCustomDashboard', () => {
    it('puts to the url for the dashboard id', async () => {
      const { result } = renderHook(() => useUpdateCustomDashboard());

      await act(async () => {
        await result.current.updateCustomDashboard({
          assetType: 'host',
          id: 'dashboard-id',
          ...dashboardPayload,
        });
      });

      await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
      expect(fetch).toHaveBeenCalledWith(
        '/api/infra/host/custom-dashboards/dashboard-id',
        expect.objectContaining({ method: 'PUT' })
      );
    });

    it('encodes the dashboard id so the url cannot leave the custom dashboards path', async () => {
      const { result } = renderHook(() => useUpdateCustomDashboard());

      await act(async () => {
        await result.current.updateCustomDashboard({
          assetType: 'host',
          id: '../../status',
          ...dashboardPayload,
        });
      });

      await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
      expect(fetch.mock.calls[0][0]).toBe('/api/infra/host/custom-dashboards/..%2F..%2Fstatus');
    });
  });

  describe('useDeleteCustomDashboard', () => {
    it('deletes the url for the dashboard id', async () => {
      const { result } = renderHook(() => useDeleteCustomDashboard());

      await act(async () => {
        await result.current.deleteCustomDashboard({ assetType: 'host', id: 'dashboard-id' });
      });

      await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
      expect(fetch).toHaveBeenCalledWith(
        '/api/infra/host/custom-dashboards/dashboard-id',
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('encodes the dashboard id so the url cannot leave the custom dashboards path', async () => {
      const { result } = renderHook(() => useDeleteCustomDashboard());

      await act(async () => {
        await result.current.deleteCustomDashboard({ assetType: 'host', id: '../../status' });
      });

      await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
      expect(fetch.mock.calls[0][0]).toBe('/api/infra/host/custom-dashboards/..%2F..%2Fstatus');
    });
  });
});
