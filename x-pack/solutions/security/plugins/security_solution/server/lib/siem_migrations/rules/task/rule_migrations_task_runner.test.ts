/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleMigrationTaskRunner } from './rule_migrations_task_runner';
import type { AuthenticatedUser, KibanaRequest } from '@kbn/core/server';
import type { SiemMigrationsClientDependencies } from '../../common/types';
import { createRuleMigrationsDataClientMock } from '../data/__mocks__/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { inferenceMock } from '@kbn/inference-plugin/server/mocks';

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

const mockCreateModel = jest.fn(() => ({ model: 'test-model', bindTools: jest.fn() }));
const mockGetModelName = jest.fn(() => 'test-model');
jest.mock('../../common/task/util/actions_client_chat', () => ({
  ...jest.requireActual('../../common/task/util/actions_client_chat'),
  ActionsClientChat: jest
    .fn()
    .mockImplementation(() => ({ createModel: mockCreateModel, getModelName: mockGetModelName })),
}));

const mockInvoke = jest.fn().mockResolvedValue({});
jest.mock('./agent', () => ({
  ...jest.requireActual('./agent'),
  getRuleMigrationAgent: () => ({ invoke: mockInvoke }),
}));

// Mock dependencies
const mockLogger = loggerMock.create();
const inferenceService = inferenceMock.createStartContract();

const mockDependencies: jest.Mocked<SiemMigrationsClientDependencies> = {
  rulesClient: {},
  savedObjectsClient: {},
  inferenceService,
  actionsClient: {},
  telemetry: {},
} as unknown as SiemMigrationsClientDependencies;

const mockRequest = {} as unknown as KibanaRequest;
const mockUser = {} as unknown as AuthenticatedUser;

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
      'splunk',
      mockRequest,
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
      expect(taskRunner.task).toBeDefined();
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
});
