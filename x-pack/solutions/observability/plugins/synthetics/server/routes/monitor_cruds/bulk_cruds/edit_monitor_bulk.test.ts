/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { syncEditedMonitorBulk } from './edit_monitor_bulk';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import { ConfigKey } from '../../../../common/runtime_types';

jest.mock('../../telemetry/monitor_upgrade_sender', () => ({
  formatTelemetryUpdateEvent: jest.fn(),
  sendTelemetryEvents: jest.fn(),
}));

describe('syncEditedMonitorBulk', () => {
  const mockMonitorConfigRepository = {
    bulkUpdate: jest.fn(),
  };

  const mockSyntheticsMonitorClient = {
    editMonitors: jest.fn(),
  };

  const mockRouteContext = {
    server: {
      logger: { error: jest.fn() },
      telemetry: {},
      stackVersion: '8.0.0',
    },
    syntheticsMonitorClient: mockSyntheticsMonitorClient,
    monitorConfigRepository: mockMonitorConfigRepository,
    spaceId: 'default',
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('package policy references', () => {
    it('should pass references inline via bulkUpdate for private locations', async () => {
      const monitorsToUpdate = [
        {
          normalizedMonitor: {
            name: 'Monitor 1',
            [ConfigKey.LOCATIONS]: [
              { id: 'loc-1', isServiceManaged: false },
              { id: 'loc-2', isServiceManaged: false },
            ],
          },
          monitorWithRevision: { name: 'Monitor 1', revision: 2 },
          decryptedPreviousMonitor: {
            id: 'monitor-1',
            type: 'synthetics-monitor',
            attributes: { name: 'Monitor 1' },
          },
        },
        {
          normalizedMonitor: {
            name: 'Monitor 2',
            [ConfigKey.LOCATIONS]: [{ id: 'loc-1', isServiceManaged: false }],
          },
          monitorWithRevision: { name: 'Monitor 2', revision: 2 },
          decryptedPreviousMonitor: {
            id: 'monitor-2',
            type: 'synthetics-monitor',
            attributes: { name: 'Monitor 2' },
          },
        },
      ] as any;

      mockMonitorConfigRepository.bulkUpdate.mockResolvedValue({
        saved_objects: [
          { id: 'monitor-1', attributes: { name: 'Monitor 1' } },
          { id: 'monitor-2', attributes: { name: 'Monitor 2' } },
        ],
      });

      mockSyntheticsMonitorClient.editMonitors.mockResolvedValue({
        failedPolicyUpdates: [],
        publicSyncErrors: [],
      });

      await syncEditedMonitorBulk({
        routeContext: mockRouteContext,
        monitorsToUpdate,
        privateLocations: [],
        spaceId: 'default',
      });

      expect(mockMonitorConfigRepository.bulkUpdate).toHaveBeenCalledWith(
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
      const monitorsToUpdate = [
        {
          normalizedMonitor: {
            name: 'Monitor 1',
            [ConfigKey.LOCATIONS]: [{ id: 'loc-1', isServiceManaged: true }],
          },
          monitorWithRevision: { name: 'Monitor 1', revision: 2 },
          decryptedPreviousMonitor: {
            id: 'monitor-1',
            type: 'synthetics-monitor',
            attributes: { name: 'Monitor 1' },
          },
        },
      ] as any;

      mockMonitorConfigRepository.bulkUpdate.mockResolvedValue({
        saved_objects: [{ id: 'monitor-1', attributes: { name: 'Monitor 1' } }],
      });

      mockSyntheticsMonitorClient.editMonitors.mockResolvedValue({
        failedPolicyUpdates: [],
        publicSyncErrors: [],
      });

      await syncEditedMonitorBulk({
        routeContext: mockRouteContext,
        monitorsToUpdate,
        privateLocations: [],
        spaceId: 'default',
      });

      expect(mockMonitorConfigRepository.bulkUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          monitors: expect.arrayContaining([
            expect.not.objectContaining({ references: expect.anything() }),
          ]),
        })
      );
    });

    it('should pass namespace when updating monitors in a different space', async () => {
      const monitorsToUpdate = [
        {
          normalizedMonitor: {
            name: 'Monitor 1',
            [ConfigKey.LOCATIONS]: [{ id: 'loc-1', isServiceManaged: false }],
          },
          monitorWithRevision: { name: 'Monitor 1', revision: 2 },
          decryptedPreviousMonitor: {
            id: 'monitor-1',
            type: 'synthetics-monitor',
            attributes: { name: 'Monitor 1' },
          },
        },
      ] as any;

      mockMonitorConfigRepository.bulkUpdate.mockResolvedValue({
        saved_objects: [
          { id: 'monitor-1', type: 'synthetics-monitor', attributes: { name: 'Monitor 1' } },
        ],
      });

      mockSyntheticsMonitorClient.editMonitors.mockResolvedValue({
        failedPolicyUpdates: [],
        publicSyncErrors: [],
      });

      await syncEditedMonitorBulk({
        routeContext: mockRouteContext,
        monitorsToUpdate,
        privateLocations: [],
        spaceId: 'other-space',
      });

      expect(mockMonitorConfigRepository.bulkUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          namespace: 'other-space',
          monitors: expect.arrayContaining([
            expect.objectContaining({
              id: 'monitor-1',
              references: [
                {
                  id: 'monitor-1-loc-1',
                  name: 'monitor-1-loc-1',
                  type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
                },
              ],
            }),
          ]),
        })
      );
    });
  });
});
