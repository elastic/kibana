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
import { SCAN_TOOL_ID } from '../..';
import { scanHostTool } from '.';

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

describe('scanHostTool', () => {
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

  it('returns a valid write builtin tool definition requiring a path', () => {
    const tool = scanHostTool(service);
    expect(tool.type).toBe(ToolType.builtin);
    expect(tool.id).toBe(SCAN_TOOL_ID);
    expect(SCAN_TOOL_ID).toBe('endpoint-response-actions.scan');
    expect(tool.description).toContain('confirmation');
  });

  it('gates every dispatch with an always-on confirmation prompt naming host and path', async () => {
    const tool = scanHostTool(service);
    expect(tool.confirmation?.askUser).toBe('always');
    const prompt = await tool.confirmation?.getConfirmation?.({
      toolParams: { hostName: 'my-host', path: '/tmp' },
    });
    expect(prompt?.color).toBe('warning');
    expect(prompt?.message).toContain('my-host');
    expect(prompt?.message).toContain('/tmp');
  });

  it('returns insufficient_privileges and does not dispatch when caller lacks canWriteScanOperations', async () => {
    service.getEndpointAuthz = jest
      .fn()
      .mockResolvedValue(getEndpointAuthzInitialStateMock({ canWriteScanOperations: false }));

    const mockResponseActionsClient = { scan: jest.fn() };
    service.getInternalResponseActionsClient = jest.fn(
      () => mockResponseActionsClient
    ) as unknown as EndpointAppContextService['getInternalResponseActionsClient'];

    const tool = scanHostTool(service);
    const result = await tool.handler({ hostName: 'my-host', path: '/tmp' }, mockContext);

    const results = assertStandardReturn(result);
    expect(results[0].type).toBe(ToolResultType.error);
    const denialData = results[0].data as Record<string, unknown>;
    expect(denialData.error).toBe('insufficient_privileges');
    expect(denialData.privilege).toBe('canWriteScanOperations');
    expect(mockResponseActionsClient.scan).not.toHaveBeenCalled();
  });

  it('returns found: false with reason endpoint_not_found when no agent matches', async () => {
    const mockAgentService = { listAgents: jest.fn().mockResolvedValue({ agents: [] }) };
    service.getInternalFleetServices = jest.fn(() => ({
      agent: mockAgentService,
      ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
    })) as unknown as EndpointAppContextService['getInternalFleetServices'];

    const tool = scanHostTool(service);
    const result = await tool.handler({ hostName: 'nonexistent-host', path: '/tmp' }, mockContext);

    expect(assertStandardReturn(result)[0].type).toBe(ToolResultType.other);
    const data = assertStandardReturn(result)[0].data as Record<string, unknown>;
    expect(data.found).toBe(false);
    expect(data.reason).toBe('endpoint_not_found');
  });

  it('calls responseActionsClient.scan with parameters.path when agent found', async () => {
    const mockAgentService = {
      listAgents: jest.fn().mockResolvedValue({ agents: [{ id: 'agent-123' }] }),
    };
    const mockResponseActionsClient = {
      scan: jest.fn().mockResolvedValue({
        id: 'action-scan-1',
        status: 'pending',
        wasSuccessful: undefined,
        hosts: { 'agent-123': { name: 'my-host' } },
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
      id: 'action-scan-1',
      status: 'successful',
      wasSuccessful: true,
      hosts: { 'agent-123': { name: 'my-host' } },
    });

    const tool = scanHostTool(service);
    const result = await tool.handler(
      { hostName: 'my-host', path: '/home/user/suspicious', comment: 'ioc match' },
      mockContext
    );

    expect(mockResponseActionsClient.scan).toHaveBeenCalledWith(
      {
        endpoint_ids: ['agent-123'],
        comment: 'ioc match [AI agent conversation: conv-test-1]',
        parameters: { path: '/home/user/suspicious' },
      },
      { hosts: { 'agent-123': { name: 'my-host' } } }
    );
    // The scan is attributed to the initiating analyst, not the system user.
    expect(service.getInternalResponseActionsClient).toHaveBeenCalledWith(
      expect.objectContaining({ username: 'test-analyst' })
    );
    const data = assertStandardReturn(result)[0].data as Record<string, unknown>;
    expect(data.found).toBe(true);
    expect(data.actionId).toBe('action-scan-1');
    expect(data.path).toBe('/home/user/suspicious');
  });

  it('resolves agentType from the agent packages for a non-Elastic-Defend host (multi-vendor)', async () => {
    const mockAgentService = {
      listAgents: jest.fn().mockResolvedValue({
        agents: [{ id: 'agent-mde-1', packages: ['microsoft_defender_endpoint'] }],
      }),
    };
    const mockResponseActionsClient = {
      scan: jest.fn().mockResolvedValue({
        id: 'action-scan-mde',
        status: 'pending',
        wasSuccessful: undefined,
        hosts: { 'agent-mde-1': { name: 'mde-host' } },
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
      id: 'action-scan-mde',
      status: 'successful',
      wasSuccessful: true,
      hosts: { 'agent-mde-1': { name: 'mde-host' } },
    });

    const tool = scanHostTool(service);
    await tool.handler({ hostName: 'mde-host', path: '/tmp' }, mockContext);

    expect(service.getInternalResponseActionsClient).toHaveBeenCalledWith(
      expect.objectContaining({ agentType: 'microsoft_defender_endpoint', isAutomated: false })
    );
  });

  it('returns an error result when the response actions client throws', async () => {
    const mockAgentService = {
      listAgents: jest.fn().mockResolvedValue({ agents: [{ id: 'agent-123' }] }),
    };
    const mockResponseActionsClient = {
      scan: jest.fn().mockRejectedValue(new Error('scan failed')),
    };
    service.getInternalFleetServices = jest.fn(() => ({
      agent: mockAgentService,
      ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
    })) as unknown as EndpointAppContextService['getInternalFleetServices'];
    service.getInternalResponseActionsClient = jest.fn(
      () => mockResponseActionsClient
    ) as unknown as EndpointAppContextService['getInternalResponseActionsClient'];

    const tool = scanHostTool(service);
    const result = await tool.handler({ hostName: 'my-host', path: '/tmp' }, mockContext);

    expect(assertStandardReturn(result)[0].type).toBe(ToolResultType.error);
    expect((assertStandardReturn(result)[0].data as Record<string, unknown>).message).toContain(
      'Error scanning host'
    );
    expect(mockLogger.error).toHaveBeenCalled();
  });
});
