/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import {
  isToolHandlerStandardReturn,
  type ToolHandlerReturn,
} from '@kbn/agent-builder-server/tools';
import { createMockEndpointAppContext } from '../../../endpoint/mocks';
import {
  createEndpointResponseActionsSkill,
  ISOLATE_TOOL_ID,
  UNISOLATE_TOOL_ID,
  GET_ENDPOINT_STATUS_TOOL_ID,
  LIST_ENDPOINTS_TOOL_ID,
  RUNNING_PROCESSES_TOOL_ID,
  SCAN_TOOL_ID,
} from '.';

function assertStandardReturn(result: unknown) {
  const r = result as ToolHandlerReturn;
  if (!isToolHandlerStandardReturn(r)) {
    throw new Error('Expected standard tool return');
  }
  return r.results;
}

describe('Handler return shapes are distinguishable (FR-020, FR-021)', () => {
  let mockEndpointAppContextService: EndpointAppContextService;
  let mockAgentService: { listAgents: jest.Mock };

  beforeEach(() => {
    mockEndpointAppContextService = createMockEndpointAppContext().service;
    // Hostname resolution also reads the Defend metadata index on origin, so
    // tests that only stub Fleet get an empty metadata index by default.
    jest
      .spyOn(mockEndpointAppContextService, 'getEndpointMetadataService')
      .mockImplementation((() => ({
        getHostMetadataList: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      })) as unknown as EndpointAppContextService['getEndpointMetadataService']);
    mockAgentService = {
      listAgents: jest.fn().mockResolvedValue({ agents: [] }),
    };
    mockEndpointAppContextService.getInternalFleetServices = jest.fn(() => ({
      agent: mockAgentService,
      ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
    })) as jest.Mock;
  });

  describe('FR-020: endpoint-not-found returns distinguishable shape', () => {
    it('isolate_host returns found: false with reason "endpoint_not_found" when no agent is found', async () => {
      const skill = createEndpointResponseActionsSkill(mockEndpointAppContextService);
      const inlineTools = await skill.getInlineTools?.();
      const isolateTool = inlineTools?.find((tool) => tool.id === ISOLATE_TOOL_ID);

      const result = await (isolateTool as unknown as { handler: Function }).handler(
        { hostName: 'nonexistent-host', comment: 'test' },
        { logger: { error: jest.fn() } }
      );

      expect(assertStandardReturn(result)).toHaveLength(1);
      const data = assertStandardReturn(result)[0].data as Record<string, unknown>;
      expect(data.found).toBe(false);
      expect(data.reason).toBe('endpoint_not_found');
      expect(data.hostName).toBe('nonexistent-host');
      expect(assertStandardReturn(result)[0].type).toBe('other');
    });

    it('unisolate_host returns found: false with reason "endpoint_not_found" when no agent is found', async () => {
      const skill = createEndpointResponseActionsSkill(mockEndpointAppContextService);
      const inlineTools = await skill.getInlineTools?.();
      const unisolateTool = inlineTools?.find((tool) => tool.id === UNISOLATE_TOOL_ID);

      const result = await (unisolateTool as unknown as { handler: Function }).handler(
        { hostName: 'nonexistent-host', comment: 'test' },
        { logger: { error: jest.fn() } }
      );

      expect(assertStandardReturn(result)).toHaveLength(1);
      const data = assertStandardReturn(result)[0].data as Record<string, unknown>;
      expect(data.found).toBe(false);
      expect(data.reason).toBe('endpoint_not_found');
      expect(data.hostName).toBe('nonexistent-host');
      expect(assertStandardReturn(result)[0].type).toBe('other');
    });

    it('get_endpoint_status returns found: false with reason "endpoint_not_found" when no agent is found', async () => {
      const skill = createEndpointResponseActionsSkill(mockEndpointAppContextService);
      const inlineTools = await skill.getInlineTools?.();
      const statusTool = inlineTools?.find((tool) => tool.id === GET_ENDPOINT_STATUS_TOOL_ID);

      const result = await (statusTool as unknown as { handler: Function }).handler(
        { hostName: 'nonexistent-host' },
        { logger: { error: jest.fn(), warn: jest.fn() } }
      );

      expect(assertStandardReturn(result)).toHaveLength(1);
      const data = assertStandardReturn(result)[0].data as Record<string, unknown>;
      expect(data.found).toBe(false);
      expect(data.reason).toBe('endpoint_not_found');
      expect(data.hostName).toBe('nonexistent-host');
      // No host was observed, so no host state may be reported.
      expect(data).not.toHaveProperty('isolated');
      expect(data).not.toHaveProperty('lastSeen');
      expect(data).not.toHaveProperty('status');
      expect(assertStandardReturn(result)[0].type).toBe('other');
    });
  });

  describe('FR-021: not-found returns distinguishable shape in get_endpoint_status', () => {
    it('get_endpoint_status returns found: false with reason "endpoint_not_found" when agent exists but metadata service returns empty', async () => {
      const skill = createEndpointResponseActionsSkill(mockEndpointAppContextService);
      const inlineTools = await skill.getInlineTools?.();
      const statusTool = inlineTools?.find((tool) => tool.id === GET_ENDPOINT_STATUS_TOOL_ID);

      const handler = (statusTool as unknown as { handler: Function }).handler;
      const mockLogger = { error: jest.fn(), warn: jest.fn() };

      // Mock the agent service to return an agent (so endpoint exists)
      const innerMockAgentService = {
        listAgents: jest.fn().mockResolvedValue({
          agents: [
            {
              id: 'agent-123',
              last_checkin: '2024-01-01T00:00:00Z',
              isolation: false,
              host_status: 'healthy',
              packages: ['endpoint'],
            },
          ],
        }),
      };

      mockEndpointAppContextService.getInternalFleetServices = jest.fn(() => ({
        agent: innerMockAgentService,
        ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
      })) as unknown as typeof mockEndpointAppContextService.getInternalFleetServices;

      // Mock metadata service to return empty data (index not found)
      const mockMetadataService = {
        getHostMetadataList: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      };

      mockEndpointAppContextService.getEndpointMetadataService = jest.fn(
        () =>
          mockMetadataService as unknown as ReturnType<
            EndpointAppContextService['getEndpointMetadataService']
          >
      );

      const result = await handler({ hostName: 'found-host' }, mockLogger);

      expect(assertStandardReturn(result)).toHaveLength(1);
      const data = assertStandardReturn(result)[0].data as Record<string, unknown>;
      expect(data.found).toBe(false);
      expect(data.reason).toBe('endpoint_not_found');
      expect(data.hostName).toBe('found-host');
      expect(assertStandardReturn(result)[0].type).toBe('other');
    });

    it('get_endpoint_status returns found: true when all lookups succeed', async () => {
      const skill = createEndpointResponseActionsSkill(mockEndpointAppContextService);
      const inlineTools = await skill.getInlineTools?.();
      const statusTool = inlineTools?.find((tool) => tool.id === GET_ENDPOINT_STATUS_TOOL_ID);

      const handler = (statusTool as unknown as { handler: Function }).handler;
      const mockLogger = { error: jest.fn(), warn: jest.fn() };

      // Mock the agent service to return an agent

      const mockAgentServiceInner = {
        listAgents: jest.fn().mockResolvedValue({
          agents: [
            {
              id: 'agent-123',
              last_checkin: '2024-01-01T00:00:00Z',
              isolation: false,
              host_status: 'healthy',
              packages: ['endpoint'],
            },
          ],
        }),
      };

      mockEndpointAppContextService.getInternalFleetServices = jest.fn(() => ({
        agent: mockAgentServiceInner,
        ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
      })) as unknown as typeof mockEndpointAppContextService.getInternalFleetServices;

      // Mock metadata service to return valid data
      const mockMetadataService = {
        getHostMetadataList: jest.fn().mockResolvedValue({
          data: [
            {
              metadata: { Endpoint: { state: { isolation: false } } },
              last_checkin: '2024-01-01T00:00:00Z',
              host_status: 'healthy',
            },
          ],
          total: 1,
        }),
      };

      mockEndpointAppContextService.getEndpointMetadataService = jest.fn(
        () =>
          mockMetadataService as unknown as ReturnType<
            EndpointAppContextService['getEndpointMetadataService']
          >
      );

      const result = await handler({ hostName: 'found-host' }, mockLogger);

      expect(assertStandardReturn(result)).toHaveLength(1);
      const data = assertStandardReturn(result)[0].data as Record<string, unknown>;
      expect(data.found).toBe(true);
      expect(data.hostName).toBe('found-host');
      expect(data.agentId).toBe('agent-123');
      expect(data.status).toBe('healthy');
      expect(data.isolated).toBe(false);
      expect(data.lastSeen).toBe('2024-01-01T00:00:00Z');

      // Verify metadata service was called
      expect(mockMetadataService.getHostMetadataList).toHaveBeenCalled();
    });
  });

  describe('Consistency across host-lookup tools', () => {
    const HOST_LOOKUP_TOOL_IDS = [
      ISOLATE_TOOL_ID,
      UNISOLATE_TOOL_ID,
      GET_ENDPOINT_STATUS_TOOL_ID,
      RUNNING_PROCESSES_TOOL_ID,
      SCAN_TOOL_ID,
    ];

    it('all host-lookup tools return ToolResultType.other for "endpoint not found" (not error)', async () => {
      const skill = createEndpointResponseActionsSkill(mockEndpointAppContextService);
      const inlineTools = await skill.getInlineTools?.();
      const hostLookupTools = (inlineTools ?? []).filter((t) =>
        HOST_LOOKUP_TOOL_IDS.includes(t.id)
      );

      // A failing lookup is NOT the same thing: if it collapsed into the
      // not-found shape, the agent would tell the analyst "no such host"
      // when the truth is "we could not tell" — the two must stay distinct.
      mockEndpointAppContextService.getInternalFleetServices = jest.fn(() => ({
        agent: {
          listAgents: jest.fn().mockRejectedValue(new Error('fleet unavailable')),
        },
        ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
      })) as unknown as typeof mockEndpointAppContextService.getInternalFleetServices;

      for (const tool of hostLookupTools) {
        const errorResult = await (tool as unknown as { handler: Function }).handler(
          { hostName: 'any-host' },
          { logger: { error: jest.fn(), warn: jest.fn() } }
        );

        const errorEntry = assertStandardReturn(errorResult)[0];
        expect(errorEntry.type).toBe('error');
        const data = errorEntry.data as Record<string, unknown>;
        expect(data.error).toBe('unknown_error');
        expect(data.found).toBeUndefined();
      }
    });

    it('list_endpoints reports an empty list rather than a not-found shape when nothing is enrolled', async () => {
      const skill = createEndpointResponseActionsSkill(mockEndpointAppContextService);
      const inlineTools = await skill.getInlineTools?.();
      const listTool = (inlineTools ?? []).find((t) => t.id === LIST_ENDPOINTS_TOOL_ID);
      expect(listTool).toBeDefined();
      expect(HOST_LOOKUP_TOOL_IDS).not.toContain(LIST_ENDPOINTS_TOOL_ID);

      // Mock metadata service to return an empty (but successful) page.
      const mockMetadataService = {
        getHostMetadataList: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      };
      const originalGetEndpointMetadataService =
        mockEndpointAppContextService.getEndpointMetadataService;

      jest
        .spyOn(mockEndpointAppContextService, 'getEndpointMetadataService')
        .mockImplementation(
          () =>
            mockMetadataService as unknown as ReturnType<
              EndpointAppContextService['getEndpointMetadataService']
            >
        );

      try {
        const result = await (listTool as unknown as { handler: Function }).handler(
          {},
          { logger: { error: jest.fn() } }
        );
        const data = assertStandardReturn(result)[0].data as Record<string, unknown>;
        // list_endpoints has no single-host lookup to fail — confirm it returns the
        // empty-list shape (not the 'endpoint_not_found' reason used by the other tools).
        expect(data.reason).not.toBe('endpoint_not_found');
        expect(Array.isArray(data.endpoints)).toBe(true);
        expect(data.endpoints).toHaveLength(0);
      } finally {
        mockEndpointAppContextService.getEndpointMetadataService =
          originalGetEndpointMetadataService;
      }
    });
  });
});
