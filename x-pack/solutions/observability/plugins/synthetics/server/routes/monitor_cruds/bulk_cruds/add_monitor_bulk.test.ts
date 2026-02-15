/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { syncNewMonitorBulk } from './add_monitor_bulk';
import { ConfigKey } from '../../../../common/runtime_types';

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
    bulkUpdatePackagePolicyReferences: jest.fn(),
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
    it('should update monitor references with created package policies', async () => {
      const normalizedMonitors = [
        { name: 'Monitor 1', [ConfigKey.LOCATIONS]: [] },
        { name: 'Monitor 2', [ConfigKey.LOCATIONS]: [] },
      ] as any;

      const createdMonitors = [
        { id: 'monitor-1', attributes: { name: 'Monitor 1' } },
        { id: 'monitor-2', attributes: { name: 'Monitor 2' } },
      ];

      const createdPolicies = [
        { id: 'monitor-1-loc-1', name: 'Policy 1' },
        { id: 'monitor-1-loc-2', name: 'Policy 2' },
        { id: 'monitor-2-loc-1', name: 'Policy 3' },
      ];

      mockMonitorConfigRepository.createBulk.mockResolvedValue(createdMonitors);
      mockSyntheticsMonitorClient.addMonitors.mockResolvedValue([
        { created: createdPolicies, failed: [] },
        [],
      ]);
      mockMonitorConfigRepository.bulkUpdatePackagePolicyReferences.mockResolvedValue({
        saved_objects: [],
      });

      await syncNewMonitorBulk({
        routeContext: mockRouteContext,
        normalizedMonitors,
        privateLocations: [],
        spaceId: 'default',
      });

      expect(mockMonitorConfigRepository.bulkUpdatePackagePolicyReferences).toHaveBeenCalledTimes(
        1
      );

      expect(mockMonitorConfigRepository.bulkUpdatePackagePolicyReferences).toHaveBeenCalledWith(
        expect.arrayContaining([
          {
            monitorId: 'monitor-1',
            packagePolicyIds: ['monitor-1-loc-1', 'monitor-1-loc-2'],
            savedObjectType: undefined,
          },
          {
            monitorId: 'monitor-2',
            packagePolicyIds: ['monitor-2-loc-1'],
            savedObjectType: undefined,
          },
        ])
      );
    });

    it('should not update references if no policies were created', async () => {
      const normalizedMonitors = [{ name: 'Monitor 1', [ConfigKey.LOCATIONS]: [] }] as any;

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

      expect(mockMonitorConfigRepository.bulkUpdatePackagePolicyReferences).not.toHaveBeenCalled();
    });

    it('should handle policies that do not match any monitor', async () => {
      const normalizedMonitors = [{ name: 'Monitor 1', [ConfigKey.LOCATIONS]: [] }] as any;

      mockMonitorConfigRepository.createBulk.mockResolvedValue([
        { id: 'monitor-1', attributes: { name: 'Monitor 1' } },
      ]);
      mockSyntheticsMonitorClient.addMonitors.mockResolvedValue([
        {
          created: [
            { id: 'monitor-1-loc-1', name: 'Policy 1' },
            { id: 'unknown-monitor-loc-1', name: 'Orphan Policy' },
          ],
          failed: [],
        },
        [],
      ]);
      mockMonitorConfigRepository.bulkUpdatePackagePolicyReferences.mockResolvedValue({
        saved_objects: [],
      });

      await syncNewMonitorBulk({
        routeContext: mockRouteContext,
        normalizedMonitors,
        privateLocations: [],
        spaceId: 'default',
      });

      expect(mockMonitorConfigRepository.bulkUpdatePackagePolicyReferences).toHaveBeenCalledTimes(
        1
      );
      expect(mockMonitorConfigRepository.bulkUpdatePackagePolicyReferences).toHaveBeenCalledWith([
        {
          monitorId: 'monitor-1',
          packagePolicyIds: ['monitor-1-loc-1'],
          savedObjectType: undefined,
        },
      ]);
    });
  });
});
