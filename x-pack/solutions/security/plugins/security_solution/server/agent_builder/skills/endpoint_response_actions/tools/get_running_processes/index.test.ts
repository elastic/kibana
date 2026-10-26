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
import { httpServerMock } from '@kbn/core-http-server-mocks';

import { getEndpointAuthzInitialStateMock } from '../../../../../../common/endpoint/service/authz/mocks';
import type { EndpointAppContextService } from '../../../../../endpoint/endpoint_app_context_services';
import { createMockEndpointAppContext } from '../../../../../endpoint/mocks';
import { getActionDetailsById } from '../../../../../endpoint/services/actions';
import { RUNNING_PROCESSES_TOOL_ID } from '../..';
import { getRunningProcessesTool } from '.';
import {
  MAX_OUTPUT_ENTRIES_PER_AGENT,
  MAX_OUTPUT_STRING_LENGTH,
  MAX_OUTPUT_TOTAL_CHARS,
  RUNNING_PROCESSES_MAX_RESULT_TOKENS,
  summarizeActionOutputs,
} from '../types';

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

// Tool-call state as the runner scopes it (`run_tool.ts`): the confirmation card
// records the target the analyst was shown here, and the handler reads it back
// once the call is confirmed.
const toolCallState: { value?: unknown } = { value: undefined };
const mockContext = {
  callContext: { callSource: 'agent' },
  logger: mockLogger,
  request: httpServerMock.createKibanaRequest(),
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
  tool: ReturnType<typeof getRunningProcessesTool>,
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

describe('getRunningProcessesTool', () => {
  // waitForActionCompletion mocks resolve on the first poll attempt, but the
  // extra promise hop through p-retry has been observed to push these tests
  // past Jest's default 5s budget under heavy CI parallelism (500+ concurrent
  // jobs). Raise the per-suite timeout rather than masking a real regression.
  jest.setTimeout(20000);

  let service: EndpointAppContextService;

  beforeEach(() => {
    jest.clearAllMocks();
    toolCallState.value = undefined;
    service = createMockEndpointAppContext().service;
    // Hostname resolution also reads the Defend metadata index on origin, so
    // tests that only stub Fleet get an empty metadata index by default.
    jest.spyOn(service, 'getEndpointMetadataService').mockImplementation((() => ({
      getHostMetadataList: jest.fn().mockResolvedValue({ data: [], total: 0 }),
    })) as unknown as EndpointAppContextService['getEndpointMetadataService']);
  });

  it('returns a valid builtin tool definition', () => {
    const tool = getRunningProcessesTool(service);
    expect(tool.type).toBe(ToolType.builtin);
    expect(tool.id).toBe(RUNNING_PROCESSES_TOOL_ID);
    expect(RUNNING_PROCESSES_TOOL_ID).toBe('endpoint-response-actions.get_running_processes');
    expect(tool.description).toContain('running processes');
  });

  it('gates every dispatch with an always-on confirmation prompt naming the host, without dispatching', async () => {
    const mockResponseActionsClient = { runningProcesses: jest.fn() };
    service.getInternalResponseActionsClient = jest.fn(
      () => mockResponseActionsClient
    ) as unknown as EndpointAppContextService['getInternalResponseActionsClient'];

    const tool = getRunningProcessesTool(service);
    expect(tool.confirmation?.askUser).toBe('always');
    const prompt = await tool.confirmation?.getConfirmation?.({
      toolParams: { hostName: 'my-host' },
      context: mockContext,
    });
    expect(prompt?.message).toContain('my-host');
    expect(mockResponseActionsClient.runningProcesses).not.toHaveBeenCalled();
  });

  it('returns insufficient_privileges and does not dispatch when caller lacks canGetRunningProcesses', async () => {
    service.getEndpointAuthz = jest
      .fn()
      .mockResolvedValue(getEndpointAuthzInitialStateMock({ canGetRunningProcesses: false }));

    const mockResponseActionsClient = { runningProcesses: jest.fn() };
    service.getInternalResponseActionsClient = jest.fn(
      () => mockResponseActionsClient
    ) as unknown as EndpointAppContextService['getInternalResponseActionsClient'];

    const tool = getRunningProcessesTool(service);
    const result = await tool.handler({ hostName: 'my-host' }, mockContext);

    const results = assertStandardReturn(result);
    expect(results[0].type).toBe(ToolResultType.error);
    const denialData = results[0].data as Record<string, unknown>;
    expect(denialData.error).toBe('insufficient_privileges');
    expect(denialData.privilege).toBe('canGetRunningProcesses');
    expect(mockResponseActionsClient.runningProcesses).not.toHaveBeenCalled();
  });

  it('returns found: false with reason endpoint_not_found when no agent matches', async () => {
    const mockAgentService = { listAgents: jest.fn().mockResolvedValue({ agents: [] }) };
    service.getInternalFleetServices = jest.fn(() => ({
      agent: mockAgentService,
      ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
    })) as unknown as EndpointAppContextService['getInternalFleetServices'];

    const tool = getRunningProcessesTool(service);
    const result = await tool.handler({ hostName: 'nonexistent-host' }, mockContext);

    expect(assertStandardReturn(result)[0].type).toBe(ToolResultType.other);
    const data = assertStandardReturn(result)[0].data as Record<string, unknown>;
    expect(data.found).toBe(false);
    expect(data.reason).toBe('endpoint_not_found');
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
    const mockResponseActionsClient = { runningProcesses: jest.fn() };
    service.getInternalFleetServices = jest.fn(() => ({
      agent: mockAgentService,
      ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
    })) as unknown as EndpointAppContextService['getInternalFleetServices'];
    service.getInternalResponseActionsClient = jest.fn(
      () => mockResponseActionsClient
    ) as unknown as EndpointAppContextService['getInternalResponseActionsClient'];
    const tool = getRunningProcessesTool(service);

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
    expect(mockResponseActionsClient.runningProcesses).not.toHaveBeenCalled();
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('calls responseActionsClient.runningProcesses when agent found', async () => {
    const mockAgentService = {
      listAgents: jest.fn().mockResolvedValue({
        agents: [{ id: 'agent-123', packages: ['endpoint'] }],
      }),
    };
    const mockResponseActionsClient = {
      runningProcesses: jest.fn().mockResolvedValue({
        id: 'action-999',
        status: 'pending',
        wasSuccessful: undefined,
        hosts: { 'agent-123': { name: 'my-host' } },
        outputs: {},
      }),
    };
    service.getInternalFleetServices = jest.fn(() => ({
      agent: mockAgentService,
      ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
    })) as unknown as EndpointAppContextService['getInternalFleetServices'];
    service.getInternalResponseActionsClient = jest.fn(
      () => mockResponseActionsClient
    ) as unknown as EndpointAppContextService['getInternalResponseActionsClient'];
    mockActionCompletion({
      id: 'action-999',
      status: 'successful',
      wasSuccessful: true,
      hosts: { 'agent-123': { name: 'my-host' } },
      outputs: {},
    });

    const tool = getRunningProcessesTool(service);
    const { result } = await confirmThenHandle(tool, { hostName: 'my-host' });

    expect(mockResponseActionsClient.runningProcesses).toHaveBeenCalledWith(
      {
        endpoint_ids: ['agent-123'],
        comment:
          'Running processes requested via AI agent: my-host [AI agent conversation: conv-test-1]',
      },
      { hosts: { 'agent-123': { name: 'my-host' } } }
    );
    // The action is attributed to the initiating analyst, not the system user.
    expect(service.getInternalResponseActionsClient).toHaveBeenCalledWith(
      expect.objectContaining({ request: expect.anything() })
    );
    const data = assertStandardReturn(result)[0].data as Record<string, unknown>;
    expect(data.found).toBe(true);
    expect(data.actionId).toBe('action-999');
  });

  it('bounds a large process list and declares a result budget (outputs are not forwarded raw)', async () => {
    const mockAgentService = {
      listAgents: jest.fn().mockResolvedValue({
        agents: [{ id: 'agent-123', packages: ['endpoint'] }],
      }),
    };
    service.getInternalFleetServices = jest.fn(() => ({
      agent: mockAgentService,
      ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
    })) as unknown as EndpointAppContextService['getInternalFleetServices'];
    service.getInternalResponseActionsClient = jest.fn(() => ({
      runningProcesses: jest.fn().mockResolvedValue({ id: 'action-big', status: 'pending' }),
    })) as unknown as EndpointAppContextService['getInternalResponseActionsClient'];

    const entryCount = MAX_OUTPUT_ENTRIES_PER_AGENT * 10;
    const hugeCommandLine = 'x'.repeat(MAX_OUTPUT_STRING_LENGTH * 5);
    const rawOutputs = {
      'agent-123': {
        type: 'json',
        content: {
          code: '0',
          entries: Array.from({ length: entryCount }, (_, i) => ({
            pid: i,
            command: hugeCommandLine,
          })),
        },
      },
    };
    mockActionCompletion({
      id: 'action-big',
      status: 'successful',
      wasSuccessful: true,
      hosts: { 'agent-123': { name: 'my-host' } },
      outputs: rawOutputs,
    });

    const tool = getRunningProcessesTool(service);
    const { result } = await confirmThenHandle(tool, { hostName: 'my-host' });
    const data = assertStandardReturn(result)[0].data as Record<string, unknown>;

    const serializedOutputs = JSON.stringify(data.outputs);
    // The raw payload is 200 entries x 10k chars; the bounded sample must be a
    // small fraction of it and stay within the documented total budget.
    expect(JSON.stringify(rawOutputs).length).toBeGreaterThan(1_000_000);
    expect(serializedOutputs.length).toBeLessThanOrEqual(MAX_OUTPUT_TOTAL_CHARS);
    expect(serializedOutputs).not.toContain(hugeCommandLine);
    // What was dropped is reported rather than silently lost.
    expect(serializedOutputs).toContain(String(entryCount));
    expect(data.outputs).toEqual(summarizeActionOutputs(rawOutputs));
    expect(data.totalHosts).toBe(1);

    // The tool declares a budget above the platform default so the structured
    // truncation counters are not replaced by a generic truncated preview.
    expect(tool.maxResultTokens).toBe(RUNNING_PROCESSES_MAX_RESULT_TOKENS);
    expect(RUNNING_PROCESSES_MAX_RESULT_TOKENS * 4).toBeGreaterThan(MAX_OUTPUT_TOTAL_CHARS);
  });

  it.each(['sentinel_one', 'crowdstrike', 'microsoft_defender_endpoint'])(
    'does not dispatch to a non-Elastic-Defend %s agent: its Fleet id is the collector, not the EDR agent id',
    async (integration) => {
      const mockAgentService = {
        listAgents: jest
          .fn()
          .mockResolvedValue({ agents: [{ id: 'agent-edr-1', packages: [integration] }] }),
      };
      const mockResponseActionsClient = { runningProcesses: jest.fn() };
      service.getInternalFleetServices = jest.fn(() => ({
        agent: mockAgentService,
        ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
      })) as unknown as EndpointAppContextService['getInternalFleetServices'];
      service.getInternalResponseActionsClient = jest.fn(
        () => mockResponseActionsClient
      ) as unknown as EndpointAppContextService['getInternalResponseActionsClient'];

      const tool = getRunningProcessesTool(service);
      const result = assertStandardReturn(
        await tool.handler({ hostName: 'edr-host' }, mockContext)
      );

      expect(result[0].data).toMatchObject({
        found: false,
        reason: 'endpoint_not_found',
        hostName: 'edr-host',
      });
      expect(mockResponseActionsClient.runningProcesses).not.toHaveBeenCalled();
      expect(service.getInternalResponseActionsClient).not.toHaveBeenCalled();
    }
  );

  it('returns an error result when the agent service throws', async () => {
    const mockAgentService = {
      listAgents: jest.fn().mockRejectedValue(new Error('fleet unavailable')),
    };
    service.getInternalFleetServices = jest.fn(() => ({
      agent: mockAgentService,
      ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
    })) as unknown as EndpointAppContextService['getInternalFleetServices'];

    const tool = getRunningProcessesTool(service);
    const result = await tool.handler({ hostName: 'my-host' }, mockContext);

    expect(assertStandardReturn(result)[0].type).toBe(ToolResultType.error);
    expect(mockLogger.error).toHaveBeenCalled();
  });
});
