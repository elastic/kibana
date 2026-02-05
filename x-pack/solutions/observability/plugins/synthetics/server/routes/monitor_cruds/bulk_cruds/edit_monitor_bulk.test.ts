/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { syncEditedMonitorBulk } from './edit_monitor_bulk';

jest.mock('../../telemetry/monitor_upgrade_sender', () => ({
  formatTelemetryUpdateEvent: jest.fn(),
  sendTelemetryEvents: jest.fn(),
}));

describe('syncEditedMonitorBulk', () => {
  const mockMonitorConfigRepository = {
    bulkUpdate: jest.fn(),
    bulkUpdatePackagePolicyReferences: jest.fn(),
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
    it('should update monitor references with active package policies after edit', async () => {
      const monitorsToUpdate = [
        {
          normalizedMonitor: { name: 'Monitor 1' },
          monitorWithRevision: { name: 'Monitor 1', revision: 2 },
          decryptedPreviousMonitor: {
            id: 'monitor-1',
            type: 'synthetics-monitor',
            attributes: { name: 'Monitor 1' },
          },
        },
        {
          normalizedMonitor: { name: 'Monitor 2' },
          monitorWithRevision: { name: 'Monitor 2', revision: 2 },
          decryptedPreviousMonitor: {
            id: 'monitor-2',
            type: 'synthetics-monitor',
            attributes: { name: 'Monitor 2' },
          },
        },
      ] as any;

      const activePolicyIds = ['monitor-1-loc-1', 'monitor-1-loc-2', 'monitor-2-loc-1'];

      mockMonitorConfigRepository.bulkUpdate.mockResolvedValue({
        saved_objects: [
          { id: 'monitor-1', attributes: { name: 'Monitor 1' } },
          { id: 'monitor-2', attributes: { name: 'Monitor 2' } },
        ],
      });

      mockSyntheticsMonitorClient.editMonitors.mockResolvedValue({
        failedPolicyUpdates: [],
        publicSyncErrors: [],
        activePolicyIds,
      });

      mockMonitorConfigRepository.bulkUpdatePackagePolicyReferences.mockResolvedValue({
        saved_objects: [],
      });

      await syncEditedMonitorBulk({
        routeContext: mockRouteContext,
        monitorsToUpdate,
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
            savedObjectType: 'synthetics-monitor',
          },
          {
            monitorId: 'monitor-2',
            packagePolicyIds: ['monitor-2-loc-1'],
            savedObjectType: 'synthetics-monitor',
          },
        ]),
        undefined
      );
    });

    it('should not update references if no active policies returned', async () => {
      const monitorsToUpdate = [
        {
          normalizedMonitor: { name: 'Monitor 1' },
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
        activePolicyIds: [],
      });

      await syncEditedMonitorBulk({
        routeContext: mockRouteContext,
        monitorsToUpdate,
        privateLocations: [],
        spaceId: 'default',
      });

      expect(mockMonitorConfigRepository.bulkUpdatePackagePolicyReferences).not.toHaveBeenCalled();
    });

    it('should handle undefined activePolicyIds gracefully', async () => {
      const monitorsToUpdate = [
        {
          normalizedMonitor: { name: 'Monitor 1' },
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

      expect(mockMonitorConfigRepository.bulkUpdatePackagePolicyReferences).not.toHaveBeenCalled();
    });

    it('should only update references for monitors with matching policies', async () => {
      const monitorsToUpdate = [
        {
          normalizedMonitor: { name: 'Monitor 1' },
          monitorWithRevision: { name: 'Monitor 1', revision: 2 },
          decryptedPreviousMonitor: {
            id: 'monitor-1',
            type: 'synthetics-monitor',
            attributes: { name: 'Monitor 1' },
          },
        },
        {
          normalizedMonitor: { name: 'Monitor 2' },
          monitorWithRevision: { name: 'Monitor 2', revision: 2 },
          decryptedPreviousMonitor: {
            id: 'monitor-2',
            type: 'synthetics-monitor',
            attributes: { name: 'Monitor 2' },
          },
        },
      ] as any;

      const activePolicyIds = ['monitor-1-loc-1'];

      mockMonitorConfigRepository.bulkUpdate.mockResolvedValue({
        saved_objects: [
          { id: 'monitor-1', attributes: { name: 'Monitor 1' } },
          { id: 'monitor-2', attributes: { name: 'Monitor 2' } },
        ],
      });

      mockSyntheticsMonitorClient.editMonitors.mockResolvedValue({
        failedPolicyUpdates: [],
        publicSyncErrors: [],
        activePolicyIds,
      });

      mockMonitorConfigRepository.bulkUpdatePackagePolicyReferences.mockResolvedValue({
        saved_objects: [],
      });

      await syncEditedMonitorBulk({
        routeContext: mockRouteContext,
        monitorsToUpdate,
        privateLocations: [],
        spaceId: 'default',
      });

      expect(mockMonitorConfigRepository.bulkUpdatePackagePolicyReferences).toHaveBeenCalledTimes(
        1
      );
      expect(mockMonitorConfigRepository.bulkUpdatePackagePolicyReferences).toHaveBeenCalledWith(
        [
          {
            monitorId: 'monitor-1',
            packagePolicyIds: ['monitor-1-loc-1'],
            savedObjectType: 'synthetics-monitor',
          },
        ],
        undefined
      );
    });

    it('should pass namespace when updating monitors in a different space', async () => {
      const monitorsToUpdate = [
        {
          normalizedMonitor: { name: 'Monitor 1' },
          monitorWithRevision: { name: 'Monitor 1', revision: 2 },
          decryptedPreviousMonitor: {
            id: 'monitor-1',
            type: 'synthetics-monitor',
            attributes: { name: 'Monitor 1' },
          },
        },
      ] as any;

      const activePolicyIds = ['monitor-1-loc-1'];

      mockMonitorConfigRepository.bulkUpdate.mockResolvedValue({
        saved_objects: [
          { id: 'monitor-1', type: 'synthetics-monitor', attributes: { name: 'Monitor 1' } },
        ],
      });

      mockSyntheticsMonitorClient.editMonitors.mockResolvedValue({
        failedPolicyUpdates: [],
        publicSyncErrors: [],
        activePolicyIds,
      });

      mockMonitorConfigRepository.bulkUpdatePackagePolicyReferences.mockResolvedValue({
        saved_objects: [],
      });

      await syncEditedMonitorBulk({
        routeContext: mockRouteContext,
        monitorsToUpdate,
        privateLocations: [],
        spaceId: 'other-space',
      });

      expect(mockMonitorConfigRepository.bulkUpdatePackagePolicyReferences).toHaveBeenCalledTimes(
        1
      );
      expect(mockMonitorConfigRepository.bulkUpdatePackagePolicyReferences).toHaveBeenCalledWith(
        [
          {
            monitorId: 'monitor-1',
            packagePolicyIds: ['monitor-1-loc-1'],
            savedObjectType: 'synthetics-monitor',
          },
        ],
        'other-space'
      );
    });
  });
});
