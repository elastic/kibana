/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { mockEncryptedSO } from '../synthetics_service/utils/mocks';
import { DeployPrivateLocationMonitors } from './deploy_private_location_monitors';
import type { SyntheticsServerSetup } from '../types';
import { MonitorConfigRepository } from '../services/monitor_config_repository';

jest.mock('../services/monitor_config_repository');

const mockSoClient = savedObjectsRepositoryMock.create();
const mockEncryptedSo = mockEncryptedSO();
const mockLogger = loggerMock.create();

const mockSyntheticsMonitorClient: any = {
  syntheticsService: {
    getSyntheticsParams: jest.fn().mockResolvedValue({}),
    getMaintenanceWindows: jest.fn().mockResolvedValue([]),
  },
};

const mockServerSetup = {
  fleet: {
    runWithCache: (fn: any) => fn(),
  },
  pluginsStart: {
    encryptedSavedObjects: mockEncryptedSo,
  },
  logger: mockLogger,
} as unknown as SyntheticsServerSetup;

describe('DeployPrivateLocationMonitors.getAllMonitorConfigs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call MonitorConfigRepository.findDecryptedMonitors with filter when privateLocationId provided', async () => {
    const monitorsMock = [
      {
        id: 'm1',
        namespaces: ['space1'],
        attributes: { locations: [] },
      },
    ];
    // Mock MonitorConfigRepository implementation
    (MonitorConfigRepository as unknown as jest.Mock).mockImplementation(() => {
      return {
        findDecryptedMonitors: jest.fn().mockResolvedValue(monitorsMock),
      };
    });

    const deployer = new DeployPrivateLocationMonitors(
      mockServerSetup,
      mockSyntheticsMonitorClient
    );
    const privateLocationId = 'pl-123';
    const res = await deployer.getAllMonitorConfigs({
      soClient: mockSoClient as any,
      encryptedSavedObjects: mockEncryptedSo,
      spaceId: 'space1',
      privateLocationId,
    });

    // Ensure MonitorConfigRepository was constructed and its finder was called with filter containing the privateLocationId
    expect(MonitorConfigRepository).toHaveBeenCalledWith(mockSoClient, mockEncryptedSo.getClient());
    const repoInstance = (MonitorConfigRepository as unknown as jest.Mock).mock.results[0].value;
    expect(repoInstance.findDecryptedMonitors).toHaveBeenCalledWith(
      expect.objectContaining({
        spaceId: 'space1',
        filter: expect.stringContaining(`locations.id:"${privateLocationId}"`),
      })
    );

    // verify returned structure contains expected keys
    expect(res).toHaveProperty('configsBySpaces');
    expect(res).toHaveProperty('paramsBySpace');
    expect(res).toHaveProperty('maintenanceWindows');
  });
});

describe('DeployPrivateLocationMonitors.mixParamsWithMonitors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('injects params shared across all spaces into monitors whose space has no space-specific params', () => {
    // Regression test for https://github.com/elastic/sdh-synthetics/issues/295.
    // getSyntheticsParams buckets a "Share across spaces" param only under the '*'
    // (ALL_SPACES_ID) key, and does not materialize a bucket for a space that has no
    // space-specific params. This monitor lives in `space1`, which has no dedicated
    // bucket, so a direct paramsBySpace['space1'] lookup used to drop the shared param.
    const deployer = new DeployPrivateLocationMonitors(
      mockServerSetup,
      mockSyntheticsMonitorClient
    );

    const browserMonitor = {
      id: 'm1',
      type: 'synthetics-monitor',
      namespaces: ['space1'],
      attributes: {
        type: 'browser',
        name: 'SRE-CF-External-Login',
        locations: [{ id: 'pl-1', isServiceManaged: false }],
      },
    } as any;

    const paramsBySpace = { '*': { GLOBAL_KEY: 'global_value' } };

    const { configsBySpaces, monitorSpaceIds } = deployer.mixParamsWithMonitors(
      [browserMonitor],
      paramsBySpace
    );

    expect(monitorSpaceIds.has('space1')).toBe(true);
    expect(configsBySpaces.space1).toHaveLength(1);
    expect(JSON.parse(configsBySpaces.space1[0].params as string)).toEqual({
      GLOBAL_KEY: 'global_value',
    });
  });
});
