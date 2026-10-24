/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
import { UNISOLATE_TOOL_ID } from '../..';
import { unisolateHostTool } from '.';

jest.mock('../../../../../endpoint/services/actions', () => {
  const original = jest.requireActual('../../../../../endpoint/services/actions');
  return { ...original, getActionDetailsById: jest.fn() };
});

const mockGetActionDetailsById = getActionDetailsById as jest.Mock;

const mockLogger = { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() };

// Tool-call state as the runner scopes it (`run_tool.ts`): the confirmation card
// records the target the analyst was shown here, and the handler reads it back
// once the call is confirmed.
const toolCallState: { value?: unknown } = { value: undefined };
const mockContext = {
  callContext: { callSource: 'agent' },
  logger: mockLogger,
  stateManager: {
    getState: () => toolCallState.value,
    setState: (state: unknown) => {
      toolCallState.value = state;
    },
  },
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

// The runner builds the confirmation card and then runs the handler with the
// same tool-call state; dispatching tests replay both phases so the handler sees
// the target the analyst was shown.
async function confirmThenHandle(
  tool: ReturnType<typeof unisolateHostTool>,
  toolParams: Record<string, unknown>
) {
  const getConfirmation = tool.confirmation?.getConfirmation;
  if (!getConfirmation) {
    throw new Error(`${tool.id} has no confirmation to build`);
  }

  const card = await getConfirmation({ toolParams, context: mockContext });
  const result = await tool.handler(toolParams, mockContext);

  return { card, result };
}

describe('unisolateHostTool', () => {
  // waitForActionCompletion mocks resolve on the first poll attempt, but the
  // extra promise hop through p-retry has been observed to push these tests
  // past Jest's default 5s budget under heavy CI parallelism (500+ concurrent
  // jobs). Raise the per-suite timeout rather than masking a real regression.
  jest.setTimeout(20000);

  let mockEndpointAppContextService: EndpointAppContextService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetActionDetailsById.mockImplementation((_service, _spaceId, actionId) =>
      Promise.resolve({
        id: actionId,
        status: 'accepted',
        wasSuccessful: true,
        isCompleted: true,
        hosts: {},
      })
    );
    toolCallState.value = undefined;
    mockEndpointAppContextService = createMockEndpointAppContext().service;
    // Hostname resolution also reads the Defend metadata index on origin, so
    // tests that only stub Fleet get an empty metadata index by default.
    jest
      .spyOn(mockEndpointAppContextService, 'getEndpointMetadataService')
      .mockImplementation((() => ({
        getHostMetadataList: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      })) as unknown as EndpointAppContextService['getEndpointMetadataService']);
  });

  describe('tool definition', () => {
    it('returns a valid builtin tool definition', () => {
      const tool = unisolateHostTool(mockEndpointAppContextService);
      expect(tool.type).toBe(ToolType.builtin);
      expect(tool.id).toBe(UNISOLATE_TOOL_ID);
      expect(tool.description).toContain('Un-isolates a host');
      expect(tool.schema).toBeDefined();
    });

    it('has correct tool id format', () => {
      expect(UNISOLATE_TOOL_ID).toBe('endpoint-response-actions.unisolate_host');
    });
  });

  describe('confirmation policy', () => {
    it('gates every dispatch with an always-on confirmation prompt', async () => {
      const tool = unisolateHostTool(mockEndpointAppContextService);
      expect(tool.confirmation?.askUser).toBe('always');
      mockEndpointAppContextService.getInternalFleetServices = jest.fn(() => ({
        agent: {
          listAgents: jest.fn().mockResolvedValue({
            agents: [{ id: 'agent-123', status: 'online', packages: ['endpoint'] }],
          }),
        },
        ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
      })) as unknown as EndpointAppContextService['getInternalFleetServices'];
      const prompt = await tool.confirmation?.getConfirmation?.({
        toolParams: { hostName: 'my-host' },
        context: mockContext,
      });
      expect(prompt?.color).toBe('warning');
      expect(prompt?.message).toContain('my-host');
      expect(prompt?.message).toContain('agent-123');
    });
  });

  describe('handler', () => {
    let tool: ReturnType<typeof unisolateHostTool>;

    beforeEach(() => {
      tool = unisolateHostTool(mockEndpointAppContextService);
    });

    it('returns insufficient_privileges and does not dispatch when caller lacks canUnIsolateHost', async () => {
      mockEndpointAppContextService.getEndpointAuthz = jest
        .fn()
        .mockResolvedValue(getEndpointAuthzInitialStateMock({ canUnIsolateHost: false }));

      const mockResponseActionsClient = { release: jest.fn() };
      mockEndpointAppContextService.getInternalResponseActionsClient = jest.fn(
        () => mockResponseActionsClient
      ) as unknown as EndpointAppContextService['getInternalResponseActionsClient'];

      const result = await tool.handler({ hostName: 'my-host' }, mockContext);

      const results = assertStandardReturn(result);
      expect(results[0].type).toBe(ToolResultType.error);
      const data = results[0].data as Record<string, unknown>;
      expect(data.error).toBe('insufficient_privileges');
      expect(data.privilege).toBe('canUnIsolateHost');
      expect(mockResponseActionsClient.release).not.toHaveBeenCalled();
    });

    it('returns found: false with reason endpoint_not_found when no agent matches', async () => {
      const mockAgentService = {
        listAgents: jest.fn().mockResolvedValue({ agents: [] }),
      };

      mockEndpointAppContextService.getInternalFleetServices = jest.fn(() => ({
        agent: mockAgentService,
        ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
      })) as unknown as EndpointAppContextService['getInternalFleetServices'];

      const result = await tool.handler({ hostName: 'nonexistent-host' }, mockContext);

      expect(assertStandardReturn(result)).toHaveLength(1);
      expect(assertStandardReturn(result)[0].type).toBe(ToolResultType.other);
      const data = assertStandardReturn(result)[0].data as Record<string, unknown>;
      expect(data.found).toBe(false);
      expect(data.reason).toBe('endpoint_not_found');
      expect(data.hostName).toBe('nonexistent-host');
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('returns ambiguous_hostname with candidates and never dispatches when several endpoints share the hostname', async () => {
      const mockAgentService = {
        listAgents: jest.fn().mockResolvedValue({
          agents: [
            { id: 'live-a', status: 'online', packages: ['endpoint'] },
            { id: 'live-b', status: 'online', packages: ['endpoint'] },
          ],
        }),
      };
      const mockResponseActionsClient = { release: jest.fn() };
      mockEndpointAppContextService.getInternalFleetServices = jest.fn(() => ({
        agent: mockAgentService,
        ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
      })) as unknown as EndpointAppContextService['getInternalFleetServices'];
      mockEndpointAppContextService.getInternalResponseActionsClient = jest.fn(
        () => mockResponseActionsClient
      ) as unknown as EndpointAppContextService['getInternalResponseActionsClient'];

      const result = await tool.handler({ hostName: 'dup-host' }, mockContext);

      const results = assertStandardReturn(result);
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe(ToolResultType.other);
      const data = results[0].data as Record<string, unknown>;
      expect(data.found).toBe(false);
      expect(data.reason).toBe('ambiguous_hostname');
      expect(data.hostName).toBe('dup-host');
      expect(data.candidates).toEqual([
        { agentId: 'live-a', status: 'healthy' },
        { agentId: 'live-b', status: 'healthy' },
      ]);
      expect(mockResponseActionsClient.release).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('calls agentService.list with the correct kuery filter', async () => {
      const mockAgentService = {
        listAgents: jest.fn().mockResolvedValue({ agents: [] }),
      };

      mockEndpointAppContextService.getInternalFleetServices = jest.fn(() => ({
        agent: mockAgentService,
        ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
      })) as unknown as EndpointAppContextService['getInternalFleetServices'];

      await confirmThenHandle(tool, { hostName: 'my-host', comment: 'test comment' });

      expect(mockAgentService.listAgents).toHaveBeenCalledWith({
        showInactive: true,
        kuery: 'local_metadata.host.name.keyword: "my-host"',
        page: 1,
        perPage: 25,
      });
    });

    it('calls responseActionsClient.release with endpoint_ids and comment when agent found', async () => {
      const mockAgentService = {
        listAgents: jest.fn().mockResolvedValue({
          agents: [{ id: 'agent-123', packages: ['endpoint'] }],
        }),
      };

      const mockResponseActionsClient = {
        isolate: jest.fn().mockReturnValue(Promise.resolve()),
        release: jest.fn().mockResolvedValue({
          id: 'action-456',
          status: 'accepted',
          wasSuccessful: true,
          hosts: { 'agent-123': { name: 'my-host' } },
        }),
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

      mockEndpointAppContextService.getInternalFleetServices = jest.fn(() => ({
        agent: mockAgentService,
        ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
      })) as unknown as EndpointAppContextService['getInternalFleetServices'];
      mockEndpointAppContextService.getInternalResponseActionsClient = jest.fn(
        () => mockResponseActionsClient
      ) as unknown as EndpointAppContextService['getInternalResponseActionsClient'];

      const { result } = await confirmThenHandle(tool, {
        hostName: 'my-host',
        comment: 'reconnecting',
      });

      expect(mockResponseActionsClient.release).toHaveBeenCalledWith(
        {
          endpoint_ids: ['agent-123'],
          comment: 'reconnecting [AI agent conversation: conv-test-1]',
        },
        { hosts: { 'agent-123': { name: 'my-host' } } }
      );

      // Ensure isolate was NOT called — unisolate tool calls release, not isolate
      expect(mockResponseActionsClient.isolate).not.toHaveBeenCalled();

      expect(assertStandardReturn(result)).toHaveLength(1);
      expect(assertStandardReturn(result)[0].type).toBe(ToolResultType.other);
      const data = assertStandardReturn(result)[0].data as Record<string, unknown>;
      expect(data.actionId).toBe('action-456');
      expect(data.status).toBe('accepted');
      expect(data.wasSuccessful).toBe(true);
      expect(data.comment).toBe('reconnecting');
    });

    it('returns a successful no-op when the endpoint is already released', async () => {
      const mockAgentService = {
        listAgents: jest.fn().mockResolvedValue({
          agents: [{ id: 'agent-123', packages: ['endpoint'], status: 'online' }],
        }),
      };
      const release = jest.fn();

      mockEndpointAppContextService.getInternalFleetServices = jest.fn(() => ({
        agent: mockAgentService,
        ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
      })) as unknown as EndpointAppContextService['getInternalFleetServices'];
      jest
        .spyOn(mockEndpointAppContextService, 'getEndpointMetadataService')
        .mockImplementation((() => ({
          getHostMetadataList: jest.fn().mockResolvedValue({
            data: [
              {
                metadata: {
                  agent: { id: 'agent-123' },
                  elastic: { agent: { id: 'agent-123' } },
                  Endpoint: { state: { isolation: false } },
                },
                host_status: 'healthy',
              },
            ],
            total: 1,
          }),
        })) as unknown as EndpointAppContextService['getEndpointMetadataService']);
      mockEndpointAppContextService.getInternalResponseActionsClient = jest.fn(
        () => ({ release } as never)
      ) as unknown as EndpointAppContextService['getInternalResponseActionsClient'];

      const { result } = await confirmThenHandle(tool, { hostName: 'my-host' });
      const data = assertStandardReturn(result)[0].data as Record<string, unknown>;

      expect(data).toMatchObject({
        action: 'unisolate',
        status: 'completed',
        wasSuccessful: true,
        noOp: true,
        isolated: false,
      });
      expect(release).not.toHaveBeenCalled();
      expect(mockEndpointAppContextService.getInternalResponseActionsClient).not.toHaveBeenCalled();
    });

    it('queues an offline endpoint without polling for completion', async () => {
      const mockAgentService = {
        listAgents: jest.fn().mockResolvedValue({
          agents: [{ id: 'agent-offline', packages: ['endpoint'], status: 'offline' }],
        }),
      };
      const release = jest.fn().mockResolvedValue({
        id: 'action-offline',
        status: 'pending',
        wasSuccessful: false,
        hosts: { 'agent-offline': { name: 'offline-host' } },
      });

      mockEndpointAppContextService.getInternalFleetServices = jest.fn(() => ({
        agent: mockAgentService,
        ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
      })) as unknown as EndpointAppContextService['getInternalFleetServices'];
      mockEndpointAppContextService.getInternalResponseActionsClient = jest.fn(
        () => ({ release } as never)
      ) as unknown as EndpointAppContextService['getInternalResponseActionsClient'];

      const { result } = await confirmThenHandle(tool, { hostName: 'offline-host' });
      const data = assertStandardReturn(result)[0].data as Record<string, unknown>;

      expect(release).toHaveBeenCalledTimes(1);
      expect(data).toMatchObject({
        actionId: 'action-offline',
        status: 'pending',
        queued: true,
        message: 'The action is queued and will execute when the endpoint reconnects.',
      });
      expect(mockGetActionDetailsById).not.toHaveBeenCalled();
    });

    it('uses a default comment when none is provided', async () => {
      const mockAgentService = {
        listAgents: jest.fn().mockResolvedValue({
          agents: [{ id: 'agent-123', packages: ['endpoint'] }],
        }),
      };

      const mockResponseActionsClient = {
        isolate: jest.fn().mockReturnValue(Promise.resolve()),
        release: jest.fn().mockResolvedValue({
          id: 'action-789',
          status: 'accepted',
          wasSuccessful: true,
          hosts: { 'agent-123': { name: 'test-host' } },
        }),
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

      mockEndpointAppContextService.getInternalFleetServices = jest.fn(() => ({
        agent: mockAgentService,
        ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
      })) as unknown as EndpointAppContextService['getInternalFleetServices'];
      mockEndpointAppContextService.getInternalResponseActionsClient = jest.fn(
        () => mockResponseActionsClient
      ) as unknown as EndpointAppContextService['getInternalResponseActionsClient'];

      await confirmThenHandle(tool, { hostName: 'test-host' });

      expect(mockResponseActionsClient.release).toHaveBeenCalledWith(
        {
          endpoint_ids: ['agent-123'],
          comment: 'Un-isolated via AI agent: test-host [AI agent conversation: conv-test-1]',
        },
        { hosts: { 'agent-123': { name: 'test-host' } } }
      );
    });

    it.each(['sentinel_one', 'crowdstrike', 'microsoft_defender_endpoint'])(
      'does not dispatch to a non-Elastic-Defend %s agent: its Fleet id is the collector, not the EDR agent id',
      async (integration) => {
        const mockAgentService = {
          listAgents: jest
            .fn()
            .mockResolvedValue({ agents: [{ id: 'agent-edr-1', packages: [integration] }] }),
        };
        const mockResponseActionsClient = { release: jest.fn() };
        mockEndpointAppContextService.getInternalFleetServices = jest.fn(() => ({
          agent: mockAgentService,
          ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
        })) as unknown as EndpointAppContextService['getInternalFleetServices'];
        mockEndpointAppContextService.getInternalResponseActionsClient = jest.fn(
          () => mockResponseActionsClient
        ) as unknown as EndpointAppContextService['getInternalResponseActionsClient'];

        const edrTool = unisolateHostTool(mockEndpointAppContextService);
        const result = assertStandardReturn(
          await edrTool.handler({ hostName: 'edr-host' }, mockContext)
        );

        expect(result[0].data).toMatchObject({
          found: false,
          reason: 'endpoint_not_found',
          hostName: 'edr-host',
        });
        expect(mockResponseActionsClient.release).not.toHaveBeenCalled();
        expect(
          mockEndpointAppContextService.getInternalResponseActionsClient
        ).not.toHaveBeenCalled();
      }
    );

    it('returns an error result when the agent service throws', async () => {
      const mockAgentService = {
        listAgents: jest.fn().mockRejectedValue(new Error('fleet service unavailable')),
      };

      mockEndpointAppContextService.getInternalFleetServices = jest.fn(() => ({
        agent: mockAgentService,
        ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
      })) as unknown as EndpointAppContextService['getInternalFleetServices'];

      const result = await tool.handler({ hostName: 'my-host' }, mockContext);

      expect(assertStandardReturn(result)).toHaveLength(1);
      expect(assertStandardReturn(result)[0].type).toBe(ToolResultType.error);
      expect(assertStandardReturn(result)[0].data).toHaveProperty('message');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('returns an error result when the response actions client throws', async () => {
      const mockAgentService = {
        listAgents: jest.fn().mockResolvedValue({
          agents: [{ id: 'agent-123', packages: ['endpoint'] }],
        }),
      };

      const mockResponseActionsClient = {
        isolate: jest.fn().mockReturnValue(Promise.resolve()),
        release: jest.fn().mockRejectedValue(new Error('release failed')),
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

      mockEndpointAppContextService.getInternalFleetServices = jest.fn(() => ({
        agent: mockAgentService,
        ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
      })) as unknown as EndpointAppContextService['getInternalFleetServices'];
      mockEndpointAppContextService.getInternalResponseActionsClient = jest.fn(
        () => mockResponseActionsClient
      ) as unknown as EndpointAppContextService['getInternalResponseActionsClient'];

      const { result } = await confirmThenHandle(tool, { hostName: 'my-host' });

      expect(assertStandardReturn(result)).toHaveLength(1);
      expect(assertStandardReturn(result)[0].type).toBe(ToolResultType.error);
      expect((assertStandardReturn(result)[0].data as Record<string, unknown>).message).toContain(
        'Error un-isolating host'
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
