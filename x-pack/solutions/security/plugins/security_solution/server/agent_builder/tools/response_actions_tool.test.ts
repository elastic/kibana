/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, type ErrorResult } from '@kbn/agent-builder-common';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { createToolHandlerContext, createToolTestMocks } from '../__mocks__/test_helpers';
import { responseActionsTool } from './response_actions_tool';
import type { ResponseActionsClient } from '../../endpoint/services/actions/clients/lib/types';
import type { EndpointAppContextService } from '../../endpoint/endpoint_app_context_services';
import type { ActionDetails } from '../../../common/endpoint/types';

const createMockActionDetails = (overrides: Partial<ActionDetails> = {}): ActionDetails => ({
  id: 'action-123',
  agents: ['endpoint-123'],
  hosts: { 'endpoint-123': { name: 'test-host' } },
  command: 'isolate',
  isExpired: false,
  isCompleted: false,
  wasSuccessful: false,
  errors: undefined,
  startedAt: '2026-03-25T00:00:00.000Z',
  completedAt: undefined,
  outputs: undefined,
  agentState: {
    'endpoint-123': {
      isCompleted: false,
      wasSuccessful: false,
      errors: undefined,
      completedAt: undefined,
    },
  },
  status: 'pending',
  createdBy: 'agent-builder',
  agentType: 'endpoint',
  ...overrides,
});

const createMockResponseActionsClient = (): jest.Mocked<ResponseActionsClient> => ({
  isolate: jest.fn().mockResolvedValue(createMockActionDetails()),
  release: jest.fn().mockResolvedValue(createMockActionDetails({ command: 'unisolate' })),
  killProcess: jest.fn().mockResolvedValue(createMockActionDetails({ command: 'kill-process' })),
  suspendProcess: jest
    .fn()
    .mockResolvedValue(createMockActionDetails({ command: 'suspend-process' })),
  runningProcesses: jest.fn().mockResolvedValue(createMockActionDetails()),
  getFile: jest.fn().mockResolvedValue(createMockActionDetails()),
  execute: jest.fn().mockResolvedValue(createMockActionDetails()),
  upload: jest.fn().mockResolvedValue(createMockActionDetails()),
  processPendingActions: jest.fn().mockResolvedValue(undefined),
  getCustomScripts: jest.fn().mockResolvedValue({ data: [] }),
  getFileDownload: jest.fn().mockResolvedValue({ stream: null, fileName: '' }),
  getFileInfo: jest.fn().mockResolvedValue({}),
  scan: jest.fn().mockResolvedValue(createMockActionDetails()),
  runscript: jest.fn().mockResolvedValue(createMockActionDetails()),
  cancel: jest.fn().mockResolvedValue(createMockActionDetails()),
  memoryDump: jest.fn().mockResolvedValue(createMockActionDetails()),
});

describe('responseActionsTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  let mockResponseActionsClient: jest.Mocked<ResponseActionsClient>;
  let mockEndpointAppContextService: jest.Mocked<EndpointAppContextService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockResponseActionsClient = createMockResponseActionsClient();
    mockEndpointAppContextService = {
      getInternalResponseActionsClient: jest.fn().mockReturnValue(mockResponseActionsClient),
    } as unknown as jest.Mocked<EndpointAppContextService>;
  });

  const getTool = () => responseActionsTool(mockCore, mockLogger, mockEndpointAppContextService);

  describe('schema', () => {
    it('validates correct isolate action', () => {
      const tool = getTool();
      const validInput = {
        action: 'isolate',
        endpoint_id: 'endpoint-123',
      };

      const result = tool.schema.safeParse(validInput);

      expect(result.success).toBe(true);
    });

    it('validates correct kill_process action with PID', () => {
      const tool = getTool();
      const validInput = {
        action: 'kill_process',
        endpoint_id: 'endpoint-123',
        parameters: {
          process_pid: 1234,
        },
      };

      const result = tool.schema.safeParse(validInput);

      expect(result.success).toBe(true);
    });

    it('rejects missing endpoint_id', () => {
      const tool = getTool();
      const invalidInput = {
        action: 'isolate',
      };

      const result = tool.schema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    it('rejects empty endpoint_id', () => {
      const tool = getTool();
      const invalidInput = {
        action: 'isolate',
        endpoint_id: '',
      };

      const result = tool.schema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    it('validates action enum values', () => {
      const tool = getTool();
      const validActions = ['isolate', 'release', 'kill_process', 'suspend_process'];
      for (const action of validActions) {
        const result = tool.schema.safeParse({ action, endpoint_id: 'ep-1' });
        expect(result.success).toBe(true);
      }
    });

    it('rejects invalid action', () => {
      const tool = getTool();
      const invalidInput = {
        action: 'reboot',
        endpoint_id: 'endpoint-123',
      };

      const result = tool.schema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    it('accepts optional parameters with comment', () => {
      const tool = getTool();
      const validInput = {
        action: 'isolate',
        endpoint_id: 'endpoint-123',
        parameters: {
          comment: 'Isolating due to malware detection',
        },
      };

      const result = tool.schema.safeParse(validInput);

      expect(result.success).toBe(true);
    });
  });

  describe('handler', () => {
    it('rejects kill_process without PID', async () => {
      const tool = getTool();
      const result = (await tool.handler(
        { action: 'kill_process', endpoint_id: 'endpoint-123' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      const errorResult = result.results[0] as ErrorResult;
      expect(errorResult.type).toBe(ToolResultType.error);
      expect(errorResult.data.message).toContain('kill_process');
      expect(errorResult.data.message).toContain('process_pid');
    });

    it('rejects suspend_process without PID', async () => {
      const tool = getTool();
      const result = (await tool.handler(
        { action: 'suspend_process', endpoint_id: 'endpoint-123' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      const errorResult = result.results[0] as ErrorResult;
      expect(errorResult.type).toBe(ToolResultType.error);
      expect(errorResult.data.message).toContain('suspend_process');
      expect(errorResult.data.message).toContain('process_pid');
    });

    it('submits isolate action successfully', async () => {
      const tool = getTool();
      const result = (await tool.handler(
        { action: 'isolate', endpoint_id: 'endpoint-123' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe(ToolResultType.other);
      expect(result.results[0].data).toEqual(
        expect.objectContaining({
          success: true,
          action: 'isolate',
          action_id: 'action-123',
          endpoint_id: 'endpoint-123',
          status: 'pending',
          started_at: '2026-03-25T00:00:00.000Z',
          is_completed: false,
        })
      );

      expect(mockEndpointAppContextService.getInternalResponseActionsClient).toHaveBeenCalledWith({
        spaceId: 'default',
        username: 'agent-builder',
      });

      expect(mockResponseActionsClient.isolate).toHaveBeenCalledWith({
        endpoint_ids: ['endpoint-123'],
        comment: 'Executed by AI SOC Agent',
      });
    });

    it('submits release action successfully', async () => {
      const tool = getTool();
      const result = (await tool.handler(
        { action: 'release', endpoint_id: 'endpoint-123' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe(ToolResultType.other);
      expect(result.results[0].data).toEqual(
        expect.objectContaining({
          success: true,
          action: 'release',
          action_id: 'action-123',
          endpoint_id: 'endpoint-123',
        })
      );

      expect(mockResponseActionsClient.release).toHaveBeenCalledWith({
        endpoint_ids: ['endpoint-123'],
        comment: 'Executed by AI SOC Agent',
      });
    });

    it('submits kill_process action with PID successfully', async () => {
      const tool = getTool();
      const result = (await tool.handler(
        {
          action: 'kill_process',
          endpoint_id: 'endpoint-123',
          parameters: { process_pid: 5678 },
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe(ToolResultType.other);
      expect(result.results[0].data).toEqual(
        expect.objectContaining({
          success: true,
          action: 'kill_process',
          endpoint_id: 'endpoint-123',
          process_pid: 5678,
          status: 'pending',
        })
      );

      expect(mockResponseActionsClient.killProcess).toHaveBeenCalledWith({
        endpoint_ids: ['endpoint-123'],
        comment: 'Executed by AI SOC Agent',
        parameters: { pid: 5678 },
      });
    });

    it('submits suspend_process action with PID successfully', async () => {
      const tool = getTool();
      const result = (await tool.handler(
        {
          action: 'suspend_process',
          endpoint_id: 'endpoint-123',
          parameters: { process_pid: 9999 },
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe(ToolResultType.other);
      expect(result.results[0].data).toEqual(
        expect.objectContaining({
          success: true,
          action: 'suspend_process',
          endpoint_id: 'endpoint-123',
          process_pid: 9999,
        })
      );

      expect(mockResponseActionsClient.suspendProcess).toHaveBeenCalledWith({
        endpoint_ids: ['endpoint-123'],
        comment: 'Executed by AI SOC Agent',
        parameters: { pid: 9999 },
      });
    });

    it('includes comment in the action request when provided', async () => {
      const tool = getTool();
      const result = (await tool.handler(
        {
          action: 'isolate',
          endpoint_id: 'endpoint-123',
          parameters: { comment: 'Malware detected' },
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results[0].type).toBe(ToolResultType.other);
      expect(result.results[0].data).toEqual(
        expect.objectContaining({
          comment: 'Malware detected',
        })
      );

      expect(mockResponseActionsClient.isolate).toHaveBeenCalledWith({
        endpoint_ids: ['endpoint-123'],
        comment: 'Malware detected',
      });
    });

    it('handles response actions client errors', async () => {
      mockResponseActionsClient.isolate.mockRejectedValue(new Error('Endpoint not found'));

      const tool = getTool();
      const result = (await tool.handler(
        { action: 'isolate', endpoint_id: 'endpoint-123' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      const errorResult = result.results[0] as ErrorResult;
      expect(errorResult.type).toBe(ToolResultType.error);
      expect(errorResult.data.message).toContain('Endpoint not found');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('handles service initialization errors', async () => {
      mockEndpointAppContextService.getInternalResponseActionsClient.mockImplementation(() => {
        throw new Error('Service not started');
      });

      const tool = getTool();
      const result = (await tool.handler(
        { action: 'isolate', endpoint_id: 'endpoint-123' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      const errorResult = result.results[0] as ErrorResult;
      expect(errorResult.type).toBe(ToolResultType.error);
      expect(errorResult.data.message).toContain('Service not started');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
