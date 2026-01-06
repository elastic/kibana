/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMaintenanceWindowsRoute } from './get_maintenance_windows';

describe('getMaintenanceWindowsRoute', () => {
  const mockMonitorConfigRepository = {
    get: jest.fn(),
  };

  const mockMaintenanceWindowClient = {
    find: jest.fn(),
  };

  const mockServer = {
    pluginsStart: {
      maintenanceWindows: {
        getMaintenanceWindowClientWithAuth: jest.fn().mockReturnValue(mockMaintenanceWindowClient),
      },
    },
  };

  const mockRequest = {
    body: { monitorId: 'test-monitor-id' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns route configuration', () => {
    const route = getMaintenanceWindowsRoute();
    expect(route.method).toBe('POST');
    expect(route.path).toBeDefined();
    expect(route.validate).toBeDefined();
  });

  it('returns empty array when monitor has no other namespaces', async () => {
    mockMonitorConfigRepository.get.mockResolvedValue({
      namespaces: ['space-a'],
    });

    const route = getMaintenanceWindowsRoute();
    const result = await route.handler({
      request: mockRequest,
      server: mockServer,
      spaceId: 'space-a',
      monitorConfigRepository: mockMonitorConfigRepository,
    } as any);

    expect(result).toEqual({ maintenanceWindows: [] });
    expect(mockMaintenanceWindowClient.find).not.toHaveBeenCalled();
  });

  it('fetches MWs only from other spaces the monitor is shared with', async () => {
    mockMonitorConfigRepository.get.mockResolvedValue({
      namespaces: ['space-a', 'space-b', 'space-c'],
    });

    mockMaintenanceWindowClient.find
      .mockResolvedValueOnce({
        data: [{ id: 'mw-b-1', title: 'MW B1' }],
      })
      .mockResolvedValueOnce({
        data: [{ id: 'mw-c-1', title: 'MW C1' }],
      });

    const route = getMaintenanceWindowsRoute();
    const result = await route.handler({
      request: mockRequest,
      server: mockServer,
      spaceId: 'space-a',
      monitorConfigRepository: mockMonitorConfigRepository,
    } as any);

    expect(mockMaintenanceWindowClient.find).toHaveBeenCalledTimes(2);
    expect(mockMaintenanceWindowClient.find).toHaveBeenCalledWith({
      page: 0,
      perPage: 1000,
      namespaces: ['space-b'],
    });
    expect(mockMaintenanceWindowClient.find).toHaveBeenCalledWith({
      page: 0,
      perPage: 1000,
      namespaces: ['space-c'],
    });

    expect(result).toEqual({
      maintenanceWindows: [
        { id: 'mw-b-1', title: 'MW B1', spaceId: 'space-b' },
        { id: 'mw-c-1', title: 'MW C1', spaceId: 'space-c' },
      ],
    });
  });

  it('returns empty array when MW client is not available', async () => {
    mockMonitorConfigRepository.get.mockResolvedValue({
      namespaces: ['space-a', 'space-b'],
    });

    const serverWithoutMWClient = {
      pluginsStart: {
        maintenanceWindows: {
          getMaintenanceWindowClientWithAuth: jest.fn().mockReturnValue(null),
        },
      },
    };

    const route = getMaintenanceWindowsRoute();
    const result = await route.handler({
      request: mockRequest,
      server: serverWithoutMWClient,
      spaceId: 'space-a',
      monitorConfigRepository: mockMonitorConfigRepository,
    } as any);

    expect(result).toEqual({ maintenanceWindows: [] });
  });

  it('excludes current space from MW query', async () => {
    mockMonitorConfigRepository.get.mockResolvedValue({
      namespaces: ['current-space', 'other-space'],
    });

    mockMaintenanceWindowClient.find.mockResolvedValue({
      data: [{ id: 'mw-1', title: 'Other MW' }],
    });

    const route = getMaintenanceWindowsRoute();
    await route.handler({
      request: mockRequest,
      server: mockServer,
      spaceId: 'current-space',
      monitorConfigRepository: mockMonitorConfigRepository,
    } as any);

    expect(mockMaintenanceWindowClient.find).toHaveBeenCalledTimes(1);
    expect(mockMaintenanceWindowClient.find).toHaveBeenCalledWith({
      page: 0,
      perPage: 1000,
      namespaces: ['other-space'],
    });
  });
});
