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
  getRuleMigrationStats,
  getRuleMigrationsStatsAll,
  getMissingResources,
  getIntegrations,
} from '../api';
import type { CreateRuleMigrationRequestBody } from '../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import { createTelemetryServiceMock } from '../../../common/lib/telemetry/telemetry_service.mock';
import {
  SiemMigrationRetryFilter,
  SiemMigrationTaskStatus,
} from '../../../../common/siem_migrations/constants';
import type { StartPluginsDependencies } from '../../../types';
import { getMissingCapabilities } from './capabilities';
import * as i18n from './translations';
import {
  REQUEST_POLLING_INTERVAL_SECONDS,
  SiemRulesMigrationsService,
} from './rule_migrations_service';

// --- Mocks for external modules ---

jest.mock('../api', () => ({
  createRuleMigration: jest.fn(),
  upsertMigrationResources: jest.fn(),
  startRuleMigration: jest.fn(),
  getRuleMigrationStats: jest.fn(),
  getRuleMigrationsStatsAll: jest.fn(),
  getMissingResources: jest.fn(),
  getIntegrations: jest.fn(),
}));

jest.mock('./capabilities', () => ({
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

jest.mock('./notifications/success_notification', () => ({
  getSuccessToast: jest.fn().mockReturnValue({ title: 'Success' }),
}));

jest.mock('./notifications/no_connector_notification', () => ({
  getNoConnectorToast: jest.fn().mockReturnValue({ title: 'No Connector' }),
}));

jest.mock('./notifications/missing_capabilities_notification', () => ({
  getMissingCapabilitiesToast: jest.fn().mockReturnValue({ title: 'Missing Capabilities' }),
}));

// --- End of mocks ---

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

    // Ensure getRuleMigrationsStatsAll returns an empty array by default (so polling exits quickly)
    (getRuleMigrationsStatsAll as jest.Mock).mockResolvedValue([]);

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
      await expect(service.createRuleMigration([])).rejects.toThrow(i18n.EMPTY_RULES_ERROR);
    });

    it('should create migration with a single batch', async () => {
      const body = [{ id: 'rule1' }] as CreateRuleMigrationRequestBody;
      (createRuleMigration as jest.Mock).mockResolvedValue({ migration_id: 'mig-1' });

      const migrationId = await service.createRuleMigration(body);

      expect(createRuleMigration).toHaveBeenCalledTimes(1);
      expect(createRuleMigration).toHaveBeenCalledWith({ migrationId: undefined, body });
      expect(migrationId).toBe('mig-1');
    });

    it('should create migration in batches if body length exceeds the batch size', async () => {
      // Create an array of 51 items (the service batches in chunks of 50)
      const body = new Array(51).fill({ rule: 'rule' });
      (createRuleMigration as jest.Mock)
        .mockResolvedValueOnce({ migration_id: 'mig-1' })
        .mockResolvedValueOnce({ migration_id: 'mig-2' });

      const migrationId = await service.createRuleMigration(body);

      expect(createRuleMigration).toHaveBeenCalledTimes(2);
      // First call: first 50 items, migrationId undefined
      expect((createRuleMigration as jest.Mock).mock.calls[0][0]).toEqual({
        migrationId: undefined,
        body: body.slice(0, 50),
      });
      // Second call: remaining 1 item, migrationId passed from previous batch
      expect((createRuleMigration as jest.Mock).mock.calls[1][0]).toEqual({
        migrationId: 'mig-1',
        body: body.slice(50, 51),
      });
      expect(migrationId).toBe('mig-2');
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
      (getMissingCapabilities as jest.Mock).mockReturnValue([{ capability: 'cap' }]);

      const result = await service.startRuleMigration('mig-1');
      expect(mockNotifications.toasts.add).toHaveBeenCalled();
      expect(result).toEqual({ started: false });
    });

    it('should notify and not start migration if connectorId is missing', async () => {
      (getMissingCapabilities as jest.Mock).mockReturnValue([]);
      // Force connectorId to be missing
      jest.spyOn(service.connectorIdStorage, 'get').mockReturnValue(undefined);

      const result = await service.startRuleMigration('mig-1');
      expect(mockNotifications.toasts.add).toHaveBeenCalled();
      expect(result).toEqual({ started: false });
    });

    it('should start migration successfully when capabilities and connectorId are present', async () => {
      (getMissingCapabilities as jest.Mock).mockReturnValue([]);
      // Simulate a valid connector id and trace options
      jest.spyOn(service.connectorIdStorage, 'get').mockReturnValue('connector-123');
      jest.spyOn(service.traceOptionsStorage, 'get').mockReturnValue({
        langSmithProject: 'proj',
        langSmithApiKey: 'key',
      } as TraceOptions);
      (startRuleMigrationAPI as jest.Mock).mockResolvedValue({ started: true });

      // Spy on startPolling to ensure it is called after starting the migration
      const startPollingSpy = jest.spyOn(service, 'startPolling');
      const result = await service.startRuleMigration(
        'mig-1',
        SiemMigrationRetryFilter.NOT_FULLY_TRANSLATED
      );

      expect(startRuleMigrationAPI).toHaveBeenCalledWith({
        migrationId: 'mig-1',
        connectorId: 'connector-123',
        retry: SiemMigrationRetryFilter.NOT_FULLY_TRANSLATED,
        langSmithOptions: { project_name: 'proj', api_key: 'key' },
      });
      expect(startPollingSpy).toHaveBeenCalled();
      expect(result).toEqual({ started: true });
    });
  });

  describe('getRuleMigrationStats', () => {
    it('should return migration stats', async () => {
      const stats = { id: 'mig-1', status: SiemMigrationTaskStatus.RUNNING };
      (getRuleMigrationStats as jest.Mock).mockResolvedValue(stats);

      const result = await service.getRuleMigrationStats('mig-1');
      expect(getRuleMigrationStats).toHaveBeenCalledWith({ migrationId: 'mig-1' });
      expect(result).toEqual(stats);
    });
  });

  describe('getRuleMigrationsStats', () => {
    it('should fetch and update latest stats', async () => {
      const statsArray = [
        { id: 'mig-1', status: SiemMigrationTaskStatus.RUNNING },
        { id: 'mig-2', status: SiemMigrationTaskStatus.FINISHED },
      ];
      (getRuleMigrationsStatsAll as jest.Mock).mockResolvedValue(statsArray);

      const result = await service.getRuleMigrationsStats();
      expect(getRuleMigrationsStatsAll).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0].number).toBe(1);
      expect(result[1].number).toBe(2);

      const latestStats = await firstValueFrom(service.getLatestStats$());
      expect(latestStats).toEqual(result);
    });
  });

  describe('getMissingResources', () => {
    it('should return missing resources', async () => {
      const resources = [{ resource: 'res1' }];
      (getMissingResources as jest.Mock).mockResolvedValue(resources);

      const result = await service.getMissingResources('mig-1');
      expect(getMissingResources).toHaveBeenCalledWith({ migrationId: 'mig-1' });
      expect(result).toEqual(resources);
    });
  });

  describe('getIntegrations', () => {
    it('should return integrations', async () => {
      const integrations = { integration1: { id: 'int-1' } };
      (getIntegrations as jest.Mock).mockResolvedValue(integrations);

      const result = await service.getIntegrations();
      expect(getIntegrations).toHaveBeenCalledWith({});
      expect(result).toEqual(integrations);
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

      // Ensure a valid connector is present (so that a STOPPED migration would be resumed, if needed)
      jest.spyOn(service.connectorIdStorage, 'get').mockReturnValue('connector-123');

      // Start polling
      service.startPolling();

      // Resolve the first getRuleMigrationsStats promise
      await Promise.resolve();

      // Fast-forward the timer by the polling interval
      jest.advanceTimersByTime(REQUEST_POLLING_INTERVAL_SECONDS * 1000);
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
  });
});
