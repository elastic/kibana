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

import type { EndpointAppContextService } from '../../../../../endpoint/endpoint_app_context_services';
import { createMockEndpointAppContext } from '../../../../../endpoint/mocks';
import { GET_ENDPOINT_STATUS_TOOL_ID } from '../..';
import { getEndpointStatusTool } from '.';
import { LOOKUP_PAGE_SIZE } from '../services/endpoint_lookup';

const mockLogger = { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() };
const mockContext = { logger: mockLogger } as unknown as ToolHandlerContext;

function assertStandardReturn(result: unknown) {
  if (!isToolHandlerStandardReturn(result as ToolHandlerReturn)) {
    throw new Error('Expected standard tool return');
  }
  return (result as ToolHandlerStandardReturn).results;
}

describe('getEndpointStatusTool', () => {
  let mockEndpointAppContextService: EndpointAppContextService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockEndpointAppContextService = createMockEndpointAppContext().service;
  });

  describe('tool definition', () => {
    it('returns a valid builtin tool definition', () => {
      const tool = getEndpointStatusTool(mockEndpointAppContextService);
      expect(tool.type).toBe(ToolType.builtin);
      expect(tool.id).toBe(GET_ENDPOINT_STATUS_TOOL_ID);
      expect(tool.description).toContain('Retrieves the current status');
      expect(tool.schema).toBeDefined();
    });

    it('has correct tool id format', () => {
      expect(GET_ENDPOINT_STATUS_TOOL_ID).toBe('endpoint-response-actions.get_endpoint_status');
    });
  });

  describe('handler', () => {
    let tool: ReturnType<typeof getEndpointStatusTool>;

    beforeEach(() => {
      tool = getEndpointStatusTool(mockEndpointAppContextService);
    });

    it('returns found: false with reason "endpoint_not_found" when no agent matches', async () => {
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
        expect(data.isolated).toBe(false);
        expect(data.lastSeen).toBeNull();
        expect(data.status).toBe('offline');
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
        await tool.handler({ hostName: 'my-host' }, mockContext);

        expect(mockAgentService.listAgents).toHaveBeenCalledWith({
          showInactive: true,
          kuery: 'local_metadata.host.name: my-host',
          page: 1,
          perPage: LOOKUP_PAGE_SIZE,
        });
      } finally {
        mockEndpointAppContextService.getInternalFleetServices = originalGetInternalFleetServices;
      }
    });

    it('returns found: true with correct data when agent and metadata lookups succeed', async () => {
      const mockAgentService = {
        listAgents: jest.fn().mockResolvedValue({
          agents: [{ id: 'agent-123' }],
        }),
      };

      const mockMetadataService = {
        getHostMetadataList: jest.fn().mockResolvedValue({
          data: [
            {
              metadata: { Endpoint: { state: { isolation: true } } },
              last_checkin: '2024-01-01T00:00:00Z',
              host_status: 'healthy',
            },
          ],
          total: 1,
        }),
      };

      const originalGetInternalFleetServices =
        mockEndpointAppContextService.getInternalFleetServices;
      const originalGetEndpointMetadataService =
        mockEndpointAppContextService.getEndpointMetadataService;

      mockEndpointAppContextService.getInternalFleetServices = jest.fn(() => ({
        agent: mockAgentService,
        ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
      })) as unknown as EndpointAppContextService['getInternalFleetServices'];
      mockEndpointAppContextService.getEndpointMetadataService = jest.fn(
        () => mockMetadataService
      ) as unknown as EndpointAppContextService['getEndpointMetadataService'];

      try {
        const result = await tool.handler({ hostName: 'my-host' }, mockContext);

        expect(assertStandardReturn(result)).toHaveLength(1);
        expect(assertStandardReturn(result)[0].type).toBe(ToolResultType.other);
        const data = assertStandardReturn(result)[0].data as Record<string, unknown>;
        expect(data.found).toBe(true);
        expect(data.hostName).toBe('my-host');
        expect(data.agentId).toBe('agent-123');
        expect(data.status).toBe('healthy');
        expect(data.isolated).toBe(true);
        expect(data.lastSeen).toBe('2024-01-01T00:00:00Z');

        expect(mockMetadataService.getHostMetadataList).toHaveBeenCalledWith(
          {
            page: 0,
            pageSize: 1,
            // Constrained by the hostname as well as the ID, so a mismatched
            // pair cannot return another host's status.
            kuery: 'agent.id: agent-123 AND united.endpoint.host.hostname: my-host',
          },
          // Scoped services are required for this read to fan out under CPS.
          expect.objectContaining({ isCpsRead: expect.any(Function) })
        );
      } finally {
        mockEndpointAppContextService.getInternalFleetServices = originalGetInternalFleetServices;
        mockEndpointAppContextService.getEndpointMetadataService =
          originalGetEndpointMetadataService;
      }
    });

    it('returns found: true with non-isolated status when metadata shows isolation is false', async () => {
      const mockAgentService = {
        listAgents: jest.fn().mockResolvedValue({
          agents: [{ id: 'agent-456' }],
        }),
      };

      const mockMetadataService = {
        getHostMetadataList: jest.fn().mockResolvedValue({
          data: [
            {
              metadata: { Endpoint: { state: { isolation: false } } },
              last_checkin: '2024-06-01T12:00:00Z',
              host_status: 'healthy',
            },
          ],
          total: 1,
        }),
      };

      const originalGetInternalFleetServices =
        mockEndpointAppContextService.getInternalFleetServices;
      const originalGetEndpointMetadataService =
        mockEndpointAppContextService.getEndpointMetadataService;

      mockEndpointAppContextService.getInternalFleetServices = jest.fn(() => ({
        agent: mockAgentService,
        ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
      })) as unknown as EndpointAppContextService['getInternalFleetServices'];
      mockEndpointAppContextService.getEndpointMetadataService = jest.fn(
        () => mockMetadataService
      ) as unknown as EndpointAppContextService['getEndpointMetadataService'];

      try {
        const result = await tool.handler({ hostName: 'safe-host' }, mockContext);

        expect(assertStandardReturn(result)).toHaveLength(1);
        const data = assertStandardReturn(result)[0].data as Record<string, unknown>;
        expect(data.found).toBe(true);
        expect(data.isolated).toBe(false);
        expect(data.status).toBe('healthy');
        expect(data.lastSeen).toBe('2024-06-01T12:00:00Z');
      } finally {
        mockEndpointAppContextService.getInternalFleetServices = originalGetInternalFleetServices;
        mockEndpointAppContextService.getEndpointMetadataService =
          originalGetEndpointMetadataService;
      }
    });

    it('returns endpoint_not_found when agent exists but metadata service returns empty', async () => {
      const mockAgentService = {
        listAgents: jest.fn().mockResolvedValue({
          agents: [
            {
              id: 'agent-789',
              last_checkin: '2024-01-01T00:00:00Z',
              isolation: false,
              host_status: 'healthy',
            },
          ],
        }),
      };

      const mockMetadataService = {
        getHostMetadataList: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      };

      const originalGetInternalFleetServices =
        mockEndpointAppContextService.getInternalFleetServices;
      const originalGetEndpointMetadataService =
        mockEndpointAppContextService.getEndpointMetadataService;

      mockEndpointAppContextService.getInternalFleetServices = jest.fn(() => ({
        agent: mockAgentService,
        ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
      })) as unknown as EndpointAppContextService['getInternalFleetServices'];
      mockEndpointAppContextService.getEndpointMetadataService = jest.fn(
        () => mockMetadataService
      ) as unknown as EndpointAppContextService['getEndpointMetadataService'];

      try {
        const result = await tool.handler({ hostName: 'found-host' }, mockContext);

        expect(assertStandardReturn(result)).toHaveLength(1);
        const data = assertStandardReturn(result)[0].data as Record<string, unknown>;
        expect(data.found).toBe(false);
        expect(data.reason).toBe('endpoint_not_found');
        expect(data.hostName).toBe('found-host');
      } finally {
        mockEndpointAppContextService.getInternalFleetServices = originalGetInternalFleetServices;
        mockEndpointAppContextService.getEndpointMetadataService =
          originalGetEndpointMetadataService;
      }
    });

    it('returns an ambiguous result when two online agents share the hostname', async () => {
      const mockAgentService = {
        listAgents: jest.fn().mockResolvedValue({
          agents: [
            { id: 'live-a', status: 'online' },
            { id: 'live-b', status: 'online' },
          ],
        }),
      };

      const originalGetInternalFleetServices =
        mockEndpointAppContextService.getInternalFleetServices;
      mockEndpointAppContextService.getInternalFleetServices = jest.fn(() => ({
        agent: mockAgentService,
        ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
      })) as unknown as EndpointAppContextService['getInternalFleetServices'];

      try {
        const result = await tool.handler({ hostName: 'duplicated-host' }, mockContext);

        const results = assertStandardReturn(result);
        expect(results).toHaveLength(1);
        expect(results[0].type).toBe(ToolResultType.other);
        const data = results[0].data as Record<string, unknown>;
        // Must NOT report a status for an arbitrary one of the two hosts.
        expect(data.found).toBe(false);
        expect(data.reason).toBe('ambiguous_hostname');
        expect(data.candidates).toEqual([
          { agentId: 'live-a', status: 'online' },
          { agentId: 'live-b', status: 'online' },
        ]);
        expect(data.message).toContain('duplicated-host');
        expect(mockLogger.error).not.toHaveBeenCalled();
      } finally {
        mockEndpointAppContextService.getInternalFleetServices = originalGetInternalFleetServices;
      }
    });

    it('returns an ambiguous result when more records match than the lookup examined', async () => {
      // A full page plus a total far beyond it: an unexamined record could be
      // another live machine, so reporting one of the visible agents' status
      // would be a guess.
      const mockAgentService = {
        listAgents: jest.fn().mockResolvedValue({
          agents: Array.from({ length: LOOKUP_PAGE_SIZE }, (_, i) => ({
            id: `live-${i}`,
            status: 'online',
          })),
          total: 500,
        }),
      };

      const originalGetInternalFleetServices =
        mockEndpointAppContextService.getInternalFleetServices;
      mockEndpointAppContextService.getInternalFleetServices = jest.fn(() => ({
        agent: mockAgentService,
        ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
      })) as unknown as EndpointAppContextService['getInternalFleetServices'];

      try {
        const result = await tool.handler({ hostName: 'huge-history-host' }, mockContext);

        const results = assertStandardReturn(result);
        const data = results[0].data as Record<string, unknown>;
        expect(data.found).toBe(false);
        expect(data.reason).toBe('ambiguous_hostname');
        expect(data.truncated).toBe(true);
        expect(data.totalCandidates).toBe(500);
        // The message must name the way out: re-calling with the agent ID.
        expect(data.message).toContain('agentId');
      } finally {
        mockEndpointAppContextService.getInternalFleetServices = originalGetInternalFleetServices;
      }
    });

    it('reads status by agent ID when the hostname resolves to several endpoints', async () => {
      // The ambiguity result tells the model to ask for an agent ID; accepting
      // one is what makes that instruction actionable instead of a dead end.
      const mockAgentService = {
        listAgents: jest.fn().mockResolvedValue({
          agents: [
            { id: 'live-a', status: 'online' },
            { id: 'live-b', status: 'online' },
          ],
        }),
      };

      const mockMetadataService = {
        getHostMetadataList: jest.fn().mockResolvedValue({
          data: [
            {
              metadata: { Endpoint: { state: { isolation: false } } },
              last_checkin: '2024-05-05T00:00:00Z',
              host_status: 'healthy',
            },
          ],
          total: 1,
        }),
      };

      const originalGetInternalFleetServices =
        mockEndpointAppContextService.getInternalFleetServices;
      const originalGetEndpointMetadataService =
        mockEndpointAppContextService.getEndpointMetadataService;

      mockEndpointAppContextService.getInternalFleetServices = jest.fn(() => ({
        agent: mockAgentService,
        ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
      })) as unknown as EndpointAppContextService['getInternalFleetServices'];
      mockEndpointAppContextService.getEndpointMetadataService = jest.fn(
        () => mockMetadataService
      ) as unknown as EndpointAppContextService['getEndpointMetadataService'];

      try {
        const result = await tool.handler(
          { hostName: 'duplicated-host', agentId: 'live-b' },
          mockContext
        );

        const results = assertStandardReturn(result);
        const data = results[0].data as Record<string, unknown>;
        expect(data.found).toBe(true);
        expect(data.agentId).toBe('live-b');
        // The ID read stays constrained by the hostname it was requested for:
        // querying `agent.id` alone would return whatever host owns that ID and
        // then label the result with the caller's hostname, reporting (or
        // isolating) the wrong machine when the pair does not match.
        expect(mockMetadataService.getHostMetadataList).toHaveBeenCalledWith(
          {
            page: 0,
            pageSize: 1,
            kuery: 'agent.id: live-b AND united.endpoint.host.hostname: duplicated-host',
          },
          expect.objectContaining({ isCpsRead: expect.any(Function) })
        );
      } finally {
        mockEndpointAppContextService.getInternalFleetServices = originalGetInternalFleetServices;
        mockEndpointAppContextService.getEndpointMetadataService =
          originalGetEndpointMetadataService;
      }
    });

    it('does not report status for an agent ID that belongs to a different hostname', async () => {
      // An agent ID supplied alongside a hostname it does not belong to must not
      // resolve: the metadata read is hostname-constrained, so it finds nothing
      // and the caller gets endpoint_not_found instead of another host's status.
      const mockAgentService = {
        listAgents: jest.fn().mockResolvedValue({
          agents: [
            { id: 'live-a', status: 'online' },
            { id: 'live-b', status: 'online' },
          ],
        }),
      };

      const mockMetadataService = {
        getHostMetadataList: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      };

      const originalGetInternalFleetServices =
        mockEndpointAppContextService.getInternalFleetServices;
      const originalGetEndpointMetadataService =
        mockEndpointAppContextService.getEndpointMetadataService;

      mockEndpointAppContextService.getInternalFleetServices = jest.fn(() => ({
        agent: mockAgentService,
        ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
      })) as unknown as EndpointAppContextService['getInternalFleetServices'];
      mockEndpointAppContextService.getEndpointMetadataService = jest.fn(
        () => mockMetadataService
      ) as unknown as EndpointAppContextService['getEndpointMetadataService'];

      try {
        const result = await tool.handler(
          { hostName: 'other-host', agentId: 'live-b' },
          mockContext
        );

        const results = assertStandardReturn(result);
        const data = results[0].data as Record<string, unknown>;
        expect(data.found).toBe(false);
        expect(data.reason).toBe('endpoint_not_found');
      } finally {
        mockEndpointAppContextService.getInternalFleetServices = originalGetInternalFleetServices;
        mockEndpointAppContextService.getEndpointMetadataService =
          originalGetEndpointMetadataService;
      }
    });

    it('returns insufficient_privileges when caller lacks canReadSecuritySolution and canAccessFleet', async () => {
      const { getEndpointAuthzInitialStateMock } = jest.requireActual(
        '../../../../../../common/endpoint/service/authz/mocks'
      );
      mockEndpointAppContextService.getEndpointAuthz = jest.fn().mockResolvedValue(
        getEndpointAuthzInitialStateMock({
          canReadSecuritySolution: false,
          canAccessFleet: false,
        })
      );

      const result = await tool.handler({ hostName: 'safe-host' }, mockContext);

      const results = assertStandardReturn(result);
      expect(results[0].type).toBe(ToolResultType.error);
      const denialData = results[0].data as Record<string, unknown>;
      expect(denialData.error).toBe('insufficient_privileges');
      expect(denialData.privilege).toBe('canReadSecuritySolution');
    });

    it('returns unknown_error when metadata service throws', async () => {
      const mockAgentService = {
        listAgents: jest.fn().mockResolvedValue({
          agents: [
            {
              id: 'agent-fallback',
              last_checkin: '2024-03-15T08:00:00Z',
              isolation: true,
              host_status: 'unhealthy',
            },
          ],
        }),
      };

      const mockMetadataService = {
        getHostMetadataList: jest.fn().mockRejectedValue(new Error('metadata service timeout')),
      };

      const originalGetInternalFleetServices =
        mockEndpointAppContextService.getInternalFleetServices;
      const originalGetEndpointMetadataService =
        mockEndpointAppContextService.getEndpointMetadataService;

      mockEndpointAppContextService.getInternalFleetServices = jest.fn(() => ({
        agent: mockAgentService,
        ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
      })) as unknown as EndpointAppContextService['getInternalFleetServices'];
      mockEndpointAppContextService.getEndpointMetadataService = jest.fn(
        () => mockMetadataService
      ) as unknown as EndpointAppContextService['getEndpointMetadataService'];

      try {
        const result = await tool.handler({ hostName: 'fallback-host' }, mockContext);

        expect(assertStandardReturn(result)).toHaveLength(1);
        expect(assertStandardReturn(result)[0].type).toBe(ToolResultType.error);
        const data = assertStandardReturn(result)[0].data as Record<string, unknown>;
        expect(data.error).toBe('unknown_error');
        expect(data.message).toContain('metadata service timeout');
        expect(mockLogger.error).toHaveBeenCalled();
      } finally {
        mockEndpointAppContextService.getInternalFleetServices = originalGetInternalFleetServices;
        mockEndpointAppContextService.getEndpointMetadataService =
          originalGetEndpointMetadataService;
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
        const data = assertStandardReturn(result)[0].data as Record<string, unknown>;
        expect(data.error).toBe('unknown_error');
        expect(data.message).toContain('fleet service unavailable');
        expect(mockLogger.error).toHaveBeenCalled();
      } finally {
        mockEndpointAppContextService.getInternalFleetServices = originalGetInternalFleetServices;
      }
    });
  });
});
