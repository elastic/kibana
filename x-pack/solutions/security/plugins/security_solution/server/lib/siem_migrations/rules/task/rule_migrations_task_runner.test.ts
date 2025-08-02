/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleMigrationTaskRunner } from './rule_migrations_task_runner';
import { SiemMigrationStatus } from '../../../../../common/siem_migrations/constants';
import type { AuthenticatedUser } from '@kbn/core/server';
import type { StoredRuleMigration } from '../types';
import { createRuleMigrationsDataClientMock } from '../data/__mocks__/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { SiemMigrationsClientDependencies } from '../../common/types';

jest.mock('./rule_migrations_telemetry_client');

const mockRetrieverInitialize = jest.fn().mockResolvedValue(undefined);
jest.mock('./retrievers', () => ({
  ...jest.requireActual('./retrievers'),
  RuleMigrationsRetriever: jest.fn().mockImplementation(() => ({
    initialize: mockRetrieverInitialize,
    resources: {
      getResources: jest.fn(() => ({})),
    },
  })),
}));

const mockCreateModel = jest.fn(() => ({ model: 'test-model' }));
jest.mock('./util/actions_client_chat', () => ({
  ...jest.requireActual('./util/actions_client_chat'),
  ActionsClientChat: jest.fn().mockImplementation(() => ({ createModel: mockCreateModel })),
}));

const mockInvoke = jest.fn().mockResolvedValue({});
jest.mock('./agent', () => ({
  ...jest.requireActual('./agent'),
  getRuleMigrationAgent: () => ({ invoke: mockInvoke }),
}));

// Mock dependencies
const mockLogger = loggerMock.create();

const mockDependencies: jest.Mocked<SiemMigrationsClientDependencies> = {
  rulesClient: {},
  savedObjectsClient: {},
  inferenceClient: {},
  actionsClient: {},
  telemetry: {},
} as unknown as SiemMigrationsClientDependencies;

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

  describe('setup', () => {
    it('should create the agent and tools', async () => {
      await expect(taskRunner.setup('test-connector-id')).resolves.toBeUndefined();
      // @ts-expect-error (checking private properties)
      expect(taskRunner.agent).toBeDefined();
      // @ts-expect-error (checking private properties)
      expect(taskRunner.retriever).toBeDefined();
      // @ts-expect-error (checking private properties)
      expect(taskRunner.telemetry).toBeDefined();
    });

    it('should throw if an error occurs', async () => {
      const errorMessage = 'Test error';
      mockCreateModel.mockImplementationOnce(() => {
        throw new Error(errorMessage);
      });

      await expect(taskRunner.setup('test-connector-id')).rejects.toThrowError(errorMessage);
    });
  });

  describe('run', () => {
    let runPromise: Promise<void>;
    beforeEach(async () => {
      await taskRunner.setup('test-connector-id');
    });

    it('should handle the migration successfully', async () => {
      mockRuleMigrationsDataClient.rules.get.mockResolvedValue({ total: 0, data: [] });
      mockRuleMigrationsDataClient.rules.get.mockResolvedValueOnce({
        total: 1,
        data: [{ id: ruleId, status: SiemMigrationStatus.PENDING }] as StoredRuleMigration[],
      });

      await taskRunner.setup('test-connector-id');
      await expect(taskRunner.run({})).resolves.toBeUndefined();

      expect(mockRuleMigrationsDataClient.rules.saveProcessing).toHaveBeenCalled();
      expect(mockTimeout).toHaveBeenCalledTimes(1); // random execution sleep
      expect(mockTimeout).toHaveBeenNthCalledWith(1, expect.any(Function), expect.any(Number));

      expect(mockInvoke).toHaveBeenCalledTimes(1);
      expect(mockRuleMigrationsDataClient.rules.saveCompleted).toHaveBeenCalled();
      expect(mockRuleMigrationsDataClient.rules.get).toHaveBeenCalledTimes(2); // One with data, one without
      expect(mockLogger.info).toHaveBeenCalledWith('Migration completed successfully');
    });

    describe('when error occurs', () => {
      const errorMessage = 'Test error message';

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
          await expect(runPromise).rejects.toEqual(
            Error('Migration initialization failed. Error: Test error message')
          );
        });
      });

      describe('during migration', () => {
        beforeEach(() => {
          mockRuleMigrationsDataClient.rules.get.mockRestore();
          mockRuleMigrationsDataClient.rules.get
            .mockResolvedValue({ total: 0, data: [] })
            .mockResolvedValueOnce({
              total: 1,
              data: [{ id: ruleId, status: SiemMigrationStatus.PENDING }] as StoredRuleMigration[],
            });
        });

        it('should handle abort error correctly', async () => {
          runPromise = taskRunner.run({});
          // Wait for the initialization to complete, needs 2 ticks
          await Promise.resolve();
          await Promise.resolve();

          abortController.abort(); // Trigger the abort signal

          await expect(runPromise).resolves.toBeUndefined(); // Ensure the function handles abort gracefully
          expect(mockLogger.info).toHaveBeenCalledWith('Abort signal received, stopping migration');
          expect(mockRuleMigrationsDataClient.rules.releaseProcessing).toHaveBeenCalled();
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
          const error = new Error('429. You did way too many requests to this random LLM API bud');

          beforeEach(async () => {
            mockRuleMigrationsDataClient.rules.get.mockRestore();
            mockRuleMigrationsDataClient.rules.get
              .mockResolvedValue({ total: 0, data: [] })
              .mockResolvedValueOnce({
                total: 2,
                data: [
                  { id: ruleId, status: SiemMigrationStatus.PENDING },
                  { id: rule2Id, status: SiemMigrationStatus.PENDING },
                ] as StoredRuleMigration[],
              });
          });

          it('should retry with exponential backoff', async () => {
            mockInvoke
              .mockResolvedValue({}) // Successful calls from here on
              .mockRejectedValueOnce(error) // First failed call for rule 1
              .mockRejectedValueOnce(error) // First failed call for rule 2
              .mockRejectedValueOnce(error) // Second failed call for rule 1
              .mockRejectedValueOnce(error); // Third failed call for rule 1

            await expect(taskRunner.run({})).resolves.toBeUndefined(); // success

            /**
             * Invoke calls:
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
            expect(mockTimeout).toHaveBeenCalledTimes(6); // 2 execution sleeps + 3 backoff sleeps + 1 execution sleep
            expect(mockTimeout).toHaveBeenNthCalledWith(
              1,
              expect.any(Function),
              expect.any(Number) // exec random sleep
            );
            expect(mockTimeout).toHaveBeenNthCalledWith(
              2,
              expect.any(Function),
              expect.any(Number) // exec random sleep
            );
            expect(mockTimeout).toHaveBeenNthCalledWith(3, expect.any(Function), 1000);
            expect(mockTimeout).toHaveBeenNthCalledWith(4, expect.any(Function), 2000);
            expect(mockTimeout).toHaveBeenNthCalledWith(5, expect.any(Function), 4000);
            expect(mockTimeout).toHaveBeenNthCalledWith(
              6,
              expect.any(Function),
              expect.any(Number) // exec random sleep
            );

            expect(mockLogger.debug).toHaveBeenCalledWith(
              `Awaiting backoff task for rule "${rule2Id}"`
            );
            expect(mockInvoke).toHaveBeenCalledTimes(6); // 3 retries + 3 executions
            expect(mockRuleMigrationsDataClient.rules.saveCompleted).toHaveBeenCalledTimes(2); // 2 rules
          });

          it('should fail when reached maxRetries', async () => {
            mockInvoke.mockRejectedValue(error);

            await expect(taskRunner.run({})).resolves.toBeUndefined(); // success

            // maxRetries = 8
            expect(mockInvoke).toHaveBeenCalledTimes(10); // 8 retries + 2 executions
            expect(mockTimeout).toHaveBeenCalledTimes(10); // 2 execution sleeps + 8 backoff sleeps

            expect(mockRuleMigrationsDataClient.rules.saveError).toHaveBeenCalledTimes(2); // 2 rules
          });

          it('should fail when reached max recovery attempts', async () => {
            const rule3Id = 'test-rule-id-3';
            const rule4Id = 'test-rule-id-4';
            mockRuleMigrationsDataClient.rules.get.mockRestore();
            mockRuleMigrationsDataClient.rules.get
              .mockResolvedValue({ total: 0, data: [] })
              .mockResolvedValueOnce({
                total: 4,
                data: [
                  { id: ruleId, status: SiemMigrationStatus.PENDING },
                  { id: rule2Id, status: SiemMigrationStatus.PENDING },
                  { id: rule3Id, status: SiemMigrationStatus.PENDING },
                  { id: rule4Id, status: SiemMigrationStatus.PENDING },
                ] as StoredRuleMigration[],
              });

            // max recovery attempts = 3
            mockInvoke
              .mockResolvedValue({}) // should never reach this
              .mockRejectedValueOnce(error) // 1st failed call for rule 1
              .mockRejectedValueOnce(error) // 1st failed call for rule 2
              .mockRejectedValueOnce(error) // 1st failed call for rule 3
              .mockRejectedValueOnce(error) // 1st failed call for rule 4
              .mockResolvedValueOnce({}) // Successful call for the rule 1 backoff
              .mockRejectedValueOnce(error) // 2nd failed call for the rule 2 recover
              .mockRejectedValueOnce(error) // 2nd failed call for the rule 3 recover
              .mockRejectedValueOnce(error) // 2nd failed call for the rule 4 recover
              .mockResolvedValueOnce({}) // Successful call for the rule 2 backoff
              .mockRejectedValueOnce(error) // 3rd failed call for the rule 3 recover
              .mockRejectedValueOnce(error) // 3rd failed call for the rule 4 recover
              .mockResolvedValueOnce({}) // Successful call for the rule 3 backoff
              .mockRejectedValueOnce(error); // 4th failed call for the rule 4 recover (max attempts failure)

            await expect(taskRunner.run({})).resolves.toBeUndefined(); // success

            expect(mockRuleMigrationsDataClient.rules.saveCompleted).toHaveBeenCalledTimes(3); // rules 1, 2 and 3
            expect(mockRuleMigrationsDataClient.rules.saveError).toHaveBeenCalledTimes(1); // rule 4
          });

          it('should increase the executor sleep time when rate limited', async () => {
            const getResponse = {
              total: 1,
              data: [{ id: ruleId, status: SiemMigrationStatus.PENDING }] as StoredRuleMigration[],
            };
            mockRuleMigrationsDataClient.rules.get.mockRestore();
            mockRuleMigrationsDataClient.rules.get
              .mockResolvedValue({ total: 0, data: [] })
              .mockResolvedValueOnce(getResponse)
              .mockResolvedValueOnce({ total: 0, data: [] })
              .mockResolvedValueOnce(getResponse)
              .mockResolvedValueOnce({ total: 0, data: [] })
              .mockResolvedValueOnce(getResponse)
              .mockResolvedValueOnce({ total: 0, data: [] })
              .mockResolvedValueOnce(getResponse)
              .mockResolvedValueOnce({ total: 0, data: [] })
              .mockResolvedValueOnce(getResponse)
              .mockResolvedValueOnce({ total: 0, data: [] })
              .mockResolvedValueOnce(getResponse)
              .mockResolvedValueOnce({ total: 0, data: [] });

            /**
             * Current EXECUTOR_SLEEP settings:
             * initialValueSeconds: 3, multiplier: 2, limitSeconds: 96, // 1m36s (5 increases)
             */

            // @ts-expect-error (checking private properties)
            expect(taskRunner.executorSleepMultiplier).toBe(3);

            mockInvoke.mockResolvedValue({}).mockRejectedValueOnce(error); // rate limit and recovery
            await expect(taskRunner.run({})).resolves.toBeUndefined(); // success

            // @ts-expect-error (checking private properties)
            expect(taskRunner.executorSleepMultiplier).toBe(6);

            mockInvoke.mockResolvedValue({}).mockRejectedValueOnce(error); // rate limit and recovery
            await expect(taskRunner.run({})).resolves.toBeUndefined(); // success

            // @ts-expect-error (checking private properties)
            expect(taskRunner.executorSleepMultiplier).toBe(12);

            mockInvoke.mockResolvedValue({}).mockRejectedValueOnce(error); // rate limit and recovery
            await expect(taskRunner.run({})).resolves.toBeUndefined(); // success

            // @ts-expect-error (checking private properties)
            expect(taskRunner.executorSleepMultiplier).toBe(24);

            mockInvoke.mockResolvedValue({}).mockRejectedValueOnce(error); // rate limit and recovery
            await expect(taskRunner.run({})).resolves.toBeUndefined(); // success

            // @ts-expect-error (checking private properties)
            expect(taskRunner.executorSleepMultiplier).toBe(48);

            mockInvoke.mockResolvedValue({}).mockRejectedValueOnce(error); // rate limit and recovery
            await expect(taskRunner.run({})).resolves.toBeUndefined(); // success

            // @ts-expect-error (checking private properties)
            expect(taskRunner.executorSleepMultiplier).toBe(96);

            mockInvoke.mockResolvedValue({}).mockRejectedValueOnce(error); // rate limit and recovery
            await expect(taskRunner.run({})).resolves.toBeUndefined(); // success

            // @ts-expect-error (checking private properties)
            expect(taskRunner.executorSleepMultiplier).toBe(96); // limit reached
            expect(mockLogger.warn).toHaveBeenCalledWith(
              'Executor sleep reached the maximum value'
            );
          });
        });
      });
    });
  });
});
