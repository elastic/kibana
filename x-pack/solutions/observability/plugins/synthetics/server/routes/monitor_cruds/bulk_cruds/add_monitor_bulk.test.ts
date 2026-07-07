/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { syncNewMonitorBulk } from './add_monitor_bulk';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import { ConfigKey } from '../../../../common/runtime_types';

jest.mock('@kbn/fleet-plugin/server/services/package_policy', () => ({
  getPackagePolicySavedObjectType: jest.fn().mockResolvedValue('fleet-package-policies'),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

jest.mock('../../telemetry/monitor_upgrade_sender', () => ({
  formatTelemetryEvent: jest.fn(),
  sendTelemetryEvents: jest.fn(),
}));

describe('syncNewMonitorBulk', () => {
  const mockMonitorConfigRepository = {
    createBulk: jest.fn(),
  };

  const mockSyntheticsMonitorClient = {
    addMonitors: jest.fn(),
  };

  const mockRouteContext = {
    server: {
      logger: { error: jest.fn() },
      telemetry: {},
    },
    syntheticsMonitorClient: mockSyntheticsMonitorClient,
    monitorConfigRepository: mockMonitorConfigRepository,
    request: { query: {} },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    let idCounter = 0;
    jest.requireMock('uuid').v4.mockImplementation(() => `monitor-${++idCounter}`);
  });

  describe('package policy references', () => {
    it('should pass references inline via createBulk for private locations', async () => {
      const normalizedMonitors = [
        {
          name: 'Monitor 1',
          [ConfigKey.LOCATIONS]: [
            { id: 'loc-1', isServiceManaged: false },
            { id: 'loc-2', isServiceManaged: false },
          ],
        },
        {
          name: 'Monitor 2',
          [ConfigKey.LOCATIONS]: [{ id: 'loc-1', isServiceManaged: false }],
        },
      ] as any;

      mockMonitorConfigRepository.createBulk.mockResolvedValue([
        { id: 'monitor-1', attributes: { name: 'Monitor 1' } },
        { id: 'monitor-2', attributes: { name: 'Monitor 2' } },
      ]);
      mockSyntheticsMonitorClient.addMonitors.mockResolvedValue([{ created: [], failed: [] }, []]);

      await syncNewMonitorBulk({
        routeContext: mockRouteContext,
        normalizedMonitors,
        privateLocations: [],
        spaceId: 'default',
      });

      expect(mockMonitorConfigRepository.createBulk).toHaveBeenCalledWith(
        expect.objectContaining({
          monitors: expect.arrayContaining([
            expect.objectContaining({
              id: 'monitor-1',
              references: [
                {
                  id: 'monitor-1-loc-1',
                  name: 'monitor-1-loc-1',
                  type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
                },
                {
                  id: 'monitor-1-loc-2',
                  name: 'monitor-1-loc-2',
                  type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
                },
              ],
            }),
            expect.objectContaining({
              id: 'monitor-2',
              references: [
                {
                  id: 'monitor-2-loc-1',
                  name: 'monitor-2-loc-1',
                  type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
                },
              ],
            }),
          ]),
        })
      );
    });

    it('should not pass references when monitors have no private locations', async () => {
      const normalizedMonitors = [
        {
          name: 'Monitor 1',
          [ConfigKey.LOCATIONS]: [{ id: 'loc-1', isServiceManaged: true }],
        },
      ] as any;

      mockMonitorConfigRepository.createBulk.mockResolvedValue([
        { id: 'monitor-1', attributes: { name: 'Monitor 1' } },
      ]);
      mockSyntheticsMonitorClient.addMonitors.mockResolvedValue([{ created: [], failed: [] }, []]);

      await syncNewMonitorBulk({
        routeContext: mockRouteContext,
        normalizedMonitors,
        privateLocations: [],
        spaceId: 'default',
      });

      expect(mockMonitorConfigRepository.createBulk).toHaveBeenCalledWith(
        expect.objectContaining({
          monitors: expect.arrayContaining([
            expect.not.objectContaining({ references: expect.anything() }),
          ]),
        })
      );
    });
  });
});
