/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

/**
 * SiemMigrationsServiceBase.test.ts
 *
 * This file tests the SiemMigrationsServiceBase class.
 * We use Jest for assertions and mocking. We also use Jest’s fake timers to simulate the polling loop.
 */

import type { CoreStart } from '@kbn/core/public';
import { firstValueFrom } from 'rxjs';
import { SiemMigrationTaskStatus } from '../../../../common/siem_migrations/constants';
import type { StartPluginsDependencies } from '../../../types';
import { getMissingCapabilitiesChecker } from './capabilities';
import { SiemMigrationsServiceBase } from './migrations_service_base';
import type { MigrationTaskStats } from '../../../../common/siem_migrations/model/common.gen';
import { TASK_STATS_POLLING_SLEEP_SECONDS } from '../constants';

// --- Mocks for external modules ---

vi.mock('./capabilities', () => {
  const mocked = {
    getMissingCapabilitiesChecker: vi.fn(() => () => []),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../common/experimental_features_service', () => {
  const mocked = {
    ExperimentalFeaturesService: {
      get: vi.fn(() => ({ siemMigrationsDisabled: false })),
    },
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../common/hooks/use_license', () => {
  const mocked = {
    licenseService: {
      isEnterprise: vi.fn(() => true),
    },
  };
  return { ...mocked, default: mocked };
});

vi.mock('./notifications/no_connector_notification', () => {
  const mocked = {
    getNoConnectorToast: vi.fn().mockReturnValue({ title: 'No Connector' }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./notifications/missing_capabilities_notification', () => {
  const mocked = {
    getMissingCapabilitiesToast: vi.fn().mockReturnValue({ title: 'Missing Capabilities' }),
  };
  return { ...mocked, default: mocked };
});

const mockGetMissingCapabilitiesChecker = getMissingCapabilitiesChecker as Mock;

const mockStartMigrationFromStats = vi.fn();
const mockFetchMigrationStats = vi.fn();
const mockFetchMigrationsStatsAll = vi.fn();
const mockSendFinishedMigrationNotification = vi.fn();

class TestMigrationsService extends SiemMigrationsServiceBase<MigrationTaskStats> {
  protected startMigrationFromStats = mockStartMigrationFromStats;
  protected fetchMigrationStats = mockFetchMigrationStats;
  protected fetchMigrationsStatsAll = mockFetchMigrationsStatsAll;
  protected sendFinishedMigrationNotification = mockSendFinishedMigrationNotification;
  public isAvailable(): boolean {
    return true;
  }

  public getMissingCapabilities = mockGetMissingCapabilitiesChecker;
}

// --- End of mocks ---

const defaultMigrationStats = {
  id: 'mig-1',
  status: SiemMigrationTaskStatus.READY,
  created_at: '2025-01-01T00:00:00Z',
  last_updated_at: '2025-01-01T01:00:00Z',
};

describe('SiemMigrationsServiceBase', () => {
  let service: TestMigrationsService;
  let mockCore: CoreStart;
  let mockPlugins: StartPluginsDependencies;
  let mockNotifications: CoreStart['notifications'];

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create a fake notifications object to spy on toast calls
    mockNotifications = {
      toasts: { add: vi.fn(), addError: vi.fn(), addSuccess: vi.fn() },
    } as unknown as CoreStart['notifications'];

    // Minimal core stub
    mockCore = {
      application: { capabilities: {} },
      notifications: mockNotifications,
    } as CoreStart;

    // Minimal plugins stub with spaces.getActiveSpace returning a fake space
    mockPlugins = {
      spaces: {
        getActiveSpace: vi.fn().mockResolvedValue({ id: 'test-space' }),
      },
    } as unknown as StartPluginsDependencies;

    mockGetMissingCapabilitiesChecker.mockReturnValue(() => []);
    mockStartMigrationFromStats.mockImplementationOnce(() => Promise.resolve());
    mockFetchMigrationStats.mockResolvedValue(defaultMigrationStats);
    mockFetchMigrationsStatsAll.mockResolvedValue([]);
    mockSendFinishedMigrationNotification.mockImplementationOnce(() => {});

    // Instantiate the service – note that the constructor calls getActiveSpace and startPolling
    service = new TestMigrationsService(mockCore, mockPlugins);
    // Wait for any async operations in the constructor to complete
    await Promise.resolve();
  });

  describe('latestStats$', () => {
    it('should be initialized to null', async () => {
      // Instantiate the service – note that the constructor calls getActiveSpace and startPolling
      const testService = new TestMigrationsService(mockCore, mockPlugins);
      expect(await firstValueFrom(testService.getLatestStats$())).toBeNull();
      await Promise.resolve();
    });
  });

  describe('getMigrationsStats', () => {
    it('should fetch and update latest stats', async () => {
      const statsArray = [
        { id: 'mig-1', status: SiemMigrationTaskStatus.RUNNING, name: 'test 1' },
        { id: 'mig-2', status: SiemMigrationTaskStatus.FINISHED, name: 'test 2' },
      ];
      mockFetchMigrationsStatsAll.mockResolvedValue(statsArray);

      const result = await service.getMigrationsStats();
      expect(mockFetchMigrationsStatsAll).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('test 1');
      expect(result[1].name).toBe('test 2');

      const latestStats = await firstValueFrom(service.getLatestStats$());
      expect(latestStats).toEqual(result);
    });
  });

  describe('Polling behavior', () => {
    it('should poll and send a success toast when a migration finishes', async () => {
      // Use fake timers to simulate delays inside the polling loop.
      vi.useFakeTimers();

      // Simulate a migration that is first reported as RUNNING and then FINISHED.
      const runningMigration = { id: 'mig-1', status: SiemMigrationTaskStatus.RUNNING };
      const finishedMigration = { id: 'mig-1', status: SiemMigrationTaskStatus.FINISHED };

      // Override getMigrationsStats to return our sequence:
      // First call: running, then finished, then empty array.
      const getStatsMock = vi
        .fn()
        .mockResolvedValue([finishedMigration])
        .mockResolvedValueOnce([runningMigration]);

      service.getMigrationsStats = getStatsMock;

      // Ensure a valid connector is present (so that a INTERRUPTED migration would be resumed, if needed)
      vi.spyOn(service.connectorIdStorage, 'get').mockReturnValue('connector-123');

      // Start polling
      service.startPolling();

      // Resolve the first getMigrationsStats promise
      await Promise.resolve();

      // Fast-forward the timer by the polling interval
      vi.advanceTimersByTime(TASK_STATS_POLLING_SLEEP_SECONDS * 1000);
      // Resolve the timeout promise
      await Promise.resolve();
      // Resolve the second getMigrationsStats promise
      await Promise.resolve();

      expect(getStatsMock).toHaveBeenCalledTimes(2);

      // Expect that a success toast was added when the migration finished.
      expect(mockSendFinishedMigrationNotification).toHaveBeenCalled();

      // Restore real timers.
      vi.useRealTimers();
    });

    describe('when a interrupted migration is found', () => {
      it('should not start a interrupted migration if migration had errors', async () => {
        vi.useFakeTimers();
        const interruptedMigration = {
          id: 'mig-1',
          status: SiemMigrationTaskStatus.INTERRUPTED,
          last_execution: {
            error: 'some failure',
          },
        };
        const finishedMigration = { id: 'mig-1', status: SiemMigrationTaskStatus.FINISHED };

        service.getMigrationsStats = vi
          .fn()
          .mockResolvedValue([finishedMigration])
          .mockResolvedValueOnce([interruptedMigration]);

        vi.spyOn(service.connectorIdStorage, 'get').mockReturnValue('connector-123');
        vi.spyOn(service, 'hasMissingCapabilities').mockReturnValueOnce(false);

        // Start polling
        service.startPolling();

        // Resolve the first getMigrationsStats promise
        await Promise.resolve();

        // Fast-forward the timer by the polling interval
        vi.advanceTimersByTime(TASK_STATS_POLLING_SLEEP_SECONDS * 1000);
        // Resolve the timeout promise
        await Promise.resolve();

        expect(mockStartMigrationFromStats).not.toHaveBeenCalled();

        // Restore real timers.
        vi.useRealTimers();
      });

      it('should not start a interrupted migration if no connector configured', async () => {
        vi.useFakeTimers();
        const interruptedMigration = { id: 'mig-1', status: SiemMigrationTaskStatus.INTERRUPTED };
        const finishedMigration = { id: 'mig-1', status: SiemMigrationTaskStatus.FINISHED };

        service.getMigrationsStats = vi
          .fn()
          .mockResolvedValue([finishedMigration])
          .mockResolvedValueOnce([interruptedMigration]);

        vi.spyOn(service.connectorIdStorage, 'get').mockReturnValue(undefined);
        vi.spyOn(service, 'hasMissingCapabilities').mockReturnValueOnce(false);

        // Start polling
        service.startPolling();

        // Resolve the first getMigrationsStats promise
        await Promise.resolve();

        // Fast-forward the timer by the polling interval
        vi.advanceTimersByTime(TASK_STATS_POLLING_SLEEP_SECONDS * 1000);
        // Resolve the timeout promise
        await Promise.resolve();

        // Expect that the migration was resumed
        expect(mockStartMigrationFromStats).not.toHaveBeenCalled();

        // Restore real timers.
        vi.useRealTimers();
      });

      it('should not start a interrupted migration if user is missing capabilities', async () => {
        // Use fake timers to simulate delays inside the polling loop.
        vi.useFakeTimers();
        // Simulate a migration that is first reported as INTERRUPTED and then FINISHED.
        const interruptedMigration = { id: 'mig-1', status: SiemMigrationTaskStatus.INTERRUPTED };
        const finishedMigration = { id: 'mig-1', status: SiemMigrationTaskStatus.FINISHED };

        // Override getMigrationsStats to return our sequence:
        // First call: interrupted, then finished, then empty array.
        const getStatsMock = vi
          .fn()
          .mockResolvedValue([finishedMigration])
          .mockResolvedValueOnce([interruptedMigration]);

        service.getMigrationsStats = getStatsMock;

        // Ensure a valid connector is present (so that a INTERRUPTED migration would be resumed, if needed)
        vi.spyOn(service.connectorIdStorage, 'get').mockReturnValue('connector-123');
        vi.spyOn(service, 'hasMissingCapabilities').mockReturnValueOnce(true);

        // Start polling
        service.startPolling();

        // Resolve the first getMigrationsStats promise
        await Promise.resolve();

        // Fast-forward the timer by the polling interval
        vi.advanceTimersByTime(TASK_STATS_POLLING_SLEEP_SECONDS * 1000);
        // Resolve the timeout promise
        await Promise.resolve();

        // Expect that the migration was resumed
        expect(mockStartMigrationFromStats).not.toHaveBeenCalled();

        // Restore real timers.
        vi.useRealTimers();
      });

      it('should automatically start the interrupted migration with last_execution values', async () => {
        vi.useFakeTimers();
        const interruptedMigration = {
          id: 'mig-1',
          status: SiemMigrationTaskStatus.INTERRUPTED,
          last_execution: {
            connector_id: 'connector-last',
            skip_prebuilt_rules_matching: true,
          },
        };
        const finishedMigration = { id: 'mig-1', status: SiemMigrationTaskStatus.FINISHED };

        service.getMigrationsStats = vi
          .fn()
          .mockResolvedValue([finishedMigration])
          .mockResolvedValueOnce([interruptedMigration]);

        vi.spyOn(service.connectorIdStorage, 'get').mockReturnValue('connector-123');
        vi.spyOn(service, 'hasMissingCapabilities').mockReturnValueOnce(false);

        // Start polling
        service.startPolling();

        // Resolve the first getMigrationsStats promise
        await Promise.resolve();

        // Fast-forward the timer by the polling interval
        vi.advanceTimersByTime(TASK_STATS_POLLING_SLEEP_SECONDS * 1000);
        // Resolve the timeout promise
        await Promise.resolve();

        // Expect that the migration was resumed
        expect(mockStartMigrationFromStats).toHaveBeenCalledWith({
          connectorId: 'connector-last',
          taskStats: {
            id: 'mig-1',
            last_execution: { connector_id: 'connector-last', skip_prebuilt_rules_matching: true },
            status: 'interrupted',
          },
        });

        // Restore real timers.
        vi.useRealTimers();
      });
    });
  });
});
