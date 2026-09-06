/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable require-atomic-updates */
import {
  isToolHandlerStandardReturn,
  type ToolHandlerContext,
  type ToolHandlerReturn,
  type ToolHandlerStandardReturn,
} from '@kbn/agent-builder-server/tools';
import { ToolResultType, ToolType } from '@kbn/agent-builder-common';

import { getEndpointAuthzInitialStateMock } from '../../../../../../common/endpoint/service/authz/mocks';
import type { EndpointAppContextService } from '../../../../../endpoint/endpoint_app_context_services';
import { createMockEndpointAppContext } from '../../../../../endpoint/mocks';
import { getActionDetailsById } from '../../../../../endpoint/services/actions';
import { ISOLATE_TOOL_ID } from '../..';
import { isolateHostTool } from '.';

jest.mock('../../../../../endpoint/services/actions', () => {
  const original = jest.requireActual('../../../../../endpoint/services/actions');
  return {
    ...original,
    getActionDetailsById: jest.fn(),
  };
});

const mockGetActionDetailsById = getActionDetailsById as jest.Mock;

// waitForActionCompletion polls getActionDetailsById; tests below mock it to
// resolve as already-completed (isCompleted: true) so the poll returns on the
// first attempt instead of retrying for real and timing out the test.
function mockActionCompletion(actionDetails: Record<string, unknown>) {
  mockGetActionDetailsById.mockResolvedValue({ ...actionDetails, isCompleted: true });
}

const mockLogger = { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() };
const mockContext = {
  logger: mockLogger,
  runContext: {
    runId: 'run-test-1',
    stack: [{ type: 'agent', agentId: 'test-agent', conversationId: 'conv-test-1' }],
  },
} as unknown as ToolHandlerContext;

function assertStandardReturn(result: unknown) {
  if (!isToolHandlerStandardReturn(result as ToolHandlerReturn)) {
    throw new Error('Expected standard tool return');
  }
  return (result as ToolHandlerStandardReturn).results;
}

describe('isolateHostTool', () => {
  // waitForActionCompletion mocks resolve on the first poll attempt, but the
  // extra promise hop through p-retry has been observed to push these tests
  // past Jest's default 5s budget under heavy CI parallelism (500+ concurrent
  // jobs). Raise the per-suite timeout rather than masking a real regression.
  jest.setTimeout(20000);

  let mockEndpointAppContextService: EndpointAppContextService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockEndpointAppContextService = createMockEndpointAppContext().service;
  });

  describe('tool definition', () => {
    it('returns a valid builtin tool definition', () => {
      const tool = isolateHostTool(mockEndpointAppContextService);
      expect(tool.type).toBe(ToolType.builtin);
      expect(tool.id).toBe(ISOLATE_TOOL_ID);
      expect(tool.description).toContain('Isolates a host');
      expect(tool.schema).toBeDefined();
    });

    it('has correct tool id format', () => {
      expect(ISOLATE_TOOL_ID).toBe('endpoint-response-actions.isolate_host');
    });
  });

  describe('confirmation policy', () => {
    it('gates every dispatch with an always-on danger confirmation prompt', async () => {
      const tool = isolateHostTool(mockEndpointAppContextService);
      expect(tool.confirmation?.askUser).toBe('always');
      const prompt = await tool.confirmation?.getConfirmation?.({
        toolParams: { hostName: 'my-host' },
      });
      expect(prompt?.color).toBe('danger');
      expect(prompt?.message).toContain('my-host');
    });
  });

  describe('handler', () => {
    let tool: ReturnType<typeof isolateHostTool>;

    beforeEach(() => {
      tool = isolateHostTool(mockEndpointAppContextService);
    });

    it('returns insufficient_privileges and does not dispatch when caller lacks canIsolateHost', async () => {
      mockEndpointAppContextService.getEndpointAuthz = jest
        .fn()
        .mockResolvedValue(getEndpointAuthzInitialStateMock({ canIsolateHost: false }));

      const mockResponseActionsClient = { isolate: jest.fn() };
      mockEndpointAppContextService.getInternalResponseActionsClient = jest.fn(
        () => mockResponseActionsClient
      ) as unknown as EndpointAppContextService['getInternalResponseActionsClient'];

      const result = await tool.handler({ hostName: 'my-host' }, mockContext);

      const results = assertStandardReturn(result);
      expect(results[0].type).toBe(ToolResultType.error);
      const data = results[0].data as Record<string, unknown>;
      expect(data.error).toBe('insufficient_privileges');
      expect(data.privilege).toBe('canIsolateHost');
      expect(mockResponseActionsClient.isolate).not.toHaveBeenCalled();
    });

    it('returns found: false with reason endpoint_not_found when no agent matches', async () => {
      const mockAgentService = {
        listAgents: jest.fn().mockResolvedValue({ agents: [] }),
      };

      const originalGetInternalFleetServices =
        mockEndpointAppContextService.getInternalFleetServices;
      mockEndpointAppContextService.getInternalFleetServices = jest.fn(() => ({
        agent: mockAgentService,
        ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
      })) as unknown as EndpointAppContextService['getInternalFleetServices'];

      try {
        const result = await tool.handler({ hostName: 'nonexistent-host' }, mockContext);

        expect(assertStandardReturn(result)).toHaveLength(1);
        expect(assertStandardReturn(result)[0].type).toBe(ToolResultType.other);
        const data = assertStandardReturn(result)[0].data as Record<string, unknown>;
        expect(data.found).toBe(false);
        expect(data.reason).toBe('endpoint_not_found');
        expect(data.hostName).toBe('nonexistent-host');
        expect(mockLogger.error).not.toHaveBeenCalled();
      } finally {
        mockEndpointAppContextService.getInternalFleetServices = originalGetInternalFleetServices;
      }
    });

    it('calls agentService.list with the correct kuery filter', async () => {
      const mockAgentService = {
        listAgents: jest.fn().mockResolvedValue({ agents: [] }),
      };

      const originalGetInternalFleetServices =
        mockEndpointAppContextService.getInternalFleetServices;
      mockEndpointAppContextService.getInternalFleetServices = jest.fn(() => ({
        agent: mockAgentService,
        ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
      })) as unknown as EndpointAppContextService['getInternalFleetServices'];

      try {
        await tool.handler({ hostName: 'my-host', comment: 'test comment' }, mockContext);

        expect(mockAgentService.listAgents).toHaveBeenCalledWith({
          showInactive: true,
          kuery: 'local_metadata.host.name: my-host',
          page: 1,
          perPage: 10,
        });
      } finally {
        mockEndpointAppContextService.getInternalFleetServices = originalGetInternalFleetServices;
      }
    });

    it('calls responseActionsClient.isolate with endpoint_ids and comment when agent found', async () => {
      const mockAgentService = {
        listAgents: jest.fn().mockResolvedValue({
          agents: [{ id: 'agent-123' }],
        }),
      };

      const mockResponseActionsClient = {
        isolate: jest.fn().mockResolvedValue({
          id: 'action-456',
          status: 'accepted',
          wasSuccessful: true,
          hosts: { 'agent-123': { name: 'my-host' } },
        }),
        release: jest.fn().mockReturnValue(Promise.resolve()),
        suspendProcess: jest.fn().mockReturnValue(Promise.resolve()),
        upload: jest.fn().mockReturnValue(Promise.resolve()),
        getFile: jest.fn().mockReturnValue(Promise.resolve()),
        execute: jest.fn().mockReturnValue(Promise.resolve()),
        killProcess: jest.fn().mockReturnValue(Promise.resolve()),
        runningProcesses: jest.fn().mockReturnValue(Promise.resolve()),
        processPendingActions: jest.fn().mockReturnValue(Promise.resolve()),
        getFileInfo: jest.fn().mockReturnValue(Promise.resolve()),
        getFileDownload: jest.fn().mockReturnValue(Promise.resolve()),
        scan: jest.fn().mockReturnValue(Promise.resolve()),
        runscript: jest.fn().mockReturnValue(Promise.resolve()),
        getCustomScripts: jest.fn().mockReturnValue(Promise.resolve()),
        cancel: jest.fn().mockReturnValue(Promise.resolve()),
        memoryDump: jest.fn().mockReturnValue(Promise.resolve()),
      };

      const originalGetInternalFleetServices =
        mockEndpointAppContextService.getInternalFleetServices;
      const originalGetInternalResponseActionsClient =
        mockEndpointAppContextService.getInternalResponseActionsClient;

      mockEndpointAppContextService.getInternalFleetServices = jest.fn(() => ({
        agent: mockAgentService,
        ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
      })) as unknown as EndpointAppContextService['getInternalFleetServices'];
      mockEndpointAppContextService.getInternalResponseActionsClient = jest.fn(
        () => mockResponseActionsClient
      ) as unknown as EndpointAppContextService['getInternalResponseActionsClient'];
      mockActionCompletion({
        id: 'action-456',
        status: 'accepted',
        wasSuccessful: true,
        hosts: { 'agent-123': { name: 'my-host' } },
      });

      try {
        const result = await tool.handler(
          { hostName: 'my-host', comment: 'malware detected' },
          mockContext
        );

        expect(mockResponseActionsClient.isolate).toHaveBeenCalledWith(
          {
            endpoint_ids: ['agent-123'],
            comment: 'malware detected [AI agent conversation: conv-test-1]',
          },
          { hosts: { 'agent-123': { name: 'my-host' } } }
        );

        expect(assertStandardReturn(result)).toHaveLength(1);
        expect(assertStandardReturn(result)[0].type).toBe(ToolResultType.other);
        const data = assertStandardReturn(result)[0].data as Record<string, unknown>;
        expect(data.actionId).toBe('action-456');
        expect(data.status).toBe('accepted');
        expect(data.wasSuccessful).toBe(true);
        expect(data.comment).toBe('malware detected');
      } finally {
        mockEndpointAppContextService.getInternalFleetServices = originalGetInternalFleetServices;
        mockEndpointAppContextService.getInternalResponseActionsClient =
          originalGetInternalResponseActionsClient;
      }
    });

    it('uses a default comment when none is provided', async () => {
      const mockAgentService = {
        listAgents: jest.fn().mockResolvedValue({
          agents: [{ id: 'agent-123' }],
        }),
      };

      const mockResponseActionsClient = {
        isolate: jest.fn().mockResolvedValue({
          id: 'action-789',
          status: 'accepted',
          wasSuccessful: true,
          hosts: { 'agent-123': { name: 'test-host' } },
        }),
        release: jest.fn().mockReturnValue(Promise.resolve()),
        suspendProcess: jest.fn().mockReturnValue(Promise.resolve()),
        upload: jest.fn().mockReturnValue(Promise.resolve()),
        getFile: jest.fn().mockReturnValue(Promise.resolve()),
        execute: jest.fn().mockReturnValue(Promise.resolve()),
        killProcess: jest.fn().mockReturnValue(Promise.resolve()),
        runningProcesses: jest.fn().mockReturnValue(Promise.resolve()),
        processPendingActions: jest.fn().mockReturnValue(Promise.resolve()),
        getFileInfo: jest.fn().mockReturnValue(Promise.resolve()),
        getFileDownload: jest.fn().mockReturnValue(Promise.resolve()),
        scan: jest.fn().mockReturnValue(Promise.resolve()),
        runscript: jest.fn().mockReturnValue(Promise.resolve()),
        getCustomScripts: jest.fn().mockReturnValue(Promise.resolve()),
        cancel: jest.fn().mockReturnValue(Promise.resolve()),
        memoryDump: jest.fn().mockReturnValue(Promise.resolve()),
      };

      const originalGetInternalFleetServices =
        mockEndpointAppContextService.getInternalFleetServices;
      const originalGetInternalResponseActionsClient =
        mockEndpointAppContextService.getInternalResponseActionsClient;

      mockEndpointAppContextService.getInternalFleetServices = jest.fn(() => ({
        agent: mockAgentService,
        ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
      })) as unknown as EndpointAppContextService['getInternalFleetServices'];
      mockEndpointAppContextService.getInternalResponseActionsClient = jest.fn(
        () => mockResponseActionsClient
      ) as unknown as EndpointAppContextService['getInternalResponseActionsClient'];
      mockActionCompletion({
        id: 'action-789',
        status: 'accepted',
        wasSuccessful: true,
        hosts: { 'agent-123': { name: 'test-host' } },
      });

      try {
        await tool.handler({ hostName: 'test-host' }, mockContext);

        expect(mockResponseActionsClient.isolate).toHaveBeenCalledWith(
          {
            endpoint_ids: ['agent-123'],
            comment: 'Isolated via AI agent: test-host [AI agent conversation: conv-test-1]',
          },
          { hosts: { 'agent-123': { name: 'test-host' } } }
        );
      } finally {
        mockEndpointAppContextService.getInternalFleetServices = originalGetInternalFleetServices;
        mockEndpointAppContextService.getInternalResponseActionsClient =
          originalGetInternalResponseActionsClient;
      }
    });

    it('resolves agentType from the agent packages for a non-Elastic-Defend host (multi-vendor)', async () => {
      const mockAgentService = {
        listAgents: jest.fn().mockResolvedValue({
          agents: [{ id: 'agent-s1-1', packages: ['sentinel_one'] }],
        }),
      };

      const mockResponseActionsClient = {
        isolate: jest.fn().mockResolvedValue({
          id: 'action-s1-1',
          status: 'accepted',
          wasSuccessful: true,
          hosts: { 'agent-s1-1': { name: 's1-host' } },
        }),
        release: jest.fn().mockReturnValue(Promise.resolve()),
        suspendProcess: jest.fn().mockReturnValue(Promise.resolve()),
        upload: jest.fn().mockReturnValue(Promise.resolve()),
        getFile: jest.fn().mockReturnValue(Promise.resolve()),
        execute: jest.fn().mockReturnValue(Promise.resolve()),
        killProcess: jest.fn().mockReturnValue(Promise.resolve()),
        runningProcesses: jest.fn().mockReturnValue(Promise.resolve()),
        processPendingActions: jest.fn().mockReturnValue(Promise.resolve()),
        getFileInfo: jest.fn().mockReturnValue(Promise.resolve()),
        getFileDownload: jest.fn().mockReturnValue(Promise.resolve()),
        scan: jest.fn().mockReturnValue(Promise.resolve()),
        runscript: jest.fn().mockReturnValue(Promise.resolve()),
        getCustomScripts: jest.fn().mockReturnValue(Promise.resolve()),
        cancel: jest.fn().mockReturnValue(Promise.resolve()),
        memoryDump: jest.fn().mockReturnValue(Promise.resolve()),
      };

      const originalGetInternalFleetServices =
        mockEndpointAppContextService.getInternalFleetServices;
      const originalGetInternalResponseActionsClient =
        mockEndpointAppContextService.getInternalResponseActionsClient;

      mockEndpointAppContextService.getInternalFleetServices = jest.fn(() => ({
        agent: mockAgentService,
        ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
      })) as unknown as EndpointAppContextService['getInternalFleetServices'];
      mockEndpointAppContextService.getInternalResponseActionsClient = jest.fn(
        () => mockResponseActionsClient
      ) as unknown as EndpointAppContextService['getInternalResponseActionsClient'];
      mockActionCompletion({
        id: 'action-s1-1',
        status: 'accepted',
        wasSuccessful: true,
        hosts: { 'agent-s1-1': { name: 's1-host' } },
      });

      try {
        await tool.handler({ hostName: 's1-host' }, mockContext);

        expect(mockEndpointAppContextService.getInternalResponseActionsClient).toHaveBeenCalledWith(
          expect.objectContaining({ agentType: 'sentinel_one', isAutomated: false })
        );
        expect(mockResponseActionsClient.isolate).toHaveBeenCalledWith(
          expect.objectContaining({ endpoint_ids: ['agent-s1-1'] }),
          expect.anything()
        );
      } finally {
        mockEndpointAppContextService.getInternalFleetServices = originalGetInternalFleetServices;
        mockEndpointAppContextService.getInternalResponseActionsClient =
          originalGetInternalResponseActionsClient;
      }
    });

    it('defaults agentType to endpoint when the agent has no recognized package', async () => {
      const mockAgentService = {
        listAgents: jest.fn().mockResolvedValue({
          agents: [{ id: 'agent-123' }],
        }),
      };

      const mockResponseActionsClient = {
        isolate: jest.fn().mockResolvedValue({
          id: 'action-456',
          status: 'accepted',
          wasSuccessful: true,
          hosts: { 'agent-123': { name: 'my-host' } },
        }),
        release: jest.fn().mockReturnValue(Promise.resolve()),
        suspendProcess: jest.fn().mockReturnValue(Promise.resolve()),
        upload: jest.fn().mockReturnValue(Promise.resolve()),
        getFile: jest.fn().mockReturnValue(Promise.resolve()),
        execute: jest.fn().mockReturnValue(Promise.resolve()),
        killProcess: jest.fn().mockReturnValue(Promise.resolve()),
        runningProcesses: jest.fn().mockReturnValue(Promise.resolve()),
        processPendingActions: jest.fn().mockReturnValue(Promise.resolve()),
        getFileInfo: jest.fn().mockReturnValue(Promise.resolve()),
        getFileDownload: jest.fn().mockReturnValue(Promise.resolve()),
        scan: jest.fn().mockReturnValue(Promise.resolve()),
        runscript: jest.fn().mockReturnValue(Promise.resolve()),
        getCustomScripts: jest.fn().mockReturnValue(Promise.resolve()),
        cancel: jest.fn().mockReturnValue(Promise.resolve()),
        memoryDump: jest.fn().mockReturnValue(Promise.resolve()),
      };

      const originalGetInternalFleetServices =
        mockEndpointAppContextService.getInternalFleetServices;
      const originalGetInternalResponseActionsClient =
        mockEndpointAppContextService.getInternalResponseActionsClient;

      mockEndpointAppContextService.getInternalFleetServices = jest.fn(() => ({
        agent: mockAgentService,
        ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
      })) as unknown as EndpointAppContextService['getInternalFleetServices'];
      mockEndpointAppContextService.getInternalResponseActionsClient = jest.fn(
        () => mockResponseActionsClient
      ) as unknown as EndpointAppContextService['getInternalResponseActionsClient'];
      mockActionCompletion({
        id: 'action-456',
        status: 'accepted',
        wasSuccessful: true,
        hosts: { 'agent-123': { name: 'my-host' } },
      });

      try {
        await tool.handler({ hostName: 'my-host' }, mockContext);

        expect(mockEndpointAppContextService.getInternalResponseActionsClient).toHaveBeenCalledWith(
          expect.objectContaining({ agentType: 'endpoint', isAutomated: false })
        );
      } finally {
        mockEndpointAppContextService.getInternalFleetServices = originalGetInternalFleetServices;
        mockEndpointAppContextService.getInternalResponseActionsClient =
          originalGetInternalResponseActionsClient;
      }
    });

    it('returns an error result when the agent service throws', async () => {
      const mockAgentService = {
        listAgents: jest.fn().mockRejectedValue(new Error('fleet service unavailable')),
      };

      const originalGetInternalFleetServices =
        mockEndpointAppContextService.getInternalFleetServices;
      mockEndpointAppContextService.getInternalFleetServices = jest.fn(() => ({
        agent: mockAgentService,
        ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
      })) as unknown as EndpointAppContextService['getInternalFleetServices'];

      try {
        const result = await tool.handler({ hostName: 'my-host' }, mockContext);

        expect(assertStandardReturn(result)).toHaveLength(1);
        expect(assertStandardReturn(result)[0].type).toBe(ToolResultType.error);
        expect(assertStandardReturn(result)[0].data).toHaveProperty('message');
        expect(mockLogger.error).toHaveBeenCalled();
      } finally {
        mockEndpointAppContextService.getInternalFleetServices = originalGetInternalFleetServices;
      }
    });

    it('returns an error result when the response actions client throws', async () => {
      const mockAgentService = {
        listAgents: jest.fn().mockResolvedValue({
          agents: [{ id: 'agent-123' }],
        }),
      };

      const mockResponseActionsClient = {
        isolate: jest.fn().mockRejectedValue(new Error('isolation failed')),
        release: jest.fn().mockReturnValue(Promise.resolve()),
        suspendProcess: jest.fn().mockReturnValue(Promise.resolve()),
        upload: jest.fn().mockReturnValue(Promise.resolve()),
        getFile: jest.fn().mockReturnValue(Promise.resolve()),
        execute: jest.fn().mockReturnValue(Promise.resolve()),
        killProcess: jest.fn().mockReturnValue(Promise.resolve()),
        runningProcesses: jest.fn().mockReturnValue(Promise.resolve()),
        processPendingActions: jest.fn().mockReturnValue(Promise.resolve()),
        getFileInfo: jest.fn().mockReturnValue(Promise.resolve()),
        getFileDownload: jest.fn().mockReturnValue(Promise.resolve()),
        scan: jest.fn().mockReturnValue(Promise.resolve()),
        runscript: jest.fn().mockReturnValue(Promise.resolve()),
        getCustomScripts: jest.fn().mockReturnValue(Promise.resolve()),
        cancel: jest.fn().mockReturnValue(Promise.resolve()),
        memoryDump: jest.fn().mockReturnValue(Promise.resolve()),
      };

      const originalGetInternalFleetServices =
        mockEndpointAppContextService.getInternalFleetServices;
      const originalGetInternalResponseActionsClient =
        mockEndpointAppContextService.getInternalResponseActionsClient;

      mockEndpointAppContextService.getInternalFleetServices = jest.fn(() => ({
        agent: mockAgentService,
        ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
      })) as unknown as EndpointAppContextService['getInternalFleetServices'];
      mockEndpointAppContextService.getInternalResponseActionsClient = jest.fn(
        () => mockResponseActionsClient
      ) as unknown as EndpointAppContextService['getInternalResponseActionsClient'];

      try {
        const result = await tool.handler({ hostName: 'my-host' }, mockContext);

        expect(assertStandardReturn(result)).toHaveLength(1);
        expect(assertStandardReturn(result)[0].type).toBe(ToolResultType.error);
        expect((assertStandardReturn(result)[0].data as Record<string, unknown>).message).toContain(
          'Error isolating host'
        );
        expect(mockLogger.error).toHaveBeenCalled();
      } finally {
        mockEndpointAppContextService.getInternalFleetServices = originalGetInternalFleetServices;
        mockEndpointAppContextService.getInternalResponseActionsClient =
          originalGetInternalResponseActionsClient;
      }
    });
  });
});
