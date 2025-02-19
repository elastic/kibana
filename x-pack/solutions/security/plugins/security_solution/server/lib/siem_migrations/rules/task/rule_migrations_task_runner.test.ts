/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleMigrationTaskRunner } from './rule_migrations_task_runner';
import { SiemMigrationStatus } from '../../../../../common/siem_migrations/constants';
import type { AuthenticatedUser } from '@kbn/core/server';
import type { SiemRuleMigrationsClientDependencies, StoredRuleMigration } from '../types';
import { createRuleMigrationsDataClientMock } from '../data/__mocks__/mocks';
import { loggerMock } from '@kbn/logging-mocks';

const mockRetrieverInitialize = jest.fn().mockResolvedValue(undefined);
jest.mock('./retrievers', () => ({
  ...jest.requireActual('./retrievers'),
  RuleMigrationsRetriever: jest.fn().mockImplementation(() => ({
    initialize: () => mockRetrieverInitialize(),
  })),
}));

jest.mock('./util/actions_client_chat', () => ({
  ...jest.requireActual('./util/actions_client_chat'),
  ActionsClientChat: jest.fn().mockImplementation(() => ({
    createModel: jest.fn(() => ({ model: 'test-model' })),
  })),
}));

const mockInvoke = jest.fn().mockResolvedValue({});
jest.mock('./agent', () => ({
  ...jest.requireActual('./agent'),
  getRuleMigrationAgent: () => ({ invoke: mockInvoke }),
}));

jest.mock('./rule_migrations_telemetry_client', () => ({
  SiemMigrationTelemetryClient: jest.fn().mockImplementation(() => ({
    startSiemMigrationTask: jest.fn(() => ({
      startRuleTranslation: jest.fn(() => ({
        success: jest.fn(),
        failure: jest.fn(),
      })),
      success: jest.fn(),
      failure: jest.fn(),
    })),
  })),
}));

// Mock dependencies
const mockLogger = loggerMock.create();

const mockDependencies: jest.Mocked<SiemRuleMigrationsClientDependencies> = {
  rulesClient: {},
  savedObjectsClient: {},
  inferenceClient: {},
  actionsClient: {},
  telemetry: {},
} as unknown as SiemRuleMigrationsClientDependencies;

const mockUser = {} as unknown as AuthenticatedUser;
const ruleId = 'test-rule-id';

jest.useFakeTimers();
jest.spyOn(global, 'setTimeout');
const mockTimeout = setTimeout as unknown as jest.Mock;
mockTimeout.mockImplementation((cb) => {
  // never actually wait, we'll check the calls manually
  cb();
});

describe('RuleMigrationTaskRunner', () => {
  let taskRunner: RuleMigrationTaskRunner;
  let abortController: AbortController;
  let mockRuleMigrationsDataClient: ReturnType<typeof createRuleMigrationsDataClientMock>;

  beforeEach(() => {
    mockRetrieverInitialize.mockResolvedValue(undefined); // Reset the mock
    mockInvoke.mockResolvedValue({}); // Reset the mock
    mockRuleMigrationsDataClient = createRuleMigrationsDataClientMock();
    jest.clearAllMocks();

    abortController = new AbortController();
    taskRunner = new RuleMigrationTaskRunner(
      'test-migration-id',
      mockUser,
      abortController,
      mockRuleMigrationsDataClient,
      mockLogger,
      mockDependencies
    );
  });

  describe('run', () => {
    let runPromise: Promise<void>;
    beforeEach(async () => {
      await taskRunner.setup('test-connector-id');
    });

    it('run handles migration successfully', async () => {
      mockRuleMigrationsDataClient.rules.get.mockResolvedValue({ total: 0, data: [] });
      mockRuleMigrationsDataClient.rules.get.mockResolvedValueOnce({
        total: 1,
        data: [{ id: ruleId, status: SiemMigrationStatus.PENDING }] as StoredRuleMigration[],
      });

      await taskRunner.setup('test-connector-id');
      await expect(taskRunner.run({})).resolves.toBeUndefined();

      expect(mockRuleMigrationsDataClient.rules.saveProcessing).toHaveBeenCalled();
      expect(mockTimeout).toHaveBeenCalledTimes(1); // execution sleep
      expect(mockInvoke).toHaveBeenCalledTimes(1);
      expect(mockRuleMigrationsDataClient.rules.saveCompleted).toHaveBeenCalled();
      expect(mockRuleMigrationsDataClient.rules.get).toHaveBeenCalledTimes(2); // One with data, one without
      expect(mockLogger.info).toHaveBeenCalledWith('Migration completed successfully');
    });

    describe('when error occurs', () => {
      const errorMessage = 'Test error';

      describe('during initialization', () => {
        it('should handle abort error correctly', async () => {
          runPromise = taskRunner.run({});
          abortController.abort(); // Trigger the abort signal

          await expect(runPromise).resolves.toBeUndefined(); // Ensure the function handles abort gracefully

          expect(mockLogger.info).toHaveBeenCalledWith(
            'Abort signal received, stopping initialization'
          );
        });

        it('should handle other errors correctly', async () => {
          mockRetrieverInitialize.mockRejectedValueOnce(new Error(errorMessage));

          runPromise = taskRunner.run({});
          await expect(runPromise).resolves.toBeUndefined(); // Ensure the function handles abort gracefully

          expect(mockLogger.error).toHaveBeenCalledWith(
            `Error initializing migration: Error: ${errorMessage}`
          );
        });
      });

      describe('during migration', () => {
        beforeEach(() => {
          mockRuleMigrationsDataClient.rules.get.mockRestore();
          mockRuleMigrationsDataClient.rules.get.mockResolvedValue({ total: 0, data: [] });
          mockRuleMigrationsDataClient.rules.get.mockResolvedValueOnce({
            total: 1,
            data: [{ id: ruleId, status: SiemMigrationStatus.PENDING }] as StoredRuleMigration[],
          });
        });

        it('should handle abort error correctly', async () => {
          runPromise = taskRunner.run({});
          await Promise.resolve(); // Wait for the initialization to complete
          abortController.abort(); // Trigger the abort signal

          await expect(runPromise).resolves.toBeUndefined(); // Ensure the function handles abort gracefully
          expect(mockLogger.info).toHaveBeenCalledWith('Abort signal received, stopping migration');
        });

        it('should handle other errors correctly', async () => {
          mockInvoke.mockRejectedValue(new Error(errorMessage));

          runPromise = taskRunner.run({});
          await expect(runPromise).resolves.toBeUndefined();

          expect(mockLogger.error).toHaveBeenCalledWith(
            `Error translating rule \"${ruleId}\" with error: ${errorMessage}`
          );
          expect(mockRuleMigrationsDataClient.rules.saveError).toHaveBeenCalled();
        });

        describe('during rate limit errors', () => {
          const rule2Id = 'test-rule-id-2';

          beforeEach(async () => {
            mockRuleMigrationsDataClient.rules.get.mockRestore();
            mockRuleMigrationsDataClient.rules.get.mockResolvedValue({ total: 0, data: [] });
            mockRuleMigrationsDataClient.rules.get.mockResolvedValueOnce({
              total: 1,
              data: [
                { id: ruleId, status: SiemMigrationStatus.PENDING },
                { id: rule2Id, status: SiemMigrationStatus.PENDING },
              ] as StoredRuleMigration[],
            });
          });

          it('should retry with exponential backoff', async () => {
            const error = new Error('429. You did way too many requests dude');

            mockInvoke
              .mockResolvedValue({}) // Successful calls from here on
              .mockRejectedValueOnce(error) // Third failed call for rule 1
              .mockRejectedValueOnce(error) // Second failed call for rule 1
              .mockRejectedValueOnce(error) // First failed call for rule 2
              .mockRejectedValueOnce(error); // First failed call for rule 1

            await expect(taskRunner.run({})).resolves.toBeUndefined(); // success

            /**
             * Invokes:
             * rule 1 -> failure -> start backoff retries
             * rule 2 -> failure -> await for rule 1 backoff
             * then:
             * rule 1 retry 1 -> failure
             * rule 1 retry 2 -> failure
             * rule 1 retry 3 -> success
             * then:
             * rule 2 -> success
             */
            expect(mockInvoke).toHaveBeenCalledTimes(6);
            expect(mockTimeout).toHaveBeenCalledTimes(6); // 3 backoff sleeps + 3 execution sleeps
            expect(mockTimeout).toHaveBeenNthCalledWith(
              1,
              expect.any(Function),
              expect.any(Number)
            );
            expect(mockTimeout).toHaveBeenNthCalledWith(
              2,
              expect.any(Function),
              expect.any(Number)
            );
            expect(mockTimeout).toHaveBeenNthCalledWith(3, expect.any(Function), 1000);
            expect(mockTimeout).toHaveBeenNthCalledWith(4, expect.any(Function), 2000);
            expect(mockTimeout).toHaveBeenNthCalledWith(5, expect.any(Function), 4000);
            expect(mockTimeout).toHaveBeenNthCalledWith(
              6,
              expect.any(Function),
              expect.any(Number)
            );

            expect(mockLogger.debug).toHaveBeenCalledWith(
              `Awaiting backoff task for rule "${rule2Id}"`
            );
            expect(mockInvoke).toHaveBeenCalledTimes(6); // 3 retries + 3 executions
            expect(mockRuleMigrationsDataClient.rules.saveCompleted).toHaveBeenCalledTimes(2); // 2 rules
          });
        });
      });
    });
  });
});
