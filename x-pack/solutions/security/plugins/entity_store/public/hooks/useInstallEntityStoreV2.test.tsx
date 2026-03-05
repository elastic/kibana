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

  it('should do nothing when not in default space and entity store is not installed', async () => {
    const mockServices = createMockServices();
    mockServices.uiSettings.get.mockReturnValue(true);
    mockServices.spaces.getActiveSpace.mockResolvedValue({ id: 'custom-space' });
    mockServices.http.get.mockResolvedValueOnce({ status: EntityStoreStatus.enum.not_installed });

    renderHook(() => useInstallEntityStoreV2(asServices(mockServices)));

    await waitFor(() => {
      expect(mockServices.http.get).toHaveBeenCalled();
    });

    expect(mockServices.http.post).not.toHaveBeenCalled();
  });

  it('when not default space but entity store is already installed, inits entity maintainers only', async () => {
    const mockServices = createMockServices();
    mockServices.uiSettings.get.mockReturnValue(true);
    mockServices.spaces.getActiveSpace.mockResolvedValue({ id: 'custom-space' });
    mockServices.http.get.mockResolvedValueOnce({ status: EntityStoreStatus.enum.running });
    mockServices.http.post.mockResolvedValue({});

    renderHook(() => useInstallEntityStoreV2(asServices(mockServices)));

    await waitFor(() => {
      expect(mockServices.http.post).toHaveBeenCalledTimes(1);
    });

    expect(mockServices.http.post).toHaveBeenCalledWith({
      path: ENTITY_STORE_ROUTES.ENTITY_MAINTAINERS_INIT,
      body: JSON.stringify({}),
      query: { apiVersion: '2' },
    });
    expect(mockServices.http.post).not.toHaveBeenCalledWith({
      path: ENTITY_STORE_ROUTES.INSTALL,
      body: JSON.stringify({}),
      query: { apiVersion: '2' },
    });
  });

  it('when entity store is already installed, inits entity maintainers only', async () => {
    const mockServices = createMockServices();
    mockServices.uiSettings.get.mockReturnValue(true);
    mockServices.spaces.getActiveSpace.mockResolvedValue({ id: 'default' });
    mockServices.http.get.mockResolvedValueOnce({ status: EntityStoreStatus.enum.running });
    mockServices.http.post.mockResolvedValue({});

    renderHook(() => useInstallEntityStoreV2(asServices(mockServices)));

    await waitFor(() => {
      expect(mockServices.http.post).toHaveBeenCalledTimes(1);
    });

    expect(mockServices.http.get).toHaveBeenCalledWith({
      path: ENTITY_STORE_ROUTES.STATUS,
      query: { apiVersion: '2', include_components: false },
    });
    expect(mockServices.http.post).toHaveBeenCalledWith({
      path: ENTITY_STORE_ROUTES.ENTITY_MAINTAINERS_INIT,
      body: JSON.stringify({}),
      query: { apiVersion: '2' },
    });
    expect(mockServices.http.post).not.toHaveBeenCalledWith({
      path: ENTITY_STORE_ROUTES.INSTALL,
      body: JSON.stringify({}),
      query: { apiVersion: '2' },
    });
  });

  it('when entity store is not installed and space is default, installs entity store then inits entity maintainers', async () => {
    const mockServices = createMockServices();
    mockServices.uiSettings.get.mockReturnValue(true);
    mockServices.spaces.getActiveSpace.mockResolvedValue({ id: 'default' });
    mockServices.http.get.mockResolvedValueOnce({ status: EntityStoreStatus.enum.not_installed });
    mockServices.http.post.mockResolvedValue({});

    renderHook(() => useInstallEntityStoreV2(asServices(mockServices)));

    await waitFor(() => {
      expect(mockServices.http.post).toHaveBeenCalledTimes(2);
    });

    expect(mockServices.http.get).toHaveBeenCalledWith({
      path: ENTITY_STORE_ROUTES.STATUS,
      query: { apiVersion: '2', include_components: false },
    });
    expect(mockServices.http.post).toHaveBeenNthCalledWith(1, {
      path: ENTITY_STORE_ROUTES.INSTALL,
      body: JSON.stringify({}),
      query: { apiVersion: '2' },
    });
    expect(mockServices.http.post).toHaveBeenNthCalledWith(2, {
      path: ENTITY_STORE_ROUTES.ENTITY_MAINTAINERS_INIT,
      body: JSON.stringify({}),
      query: { apiVersion: '2' },
    });
  });
});
