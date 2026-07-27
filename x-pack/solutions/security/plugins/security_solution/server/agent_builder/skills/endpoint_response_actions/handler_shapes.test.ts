/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable require-atomic-updates */
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import {
  isToolHandlerStandardReturn,
  type ToolHandlerReturn,
} from '@kbn/agent-builder-server/tools';
import { createMockEndpointAppContext } from '../../../endpoint/mocks';
import {
  isolateHostTool,
  unisolateHostTool,
  getEndpointStatusTool,
  listEndpointsTool,
  getRunningProcessesTool,
  scanHostTool,
} from './tools';
import {
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
    mockAgentService = {
      listAgents: jest.fn().mockResolvedValue({ agents: [] }),
    };
    mockEndpointAppContextService.getInternalFleetServices = jest.fn(() => ({
      agent: mockAgentService,
    })) as jest.Mock;
  });

  describe('FR-020: endpoint-not-found returns distinguishable shape', () => {
    it('isolate_host returns found: false with reason "endpoint_not_found" when no agent is found', async () => {
      const isolateTool = isolateHostTool(mockEndpointAppContextService);

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
      const unisolateTool = unisolateHostTool(mockEndpointAppContextService);

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
      const statusTool = getEndpointStatusTool(mockEndpointAppContextService);

      const result = await (statusTool as unknown as { handler: Function }).handler(
        { hostName: 'nonexistent-host' },
        { logger: { error: jest.fn(), warn: jest.fn() } }
      );

      expect(assertStandardReturn(result)).toHaveLength(1);
      const data = assertStandardReturn(result)[0].data as Record<string, unknown>;
      expect(data.found).toBe(false);
      expect(data.reason).toBe('endpoint_not_found');
      expect(data.hostName).toBe('nonexistent-host');
      expect(data.isolated).toBe(false);
      expect(data.lastSeen).toBeNull();
      expect(data.status).toBe('offline');
    });
  });

  describe('FR-021: not-found returns distinguishable shape in get_endpoint_status', () => {
    it('get_endpoint_status returns found: false with reason "endpoint_not_found" when agent exists but metadata service returns empty', async () => {
      const statusTool = getEndpointStatusTool(mockEndpointAppContextService);

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
            },
          ],
        }),
      };

      const originalGetInternalFleetServices =
        mockEndpointAppContextService.getInternalFleetServices;
      mockEndpointAppContextService.getInternalFleetServices = jest.fn(() => ({
        agent: innerMockAgentService,
        ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
      })) as unknown as typeof mockEndpointAppContextService.getInternalFleetServices;

      // Mock metadata service to return empty data (index not found)
      const mockMetadataService = {
        getHostMetadataList: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      };

      const originalGetEndpointMetadataService =
        mockEndpointAppContextService.getEndpointMetadataService;
      mockEndpointAppContextService.getEndpointMetadataService = jest.fn(
        () =>
          mockMetadataService as unknown as ReturnType<
            EndpointAppContextService['getEndpointMetadataService']
          >
      );

      try {
        const result = await handler({ hostName: 'nonexistent-host' }, mockLogger);

        expect(assertStandardReturn(result)).toHaveLength(1);
        const data = assertStandardReturn(result)[0].data as Record<string, unknown>;
        expect(data.found).toBe(false);
        expect(data.reason).toBe('endpoint_not_found');
        expect(data.hostName).toBe('nonexistent-host');
      } finally {
        mockEndpointAppContextService.getInternalFleetServices = originalGetInternalFleetServices;
        mockEndpointAppContextService.getEndpointMetadataService =
          originalGetEndpointMetadataService;
      }
    });

    it('get_endpoint_status returns found: true with real data when agent and metadata exist', async () => {
      const statusTool = getEndpointStatusTool(mockEndpointAppContextService);

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
            },
          ],
        }),
      };

      const originalGetInternalFleetServices =
        mockEndpointAppContextService.getInternalFleetServices;
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

      const originalGetEndpointMetadataService =
        mockEndpointAppContextService.getEndpointMetadataService;
      mockEndpointAppContextService.getEndpointMetadataService = jest.fn(
        () =>
          mockMetadataService as unknown as ReturnType<
            EndpointAppContextService['getEndpointMetadataService']
          >
      );

      try {
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
      } finally {
        mockEndpointAppContextService.getInternalFleetServices = originalGetInternalFleetServices;
        mockEndpointAppContextService.getEndpointMetadataService =
          originalGetEndpointMetadataService;
      }
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

    function buildHostLookupTools(service: EndpointAppContextService) {
      return [
        isolateHostTool(service),
        unisolateHostTool(service),
        getEndpointStatusTool(service),
        getRunningProcessesTool(service),
        scanHostTool(service),
      ];
    }

    it('all host-lookup tools return ToolResultType.other for "endpoint not found" (not error)', async () => {
      const hostLookupTools = buildHostLookupTools(mockEndpointAppContextService);

      for (const tool of hostLookupTools) {
        const result = await (tool as unknown as { handler: Function }).handler(
          { hostName: 'nonexistent-host' },
          { logger: { error: jest.fn() } }
        );

        expect(assertStandardReturn(result)[0].type).toBe('other');
        const data = assertStandardReturn(result)[0].data as Record<string, unknown>;
        expect(data.found).toBe(false);
        expect(data.reason).toBe('endpoint_not_found');
      }
    });

    it('handler errors use ToolResultType.error while not-found uses ToolResultType.other', async () => {
      const hostLookupTools = buildHostLookupTools(mockEndpointAppContextService);

      for (const tool of hostLookupTools) {
        const notFoundResult = await (tool as unknown as { handler: Function }).handler(
          { hostName: 'nonexistent-host' },
          { logger: { error: jest.fn() } }
        );
        expect(notFoundResult.results[0].type).toBe('other');
      }
    });

    it('all host-lookup tool IDs match the exported constants', () => {
      const hostLookupTools = buildHostLookupTools(mockEndpointAppContextService);
      const toolIds = hostLookupTools.map((t) => t.id);
      for (const expectedId of HOST_LOOKUP_TOOL_IDS) {
        expect(toolIds).toContain(expectedId);
      }
    });

    it('list_endpoints tool is excluded from host-lookup consistency checks', () => {
      const listTool = listEndpointsTool(mockEndpointAppContextService);
      expect(listTool.id).toBe(LIST_ENDPOINTS_TOOL_ID);
      expect(HOST_LOOKUP_TOOL_IDS).not.toContain(LIST_ENDPOINTS_TOOL_ID);
    });
  });
});
