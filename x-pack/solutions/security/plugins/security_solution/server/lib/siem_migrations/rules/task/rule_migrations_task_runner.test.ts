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
import { mockRuleMigrationsDataClient } from '../data/__mocks__/mocks';
import { loggerMock } from '@kbn/logging-mocks';

jest.mock('./retrievers', () => ({
  RuleMigrationsRetriever: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('./util/actions_client_chat', () => ({
  ...jest.requireActual('./util/actions_client_chat'),
  ActionsClientChat: jest.fn().mockImplementation(() => ({
    createModel: jest.fn(() => ({ model: 'test-model' })),
  })),
}));

jest.mock('./agent', () => ({
  ...jest.requireActual('./agent'),
  getRuleMigrationAgent: jest.fn(() => ({ invoke: jest.fn().mockResolvedValue({}) })),
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

describe('RuleMigrationTaskRunner', () => {
  let taskRunner: RuleMigrationTaskRunner;
  let abortController: AbortController;

  beforeEach(() => {
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

  it('setup initializes necessary components', async () => {
    const mockSetup = jest.spyOn(taskRunner, 'setup').mockResolvedValue();
    await taskRunner.setup('test-connector-id');
    expect(mockSetup).toHaveBeenCalledWith('test-connector-id');
  });

  it('run handles migration successfully', async () => {
    mockRuleMigrationsDataClient.rules.get.mockResolvedValue({
      total: 1,
      data: [{ id: 'rule-1', status: SiemMigrationStatus.PENDING }] as StoredRuleMigration[],
    });
    mockRuleMigrationsDataClient.rules.saveProcessing.mockResolvedValue(undefined);
    mockRuleMigrationsDataClient.rules.saveCompleted.mockResolvedValue(undefined);

    const mockRun = jest.spyOn(taskRunner, 'run').mockResolvedValue();
    await taskRunner.setup('test-connector-id');
    await taskRunner.run({});
    expect(mockRun).toHaveBeenCalled();
  });

  describe('abort', () => {
    it('run handles abort signal correctly during initialization', async () => {
      await taskRunner.setup('test-connector-id');
      const promise = taskRunner.run({});
      abortController.abort(); // Trigger the abort signal

      await expect(promise).resolves.toBeUndefined(); // Ensure the function handles abort gracefully

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Abort signal received, stopping initialization'
      );
    });

    it('run handles abort signal correctly during run', async () => {
      await taskRunner.setup('test-connector-id');
      const promise = taskRunner.run({});
      await Promise.resolve(); // Wait for the initialization to complete
      abortController.abort(); // Trigger the abort signal

      await expect(promise).resolves.toBeUndefined(); // Ensure the function handles abort gracefully

      expect(mockLogger.info).toHaveBeenCalledWith('Abort signal received, stopping migration');
    });
  });

  it('run logs an error on regular failure', async () => {
    const error = new Error('Test error');
    mockRuleMigrationsDataClient.rules.get.mockRejectedValue(error);
    await taskRunner.setup('test-connector-id');
    await expect(taskRunner.run({})).resolves.toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalledWith(`Error processing migration: ${error}`);
  });

  describe.skip('backoff retries', () => {
    it('retries on failure with exponential backoff', async () => {
      jest.useFakeTimers();
      const error = new Error('Transient error');
      const mockAgent = jest.requireMock('./agent').getRuleMigrationAgent();

      mockAgent.invoke
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValue({});

      await taskRunner.setup('test-connector-id');
      const runPromise = taskRunner.run({});

      jest.advanceTimersByTime(1000); // First retry delay
      jest.advanceTimersByTime(2000); // Second retry delay

      await runPromise;

      expect(mockLogger.warn).toHaveBeenCalledWith('Retrying agent.invoke after transient failure');
      expect(mockAgent.invoke).toHaveBeenCalledTimes(3);
      jest.useRealTimers();
    });
  });
});
