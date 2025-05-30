/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser } from '@kbn/core/server';
import type { MigrationsRunning } from './rule_migrations_task_client';
import { RuleMigrationsTaskClient } from './rule_migrations_task_client';
import {
  SiemMigrationStatus,
  SiemMigrationTaskStatus,
} from '../../../../../common/siem_migrations/constants';
import { RuleMigrationTaskRunner } from './rule_migrations_task_runner';
import type { MockedLogger } from '@kbn/logging-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { SiemRuleMigrationsClientDependencies } from '../types';
import type { RuleMigrationTaskStartParams } from './types';
import { createRuleMigrationsDataClientMock } from '../data/__mocks__/mocks';
import type { RuleMigrationDataStats } from '../data/rule_migrations_data_rules_client';
import type { RuleMigrationFilters } from '../../../../../common/siem_migrations/types';

jest.mock('./rule_migrations_task_runner', () => {
  return {
    RuleMigrationTaskRunner: jest.fn().mockImplementation(() => {
      return {
        setup: jest.fn().mockResolvedValue(undefined),
        run: jest.fn().mockResolvedValue(undefined),
        abortController: { abort: jest.fn() },
      };
    }),
  };
});

const currentUser = {} as AuthenticatedUser;
const dependencies = {} as SiemRuleMigrationsClientDependencies;
const migrationId = 'migration1';

describe('RuleMigrationsTaskClient', () => {
  let migrationsRunning: MigrationsRunning;
  let logger: MockedLogger;
  let data: ReturnType<typeof createRuleMigrationsDataClientMock>;

  beforeEach(() => {
    migrationsRunning = new Map();
    logger = loggerMock.create();

    data = createRuleMigrationsDataClientMock();
    // @ts-expect-error resetting private property for each test.
    RuleMigrationsTaskClient.migrationsLastError = new Map();
    jest.clearAllMocks();
  });

  describe('start', () => {
    const params: RuleMigrationTaskStartParams = {
      migrationId,
      connectorId: 'connector1',
      invocationConfig: {},
    };

    it('should not start if migration is already running', async () => {
      // Pre-populate with the migration id.
      migrationsRunning.set(migrationId, {} as RuleMigrationTaskRunner);
      const client = new RuleMigrationsTaskClient(
        migrationsRunning,
        logger,
        data,
        currentUser,
        dependencies
      );
      const result = await client.start(params);
      expect(result).toEqual({ exists: true, started: false });
      expect(data.rules.updateStatus).not.toHaveBeenCalled();
    });

    it('should not start if there are no rules to migrate (total = 0)', async () => {
      data.rules.getStats.mockResolvedValue({
        rules: { total: 0, pending: 0, completed: 0, failed: 0 },
      } as RuleMigrationDataStats);
      const client = new RuleMigrationsTaskClient(
        migrationsRunning,
        logger,
        data,
        currentUser,
        dependencies
      );
      const result = await client.start(params);
      expect(data.rules.updateStatus).toHaveBeenCalledWith(
        migrationId,
        { status: SiemMigrationStatus.PROCESSING },
        SiemMigrationStatus.PENDING,
        { refresh: true }
      );
      expect(result).toEqual({ exists: false, started: false });
    });

    it('should not start if there are no pending rules', async () => {
      data.rules.getStats.mockResolvedValue({
        rules: { total: 10, pending: 0, completed: 10, failed: 0 },
      } as RuleMigrationDataStats);
      const client = new RuleMigrationsTaskClient(
        migrationsRunning,
        logger,
        data,
        currentUser,
        dependencies
      );
      const result = await client.start(params);
      expect(result).toEqual({ exists: true, started: false });
    });

    it('should start migration successfully', async () => {
      data.rules.getStats.mockResolvedValue({
        rules: { total: 10, pending: 5, completed: 0, failed: 0 },
      } as RuleMigrationDataStats);
      const mockedRunnerInstance = {
        setup: jest.fn().mockResolvedValue(undefined),
        run: jest.fn().mockResolvedValue(undefined),
        abortController: { abort: jest.fn() },
      };
      // Use our custom mock for this test.
      (RuleMigrationTaskRunner as jest.Mock).mockImplementation(() => mockedRunnerInstance);

      const client = new RuleMigrationsTaskClient(
        migrationsRunning,
        logger,
        data,
        currentUser,
        dependencies
      );
      const result = await client.start(params);
      expect(result).toEqual({ exists: true, started: true });
      expect(logger.get).toHaveBeenCalledWith(migrationId);
      expect(mockedRunnerInstance.setup).toHaveBeenCalledWith(params.connectorId);
      expect(logger.get(migrationId).info).toHaveBeenCalledWith('Starting migration');
      expect(migrationsRunning.has(migrationId)).toBe(true);

      // Allow the asynchronous run() call to complete its finally callback.
      await new Promise(process.nextTick);
      expect(migrationsRunning.has(migrationId)).toBe(false);
      // @ts-expect-error check private property
      expect(RuleMigrationsTaskClient.migrationsLastError.has(migrationId)).toBe(false);
    });

    it('should throw error if a race condition occurs after setup', async () => {
      data.rules.getStats.mockResolvedValue({
        rules: { total: 10, pending: 5, completed: 0, failed: 0 },
      } as RuleMigrationDataStats);
      const mockedRunnerInstance = {
        setup: jest.fn().mockImplementation(() => {
          // Simulate a race condition by setting the migration as running during setup.
          migrationsRunning.set(migrationId, {} as RuleMigrationTaskRunner);
          return Promise.resolve();
        }),
        run: jest.fn().mockResolvedValue(undefined),
        abortController: { abort: jest.fn() },
      };
      (RuleMigrationTaskRunner as jest.Mock).mockImplementation(() => mockedRunnerInstance);

      const client = new RuleMigrationsTaskClient(
        migrationsRunning,
        logger,
        data,
        currentUser,
        dependencies
      );
      await expect(client.start(params)).rejects.toThrow('Task already running for this migration');
    });
  });

  describe('updateToRetry', () => {
    it('should not update if migration is currently running', async () => {
      migrationsRunning.set(migrationId, {} as RuleMigrationTaskRunner);
      const client = new RuleMigrationsTaskClient(
        migrationsRunning,
        logger,
        data,
        currentUser,
        dependencies
      );
      const filter: RuleMigrationFilters = { fullyTranslated: true };
      const result = await client.updateToRetry(migrationId, filter);
      expect(result).toEqual({ updated: false });
      expect(data.rules.updateStatus).not.toHaveBeenCalled();
    });

    it('should update to retry if migration is not running', async () => {
      const client = new RuleMigrationsTaskClient(
        migrationsRunning,
        logger,
        data,
        currentUser,
        dependencies
      );
      const filter: RuleMigrationFilters = { fullyTranslated: true };
      const result = await client.updateToRetry(migrationId, filter);
      expect(filter.installed).toBe(false);
      expect(data.rules.updateStatus).toHaveBeenCalledWith(
        migrationId,
        { fullyTranslated: true, installed: false },
        SiemMigrationStatus.PENDING,
        { refresh: true }
      );
      expect(result).toEqual({ updated: true });
    });
  });

  describe('getStats', () => {
    it('should return RUNNING status if migration is running', async () => {
      migrationsRunning.set(migrationId, {} as RuleMigrationTaskRunner); // migration is running
      data.rules.getStats.mockResolvedValue({
        rules: { total: 10, pending: 5, completed: 3, failed: 2 },
      } as RuleMigrationDataStats);
      const client = new RuleMigrationsTaskClient(
        migrationsRunning,
        logger,
        data,
        currentUser,
        dependencies
      );
      const stats = await client.getStats(migrationId);
      expect(stats.status).toEqual(SiemMigrationTaskStatus.RUNNING);
    });

    it('should return READY status if pending equals total', async () => {
      data.rules.getStats.mockResolvedValue({
        rules: { total: 10, pending: 10, completed: 0, failed: 0 },
      } as RuleMigrationDataStats);
      const client = new RuleMigrationsTaskClient(
        migrationsRunning,
        logger,
        data,
        currentUser,
        dependencies
      );
      const stats = await client.getStats(migrationId);
      expect(stats.status).toEqual(SiemMigrationTaskStatus.READY);
    });

    it('should return FINISHED status if completed+failed equals total', async () => {
      data.rules.getStats.mockResolvedValue({
        rules: { total: 10, pending: 0, completed: 5, failed: 5 },
      } as RuleMigrationDataStats);
      const client = new RuleMigrationsTaskClient(
        migrationsRunning,
        logger,
        data,
        currentUser,
        dependencies
      );
      const stats = await client.getStats(migrationId);
      expect(stats.status).toEqual(SiemMigrationTaskStatus.FINISHED);
    });

    it('should return STOPPED status for other cases', async () => {
      data.rules.getStats.mockResolvedValue({
        rules: { total: 10, pending: 2, completed: 3, failed: 2 },
      } as RuleMigrationDataStats);
      const client = new RuleMigrationsTaskClient(
        migrationsRunning,
        logger,
        data,
        currentUser,
        dependencies
      );
      const stats = await client.getStats(migrationId);
      expect(stats.status).toEqual(SiemMigrationTaskStatus.STOPPED);
    });

    it('should include last_error if one exists', async () => {
      const error = new Error('Test error');
      // @ts-expect-error private property
      RuleMigrationsTaskClient.migrationsLastError.set(migrationId, error);
      data.rules.getStats.mockResolvedValue({
        rules: { total: 10, pending: 2, completed: 3, failed: 2 },
      } as RuleMigrationDataStats);
      const client = new RuleMigrationsTaskClient(
        migrationsRunning,
        logger,
        data,
        currentUser,
        dependencies
      );
      const stats = await client.getStats(migrationId);
      expect(stats.last_error).toEqual('Test error');
    });
  });

  describe('getAllStats', () => {
    it('should return combined stats for all migrations', async () => {
      const statsArray = [
        {
          id: 'm1',
          rules: { total: 10, pending: 10, completed: 0, failed: 0 },
        } as RuleMigrationDataStats,
        {
          id: 'm2',
          rules: { total: 10, pending: 2, completed: 3, failed: 2 },
        } as RuleMigrationDataStats,
      ];
      data.rules.getAllStats.mockResolvedValue(statsArray);
      // Mark migration m1 as running.
      migrationsRunning.set('m1', {} as RuleMigrationTaskRunner);
      const client = new RuleMigrationsTaskClient(
        migrationsRunning,
        logger,
        data,
        currentUser,
        dependencies
      );
      const allStats = await client.getAllStats();
      const m1Stats = allStats.find((s) => s.id === 'm1');
      const m2Stats = allStats.find((s) => s.id === 'm2');
      expect(m1Stats?.status).toEqual(SiemMigrationTaskStatus.RUNNING);
      expect(m2Stats?.status).toEqual(SiemMigrationTaskStatus.STOPPED);
    });
  });

  describe('stop', () => {
    it('should stop a running migration', async () => {
      const abortMock = jest.fn();
      const migrationRunner = {
        abortController: { abort: abortMock },
      } as unknown as RuleMigrationTaskRunner;
      migrationsRunning.set(migrationId, migrationRunner);
      const client = new RuleMigrationsTaskClient(
        migrationsRunning,
        logger,
        data,
        currentUser,
        dependencies
      );
      const result = await client.stop(migrationId);
      expect(result).toEqual({ exists: true, stopped: true });
      expect(abortMock).toHaveBeenCalled();
    });

    it('should return stopped even if migration is already stopped', async () => {
      data.rules.getStats.mockResolvedValue({
        rules: { total: 10, pending: 10, completed: 0, failed: 0 },
      } as RuleMigrationDataStats);
      const client = new RuleMigrationsTaskClient(
        migrationsRunning,
        logger,
        data,
        currentUser,
        dependencies
      );
      const result = await client.stop(migrationId);
      expect(result).toEqual({ exists: true, stopped: true });
    });

    it('should return exists false if migration is not running and total equals 0', async () => {
      data.rules.getStats.mockResolvedValue({
        rules: { total: 0, pending: 0, completed: 0, failed: 0 },
      } as RuleMigrationDataStats);
      const client = new RuleMigrationsTaskClient(
        migrationsRunning,
        logger,
        data,
        currentUser,
        dependencies
      );
      const result = await client.stop(migrationId);
      expect(result).toEqual({ exists: false, stopped: true });
    });

    it('should catch errors and return exists true, stopped false', async () => {
      const error = new Error('Stop error');
      data.rules.getStats.mockRejectedValue(error);
      const client = new RuleMigrationsTaskClient(
        migrationsRunning,
        logger,
        data,
        currentUser,
        dependencies
      );
      const result = await client.stop(migrationId);
      expect(result).toEqual({ exists: true, stopped: false });
      expect(logger.error).toHaveBeenCalledWith(
        `Error stopping migration ID:${migrationId}`,
        error
      );
    });
  });
});
