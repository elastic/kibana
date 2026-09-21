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
  createEndpointResponseActionsSkill,
  GET_ENDPOINT_STATUS_TOOL_ID,
  LIST_ENDPOINTS_TOOL_ID,
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
      expect(data.isolated).toBe(false);
      expect(data.lastSeen).toBeNull();
      expect(data.status).toBe('offline');
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
        const result = await handler({ hostName: 'found-host' }, mockLogger);

        expect(assertStandardReturn(result)).toHaveLength(1);
        const data = assertStandardReturn(result)[0].data as Record<string, unknown>;
        expect(data.found).toBe(false);
        expect(data.reason).toBe('endpoint_not_found');
        expect(data.hostName).toBe('found-host');
        expect(assertStandardReturn(result)[0].type).toBe('other');
      } finally {
        mockEndpointAppContextService.getInternalFleetServices = originalGetInternalFleetServices;
        mockEndpointAppContextService.getEndpointMetadataService =
          originalGetEndpointMetadataService;
      }
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

  describe('not-found and failure are separate result types', () => {
    it('get_endpoint_status uses ToolResultType.other for not-found, but ToolResultType.error when the lookup itself fails', async () => {
      const skill = createEndpointResponseActionsSkill(mockEndpointAppContextService);
      const inlineTools = await skill.getInlineTools?.();
      const statusTool = inlineTools?.find((tool) => tool.id === GET_ENDPOINT_STATUS_TOOL_ID);
      const handler = (statusTool as unknown as { handler: Function }).handler;

      // A host that simply is not enrolled is a normal, reportable outcome.
      const notFoundResult = await handler(
        { hostName: 'nonexistent-host' },
        { logger: { error: jest.fn(), warn: jest.fn() } }
      );
      expect(assertStandardReturn(notFoundResult)[0].type).toBe('other');

      // A failing lookup is NOT the same thing: if it collapsed into the
      // not-found shape, the agent would tell the analyst "no such host"
      // when the truth is "we could not tell" — the two must stay distinct.
      const originalGetInternalFleetServices =
        mockEndpointAppContextService.getInternalFleetServices;
      mockEndpointAppContextService.getInternalFleetServices = jest.fn(() => ({
        agent: {
          listAgents: jest.fn().mockRejectedValue(new Error('fleet unavailable')),
        },
        ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
      })) as unknown as typeof mockEndpointAppContextService.getInternalFleetServices;

      try {
        const errorResult = await handler(
          { hostName: 'any-host' },
          { logger: { error: jest.fn(), warn: jest.fn() } }
        );

        const errorEntry = assertStandardReturn(errorResult)[0];
        expect(errorEntry.type).toBe('error');
        const data = errorEntry.data as Record<string, unknown>;
        expect(data.error).toBe('unknown_error');
        expect(data.found).toBeUndefined();
      } finally {
        mockEndpointAppContextService.getInternalFleetServices = originalGetInternalFleetServices;
      }
    });

    it('list_endpoints reports an empty list rather than a not-found shape when nothing is enrolled', async () => {
      const skill = createEndpointResponseActionsSkill(mockEndpointAppContextService);
      const inlineTools = await skill.getInlineTools?.();
      const listTool = (inlineTools ?? []).find((t) => t.id === LIST_ENDPOINTS_TOOL_ID);
      const handler = (listTool as unknown as { handler: Function }).handler;

      mockEndpointAppContextService.getEndpointMetadataService = jest.fn(
        () =>
          ({
            getHostMetadataList: jest.fn().mockResolvedValue({ data: [], total: 0 }),
          } as unknown as ReturnType<EndpointAppContextService['getEndpointMetadataService']>)
      );

      const result = await handler({}, { logger: { error: jest.fn(), warn: jest.fn() } });

      // `list_endpoints` answers "which hosts exist", so zero enrolled hosts is
      // a valid, successful answer — not the `found: false` /
      // `endpoint_not_found` shape the single-host lookup tools return. If this
      // ever collapsed into the not-found shape, the agent would report a
      // lookup failure for what is really just an empty fleet.
      const entry = assertStandardReturn(result)[0];
      expect(entry.type).toBe('other');
      const data = entry.data as Record<string, unknown>;
      expect(data.endpoints).toEqual([]);
      expect(data.total).toBe(0);
      expect(data.found).toBeUndefined();
      expect(data.reason).toBeUndefined();
    });
  });
});
