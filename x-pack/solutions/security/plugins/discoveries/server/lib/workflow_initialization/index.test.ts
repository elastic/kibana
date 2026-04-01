/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';

import { calculateRetryDelay, createWorkflowInitializationService } from '.';

const mockRegisterDefaultWorkflows = jest.fn();

jest.mock('../../workflows/register_default_workflows', () => ({
  registerDefaultWorkflows: (...args: unknown[]) => mockRegisterDefaultWorkflows(...args),
}));

const mockLogger = loggerMock.create();
const mockRequest = {} as never;
const mockWorkflowIds = {
  default_alert_retrieval: 'legacy-id',
  esql_example_alert_retrieval: 'esql-id',
  generation: 'orch-id',
  validate: 'validate-id',
};

describe('createWorkflowInitializationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('ensureWorkflowsForSpace', () => {
    it('returns null when workflowsManagementApi is undefined', async () => {
      const service = createWorkflowInitializationService({
        workflowsManagementApi: undefined,
      });

      const result = await service.ensureWorkflowsForSpace({
        logger: mockLogger,
        request: mockRequest,
        spaceId: 'default',
      });

      expect(result).toBeNull();
      expect(mockRegisterDefaultWorkflows).not.toHaveBeenCalled();
    });

    it('calls registerDefaultWorkflows and returns workflow IDs on success', async () => {
      mockRegisterDefaultWorkflows.mockResolvedValue(mockWorkflowIds);
      const mockApi = {} as WorkflowsServerPluginSetup['management'];

      const service = createWorkflowInitializationService({
        workflowsManagementApi: mockApi,
      });

      const result = await service.ensureWorkflowsForSpace({
        logger: mockLogger,
        request: mockRequest,
        spaceId: 'default',
      });

      expect(result).toEqual(mockWorkflowIds);
      expect(mockRegisterDefaultWorkflows).toHaveBeenCalledWith(
        mockApi,
        'default',
        mockLogger,
        mockRequest
      );
    });

    it('returns cached result on subsequent calls for the same space', async () => {
      mockRegisterDefaultWorkflows.mockResolvedValue(mockWorkflowIds);
      const mockApi = {} as WorkflowsServerPluginSetup['management'];

      const service = createWorkflowInitializationService({
        workflowsManagementApi: mockApi,
      });

      const result1 = await service.ensureWorkflowsForSpace({
        logger: mockLogger,
        request: mockRequest,
        spaceId: 'default',
      });

      const result2 = await service.ensureWorkflowsForSpace({
        logger: mockLogger,
        request: mockRequest,
        spaceId: 'default',
      });

      expect(result1).toEqual(mockWorkflowIds);
      expect(result2).toEqual(mockWorkflowIds);
      expect(mockRegisterDefaultWorkflows).toHaveBeenCalledTimes(1);
    });

    it('deduplicates concurrent initialization requests for the same space', async () => {
      mockRegisterDefaultWorkflows.mockResolvedValue(mockWorkflowIds);
      const mockApi = {} as WorkflowsServerPluginSetup['management'];

      const service = createWorkflowInitializationService({
        workflowsManagementApi: mockApi,
      });

      const [result1, result2] = await Promise.all([
        service.ensureWorkflowsForSpace({
          logger: mockLogger,
          request: mockRequest,
          spaceId: 'default',
        }),
        service.ensureWorkflowsForSpace({
          logger: mockLogger,
          request: mockRequest,
          spaceId: 'default',
        }),
      ]);

      expect(result1).toEqual(mockWorkflowIds);
      expect(result2).toEqual(mockWorkflowIds);
      expect(mockRegisterDefaultWorkflows).toHaveBeenCalledTimes(1);
    });

    it('does not re-register after a successful initialization', async () => {
      mockRegisterDefaultWorkflows.mockResolvedValueOnce(mockWorkflowIds);

      const mockApi = {} as WorkflowsServerPluginSetup['management'];

      const service = createWorkflowInitializationService({
        workflowsManagementApi: mockApi,
      });

      const result1 = await service.ensureWorkflowsForSpace({
        logger: mockLogger,
        request: mockRequest,
        spaceId: 'default',
      });

      expect(result1).toEqual(mockWorkflowIds);

      const result2 = await service.ensureWorkflowsForSpace({
        logger: mockLogger,
        request: mockRequest,
        spaceId: 'default',
      });

      expect(result2).toEqual(mockWorkflowIds);
      expect(mockRegisterDefaultWorkflows).toHaveBeenCalledTimes(1);
    });

    it('initializes different spaces independently', async () => {
      mockRegisterDefaultWorkflows.mockResolvedValue(mockWorkflowIds);
      const mockApi = {} as WorkflowsServerPluginSetup['management'];

      const service = createWorkflowInitializationService({
        workflowsManagementApi: mockApi,
      });

      await service.ensureWorkflowsForSpace({
        logger: mockLogger,
        request: mockRequest,
        spaceId: 'space-a',
      });

      await service.ensureWorkflowsForSpace({
        logger: mockLogger,
        request: mockRequest,
        spaceId: 'space-b',
      });

      expect(mockRegisterDefaultWorkflows).toHaveBeenCalledTimes(3);
      expect(mockRegisterDefaultWorkflows).toHaveBeenCalledWith(
        mockApi,
        'space-a',
        mockLogger,
        mockRequest
      );
      expect(mockRegisterDefaultWorkflows).toHaveBeenCalledWith(
        mockApi,
        'default',
        mockLogger,
        mockRequest
      );
      expect(mockRegisterDefaultWorkflows).toHaveBeenCalledWith(
        mockApi,
        'space-b',
        mockLogger,
        mockRequest
      );
    });

    it('eagerly initializes the default space when a non-default space is requested', async () => {
      mockRegisterDefaultWorkflows.mockResolvedValue(mockWorkflowIds);
      const mockApi = {} as WorkflowsServerPluginSetup['management'];

      const service = createWorkflowInitializationService({
        workflowsManagementApi: mockApi,
      });

      await service.ensureWorkflowsForSpace({
        logger: mockLogger,
        request: mockRequest,
        spaceId: 'custom-space',
      });

      expect(mockRegisterDefaultWorkflows).toHaveBeenCalledTimes(2);
      expect(mockRegisterDefaultWorkflows).toHaveBeenCalledWith(
        mockApi,
        'custom-space',
        mockLogger,
        mockRequest
      );
      expect(mockRegisterDefaultWorkflows).toHaveBeenCalledWith(
        mockApi,
        'default',
        mockLogger,
        mockRequest
      );
    });

    it('does not re-initialize default space when it is already cached', async () => {
      mockRegisterDefaultWorkflows.mockResolvedValue(mockWorkflowIds);
      const mockApi = {} as WorkflowsServerPluginSetup['management'];

      const service = createWorkflowInitializationService({
        workflowsManagementApi: mockApi,
      });

      await service.ensureWorkflowsForSpace({
        logger: mockLogger,
        request: mockRequest,
        spaceId: 'default',
      });

      await service.ensureWorkflowsForSpace({
        logger: mockLogger,
        request: mockRequest,
        spaceId: 'custom-space',
      });

      expect(mockRegisterDefaultWorkflows).toHaveBeenCalledTimes(2);
    });

    it('does not eagerly init default space when default space is the requested space', async () => {
      mockRegisterDefaultWorkflows.mockResolvedValue(mockWorkflowIds);
      const mockApi = {} as WorkflowsServerPluginSetup['management'];

      const service = createWorkflowInitializationService({
        workflowsManagementApi: mockApi,
      });

      await service.ensureWorkflowsForSpace({
        logger: mockLogger,
        request: mockRequest,
        spaceId: 'default',
      });

      expect(mockRegisterDefaultWorkflows).toHaveBeenCalledTimes(1);
    });

    it('returns null and logs warning when registration fails', async () => {
      mockRegisterDefaultWorkflows.mockRejectedValue(new Error('registration failed'));
      const mockApi = {} as WorkflowsServerPluginSetup['management'];

      const service = createWorkflowInitializationService({
        workflowsManagementApi: mockApi,
      });

      const result = await service.ensureWorkflowsForSpace({
        logger: mockLogger,
        request: mockRequest,
        spaceId: 'default',
      });

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Failed to initialize workflows for space 'default': registration failed"
      );
    });

    it('throttles retries after failure', async () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      mockRegisterDefaultWorkflows.mockRejectedValueOnce(new Error('fail'));
      const mockApi = {} as WorkflowsServerPluginSetup['management'];

      const service = createWorkflowInitializationService({
        workflowsManagementApi: mockApi,
      });

      await service.ensureWorkflowsForSpace({
        logger: mockLogger,
        request: mockRequest,
        spaceId: 'default',
      });

      jest.spyOn(Date, 'now').mockReturnValue(now + 1000);

      const result = await service.ensureWorkflowsForSpace({
        logger: mockLogger,
        request: mockRequest,
        spaceId: 'default',
      });

      expect(result).toBeNull();
      expect(mockRegisterDefaultWorkflows).toHaveBeenCalledTimes(1);
    });

    it('retries after the throttle delay has elapsed', async () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      mockRegisterDefaultWorkflows.mockRejectedValueOnce(new Error('fail'));
      const mockApi = {} as WorkflowsServerPluginSetup['management'];

      const service = createWorkflowInitializationService({
        workflowsManagementApi: mockApi,
      });

      await service.ensureWorkflowsForSpace({
        logger: mockLogger,
        request: mockRequest,
        spaceId: 'default',
      });

      jest.spyOn(Date, 'now').mockReturnValue(now + 31_000);
      mockRegisterDefaultWorkflows.mockResolvedValue(mockWorkflowIds);

      const result = await service.ensureWorkflowsForSpace({
        logger: mockLogger,
        request: mockRequest,
        spaceId: 'default',
      });

      expect(result).toEqual(mockWorkflowIds);
      expect(mockRegisterDefaultWorkflows).toHaveBeenCalledTimes(2);
    });

    it('caches the result after a successful retry', async () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      mockRegisterDefaultWorkflows.mockRejectedValueOnce(new Error('fail'));
      const mockApi = {} as WorkflowsServerPluginSetup['management'];

      const service = createWorkflowInitializationService({
        workflowsManagementApi: mockApi,
      });

      await service.ensureWorkflowsForSpace({
        logger: mockLogger,
        request: mockRequest,
        spaceId: 'default',
      });

      jest.spyOn(Date, 'now').mockReturnValue(now + 31_000);
      mockRegisterDefaultWorkflows.mockResolvedValue(mockWorkflowIds);

      await service.ensureWorkflowsForSpace({
        logger: mockLogger,
        request: mockRequest,
        spaceId: 'default',
      });

      const result = await service.ensureWorkflowsForSpace({
        logger: mockLogger,
        request: mockRequest,
        spaceId: 'default',
      });

      expect(result).toEqual(mockWorkflowIds);
      expect(mockRegisterDefaultWorkflows).toHaveBeenCalledTimes(2);
    });
  });
});

describe('calculateRetryDelay', () => {
  it('returns 30s for the first attempt', () => {
    expect(calculateRetryDelay(1)).toBe(30_000);
  });

  it('returns 30s for attempt 0 (edge case)', () => {
    expect(calculateRetryDelay(0)).toBe(30_000);
  });

  it('returns 2 minutes for the second attempt', () => {
    expect(calculateRetryDelay(2)).toBe(2 * 60 * 1000);
  });

  it('returns 4 minutes for the third attempt', () => {
    expect(calculateRetryDelay(3)).toBe(4 * 60 * 1000);
  });

  it('returns 8 minutes for the fourth attempt', () => {
    expect(calculateRetryDelay(4)).toBe(8 * 60 * 1000);
  });
});
