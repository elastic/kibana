/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useInstallEntityStoreV2, type Services } from './useInstallEntityStoreV2';
import { ENTITY_STORE_ROUTES, EntityStoreStatus, FF_ENABLE_ENTITY_STORE_V2 } from '../../common';

interface MockServices {
  http: { get: jest.Mock; post: jest.Mock };
  uiSettings: { get: jest.Mock };
  logger: { error: jest.Mock };
  spaces: { getActiveSpace: jest.Mock };
}

const createMockServices = (): MockServices => ({
  http: { get: jest.fn(), post: jest.fn() },
  uiSettings: { get: jest.fn() },
  logger: { error: jest.fn() },
  spaces: { getActiveSpace: jest.fn() },
});

const asServices = (mock: MockServices): Services => mock as unknown as Services;

describe('useInstallEntityStoreV2', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not install when feature flag is disabled', async () => {
    const mockServices = createMockServices();
    mockServices.uiSettings.get.mockReturnValue(false);

    renderHook(() => useInstallEntityStoreV2(asServices(mockServices)));

    await waitFor(() => {
      expect(mockServices.uiSettings.get).toHaveBeenCalledWith(FF_ENABLE_ENTITY_STORE_V2);
    });

    expect(mockServices.spaces.getActiveSpace).not.toHaveBeenCalled();
    expect(mockServices.http.post).not.toHaveBeenCalled();
  });

  it('should not install when not in default space', async () => {
    const mockServices = createMockServices();
    mockServices.uiSettings.get.mockReturnValue(true);
    mockServices.spaces.getActiveSpace.mockResolvedValue({ id: 'custom-space' });

    renderHook(() => useInstallEntityStoreV2(asServices(mockServices)));

    await waitFor(() => {
      expect(mockServices.spaces.getActiveSpace).toHaveBeenCalled();
    });

    expect(mockServices.http.post).not.toHaveBeenCalled();
  });

  it("should not install when entity store status is 'running'", async () => {
    const mockServices = createMockServices();
    mockServices.uiSettings.get.mockReturnValue(true);
    mockServices.spaces.getActiveSpace.mockResolvedValue({ id: 'default' });
    mockServices.http.get.mockResolvedValueOnce({ status: EntityStoreStatus.Values.running });

    renderHook(() => useInstallEntityStoreV2(asServices(mockServices)));

    await waitFor(() => {
      expect(mockServices.http.get).toHaveBeenCalledWith({
        path: ENTITY_STORE_ROUTES.STATUS,
        query: { apiVersion: '2', include_components: false },
      });
    });

    expect(mockServices.http.post).not.toHaveBeenCalled();
  });

  it("should not install when entity store status is 'installing'", async () => {
    const mockServices = createMockServices();
    mockServices.uiSettings.get.mockReturnValue(true);
    mockServices.spaces.getActiveSpace.mockResolvedValue({ id: 'default' });
    mockServices.http.get.mockResolvedValueOnce({ status: EntityStoreStatus.Values.installing });

    renderHook(() => useInstallEntityStoreV2(asServices(mockServices)));

    await waitFor(() => {
      expect(mockServices.http.get).toHaveBeenCalledTimes(1);
    });

    expect(mockServices.http.post).not.toHaveBeenCalled();
  });

  it("should not install when entity store status is 'stopped'", async () => {
    const mockServices = createMockServices();
    mockServices.uiSettings.get.mockReturnValue(true);
    mockServices.spaces.getActiveSpace.mockResolvedValue({ id: 'default' });
    mockServices.http.get.mockResolvedValueOnce({ status: EntityStoreStatus.Values.stopped });

    renderHook(() => useInstallEntityStoreV2(asServices(mockServices)));

    await waitFor(() => {
      expect(mockServices.http.get).toHaveBeenCalledTimes(1);
    });

    expect(mockServices.http.post).not.toHaveBeenCalled();
  });

  it("should not install when entity store status is 'error'", async () => {
    const mockServices = createMockServices();
    mockServices.uiSettings.get.mockReturnValue(true);
    mockServices.spaces.getActiveSpace.mockResolvedValue({ id: 'default' });
    mockServices.http.get.mockResolvedValueOnce({ status: EntityStoreStatus.Values.error });

    renderHook(() => useInstallEntityStoreV2(asServices(mockServices)));

    await waitFor(() => {
      expect(mockServices.http.get).toHaveBeenCalledTimes(1);
    });

    expect(mockServices.http.post).not.toHaveBeenCalled();
  });

  it('should install when entity store is not installed', async () => {
    const mockServices = createMockServices();
    mockServices.uiSettings.get.mockReturnValue(true);
    mockServices.spaces.getActiveSpace.mockResolvedValue({ id: 'default' });
    mockServices.http.get.mockResolvedValueOnce({ status: EntityStoreStatus.Values.not_installed });
    mockServices.http.post.mockResolvedValueOnce({});

    renderHook(() => useInstallEntityStoreV2(asServices(mockServices)));

    await waitFor(() => {
      expect(mockServices.http.post).toHaveBeenCalledTimes(1);
    });

    expect(mockServices.http.get).toHaveBeenCalledWith({
      path: ENTITY_STORE_ROUTES.STATUS,
      query: { apiVersion: '2', include_components: false },
    });
    expect(mockServices.http.post).toHaveBeenCalledWith({
      path: ENTITY_STORE_ROUTES.INSTALL,
      body: JSON.stringify({}),
      query: { apiVersion: '2' },
    });
  });
});
