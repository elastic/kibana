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
import { SCAN_TOOL_ID } from '../..';
import { scanHostTool } from '.';

const mockLogger = { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() };
const mockContext = { logger: mockLogger } as unknown as ToolHandlerContext;

function assertStandardReturn(result: unknown) {
  if (!isToolHandlerStandardReturn(result as ToolHandlerReturn)) {
    throw new Error('Expected standard tool return');
  }
  return (result as ToolHandlerStandardReturn).results;
}

describe('scanHostTool', () => {
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

  it('returns found: false with reason endpoint_not_found when no agent matches', async () => {
    const mockAgentService = { listAgents: jest.fn().mockResolvedValue({ agents: [] }) };
    service.getInternalFleetServices = jest.fn(() => ({
      agent: mockAgentService,
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
    })) as unknown as EndpointAppContextService['getInternalFleetServices'];
    service.getInternalResponseActionsClient = jest.fn(
      () => mockResponseActionsClient
    ) as unknown as EndpointAppContextService['getInternalResponseActionsClient'];

    const tool = scanHostTool(service);
    const result = await tool.handler(
      { hostName: 'my-host', path: '/home/user/suspicious', comment: 'ioc match' },
      mockContext
    );

    expect(mockResponseActionsClient.scan).toHaveBeenCalledWith(
      {
        endpoint_ids: ['agent-123'],
        comment: 'ioc match',
        parameters: { path: '/home/user/suspicious' },
      },
      { hosts: { 'agent-123': { name: 'my-host' } } }
    );
    const data = assertStandardReturn(result)[0].data as Record<string, unknown>;
    expect(data.found).toBe(true);
    expect(data.actionId).toBe('action-scan-1');
    expect(data.path).toBe('/home/user/suspicious');
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
