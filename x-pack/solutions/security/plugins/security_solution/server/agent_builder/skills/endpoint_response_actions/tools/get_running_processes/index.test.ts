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
import { RUNNING_PROCESSES_TOOL_ID } from '../..';
import { getRunningProcessesTool } from '.';

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

describe('getRunningProcessesTool', () => {
  // waitForActionCompletion mocks resolve on the first poll attempt, but the
  // extra promise hop through p-retry has been observed to push these tests
  // past Jest's default 5s budget under heavy CI parallelism (500+ concurrent
  // jobs). Raise the per-suite timeout rather than masking a real regression.
  jest.setTimeout(20000);

  let service: EndpointAppContextService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = createMockEndpointAppContext().service;
  });

  it('returns a valid builtin tool definition', () => {
    const tool = getRunningProcessesTool(service);
    expect(tool.type).toBe(ToolType.builtin);
    expect(tool.id).toBe(RUNNING_PROCESSES_TOOL_ID);
    expect(RUNNING_PROCESSES_TOOL_ID).toBe('endpoint-response-actions.running_processes');
    expect(tool.description).toContain('running processes');
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

  it('calls responseActionsClient.runningProcesses when agent found', async () => {
    const mockAgentService = {
      listAgents: jest.fn().mockResolvedValue({ agents: [{ id: 'agent-123' }] }),
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
    const result = await tool.handler({ hostName: 'my-host' }, mockContext);

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
      expect.objectContaining({ username: 'test-analyst' })
    );
    const data = assertStandardReturn(result)[0].data as Record<string, unknown>;
    expect(data.found).toBe(true);
    expect(data.actionId).toBe('action-999');
  });

  it('resolves agentType from the agent packages for a non-Elastic-Defend host (multi-vendor)', async () => {
    const mockAgentService = {
      listAgents: jest.fn().mockResolvedValue({
        agents: [{ id: 'agent-s1-1', packages: ['sentinel_one'] }],
      }),
    };
    const mockResponseActionsClient = {
      runningProcesses: jest.fn().mockResolvedValue({
        id: 'action-999',
        status: 'pending',
        wasSuccessful: undefined,
        hosts: { 'agent-s1-1': { name: 's1-host' } },
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
      hosts: { 'agent-s1-1': { name: 's1-host' } },
      outputs: {},
    });

    const tool = getRunningProcessesTool(service);
    await tool.handler({ hostName: 's1-host' }, mockContext);

    expect(service.getInternalResponseActionsClient).toHaveBeenCalledWith(
      expect.objectContaining({ agentType: 'sentinel_one', isAutomated: false })
    );
  });

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
