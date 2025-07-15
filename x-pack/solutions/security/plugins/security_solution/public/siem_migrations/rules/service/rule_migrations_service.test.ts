/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * SiemRulesMigrationsService.test.ts
 *
 * This file tests the SiemRulesMigrationsService class.
 * We use Jest for assertions and mocking. We also use Jest’s fake timers to simulate the polling loop.
 */

import type { CoreStart } from '@kbn/core/public';
import type { TraceOptions } from '@kbn/elastic-assistant/impl/assistant/types';
import { firstValueFrom } from 'rxjs';
import {
  createRuleMigration,
  upsertMigrationResources,
  startRuleMigration as startRuleMigrationAPI,
  stopRuleMigration as stopRuleMigrationAPI,
  getRuleMigrationStats,
  getRuleMigrationsStatsAll,
  addRulesToMigration,
} from '../api';
import { createTelemetryServiceMock } from '../../../common/lib/telemetry/telemetry_service.mock';
import {
  SiemMigrationRetryFilter,
  SiemMigrationTaskStatus,
} from '../../../../common/siem_migrations/constants';
import type { StartPluginsDependencies } from '../../../types';
import * as i18n from './translations';
import {
  TASK_STATS_POLLING_SLEEP_SECONDS,
  SiemRulesMigrationsService,
} from './rule_migrations_service';
import type { CreateRuleMigrationRulesRequestBody } from '../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import { getMissingCapabilities } from '../../common/service/capabilities';

// --- Mocks for external modules ---

jest.mock('../api', () => ({
  createRuleMigration: jest.fn(),
  upsertMigrationResources: jest.fn(),
  startRuleMigration: jest.fn(),
  stopRuleMigration: jest.fn(),
  getRuleMigrationStats: jest.fn(),
  getRuleMigrationsStatsAll: jest.fn(),
  getMissingResources: jest.fn(),
  getIntegrations: jest.fn(),
  addRulesToMigration: jest.fn(),
}));

jest.mock('../../common/service/capabilities', () => ({
  getMissingCapabilities: jest.fn(() => []),
}));

jest.mock('../../../common/experimental_features_service', () => ({
  ExperimentalFeaturesService: {
    get: jest.fn(() => ({ siemMigrationsDisabled: false })),
  },
}));

jest.mock('../../../common/hooks/use_license', () => ({
  licenseService: {
    isEnterprise: jest.fn(() => true),
  },
}));

jest.mock('../../common/service/notifications/success_notification', () => ({
  getSuccessToast: jest.fn().mockReturnValue({ title: 'Success' }),
}));

jest.mock('../../common/service/notifications/no_connector_notification', () => ({
  getNoConnectorToast: jest.fn().mockReturnValue({ title: 'No Connector' }),
}));

jest.mock('../../common/service/notifications/missing_capabilities_notification', () => ({
  getMissingCapabilitiesToast: jest.fn().mockReturnValue({ title: 'Missing Capabilities' }),
}));

const mockGetRuleMigrationStats = getRuleMigrationStats as jest.Mock;
const mockGetRuleMigrationsStatsAll = getRuleMigrationsStatsAll as jest.Mock;
const mockStartRuleMigrationAPI = startRuleMigrationAPI as jest.Mock;
const mockStopRuleMigrationAPI = stopRuleMigrationAPI as jest.Mock;
const mockGetMissingCapabilities = getMissingCapabilities as jest.Mock;

// --- End of mocks ---

const defaultMigrationStats = {
  id: 'mig-1',
  status: SiemMigrationTaskStatus.READY,
  rules: { total: 100, pending: 100, processing: 0, completed: 0, failed: 0 },
  created_at: '2025-01-01T00:00:00Z',
  last_updated_at: '2025-01-01T01:00:00Z',
};

describe('SiemRulesMigrationsService', () => {
  let service: SiemRulesMigrationsService;
  let mockCore: CoreStart;
  let mockPlugins: StartPluginsDependencies;
  let mockNotifications: CoreStart['notifications'];
  const mockTelemetry = createTelemetryServiceMock();

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create a fake notifications object to spy on toast calls
    mockNotifications = {
      toasts: { add: jest.fn(), addError: jest.fn(), addSuccess: jest.fn() },
    } as unknown as CoreStart['notifications'];

    // Minimal core stub
    mockCore = {
      application: { capabilities: {} },
      notifications: mockNotifications,
    } as CoreStart;

    // Minimal plugins stub with spaces.getActiveSpace returning a fake space
    mockPlugins = {
      spaces: {
        getActiveSpace: jest.fn().mockResolvedValue({ id: 'test-space' }),
      },
    } as unknown as StartPluginsDependencies;

    mockGetRuleMigrationStats.mockResolvedValue(defaultMigrationStats);
    mockGetRuleMigrationsStatsAll.mockResolvedValue([]);
    mockStartRuleMigrationAPI.mockResolvedValue({ started: true });
    mockStopRuleMigrationAPI.mockResolvedValue({ stopped: true });
    mockGetMissingCapabilities.mockReturnValue([]);

    // Instantiate the service – note that the constructor calls getActiveSpace and startPolling
    service = new SiemRulesMigrationsService(mockCore, mockPlugins, mockTelemetry);
    // Wait for any async operations in the constructor to complete
    await Promise.resolve();
  });

  describe('latestStats$', () => {
    it('should be initialized to null', async () => {
      // Instantiate the service – note that the constructor calls getActiveSpace and startPolling
      const testService = new SiemRulesMigrationsService(mockCore, mockPlugins, mockTelemetry);
      expect(await firstValueFrom(testService.getLatestStats$())).toBeNull();
      await Promise.resolve();
    });
  });

  describe('createRuleMigration', () => {
    it('should throw an error when body is empty', async () => {
      await expect(service.createRuleMigration([], 'test')).rejects.toThrow(i18n.EMPTY_RULES_ERROR);
    });

    it('should create migration with a single batch', async () => {
      const body = [{ id: 'rule1' }] as CreateRuleMigrationRulesRequestBody;
      const name = 'test';
      (createRuleMigration as jest.Mock).mockResolvedValue({ migration_id: 'mig-1' });
      (addRulesToMigration as jest.Mock).mockResolvedValue(undefined);

      const migrationId = await service.createRuleMigration(body, name);

      expect(createRuleMigration).toHaveBeenCalledTimes(1);
      expect(createRuleMigration).toHaveBeenCalledWith({ name });
      expect(addRulesToMigration).toHaveBeenCalledWith({ migrationId: 'mig-1', body });
      expect(migrationId).toBe('mig-1');
    });

    it('should create migration in batches if body length exceeds the batch size', async () => {
      // Create an array of 51 items (the service batches in chunks of 50)
      const body = new Array(51).fill({ rule: 'rule' });
      const name = 'test';
      (createRuleMigration as jest.Mock).mockResolvedValueOnce({ migration_id: 'mig-1' });
      (addRulesToMigration as jest.Mock).mockResolvedValue(undefined);

      const migrationId = await service.createRuleMigration(body, name);

      expect(createRuleMigration).toHaveBeenCalledTimes(1);
      expect(addRulesToMigration).toHaveBeenCalledTimes(2);
      // First call: first 50 items, migrationId undefined
      expect(createRuleMigration).toHaveBeenNthCalledWith(1, { name });

      expect(addRulesToMigration).toHaveBeenNthCalledWith(1, {
        migrationId: 'mig-1',
        body: body.slice(0, 50),
      });

      expect(addRulesToMigration).toHaveBeenNthCalledWith(2, {
        migrationId: 'mig-1',
        body: body.slice(50, 51),
      });

      expect(migrationId).toBe('mig-1');
    });
  });

  describe('upsertMigrationResources', () => {
    it('should throw an error when body is empty', async () => {
      await expect(service.upsertMigrationResources('mig-1', [])).rejects.toThrow(
        i18n.EMPTY_RULES_ERROR
      );
    });

    it('should upsert resources in batches', async () => {
      const body = new Array(51).fill({ resource: 'res' });
      (upsertMigrationResources as jest.Mock).mockResolvedValue({});
      await service.upsertMigrationResources('mig-1', body);

      expect(upsertMigrationResources).toHaveBeenCalledTimes(2);
      expect((upsertMigrationResources as jest.Mock).mock.calls[0][0]).toEqual({
        migrationId: 'mig-1',
        body: body.slice(0, 50),
      });
      expect((upsertMigrationResources as jest.Mock).mock.calls[1][0]).toEqual({
        migrationId: 'mig-1',
        body: body.slice(50, 51),
      });
    });
  });

  describe('startRuleMigration', () => {
    it('should notify and not start migration if missing capabilities exist', async () => {
      mockGetMissingCapabilities.mockReturnValue([{ capability: 'cap' }]);

      const result = await service.startRuleMigration('mig-1');
      expect(mockNotifications.toasts.add).toHaveBeenCalled();
      expect(result).toEqual({ started: false });
    });

    it('should notify and not start migration if connectorId is missing', async () => {
      mockGetMissingCapabilities.mockReturnValue([]);
      // Force connectorId to be missing
      jest.spyOn(service.connectorIdStorage, 'get').mockReturnValue(undefined);

      const result = await service.startRuleMigration('mig-1');
      expect(mockNotifications.toasts.add).toHaveBeenCalled();
      expect(result).toEqual({ started: false });
    });

    it('should start migration successfully when capabilities and connectorId are present', async () => {
      mockGetMissingCapabilities.mockReturnValue([]);
      // Simulate a valid connector id and trace options
      jest.spyOn(service.connectorIdStorage, 'get').mockReturnValue('connector-123');
      jest.spyOn(service.traceOptionsStorage, 'get').mockReturnValue({
        langSmithProject: 'proj',
        langSmithApiKey: 'key',
      } as TraceOptions);
      mockStartRuleMigrationAPI.mockResolvedValue({ started: true });

      // Simulate multiple responses to mimic polling behavior
      let statsCalls = 0;
      mockGetRuleMigrationStats.mockImplementation(async () => {
        statsCalls++;
        if (statsCalls < 2) {
          return { ...defaultMigrationStats, status: SiemMigrationTaskStatus.READY };
        }
        return { ...defaultMigrationStats, status: SiemMigrationTaskStatus.RUNNING };
      });

      // Spy on startPolling to ensure it is called after starting the migration
      const startPollingSpy = jest.spyOn(service, 'startPolling');
      // @ts-ignore (spying on a private method)
      const stopMigrationPollingSpy = jest.spyOn(service, 'migrationTaskPollingUntil');

      const result = await service.startRuleMigration(
        'mig-1',
        SiemMigrationRetryFilter.NOT_FULLY_TRANSLATED
      );

      expect(mockStartRuleMigrationAPI).toHaveBeenCalledWith({
        migrationId: 'mig-1',
        settings: {
          connectorId: 'connector-123',
          skipPrebuiltRulesMatching: undefined,
        },
        retry: SiemMigrationRetryFilter.NOT_FULLY_TRANSLATED,
        langSmithOptions: { project_name: 'proj', api_key: 'key' },
      });
      expect(startPollingSpy).toHaveBeenCalled();
      expect(stopMigrationPollingSpy).toHaveBeenCalled();
      expect(mockGetRuleMigrationStats).toHaveBeenCalledTimes(statsCalls);
      expect(result).toEqual({ started: true });
    });
  });

  describe('stopRuleMigration', () => {
    it('should notify and not stop migration if missing capabilities exist', async () => {
      mockGetMissingCapabilities.mockReturnValue([{ capability: 'cap' }]);

      const result = await service.stopRuleMigration('mig-1');
      expect(mockNotifications.toasts.add).toHaveBeenCalled();
      expect(result).toEqual({ stopped: false });
    });

    it('should stop migration successfully', async () => {
      mockGetMissingCapabilities.mockReturnValue([]);
      mockStopRuleMigrationAPI.mockResolvedValue({ stopped: true });
      // Simulate multiple responses to mimic polling behavior
      let statsCalls = 0;
      mockGetRuleMigrationStats.mockImplementation(async () => {
        statsCalls++;
        if (statsCalls < 2) {
          return { ...defaultMigrationStats, status: SiemMigrationTaskStatus.RUNNING };
        }
        return { ...defaultMigrationStats, status: SiemMigrationTaskStatus.FINISHED };
      });

      // @ts-ignore (spying on a private method)
      const stopMigrationPollingSpy = jest.spyOn(service, 'migrationTaskPollingUntil');

      const result = await service.stopRuleMigration('mig-1');

      expect(mockStopRuleMigrationAPI).toHaveBeenCalledWith({ migrationId: 'mig-1' });
      expect(stopMigrationPollingSpy).toHaveBeenCalled();
      expect(mockGetRuleMigrationStats).toHaveBeenCalledTimes(statsCalls);
      expect(result).toEqual({ stopped: true });
    });
  });

  describe('getRuleMigrationsStats', () => {
    it('should fetch and update latest stats', async () => {
      const statsArray = [
        { id: 'mig-1', status: SiemMigrationTaskStatus.RUNNING, name: 'test 1' },
        { id: 'mig-2', status: SiemMigrationTaskStatus.FINISHED, name: 'test 2' },
      ];
      mockGetRuleMigrationsStatsAll.mockResolvedValue(statsArray);

      const result = await service.getRuleMigrationsStats();
      expect(getRuleMigrationsStatsAll).toHaveBeenCalled();
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
      jest.useFakeTimers();

      // Simulate a migration that is first reported as RUNNING and then FINISHED.
      const runningMigration = { id: 'mig-1', status: SiemMigrationTaskStatus.RUNNING };
      const finishedMigration = { id: 'mig-1', status: SiemMigrationTaskStatus.FINISHED };

      // Override getRuleMigrationsStats to return our sequence:
      // First call: running, then finished, then empty array.
      const getStatsMock = jest
        .fn()
        .mockResolvedValue([finishedMigration])
        .mockResolvedValueOnce([runningMigration]);

      service.getRuleMigrationsStats = getStatsMock;

      // Ensure a valid connector is present (so that a INTERRUPTED migration would be resumed, if needed)
      jest.spyOn(service.connectorIdStorage, 'get').mockReturnValue('connector-123');

      // Start polling
      service.startPolling();

      // Resolve the first getRuleMigrationsStats promise
      await Promise.resolve();

      // Fast-forward the timer by the polling interval
      jest.advanceTimersByTime(TASK_STATS_POLLING_SLEEP_SECONDS * 1000);
      // Resolve the timeout promise
      await Promise.resolve();
      // Resolve the second getRuleMigrationsStats promise
      await Promise.resolve();

      expect(getStatsMock).toHaveBeenCalledTimes(2);

      // Expect that a success toast was added when the migration finished.
      expect(mockNotifications.toasts.addSuccess).toHaveBeenCalled();

      // Restore real timers.
      jest.useRealTimers();
    });

    describe('when a interrupted migration is found', () => {
      it('should not start a interrupted migration if migration had errors', async () => {
        jest.useFakeTimers();
        const interruptedMigration = {
          id: 'mig-1',
          status: SiemMigrationTaskStatus.INTERRUPTED,
          last_execution: {
            error: 'some failure',
          },
        };
        const finishedMigration = { id: 'mig-1', status: SiemMigrationTaskStatus.FINISHED };

        service.getRuleMigrationsStats = jest
          .fn()
          .mockResolvedValue([finishedMigration])
          .mockResolvedValueOnce([interruptedMigration]);

        jest.spyOn(service.connectorIdStorage, 'get').mockReturnValue('connector-123');
        jest.spyOn(service, 'hasMissingCapabilities').mockReturnValueOnce(false);

        // Start polling
        service.startPolling();

        // Resolve the first getRuleMigrationsStats promise
        await Promise.resolve();

        // Fast-forward the timer by the polling interval
        jest.advanceTimersByTime(TASK_STATS_POLLING_SLEEP_SECONDS * 1000);
        // Resolve the timeout promise
        await Promise.resolve();

        expect(mockStartRuleMigrationAPI).not.toHaveBeenCalled();

        // Restore real timers.
        jest.useRealTimers();
      });

      it('should not start a interrupted migration if no connector configured', async () => {
        jest.useFakeTimers();
        const interruptedMigration = { id: 'mig-1', status: SiemMigrationTaskStatus.INTERRUPTED };
        const finishedMigration = { id: 'mig-1', status: SiemMigrationTaskStatus.FINISHED };

        service.getRuleMigrationsStats = jest
          .fn()
          .mockResolvedValue([finishedMigration])
          .mockResolvedValueOnce([interruptedMigration]);

        jest.spyOn(service.connectorIdStorage, 'get').mockReturnValue(undefined);
        jest.spyOn(service, 'hasMissingCapabilities').mockReturnValueOnce(false);

        // Start polling
        service.startPolling();

        // Resolve the first getRuleMigrationsStats promise
        await Promise.resolve();

        // Fast-forward the timer by the polling interval
        jest.advanceTimersByTime(TASK_STATS_POLLING_SLEEP_SECONDS * 1000);
        // Resolve the timeout promise
        await Promise.resolve();

        // Expect that the migration was resumed
        expect(mockStartRuleMigrationAPI).not.toHaveBeenCalled();

        // Restore real timers.
        jest.useRealTimers();
      });

      it('should not start a interrupted migration if user is missing capabilities', async () => {
        // Use fake timers to simulate delays inside the polling loop.
        jest.useFakeTimers();
        // Simulate a migration that is first reported as INTERRUPTED and then FINISHED.
        const interruptedMigration = { id: 'mig-1', status: SiemMigrationTaskStatus.INTERRUPTED };
        const finishedMigration = { id: 'mig-1', status: SiemMigrationTaskStatus.FINISHED };

        // Override getRuleMigrationsStats to return our sequence:
        // First call: interrupted, then finished, then empty array.
        const getStatsMock = jest
          .fn()
          .mockResolvedValue([finishedMigration])
          .mockResolvedValueOnce([interruptedMigration]);

        service.getRuleMigrationsStats = getStatsMock;

        // Ensure a valid connector is present (so that a INTERRUPTED migration would be resumed, if needed)
        jest.spyOn(service.connectorIdStorage, 'get').mockReturnValue('connector-123');
        jest.spyOn(service, 'hasMissingCapabilities').mockReturnValueOnce(true);

        // Start polling
        service.startPolling();

        // Resolve the first getRuleMigrationsStats promise
        await Promise.resolve();

        // Fast-forward the timer by the polling interval
        jest.advanceTimersByTime(TASK_STATS_POLLING_SLEEP_SECONDS * 1000);
        // Resolve the timeout promise
        await Promise.resolve();

        // Expect that the migration was resumed
        expect(mockStartRuleMigrationAPI).not.toHaveBeenCalled();

        // Restore real timers.
        jest.useRealTimers();
      });

      it('should automatically start the interrupted migration with last_execution values', async () => {
        jest.useFakeTimers();
        const interruptedMigration = {
          id: 'mig-1',
          status: SiemMigrationTaskStatus.INTERRUPTED,
          last_execution: {
            connector_id: 'connector-last',
            skip_prebuilt_rules_matching: true,
          },
        };
        const finishedMigration = { id: 'mig-1', status: SiemMigrationTaskStatus.FINISHED };

        service.getRuleMigrationsStats = jest
          .fn()
          .mockResolvedValue([finishedMigration])
          .mockResolvedValueOnce([interruptedMigration]);

        jest.spyOn(service.connectorIdStorage, 'get').mockReturnValue('connector-123');
        jest.spyOn(service, 'hasMissingCapabilities').mockReturnValueOnce(false);

        // Start polling
        service.startPolling();

        // Resolve the first getRuleMigrationsStats promise
        await Promise.resolve();

        // Fast-forward the timer by the polling interval
        jest.advanceTimersByTime(TASK_STATS_POLLING_SLEEP_SECONDS * 1000);
        // Resolve the timeout promise
        await Promise.resolve();

        // Expect that the migration was resumed
        expect(mockStartRuleMigrationAPI).toHaveBeenCalledWith({
          migrationId: 'mig-1',
          settings: {
            connectorId: 'connector-last',
            skipPrebuiltRulesMatching: true,
          },
        });

        // Restore real timers.
        jest.useRealTimers();
      });
    });
  });
});
