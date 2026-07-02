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

import type { EndpointAppContextService } from '../../../../../endpoint/endpoint_app_context_services';
import { createMockEndpointAppContext } from '../../../../../endpoint/mocks';
import { RUNNING_PROCESSES_TOOL_ID } from '../..';
import { getRunningProcessesTool } from '.';

const mockLogger = { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() };
const mockContext = { logger: mockLogger } as unknown as ToolHandlerContext;

function assertStandardReturn(result: unknown) {
  if (!isToolHandlerStandardReturn(result as ToolHandlerReturn)) {
    throw new Error('Expected standard tool return');
  }
  return (result as ToolHandlerStandardReturn).results;
}

describe('getRunningProcessesTool', () => {
  let service: EndpointAppContextService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = createMockEndpointAppContext().service;
  });

  it('returns a valid read-only builtin tool definition', () => {
    const tool = getRunningProcessesTool(service);
    expect(tool.type).toBe(ToolType.builtin);
    expect(tool.id).toBe(RUNNING_PROCESSES_TOOL_ID);
    expect(RUNNING_PROCESSES_TOOL_ID).toBe('endpoint-response-actions.running_processes');
    expect(tool.description).toContain('read-only');
  });

  it('returns found: false with reason endpoint_not_found when no agent matches', async () => {
    const mockAgentService = { listAgents: jest.fn().mockResolvedValue({ agents: [] }) };
    service.getInternalFleetServices = jest.fn(() => ({
      agent: mockAgentService,
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
    })) as unknown as EndpointAppContextService['getInternalFleetServices'];
    service.getInternalResponseActionsClient = jest.fn(
      () => mockResponseActionsClient
    ) as unknown as EndpointAppContextService['getInternalResponseActionsClient'];

    const tool = getRunningProcessesTool(service);
    const result = await tool.handler({ hostName: 'my-host' }, mockContext);

    expect(mockResponseActionsClient.runningProcesses).toHaveBeenCalledWith(
      { endpoint_ids: ['agent-123'], comment: 'Running processes requested via AI agent: my-host' },
      { hosts: { 'agent-123': { name: 'my-host' } } }
    );
    const data = assertStandardReturn(result)[0].data as Record<string, unknown>;
    expect(data.found).toBe(true);
    expect(data.actionId).toBe('action-999');
  });

  it('returns an error result when the agent service throws', async () => {
    const mockAgentService = {
      listAgents: jest.fn().mockRejectedValue(new Error('fleet unavailable')),
    };
    service.getInternalFleetServices = jest.fn(() => ({
      agent: mockAgentService,
    })) as unknown as EndpointAppContextService['getInternalFleetServices'];

    const tool = getRunningProcessesTool(service);
    const result = await tool.handler({ hostName: 'my-host' }, mockContext);

    expect(assertStandardReturn(result)[0].type).toBe(ToolResultType.error);
    expect(mockLogger.error).toHaveBeenCalled();
  });
});
