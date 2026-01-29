/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SiemMigrationTaskRunner } from './siem_migrations_task_runner';
import { SiemMigrationStatus } from '../../../../../common/siem_migrations/constants';
import type { AuthenticatedUser, KibanaRequest } from '@kbn/core/server';
import type { StoredSiemMigrationItem, SiemMigrationsClientDependencies } from '../types';
import { createSiemMigrationsDataClientMock } from '../data/__mocks__/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { SiemMigrationTelemetryClient } from './__mocks__/siem_migrations_telemetry_client';
import { TELEMETRY_SIEM_MIGRATION_ID } from './util/constants';

jest.mock('./siem_migrations_telemetry_client');

// Mock dependencies
const mockLogger = loggerMock.create();

const mockDependencies: jest.Mocked<SiemMigrationsClientDependencies> = {
  itemsClient: {},
  savedObjectsClient: {},
  inferenceClient: {},
  actionsClient: {},
  telemetry: {},
} as unknown as SiemMigrationsClientDependencies;

const mockRequest = {} as unknown as KibanaRequest;
const mockUser = {} as unknown as AuthenticatedUser;
const itemId = 'test-item-id';

jest.useFakeTimers();
jest.spyOn(global, 'setTimeout');
const mockTimeout = setTimeout as unknown as jest.Mock;
mockTimeout.mockImplementation((cb) => {
  // never actually wait, we'll check the calls manually
  cb();
});

const mockSetup = jest.fn().mockResolvedValue(undefined);
const mockInvoke = jest.fn().mockResolvedValue(undefined);
const mockPrepareTaskInput = jest.fn().mockResolvedValue({});
const mockProcessTaskOutput = jest.fn().mockResolvedValue({});
const mockInitialize = jest.fn().mockResolvedValue(undefined);

class TestMigrationTaskRunner extends SiemMigrationTaskRunner {
  protected taskConcurrency = 10;
  protected TaskRunnerClass = SiemMigrationTaskRunner;
  protected EvaluatorClass = undefined;

  public async setup(connectorId: string): Promise<void> {
    await mockSetup();
    this.task = mockInvoke;
    this.telemetry = new SiemMigrationTelemetryClient(
      this.dependencies.telemetry,
      this.logger,
      this.migrationId,
      TELEMETRY_SIEM_MIGRATION_ID
    );
  }

  prepareTaskInput = mockPrepareTaskInput;
  processTaskOutput = mockProcessTaskOutput;

  public async initialize(): Promise<void> {
    await mockInitialize();
  }
}

describe('SiemMigrationTaskRunner', () => {
  let taskRunner: SiemMigrationTaskRunner;
  let abortController: AbortController;
  let mockSiemMigrationsDataClient: ReturnType<typeof createSiemMigrationsDataClientMock>;

  beforeEach(() => {
    mockSetup.mockResolvedValue(undefined); // Reset the mock
    mockInitialize.mockResolvedValue(undefined); // Reset the mock
    mockInvoke.mockResolvedValue({}); // Reset the mock
    mockSiemMigrationsDataClient = createSiemMigrationsDataClientMock();
    jest.clearAllMocks();

    abortController = new AbortController();
    taskRunner = new TestMigrationTaskRunner(
      'test-migration-id',
      'splunk',
      mockRequest,
      mockUser,
      abortController,
      mockSiemMigrationsDataClient,
      mockLogger,
      mockDependencies
    );
  });

  describe('setup', () => {
    it('should create the task and tools', async () => {
      await expect(taskRunner.setup('test-connector-id')).resolves.toBeUndefined();
      // @ts-expect-error (checking private properties)
      expect(taskRunner.task).toBeDefined();
      // @ts-expect-error (checking private properties)
      expect(taskRunner.telemetry).toBeDefined();
    });

    it('should throw if an error occurs', async () => {
      const errorMessage = 'Test error';
      mockSetup.mockImplementationOnce(() => {
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
      mockSiemMigrationsDataClient.items.get.mockResolvedValue({ total: 0, data: [] });
      mockSiemMigrationsDataClient.items.get.mockResolvedValueOnce({
        total: 1,
        data: [{ id: itemId, status: SiemMigrationStatus.PENDING }] as StoredSiemMigrationItem[],
      });

      await taskRunner.setup('test-connector-id');
      await expect(taskRunner.run({})).resolves.toBeUndefined();

      expect(mockSiemMigrationsDataClient.items.saveProcessing).toHaveBeenCalled();
      expect(mockTimeout).toHaveBeenCalledTimes(1); // random execution sleep
      expect(mockTimeout).toHaveBeenNthCalledWith(1, expect.any(Function), expect.any(Number));

      expect(mockPrepareTaskInput).toHaveBeenCalledTimes(1);
      expect(mockInvoke).toHaveBeenCalledTimes(1);
      expect(mockProcessTaskOutput).toHaveBeenCalledTimes(1);
      expect(mockSiemMigrationsDataClient.items.saveCompleted).toHaveBeenCalled();
      expect(mockSiemMigrationsDataClient.items.get).toHaveBeenCalledTimes(2); // One with data, one without
      expect(mockLogger.info).toHaveBeenCalledWith('Migration completed successfully');
    });

    describe('when error occurs', () => {
      const errorMessage = 'Test error message';

      describe('during initialization', () => {
        it('should handle abort error correctly', async () => {
          abortController.abort();

          runPromise = taskRunner.run({});
          await expect(runPromise).resolves.toBeUndefined(); // Ensure the function handles abort gracefully

          expect(mockLogger.info).toHaveBeenCalledWith(
            'Abort signal received, stopping initialization'
          );
        });

        it('should handle other errors correctly', async () => {
          mockInitialize.mockRejectedValueOnce(new Error(errorMessage));

          runPromise = taskRunner.run({});
          await expect(runPromise).rejects.toEqual(
            Error('Migration initialization failed. Error: Test error message')
          );
        });
      });

      describe('during migration', () => {
        beforeEach(() => {
          mockSiemMigrationsDataClient.items.get.mockRestore();
          mockSiemMigrationsDataClient.items.get
            .mockResolvedValue({ total: 0, data: [] })
            .mockResolvedValueOnce({
              total: 1,
              data: [
                { id: itemId, status: SiemMigrationStatus.PENDING },
              ] as StoredSiemMigrationItem[],
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
          expect(mockSiemMigrationsDataClient.items.releaseProcessing).toHaveBeenCalled();
        });

        it('should handle other errors correctly', async () => {
          mockInvoke.mockRejectedValue(new Error(errorMessage));

          runPromise = taskRunner.run({});
          await expect(runPromise).resolves.toBeUndefined();

          expect(mockLogger.error).toHaveBeenCalledWith(
            `Error translating migration item \"${itemId}\" with error: ${errorMessage}`
          );
          expect(mockSiemMigrationsDataClient.items.saveError).toHaveBeenCalled();
        });

        describe('during rate limit errors', () => {
          const item2Id = 'test-item-id-2';
          const error = new Error('429. You did way too many requests to this random LLM API bud');

          beforeEach(async () => {
            mockSiemMigrationsDataClient.items.get.mockRestore();
            mockSiemMigrationsDataClient.items.get
              .mockResolvedValue({ total: 0, data: [] })
              .mockResolvedValueOnce({
                total: 2,
                data: [
                  { id: itemId, status: SiemMigrationStatus.PENDING },
                  { id: item2Id, status: SiemMigrationStatus.PENDING },
                ] as StoredSiemMigrationItem[],
              });
          });

          it('should retry with exponential backoff', async () => {
            mockInvoke
              .mockResolvedValue({}) // Successful calls from here on
              .mockRejectedValueOnce(error) // First failed call for item 1
              .mockRejectedValueOnce(error) // First failed call for item 2
              .mockRejectedValueOnce(error) // Second failed call for item 1
              .mockRejectedValueOnce(error); // Third failed call for item 1

            await expect(taskRunner.run({})).resolves.toBeUndefined(); // success

            expect(mockPrepareTaskInput).toHaveBeenCalledTimes(2); // 2 items
            /**
             * Invoke calls:
             * item 1 -> failure -> start backoff retries
             * item 2 -> failure -> await for item 1 backoff
             * then:
             * item 1 retry 1 -> failure
             * item 1 retry 2 -> failure
             * item 1 retry 3 -> success
             * then:
             * item 2 -> success
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
              `Awaiting backoff task for migration item "${item2Id}"`
            );
            expect(mockPrepareTaskInput).toHaveBeenCalledTimes(2); // 2 items
            expect(mockInvoke).toHaveBeenCalledTimes(6); // 3 retries + 3 executions
            expect(mockSiemMigrationsDataClient.items.saveCompleted).toHaveBeenCalledTimes(2); // 2 items
          });

          it('should fail when reached maxRetries', async () => {
            mockInvoke.mockRejectedValue(error);

            await expect(taskRunner.run({})).resolves.toBeUndefined(); // success

            expect(mockPrepareTaskInput).toHaveBeenCalledTimes(2); // 2 items
            // maxRetries = 8
            expect(mockInvoke).toHaveBeenCalledTimes(10); // 8 retries + 2 executions
            expect(mockTimeout).toHaveBeenCalledTimes(10); // 2 execution sleeps + 8 backoff sleeps

            expect(mockSiemMigrationsDataClient.items.saveError).toHaveBeenCalledTimes(2); // 2 items
          });

          it('should fail when reached max recovery attempts', async () => {
            const item3Id = 'test-item-id-3';
            const item4Id = 'test-item-id-4';
            mockSiemMigrationsDataClient.items.get.mockRestore();
            mockSiemMigrationsDataClient.items.get
              .mockResolvedValue({ total: 0, data: [] })
              .mockResolvedValueOnce({
                total: 4,
                data: [
                  { id: itemId, status: SiemMigrationStatus.PENDING },
                  { id: item2Id, status: SiemMigrationStatus.PENDING },
                  { id: item3Id, status: SiemMigrationStatus.PENDING },
                  { id: item4Id, status: SiemMigrationStatus.PENDING },
                ] as StoredSiemMigrationItem[],
              });

            // max recovery attempts = 3
            mockInvoke
              .mockResolvedValue({}) // should never reach this
              .mockRejectedValueOnce(error) // 1st failed call for item 1
              .mockRejectedValueOnce(error) // 1st failed call for item 2
              .mockRejectedValueOnce(error) // 1st failed call for item 3
              .mockRejectedValueOnce(error) // 1st failed call for item 4
              .mockResolvedValueOnce({}) // Successful call for the item 1 backoff
              .mockRejectedValueOnce(error) // 2nd failed call for the item 2 recover
              .mockRejectedValueOnce(error) // 2nd failed call for the item 3 recover
              .mockRejectedValueOnce(error) // 2nd failed call for the item 4 recover
              .mockResolvedValueOnce({}) // Successful call for the item 2 backoff
              .mockRejectedValueOnce(error) // 3rd failed call for the item 3 recover
              .mockRejectedValueOnce(error) // 3rd failed call for the item 4 recover
              .mockResolvedValueOnce({}) // Successful call for the item 3 backoff
              .mockRejectedValueOnce(error); // 4th failed call for the item 4 recover (max attempts failure)

            await expect(taskRunner.run({})).resolves.toBeUndefined(); // success

            expect(mockSiemMigrationsDataClient.items.saveCompleted).toHaveBeenCalledTimes(3); // items 1, 2 and 3
            expect(mockSiemMigrationsDataClient.items.saveError).toHaveBeenCalledTimes(1); // item 4
          });

          it('should increase the executor sleep time when rate limited', async () => {
            const getResponse = {
              total: 1,
              data: [
                { id: itemId, status: SiemMigrationStatus.PENDING },
              ] as StoredSiemMigrationItem[],
            };
            mockSiemMigrationsDataClient.items.get.mockRestore();
            mockSiemMigrationsDataClient.items.get
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
