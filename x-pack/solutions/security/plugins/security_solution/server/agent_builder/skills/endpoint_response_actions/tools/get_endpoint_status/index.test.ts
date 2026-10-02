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
    // Hostname resolution also reads the Defend metadata index on origin, so
    // tests that only stub Fleet get an empty metadata index by default.
    jest
      .spyOn(mockEndpointAppContextService, 'getEndpointMetadataService')
      .mockImplementation((() => ({
        getHostMetadataList: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      })) as unknown as EndpointAppContextService['getEndpointMetadataService']);
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

    it('looks up a host by agent ID alone and derives the hostname from metadata', async () => {
      const mockMetadataService = {
        getHostMetadataList: jest.fn().mockResolvedValue({
          data: [
            {
              metadata: {
                host: { hostname: 'WIN-123' },
                Endpoint: { state: { isolation: true } },
              },
              last_checkin: '2024-06-01T12:00:00Z',
              host_status: 'healthy',
            },
          ],
        }),
      };

      jest
        .spyOn(mockEndpointAppContextService, 'getEndpointMetadataService')
        .mockImplementation(
          (() =>
            mockMetadataService) as unknown as EndpointAppContextService['getEndpointMetadataService']
        );

      const result = await tool.handler({ agentId: 'agent-123' }, mockContext);

      const data = assertStandardReturn(result)[0].data as Record<string, unknown>;
      expect(data.found).toBe(true);
      expect(data.hostName).toBe('WIN-123');
      expect(data.agentId).toBe('agent-123');
      expect(data.isolated).toBe(true);
      expect(mockMetadataService.getHostMetadataList).toHaveBeenCalledWith(
        {
          page: 0,
          pageSize: 1,
          // No hostname constraint when only the ID is supplied.
          kuery: '(united.agent.agent.id: "agent-123" OR agent.id: "agent-123")',
        },
        expect.objectContaining({ isCpsRead: expect.any(Function) })
      );
    });

    it('quotes an agent ID containing a space so it stays one exact term', async () => {
      const getHostMetadataList = jest.fn().mockResolvedValue({ data: [], total: 0 });
      jest
        .spyOn(mockEndpointAppContextService, 'getEndpointMetadataService')
        .mockImplementation((() => ({
          getHostMetadataList,
        })) as unknown as EndpointAppContextService['getEndpointMetadataService']);

      const result = await tool.handler({ agentId: 'agent 123' }, mockContext);

      const data = assertStandardReturn(result)[0].data as Record<string, unknown>;
      expect(data.found).toBe(false);
      expect(getHostMetadataList).toHaveBeenCalledWith(
        expect.objectContaining({
          kuery: '(united.agent.agent.id: "agent 123" OR agent.id: "agent 123")',
        }),
        expect.anything()
      );
    });

    it('reports an unknown agent ID as agentId, not as a hostname', async () => {
      const mockMetadataService = {
        getHostMetadataList: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      };
      jest
        .spyOn(mockEndpointAppContextService, 'getEndpointMetadataService')
        .mockImplementation(
          (() =>
            mockMetadataService) as unknown as EndpointAppContextService['getEndpointMetadataService']
        );

      const result = await tool.handler({ agentId: 'agent-404' }, mockContext);

      const data = assertStandardReturn(result)[0].data as Record<string, unknown>;
      expect(data.found).toBe(false);
      expect(data.reason).toBe('endpoint_not_found');
      expect(data.agentId).toBe('agent-404');
      expect(data).not.toHaveProperty('hostName');
      expect(data).not.toHaveProperty('isolated');
    });

    it('reports the Fleet agent id when looked up by Endpoint ID and the two ids differ', async () => {
      const mockMetadataService = {
        getHostMetadataList: jest.fn().mockResolvedValue({
          data: [
            {
              metadata: {
                host: { hostname: 'WIN-999' },
                Endpoint: { state: { isolation: false } },
                elastic: { agent: { id: 'fleet-999' } },
              },
              last_checkin: '2024-06-01T12:00:00Z',
              host_status: 'healthy',
            },
          ],
        }),
      };

      jest
        .spyOn(mockEndpointAppContextService, 'getEndpointMetadataService')
        .mockImplementation(
          (() =>
            mockMetadataService) as unknown as EndpointAppContextService['getEndpointMetadataService']
        );

      // Looked up by the Endpoint ID (agent.id), which differs from the
      // host's Fleet id (elastic.agent.id) in this fixture.
      const result = await tool.handler({ agentId: 'endpoint-id-123' }, mockContext);

      const data = assertStandardReturn(result)[0].data as Record<string, unknown>;
      expect(data.found).toBe(true);
      // The response must report the Fleet agent id, not the raw supplied
      // id, so it matches list_endpoints and response-action host keys.
      expect(data.agentId).toBe('fleet-999');
    });

    it('requires hostName, agentId, or both', () => {
      expect(() => tool.schema.parse({})).toThrow();
      expect(() => tool.schema.parse({ agentId: 'agent-123' })).not.toThrow();
      expect(() => tool.schema.parse({ hostName: 'my-host' })).not.toThrow();
    });

    it('returns found: false with reason "endpoint_not_found" when no agent matches', async () => {
      const mockAgentService = {
        listAgents: jest.fn().mockResolvedValue({ agents: [] }),
      };

      jest
        .spyOn(mockEndpointAppContextService, 'getInternalFleetServices')
        .mockImplementation((() => ({
          agent: mockAgentService,
          ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
        })) as unknown as EndpointAppContextService['getInternalFleetServices']);

      const result = await tool.handler({ hostName: 'nonexistent-host' }, mockContext);

      expect(assertStandardReturn(result)).toHaveLength(1);
      expect(assertStandardReturn(result)[0].type).toBe(ToolResultType.other);
      const data = assertStandardReturn(result)[0].data as Record<string, unknown>;
      expect(data.found).toBe(false);
      expect(data.reason).toBe('endpoint_not_found');
      expect(data.hostName).toBe('nonexistent-host');
      // No host was observed, so no host state may be reported.
      expect(data).not.toHaveProperty('isolated');
      expect(data).not.toHaveProperty('lastSeen');
      expect(data).not.toHaveProperty('status');
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('calls agentService.list with the correct kuery filter', async () => {
      const mockAgentService = {
        listAgents: jest.fn().mockResolvedValue({ agents: [] }),
      };

      jest
        .spyOn(mockEndpointAppContextService, 'getInternalFleetServices')
        .mockImplementation((() => ({
          agent: mockAgentService,
          ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
        })) as unknown as EndpointAppContextService['getInternalFleetServices']);

      await tool.handler({ hostName: 'my-host' }, mockContext);

      expect(mockAgentService.listAgents).toHaveBeenCalledWith({
        showInactive: true,
        kuery: 'local_metadata.host.name.keyword: "my-host"',
        page: 1,
        perPage: LOOKUP_PAGE_SIZE,
      });
    });

    it('returns found: true with correct data when agent and metadata lookups succeed', async () => {
      const mockAgentService = {
        listAgents: jest.fn().mockResolvedValue({
          agents: [{ id: 'agent-123', packages: ['endpoint'] }],
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

      jest
        .spyOn(mockEndpointAppContextService, 'getInternalFleetServices')
        .mockImplementation((() => ({
          agent: mockAgentService,
          ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
        })) as unknown as EndpointAppContextService['getInternalFleetServices']);
      jest
        .spyOn(mockEndpointAppContextService, 'getEndpointMetadataService')
        .mockImplementation(
          (() =>
            mockMetadataService) as unknown as EndpointAppContextService['getEndpointMetadataService']
        );

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
          // The id came from the hostname lookup, which already matched the
          // hostname, so the read is by id alone. It matches both identities:
          // the Fleet agent id (`united.agent.agent.id`) and the endpoint's
          // own id (top-level `agent.id`), which diverge on current agents.
          kuery: '(united.agent.agent.id: "agent-123" OR agent.id: "agent-123")',
        },
        // Scoped services are required for this read to fan out under CPS.
        expect.objectContaining({ isCpsRead: expect.any(Function) })
      );
    });

    it('returns found: true with non-isolated status when metadata shows isolation is false', async () => {
      const mockAgentService = {
        listAgents: jest.fn().mockResolvedValue({
          agents: [{ id: 'agent-456', packages: ['endpoint'] }],
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

      jest
        .spyOn(mockEndpointAppContextService, 'getInternalFleetServices')
        .mockImplementation((() => ({
          agent: mockAgentService,
          ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
        })) as unknown as EndpointAppContextService['getInternalFleetServices']);
      jest
        .spyOn(mockEndpointAppContextService, 'getEndpointMetadataService')
        .mockImplementation(
          (() =>
            mockMetadataService) as unknown as EndpointAppContextService['getEndpointMetadataService']
        );

      const result = await tool.handler({ hostName: 'safe-host' }, mockContext);

      expect(assertStandardReturn(result)).toHaveLength(1);
      const data = assertStandardReturn(result)[0].data as Record<string, unknown>;
      expect(data.found).toBe(true);
      expect(data.isolated).toBe(false);
      expect(data.status).toBe('healthy');
      expect(data.lastSeen).toBe('2024-06-01T12:00:00Z');
    });

    it('reports status "unknown", not a fabricated "offline", when metadata omits host_status', async () => {
      const mockAgentService = {
        listAgents: jest.fn().mockResolvedValue({
          agents: [{ id: 'agent-no-status', packages: ['endpoint'] }],
        }),
      };

      const mockMetadataService = {
        getHostMetadataList: jest.fn().mockResolvedValue({
          data: [
            {
              metadata: { Endpoint: { state: { isolation: false } } },
              last_checkin: '2024-06-01T12:00:00Z',
              // host_status intentionally absent
            },
          ],
          total: 1,
        }),
      };

      jest
        .spyOn(mockEndpointAppContextService, 'getInternalFleetServices')
        .mockImplementation((() => ({
          agent: mockAgentService,
          ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
        })) as unknown as EndpointAppContextService['getInternalFleetServices']);
      jest
        .spyOn(mockEndpointAppContextService, 'getEndpointMetadataService')
        .mockImplementation(
          (() =>
            mockMetadataService) as unknown as EndpointAppContextService['getEndpointMetadataService']
        );

      const result = await tool.handler({ hostName: 'no-status-host' }, mockContext);

      const data = assertStandardReturn(result)[0].data as Record<string, unknown>;
      expect(data.status).toBe('unknown');
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
              packages: ['endpoint'],
            },
          ],
        }),
      };

      const mockMetadataService = {
        getHostMetadataList: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      };

      jest
        .spyOn(mockEndpointAppContextService, 'getInternalFleetServices')
        .mockImplementation((() => ({
          agent: mockAgentService,
          ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
        })) as unknown as EndpointAppContextService['getInternalFleetServices']);
      jest
        .spyOn(mockEndpointAppContextService, 'getEndpointMetadataService')
        .mockImplementation(
          (() =>
            mockMetadataService) as unknown as EndpointAppContextService['getEndpointMetadataService']
        );

      const result = await tool.handler({ hostName: 'found-host' }, mockContext);

      expect(assertStandardReturn(result)).toHaveLength(1);
      const data = assertStandardReturn(result)[0].data as Record<string, unknown>;
      expect(data.found).toBe(false);
      expect(data.reason).toBe('endpoint_not_found');
      expect(data.hostName).toBe('found-host');
    });

    it('returns an ambiguous result when two online agents share the hostname', async () => {
      const mockAgentService = {
        listAgents: jest.fn().mockResolvedValue({
          agents: [
            { id: 'live-a', status: 'online', packages: ['endpoint'] },
            { id: 'live-b', status: 'online', packages: ['endpoint'] },
          ],
        }),
      };

      jest
        .spyOn(mockEndpointAppContextService, 'getInternalFleetServices')
        .mockImplementation((() => ({
          agent: mockAgentService,
          ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
        })) as unknown as EndpointAppContextService['getInternalFleetServices']);

      const result = await tool.handler({ hostName: 'duplicated-host' }, mockContext);

      const results = assertStandardReturn(result);
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe(ToolResultType.other);
      const data = results[0].data as Record<string, unknown>;
      // Must NOT report a status for an arbitrary one of the two hosts.
      expect(data.found).toBe(false);
      expect(data.reason).toBe('ambiguous_hostname');
      expect(data.candidates).toEqual([
        { agentId: 'live-a', status: 'healthy' },
        { agentId: 'live-b', status: 'healthy' },
      ]);
      expect(data.message).toContain('duplicated-host');
      expect(data.message).not.toContain('online');
      expect(mockLogger.error).not.toHaveBeenCalled();
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
            packages: ['endpoint'],
          })),
          total: 5000,
        }),
      };

      jest
        .spyOn(mockEndpointAppContextService, 'getInternalFleetServices')
        .mockImplementation((() => ({
          agent: mockAgentService,
          ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
        })) as unknown as EndpointAppContextService['getInternalFleetServices']);

      const result = await tool.handler({ hostName: 'huge-history-host' }, mockContext);

      const results = assertStandardReturn(result);
      const data = results[0].data as Record<string, unknown>;
      expect(data.found).toBe(false);
      expect(data.reason).toBe('ambiguous_hostname');
      expect(data.truncated).toBe(true);
      // Fleet's `total` is deliberately NOT surfaced: it counts agents
      // before space filtering, so exposing it would report how many matching
      // records exist in other Spaces. `truncated` alone carries the signal
      // the agent needs — "there were more than I examined".
      expect(data.totalCandidates).toBeUndefined();
      // The message must name the way out: re-calling with the agent ID.
      expect(data.message).toContain('agentId');
    });

    it('reads status by agent ID when the hostname resolves to several endpoints', async () => {
      // The ambiguity result tells the model to ask for an agent ID; accepting
      // one is what makes that instruction actionable instead of a dead end.
      const mockAgentService = {
        listAgents: jest.fn().mockResolvedValue({
          agents: [
            { id: 'live-a', status: 'online', packages: ['endpoint'] },
            { id: 'live-b', status: 'online', packages: ['endpoint'] },
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

      jest
        .spyOn(mockEndpointAppContextService, 'getInternalFleetServices')
        .mockImplementation((() => ({
          agent: mockAgentService,
          ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
        })) as unknown as EndpointAppContextService['getInternalFleetServices']);
      jest
        .spyOn(mockEndpointAppContextService, 'getEndpointMetadataService')
        .mockImplementation(
          (() =>
            mockMetadataService) as unknown as EndpointAppContextService['getEndpointMetadataService']
        );

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
          kuery:
            '(united.agent.agent.id: "live-b" OR agent.id: "live-b") AND (united.endpoint.host.hostname: "duplicated-host" OR united.agent.local_metadata.host.name.keyword: "duplicated-host")',
        },
        expect.objectContaining({ isCpsRead: expect.any(Function) })
      );
    });

    describe('FQDN hostname format', () => {
      // Fleet's `local_metadata.host.name` holds the FQDN while Defend writes
      // the short OS name to `united.endpoint.host.hostname`.
      const FQDN = 'web-01.example.com';

      const setup = () => {
        const mockAgentService = {
          listAgents: jest.fn().mockResolvedValue({
            agents: [{ id: 'fleet-web01', status: 'online', packages: ['endpoint'] }],
          }),
        };
        const mockMetadataService = {
          getHostMetadataList: jest.fn().mockImplementation(async ({ kuery }: { kuery: string }) =>
            // Only a query that can match the short-name document returns it,
            // like Elasticsearch would.
            kuery.includes('united.endpoint.host.hostname: "web-01.example.com"') &&
            !kuery.includes(' OR united.agent.local_metadata.host.name.keyword')
              ? { data: [], total: 0 }
              : {
                  data: [
                    {
                      metadata: {
                        host: { hostname: 'web-01' },
                        Endpoint: { state: { isolation: false } },
                      },
                      last_checkin: '2024-05-05T00:00:00Z',
                      host_status: 'healthy',
                    },
                  ],
                  total: 1,
                }
          ),
        };

        jest
          .spyOn(mockEndpointAppContextService, 'getInternalFleetServices')
          .mockImplementation((() => ({
            agent: mockAgentService,
            ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
          })) as unknown as EndpointAppContextService['getInternalFleetServices']);
        jest
          .spyOn(mockEndpointAppContextService, 'getEndpointMetadataService')
          .mockImplementation(
            (() =>
              mockMetadataService) as unknown as EndpointAppContextService['getEndpointMetadataService']
          );

        return mockMetadataService;
      };

      it('reads status by id alone when the agent id came from resolving an FQDN hostname', async () => {
        const mockMetadataService = setup();

        const result = await tool.handler({ hostName: FQDN }, mockContext);

        const data = assertStandardReturn(result)[0].data as Record<string, unknown>;
        expect(data.found).toBe(true);
        expect(data.agentId).toBe('fleet-web01');
        expect(data.status).toBe('healthy');
        // The last metadata read is the status read: id only, no hostname AND.
        const kueries = mockMetadataService.getHostMetadataList.mock.calls.map(
          ([query]: [{ kuery: string }]) => query.kuery
        );
        expect(kueries[kueries.length - 1]).toBe(
          '(united.agent.agent.id: "fleet-web01" OR agent.id: "fleet-web01")'
        );
      });

      it('accepts the Fleet FQDN as the hostname constraint when the caller supplies the agent id', async () => {
        const mockMetadataService = setup();

        const result = await tool.handler({ hostName: FQDN, agentId: 'fleet-web01' }, mockContext);

        const data = assertStandardReturn(result)[0].data as Record<string, unknown>;
        expect(data.found).toBe(true);
        expect(data.agentId).toBe('fleet-web01');
        expect(mockMetadataService.getHostMetadataList).toHaveBeenCalledWith(
          {
            page: 0,
            pageSize: 1,
            kuery: `(united.agent.agent.id: "fleet-web01" OR agent.id: "fleet-web01") AND (united.endpoint.host.hostname: "${FQDN}" OR united.agent.local_metadata.host.name.keyword: "${FQDN}")`,
          },
          expect.objectContaining({ isCpsRead: expect.any(Function) })
        );
      });
    });

    it('does not report status for an agent ID that belongs to a different hostname', async () => {
      // An agent ID supplied alongside a hostname it does not belong to must not
      // resolve: the metadata read is hostname-constrained, so it finds nothing
      // and the caller gets endpoint_not_found instead of another host's status.
      const mockAgentService = {
        listAgents: jest.fn().mockResolvedValue({
          agents: [
            { id: 'live-a', status: 'online', packages: ['endpoint'] },
            { id: 'live-b', status: 'online', packages: ['endpoint'] },
          ],
        }),
      };

      const mockMetadataService = {
        getHostMetadataList: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      };

      jest
        .spyOn(mockEndpointAppContextService, 'getInternalFleetServices')
        .mockImplementation((() => ({
          agent: mockAgentService,
          ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
        })) as unknown as EndpointAppContextService['getInternalFleetServices']);
      jest
        .spyOn(mockEndpointAppContextService, 'getEndpointMetadataService')
        .mockImplementation(
          (() =>
            mockMetadataService) as unknown as EndpointAppContextService['getEndpointMetadataService']
        );

      const result = await tool.handler({ hostName: 'other-host', agentId: 'live-b' }, mockContext);

      const results = assertStandardReturn(result);
      const data = results[0].data as Record<string, unknown>;
      expect(data.found).toBe(false);
      expect(data.reason).toBe('endpoint_not_found');
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

    it('returns insufficient_privileges for a Fleet-only caller without canReadSecuritySolution', async () => {
      // The metadata detail route requires the `securitySolution` feature
      // privilege before its `any: [canReadSecuritySolution, canAccessFleet]`
      // check, so Fleet access alone never reaches it.
      const { getEndpointAuthzInitialStateMock } = jest.requireActual(
        '../../../../../../common/endpoint/service/authz/mocks'
      );
      mockEndpointAppContextService.getEndpointAuthz = jest.fn().mockResolvedValue(
        getEndpointAuthzInitialStateMock({
          canReadSecuritySolution: false,
          canAccessFleet: true,
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
              packages: ['endpoint'],
            },
          ],
        }),
      };

      const mockMetadataService = {
        getHostMetadataList: jest.fn().mockRejectedValue(new Error('metadata service timeout')),
      };

      jest
        .spyOn(mockEndpointAppContextService, 'getInternalFleetServices')
        .mockImplementation((() => ({
          agent: mockAgentService,
          ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
        })) as unknown as EndpointAppContextService['getInternalFleetServices']);
      jest
        .spyOn(mockEndpointAppContextService, 'getEndpointMetadataService')
        .mockImplementation(
          (() =>
            mockMetadataService) as unknown as EndpointAppContextService['getEndpointMetadataService']
        );

      const result = await tool.handler({ hostName: 'fallback-host' }, mockContext);

      expect(assertStandardReturn(result)).toHaveLength(1);
      expect(assertStandardReturn(result)[0].type).toBe(ToolResultType.error);
      const data = assertStandardReturn(result)[0].data as Record<string, unknown>;
      expect(data.error).toBe('unknown_error');
      expect(data.message).toContain('metadata service timeout');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('returns an error result when the agent service throws', async () => {
      const mockAgentService = {
        listAgents: jest.fn().mockRejectedValue(new Error('fleet service unavailable')),
      };

      jest
        .spyOn(mockEndpointAppContextService, 'getInternalFleetServices')
        .mockImplementation((() => ({
          agent: mockAgentService,
          ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
        })) as unknown as EndpointAppContextService['getInternalFleetServices']);

      const result = await tool.handler({ hostName: 'my-host' }, mockContext);

      expect(assertStandardReturn(result)).toHaveLength(1);
      expect(assertStandardReturn(result)[0].type).toBe(ToolResultType.error);
      const data = assertStandardReturn(result)[0].data as Record<string, unknown>;
      expect(data.error).toBe('unknown_error');
      expect(data.message).toContain('fleet service unavailable');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('reports endpoint_not_found for a SentinelOne-only hostname instead of a phantom miss', async () => {
      // The status read is backed by the Defend metadata index. Resolving a
      // third-party agent would hand a valid Fleet id to a read that can never
      // find it — so resolution itself is scoped to Elastic Defend and the
      // caller is told there is no Defend endpoint by that name.
      const mockAgentService = {
        listAgents: jest.fn().mockResolvedValue({
          agents: [{ id: 'agent-s1', status: 'online', packages: ['sentinel_one'] }],
        }),
      };
      const mockMetadataService = {
        getHostMetadataList: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      };

      jest
        .spyOn(mockEndpointAppContextService, 'getInternalFleetServices')
        .mockImplementation((() => ({
          agent: mockAgentService,
          ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
        })) as unknown as EndpointAppContextService['getInternalFleetServices']);
      jest
        .spyOn(mockEndpointAppContextService, 'getEndpointMetadataService')
        .mockImplementation(
          (() =>
            mockMetadataService) as unknown as EndpointAppContextService['getEndpointMetadataService']
        );

      const result = await tool.handler({ hostName: 's1-host' }, mockContext);

      const data = assertStandardReturn(result)[0].data as Record<string, unknown>;
      expect(data.found).toBe(false);
      expect(data.reason).toBe('endpoint_not_found');
    });
  });
});
