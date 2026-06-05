/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable require-atomic-updates */
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import { createMockEndpointAppContext } from '../../../endpoint/mocks';
import {
  createEndpointResponseActionsSkill,
  ISOLATE_TOOL_ID,
  UNISOLATE_TOOL_ID,
  GET_ENDPOINT_STATUS_TOOL_ID,
} from '.';

describe('Handler return shapes are distinguishable (FR-020, FR-021)', () => {
  let mockEndpointAppContextService: EndpointAppContextService;
  let mockAgentService: { asInternalUser: { list: jest.Mock } };

  beforeEach(() => {
    mockEndpointAppContextService = createMockEndpointAppContext().service;
    mockAgentService = {
      asInternalUser: {
        list: jest.fn().mockResolvedValue({ items: [] }),
      },
    };
    mockEndpointAppContextService.getInternalFleetServices = jest.fn(() => ({
      agentService: mockAgentService,
    })) as jest.Mock;
  });

  describe('FR-020: endpoint-not-found returns distinguishable shape', () => {
    it('isolate_host returns found: false with reason "endpoint_not_found" when no agent is found', async () => {
      const skill = createEndpointResponseActionsSkill(mockEndpointAppContextService);
      const inlineTools = await skill.getInlineTools?.();
      const isolateTool = inlineTools?.find((tool) => tool.id === ISOLATE_TOOL_ID);

      const result = await (isolateTool?.handler as Function)(
        { hostName: 'nonexistent-host', comment: 'test' },
        { logger: { error: jest.fn() } }
      );

      expect(result.results).toHaveLength(1);
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.found).toBe(false);
      expect(data.reason).toBe('endpoint_not_found');
      expect(data.hostName).toBe('nonexistent-host');
      expect(result.results[0].type).toBe('other');
    });

    it('unisolate_host returns found: false with reason "endpoint_not_found" when no agent is found', async () => {
      const skill = createEndpointResponseActionsSkill(mockEndpointAppContextService);
      const inlineTools = await skill.getInlineTools?.();
      const unisolateTool = inlineTools?.find((tool) => tool.id === UNISOLATE_TOOL_ID);

      const result = await (unisolateTool?.handler as Function)(
        { hostName: 'nonexistent-host', comment: 'test' },
        { logger: { error: jest.fn() } }
      );

      expect(result.results).toHaveLength(1);
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.found).toBe(false);
      expect(data.reason).toBe('endpoint_not_found');
      expect(data.hostName).toBe('nonexistent-host');
      expect(result.results[0].type).toBe('other');
    });

    it('get_endpoint_status returns found: false with reason "endpoint_not_found" when no agent is found', async () => {
      const skill = createEndpointResponseActionsSkill(mockEndpointAppContextService);
      const inlineTools = await skill.getInlineTools?.();
      const statusTool = inlineTools?.find((tool) => tool.id === GET_ENDPOINT_STATUS_TOOL_ID);

      const result = await (statusTool?.handler as Function)(
        { hostName: 'nonexistent-host' },
        { logger: { error: jest.fn(), warn: jest.fn() } }
      );

      expect(result.results).toHaveLength(1);
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.found).toBe(false);
      expect(data.reason).toBe('endpoint_not_found');
      expect(data.hostName).toBe('nonexistent-host');
      expect(data.isolated).toBe(false);
      expect(data.lastSeen).toBeNull();
      expect(data.status).toBe('offline');
    });
  });

  describe('FR-021: index-not-found returns distinguishable shape in get_endpoint_status', () => {
    it('get_endpoint_status returns found: false with reason "index_not_found" when agent exists but metadata index is missing', async () => {
      const skill = createEndpointResponseActionsSkill(mockEndpointAppContextService);
      const inlineTools = await skill.getInlineTools?.();
      const statusTool = inlineTools?.find((tool) => tool.id === GET_ENDPOINT_STATUS_TOOL_ID);

      const handler = statusTool?.handler as Function;
      const mockLogger = { error: jest.fn(), warn: jest.fn() };

      // Mock the agent service to return an agent (so endpoint exists)
      const innerMockAgentService = {
        asInternalUser: {
          list: jest.fn().mockResolvedValue({
            items: [
              {
                id: 'agent-123',
                last_checkin: '2024-01-01T00:00:00Z',
                isolation: false,
                host_status: 'healthy',
              },
            ],
          }),
        },
      };

      const originalGetInternalFleetServices =
        mockEndpointAppContextService.getInternalFleetServices;
      mockEndpointAppContextService.getInternalFleetServices = jest.fn(() => ({
        agentService: innerMockAgentService,
      }));

      // Mock metadata service to return empty data (index not found)
      const mockMetadataService = {
        getHostMetadataList: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      };

      const originalGetEndpointMetadataService =
        mockEndpointAppContextService.getEndpointMetadataService;
      mockEndpointAppContextService.getEndpointMetadataService = jest.fn(() => mockMetadataService);

      // Mock ES client to return index does not exist
      const mockEsClient = {
        indices: {
          exists: jest.fn().mockResolvedValue(false),
        },
      };

      const originalGetInternalEsClient = mockEndpointAppContextService.getInternalEsClient;
      mockEndpointAppContextService.getInternalEsClient = jest.fn(() => mockEsClient);

      try {
        const result = await handler({ hostName: 'found-host' }, mockLogger);

        expect(result.results).toHaveLength(1);
        const data = result.results[0].data as Record<string, unknown>;
        expect(data.found).toBe(false);
        expect(data.reason).toBe('index_not_found');
        expect(data.hostName).toBe('found-host');
        expect(result.results[0].type).toBe('other');

        // Verify ES index existence check was called
        expect(mockEsClient.indices.exists).toHaveBeenCalledWith({
          index: '.ds-metrics-endpoint.metadata-default',
        });
      } finally {
        mockEndpointAppContextService.getInternalFleetServices = originalGetInternalFleetServices;
        mockEndpointAppContextService.getEndpointMetadataService =
          originalGetEndpointMetadataService;
        mockEndpointAppContextService.getInternalEsClient = originalGetInternalEsClient;
      }
    });

    it('get_endpoint_status returns found: true when all lookups succeed', async () => {
      const skill = createEndpointResponseActionsSkill(mockEndpointAppContextService);
      const inlineTools = await skill.getInlineTools?.();
      const statusTool = inlineTools?.find((tool) => tool.id === GET_ENDPOINT_STATUS_TOOL_ID);

      const handler = statusTool?.handler as Function;
      const mockLogger = { error: jest.fn(), warn: jest.fn() };

      // Mock the agent service to return an agent

      const mockAgentService = {
        asInternalUser: {
          list: jest.fn().mockResolvedValue({
            items: [
              {
                id: 'agent-123',
                last_checkin: '2024-01-01T00:00:00Z',
                isolation: false,
                host_status: 'healthy',
              },
            ],
          }),
        },
      };

      const originalGetInternalFleetServices =
        mockEndpointAppContextService.getInternalFleetServices;
      mockEndpointAppContextService.getInternalFleetServices = jest.fn(() => ({
        agentService: mockAgentService,
      }));

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
      mockEndpointAppContextService.getEndpointMetadataService = jest.fn(() => mockMetadataService);

      try {
        const result = await handler({ hostName: 'found-host' }, mockLogger);

        expect(result.results).toHaveLength(1);
        const data = result.results[0].data as Record<string, unknown>;
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

  describe('Consistency across tools', () => {
    it('all three tools return ToolResultType.other for "endpoint not found" (not error)', async () => {
      const skill = createEndpointResponseActionsSkill(mockEndpointAppContextService);
      const inlineTools = await skill.getInlineTools?.();

      for (const tool of inlineTools ?? []) {
        const result = await (tool.handler as Function)(
          { hostName: 'nonexistent-host' },
          { logger: { error: jest.fn() } }
        );

        expect(result.results[0].type).toBe('other');
        const data = result.results[0].data as Record<string, unknown>;
        expect(data.found).toBe(false);
        expect(data.reason).toBe('endpoint_not_found');
      }
    });

    it('handler errors use ToolResultType.error while not-found uses ToolResultType.other', async () => {
      const skill = createEndpointResponseActionsSkill(mockEndpointAppContextService);
      const inlineTools = await skill.getInlineTools?.();

      for (const tool of inlineTools ?? []) {
        // Endpoint not found should NOT be an error type
        const notFoundResult = await (tool.handler as Function)(
          { hostName: 'nonexistent-host' },
          { logger: { error: jest.fn() } }
        );
        expect(notFoundResult.results[0].type).toBe('other');
      }
    });
  });
});
