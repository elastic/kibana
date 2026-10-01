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
  basePath: {
    publicBaseUrl: 'https://localhost:5601',
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
        attributes: { locations: [], schedule: {} },
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

describe('DeployPrivateLocationMonitors failed-create handling', () => {
  const privateLocations = [{ id: 'pl-1', label: 'Private Location 1' }] as any;

  const monitorSo = (id: string) => ({
    id,
    type: 'synthetics-monitor',
    namespaces: ['space1'],
    attributes: {},
  });

  const buildDeployer = ({
    pages,
    editMonitors,
  }: {
    pages: string[][];
    editMonitors: jest.Mock;
  }) => {
    const close = jest.fn().mockResolvedValue(undefined);
    // one finder per maintenance window; monitor ids are unique per finder because
    // the production code skips monitors already handled for an earlier window
    let finderCount = 0;
    const encryptedClient = {
      createPointInTimeFinderDecryptedAsInternalUser: jest.fn().mockImplementation(() => {
        const finderId = finderCount++;
        return Promise.resolve({
          find: () =>
            (async function* () {
              for (const page of pages) {
                yield { saved_objects: page.map((id) => monitorSo(`${id}-${finderId}`)) };
              }
            })(),
          close,
        });
      }),
    };

    const serverSetup = {
      ...mockServerSetup,
      pluginsStart: { encryptedSavedObjects: { getClient: () => encryptedClient } },
    } as unknown as SyntheticsServerSetup;

    const deployer = new DeployPrivateLocationMonitors(serverSetup, {
      ...mockSyntheticsMonitorClient,
      privateLocationAPI: { editMonitors },
    } as any);

    // keep the test focused on the failed-create control flow, not on monitor formatting
    jest.spyOn(deployer, 'mixParamsWithMonitors').mockImplementation((monitors: any) => ({
      configsBySpaces: { space1: monitors },
      monitorSpaceIds: new Set(['space1']),
    }));
    jest
      .spyOn(deployer, 'parseLocations')
      .mockReturnValue({ privateLocations, publicLocations: [] } as any);

    return { deployer, close, editMonitors };
  };

  const withFailedCreates = { failedUpdates: [], failedCreates: [{ packagePolicy: { id: 'p1' } }] };
  const withoutFailures = { failedUpdates: [], failedCreates: [] };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSoClient.bulkUpdate.mockResolvedValue({ saved_objects: [] } as any);
  });

  describe('syncAllPackagePolicies', () => {
    it('reports failed creates to the caller instead of throwing', async () => {
      const editMonitors = jest.fn().mockResolvedValue(withFailedCreates);
      const { deployer } = buildDeployer({ pages: [], editMonitors });

      jest.spyOn(deployer, 'getAllMonitorConfigs').mockResolvedValue({
        configsBySpaces: { space1: [{ id: 'm1' }] },
        monitorSpaceIds: new Set(['space1']),
        paramsBySpace: {},
        maintenanceWindows: [],
      } as any);

      await expect(
        deployer.syncAllPackagePolicies({
          allPrivateLocations: privateLocations,
          soClient: mockSoClient as any,
          encryptedSavedObjects: mockEncryptedSo,
        })
      ).resolves.toEqual({ failedCreatesBySpace: [{ spaceId: 'space1', count: 1 }] });
    });

    it('reports no failures when every create succeeds', async () => {
      const editMonitors = jest.fn().mockResolvedValue(withoutFailures);
      const { deployer } = buildDeployer({ pages: [], editMonitors });

      jest.spyOn(deployer, 'getAllMonitorConfigs').mockResolvedValue({
        configsBySpaces: { space1: [{ id: 'm1' }] },
        monitorSpaceIds: new Set(['space1']),
        paramsBySpace: {},
        maintenanceWindows: [],
      } as any);

      await expect(
        deployer.syncAllPackagePolicies({
          allPrivateLocations: privateLocations,
          soClient: mockSoClient as any,
          encryptedSavedObjects: mockEncryptedSo,
        })
      ).resolves.toEqual({ failedCreatesBySpace: [] });
    });
  });

  describe('syncPackagePoliciesForMws', () => {
    const syncForMws = (deployer: DeployPrivateLocationMonitors, mwIds: string[]) =>
      deployer.syncPackagePoliciesForMws({
        allPrivateLocations: privateLocations,
        updatedMWs: mwIds.map((id) => ({ id })) as any,
        soClient: mockSoClient as any,
        maintenanceWindows: [],
      });

    it('keeps syncing later pages when an earlier page has failed creates', async () => {
      const editMonitors = jest
        .fn()
        .mockResolvedValueOnce(withFailedCreates)
        .mockResolvedValueOnce(withoutFailures);
      const { deployer } = buildDeployer({
        pages: [['m1'], ['m2']],
        editMonitors,
      });

      await syncForMws(deployer, ['mw-1']);

      expect(editMonitors).toHaveBeenCalledTimes(2);
    });

    it('closes the point-in-time finder when a page has failed creates', async () => {
      const editMonitors = jest.fn().mockResolvedValue(withFailedCreates);
      const { deployer, close } = buildDeployer({ pages: [['m1']], editMonitors });

      await syncForMws(deployer, ['mw-1']);

      expect(close).toHaveBeenCalled();
    });

    it('keeps processing later maintenance windows when one has failed creates', async () => {
      const editMonitors = jest
        .fn()
        .mockResolvedValueOnce(withFailedCreates)
        .mockResolvedValueOnce(withoutFailures);
      const { deployer } = buildDeployer({ pages: [['m1']], editMonitors });

      await syncForMws(deployer, ['mw-1', 'mw-2']);

      expect(editMonitors).toHaveBeenCalledTimes(2);
    });

    it('still strips a missing maintenance window from monitors when creates fail', async () => {
      const editMonitors = jest.fn().mockResolvedValue(withFailedCreates);
      const { deployer } = buildDeployer({ pages: [['m1']], editMonitors });

      await deployer.syncPackagePoliciesForMws({
        allPrivateLocations: privateLocations,
        missingMWIds: ['mw-gone'],
        soClient: mockSoClient as any,
        maintenanceWindows: [],
      });

      expect(mockSoClient.bulkUpdate).toHaveBeenCalled();
    });

    it('logs the failed creates so they are still visible', async () => {
      const editMonitors = jest.fn().mockResolvedValue(withFailedCreates);
      const { deployer } = buildDeployer({ pages: [['m1']], editMonitors });

      await syncForMws(deployer, ['mw-1']);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create policies during sync')
      );
    });
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
