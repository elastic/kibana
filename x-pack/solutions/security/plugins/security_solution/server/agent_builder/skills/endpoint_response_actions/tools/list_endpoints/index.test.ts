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
import { LIST_ENDPOINTS_TOOL_ID } from '../..';
import { listEndpointsTool, MAX_LIST_ENDPOINTS_PAGE } from '.';

const mockLogger = { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() };
const mockContext = { logger: mockLogger } as unknown as ToolHandlerContext;

function assertStandardReturn(result: unknown) {
  if (!isToolHandlerStandardReturn(result as ToolHandlerReturn)) {
    throw new Error('Expected standard tool return');
  }
  return (result as ToolHandlerStandardReturn).results;
}

describe('listEndpointsTool', () => {
  let mockEndpointAppContextService: EndpointAppContextService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockEndpointAppContextService = createMockEndpointAppContext().service;
  });

  describe('tool definition', () => {
    it('returns a valid builtin tool definition', () => {
      const tool = listEndpointsTool(mockEndpointAppContextService);
      expect(tool.type).toBe(ToolType.builtin);
      expect(tool.id).toBe(LIST_ENDPOINTS_TOOL_ID);
      expect(tool.description).toContain('endpoint');
      expect(tool.schema).toBeDefined();
    });

    it('has correct tool id format', () => {
      expect(LIST_ENDPOINTS_TOOL_ID).toBe('endpoint-response-actions.list_endpoints');
    });
  });

  describe('handler', () => {
    let tool: ReturnType<typeof listEndpointsTool>;

    beforeEach(() => {
      tool = listEndpointsTool(mockEndpointAppContextService);
    });

    it('reports the Fleet agent id when both endpoint and fleet ids are present', async () => {
      const mockMetadataService = {
        getHostMetadataList: jest.fn().mockResolvedValue({
          data: [
            {
              metadata: {
                host: { hostname: 'dual-id-host', os: { name: 'Windows', version: '11' } },
                agent: { id: 'endpoint-id-1' },
                elastic: { agent: { id: 'fleet-id-1' } },
                Endpoint: { state: { isolation: false } },
              },
              host_status: 'healthy',
              last_checkin: '2024-06-01T12:00:00Z',
            },
          ],
          total: 1,
        }),
      };

      jest
        .spyOn(mockEndpointAppContextService, 'getEndpointMetadataService')
        .mockImplementation(
          (() =>
            mockMetadataService) as unknown as EndpointAppContextService['getEndpointMetadataService']
        );

      const result = await tool.handler({}, mockContext);

      const data = assertStandardReturn(result)[0].data as {
        endpoints: Array<Record<string, unknown>>;
      };
      expect(data.endpoints[0].agentId).toBe('fleet-id-1');
      expect(data.endpoints[0].hostName).toBe('dual-id-host');
    });

    it('returns a list of endpoints with status and isolation info', async () => {
      const mockMetadataService = {
        getHostMetadataList: jest.fn().mockResolvedValue({
          data: [
            {
              metadata: {
                host: { hostname: 'server-alpha', os: { name: 'Ubuntu', version: '22.04' } },
                agent: { id: 'agent-1' },
                Endpoint: { state: { isolation: false } },
              },
              last_checkin: '2024-06-01T12:00:00Z',
              host_status: 'healthy',
            },
            {
              metadata: {
                host: { hostname: 'server-bravo', os: { name: 'Windows', version: '11' } },
                agent: { id: 'agent-2' },
                Endpoint: { state: { isolation: true } },
              },
              last_checkin: '2024-06-01T10:00:00Z',
              host_status: 'unhealthy',
            },
          ],
          total: 2,
        }),
      };

      jest
        .spyOn(mockEndpointAppContextService, 'getEndpointMetadataService')
        .mockImplementation(
          (() =>
            mockMetadataService) as unknown as EndpointAppContextService['getEndpointMetadataService']
        );

      const result = await tool.handler({}, mockContext);
      const results = assertStandardReturn(result);
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe(ToolResultType.other);

      const data = results[0].data as {
        endpoints: Array<Record<string, unknown>>;
        total: number;
      };
      expect(data.total).toBe(2);
      expect(data.endpoints).toHaveLength(2);

      expect(data.endpoints[0]).toEqual(
        expect.objectContaining({
          hostName: 'server-alpha',
          status: 'healthy',
          isolated: false,
          os: 'Ubuntu 22.04',
        })
      );
      expect(data.endpoints[1]).toEqual(
        expect.objectContaining({
          hostName: 'server-bravo',
          status: 'unhealthy',
          isolated: true,
          os: 'Windows 11',
        })
      );
    });

    it('returns empty list when no endpoints exist', async () => {
      const mockMetadataService = {
        getHostMetadataList: jest.fn().mockResolvedValue({
          data: [],
          total: 0,
        }),
      };

      jest
        .spyOn(mockEndpointAppContextService, 'getEndpointMetadataService')
        .mockImplementation(
          (() =>
            mockMetadataService) as unknown as EndpointAppContextService['getEndpointMetadataService']
        );

      const result = await tool.handler({}, mockContext);
      const results = assertStandardReturn(result);
      const data = results[0].data as {
        endpoints: Array<Record<string, unknown>>;
        total: number;
      };
      expect(data.total).toBe(0);
      expect(data.endpoints).toHaveLength(0);
    });

    it.each([
      ['whitespace', 'prod web'],
      ['a tab', 'prod\tweb'],
      ['an opening curly brace', 'prod{web'],
      ['a closing curly brace', 'prod}web'],
    ])(
      'rejects a hostNameFilter containing %s with invalid_argument before querying',
      async (_label, hostNameFilter) => {
        // With no index pattern the wildcard compiles to `query_string`, which
        // splits on whitespace (`*prod web*` -> `*prod OR web*`), and
        // `escapeKuery` leaves `{`/`}` unescaped, so they throw parser errors.
        const mockMetadataService = { getHostMetadataList: jest.fn() };
        jest
          .spyOn(mockEndpointAppContextService, 'getEndpointMetadataService')
          .mockImplementation(
            (() =>
              mockMetadataService) as unknown as EndpointAppContextService['getEndpointMetadataService']
          );

        const result = await tool.handler({ hostNameFilter }, mockContext);

        const results = assertStandardReturn(result);
        expect(results[0].type).toBe(ToolResultType.error);
        expect((results[0].data as Record<string, unknown>).error).toBe('invalid_argument');
        expect(mockMetadataService.getHostMetadataList).not.toHaveBeenCalled();
      }
    );

    describe('hostNameFilter kuery', () => {
      const queryFor = async (hostNameFilter: string) => {
        const mockMetadataService = {
          getHostMetadataList: jest.fn().mockResolvedValue({ data: [], total: 0 }),
        };
        jest
          .spyOn(mockEndpointAppContextService, 'getEndpointMetadataService')
          .mockImplementation(
            (() =>
              mockMetadataService) as unknown as EndpointAppContextService['getEndpointMetadataService']
          );

        await tool.handler({ hostNameFilter }, mockContext);

        expect(mockMetadataService.getHostMetadataList).toHaveBeenCalledWith(
          expect.any(Object),
          // Scoped services must be threaded through, otherwise the read is
          // origin-only under CPS and linked-project hosts disappear.
          expect.objectContaining({ isCpsRead: expect.any(Function) })
        );
        const [[calledArgs]] = mockMetadataService.getHostMetadataList.mock.calls;
        return calledArgs as { kuery: string };
      };

      it('wraps the filter in a wildcard on the hostname keyword field', async () => {
        expect((await queryFor('prod-web')).kuery).toBe(
          'united.endpoint.host.hostname: *prod-web*'
        );
      });

      it('escapes KQL special characters in the filter', async () => {
        expect((await queryFor('prod-web(1)"*')).kuery).toBe(
          String.raw`united.endpoint.host.hostname: *prod-web\(1\)\"\**`
        );
      });

      it('passes the filter through case-sensitively so stored names with capitals stay matchable', async () => {
        // `united.endpoint.host.hostname` is a `keyword` with no normalizer,
        // so lowercasing would make `WIN-ABC123` unmatchable.
        expect((await queryFor('WIN-ABC')).kuery).toBe('united.endpoint.host.hostname: *WIN-ABC*');
      });
    });

    it('reports status "unknown", not a fabricated "offline", when an entry has no host_status', async () => {
      const mockMetadataService = {
        getHostMetadataList: jest.fn().mockResolvedValue({
          data: [
            {
              metadata: {
                host: { hostname: 'no-status-host', os: { name: 'Ubuntu', version: '22.04' } },
                agent: { id: 'agent-1' },
                Endpoint: { state: { isolation: false } },
              },
              last_checkin: '2024-06-01T12:00:00Z',
              // host_status intentionally absent
            },
          ],
          total: 1,
        }),
      };

      jest
        .spyOn(mockEndpointAppContextService, 'getEndpointMetadataService')
        .mockImplementation(
          (() =>
            mockMetadataService) as unknown as EndpointAppContextService['getEndpointMetadataService']
        );

      const result = await tool.handler({}, mockContext);
      const data = assertStandardReturn(result)[0].data as {
        endpoints: Array<Record<string, unknown>>;
      };
      expect(data.endpoints[0].status).toBe('unknown');
    });

    it('returns an error result when the metadata service throws', async () => {
      const mockMetadataService = {
        getHostMetadataList: jest.fn().mockRejectedValue(new Error('metadata service unavailable')),
      };

      jest
        .spyOn(mockEndpointAppContextService, 'getEndpointMetadataService')
        .mockImplementation(
          (() =>
            mockMetadataService) as unknown as EndpointAppContextService['getEndpointMetadataService']
        );

      const result = await tool.handler({}, mockContext);
      const results = assertStandardReturn(result);
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe(ToolResultType.error);
      expect(results[0].data).toHaveProperty('message');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('handles missing os metadata gracefully', async () => {
      const mockMetadataService = {
        getHostMetadataList: jest.fn().mockResolvedValue({
          data: [
            {
              metadata: {
                host: { hostname: 'no-os-host' },
                agent: { id: 'agent-no-os' },
                Endpoint: { state: { isolation: false } },
              },
              last_checkin: '2024-06-01T12:00:00Z',
              host_status: 'healthy',
            },
          ],
          total: 1,
        }),
      };

      jest
        .spyOn(mockEndpointAppContextService, 'getEndpointMetadataService')
        .mockImplementation(
          (() =>
            mockMetadataService) as unknown as EndpointAppContextService['getEndpointMetadataService']
        );

      const result = await tool.handler({}, mockContext);
      const results = assertStandardReturn(result);
      const data = results[0].data as {
        endpoints: Array<Record<string, unknown>>;
        total: number;
      };
      expect(data.endpoints[0].os).toBe('Unknown');
    });

    it('returns up to 50 endpoints by default', async () => {
      const mockMetadataService = {
        getHostMetadataList: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      };

      jest
        .spyOn(mockEndpointAppContextService, 'getEndpointMetadataService')
        .mockImplementation(
          (() =>
            mockMetadataService) as unknown as EndpointAppContextService['getEndpointMetadataService']
        );

      await tool.handler({}, mockContext);

      expect(mockMetadataService.getHostMetadataList).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 0,
          pageSize: 50,
        }),
        expect.objectContaining({ isCpsRead: expect.any(Function) })
      );
    });

    it('forwards the requested page to the metadata service', async () => {
      const mockMetadataService = {
        getHostMetadataList: jest.fn().mockResolvedValue({ data: [], total: 120 }),
      };

      jest
        .spyOn(mockEndpointAppContextService, 'getEndpointMetadataService')
        .mockImplementation(
          (() =>
            mockMetadataService) as unknown as EndpointAppContextService['getEndpointMetadataService']
        );

      await tool.handler({ page: 2 }, mockContext);

      expect(mockMetadataService.getHostMetadataList).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, pageSize: 50 }),
        expect.objectContaining({ isCpsRead: expect.any(Function) })
      );
    });

    it('reports hasMore when the fleet is larger than one page', async () => {
      // A fleet bigger than one page must not look like the whole inventory.
      const mockMetadataService = {
        getHostMetadataList: jest.fn().mockResolvedValue({
          data: Array.from({ length: 50 }, (_, i) => ({
            metadata: {
              host: { hostname: `host-${i}` },
              agent: { id: `agent-${i}` },
              Endpoint: { state: { isolation: false } },
            },
            last_checkin: '2024-06-01T12:00:00Z',
            host_status: 'healthy',
          })),
          total: 120,
        }),
      };

      jest
        .spyOn(mockEndpointAppContextService, 'getEndpointMetadataService')
        .mockImplementation(
          (() =>
            mockMetadataService) as unknown as EndpointAppContextService['getEndpointMetadataService']
        );

      const result = await tool.handler({ page: 0 }, mockContext);
      const data = assertStandardReturn(result)[0].data as Record<string, unknown>;

      expect(data.total).toBe(120);
      expect(data.page).toBe(0);
      expect(data.pageSize).toBe(50);
      expect(data.hasMore).toBe(true);
    });

    it('rejects a page beyond the cap with invalid_argument before querying', async () => {
      const mockMetadataService = { getHostMetadataList: jest.fn() };
      jest
        .spyOn(mockEndpointAppContextService, 'getEndpointMetadataService')
        .mockImplementation(
          (() =>
            mockMetadataService) as unknown as EndpointAppContextService['getEndpointMetadataService']
        );

      const result = await tool.handler({ page: MAX_LIST_ENDPOINTS_PAGE + 1 }, mockContext);
      const results = assertStandardReturn(result);

      expect(results[0].type).toBe(ToolResultType.error);
      expect((results[0].data as Record<string, unknown>).error).toBe('invalid_argument');
      expect(mockMetadataService.getHostMetadataList).not.toHaveBeenCalled();
    });

    it('reports hasMore false at the page cap even when the fleet is larger', async () => {
      // The page cap rejects page 200+, so signaling more data at the cap
      // would steer the agent into a guaranteed-error request.
      const mockMetadataService = {
        getHostMetadataList: jest.fn().mockResolvedValue({
          data: Array.from({ length: 50 }, (_, i) => ({
            metadata: {
              host: { hostname: `host-${i}` },
              agent: { id: `agent-${i}` },
              Endpoint: { state: { isolation: false } },
            },
            last_checkin: '2024-06-01T12:00:00Z',
            host_status: 'healthy',
          })),
          total: 20000,
        }),
      };

      jest
        .spyOn(mockEndpointAppContextService, 'getEndpointMetadataService')
        .mockImplementation(
          (() =>
            mockMetadataService) as unknown as EndpointAppContextService['getEndpointMetadataService']
        );

      const result = await tool.handler({ page: MAX_LIST_ENDPOINTS_PAGE }, mockContext);
      const data = assertStandardReturn(result)[0].data as Record<string, unknown>;

      expect(data.page).toBe(MAX_LIST_ENDPOINTS_PAGE);
      expect(data.total).toBe(20000);
      expect(data.hasMore).toBe(false);
    });

    it('walks a second page without repeating or losing endpoints', async () => {
      // Forwarding `page` is not the same as paging: a tool that passed the
      // parameter through but returned page 0's data would satisfy every
      // assertion above. Walk the whole inventory and check the pages are
      // disjoint and their union is complete.
      const TOTAL = 90;
      // 50 + 20 + 20 = TOTAL, so the walk covers the whole inventory.
      const pageSizes = [50, 20, 20];
      const pageOffsets = [0, 50, 70];
      const pageOf = (page: number) =>
        Array.from({ length: pageSizes[page] ?? 0 }, (_, i) => ({
          metadata: {
            host: { hostname: `host-${pageOffsets[page] + i}` },
            agent: { id: `agent-${pageOffsets[page] + i}` },
            Endpoint: { state: { isolation: false } },
          },
          last_checkin: '2024-06-01T12:00:00Z',
          host_status: 'healthy',
        }));

      const mockMetadataService = {
        getHostMetadataList: jest.fn(async ({ page }: { page: number }) => ({
          data: pageOf(page),
          total: TOTAL,
        })),
      };

      jest
        .spyOn(mockEndpointAppContextService, 'getEndpointMetadataService')
        .mockImplementation(
          (() =>
            mockMetadataService) as unknown as EndpointAppContextService['getEndpointMetadataService']
        );

      const hostNamesFor = async (page: number) => {
        const result = await tool.handler({ page }, mockContext);
        const data = assertStandardReturn(result)[0].data as {
          endpoints: Array<{ hostName: string }>;
          hasMore: boolean;
        };

        return { hostNames: data.endpoints.map((endpoint) => endpoint.hostName), data };
      };

      const first = await hostNamesFor(0);
      const second = await hostNamesFor(1);
      const last = await hostNamesFor(2);

      expect(first.hostNames).toHaveLength(50);
      expect(second.hostNames).toHaveLength(20);
      expect(second.hostNames[0]).toBe('host-50');
      expect(last.hostNames).toHaveLength(20);
      expect(last.hostNames[0]).toBe('host-70');

      const union = new Set([...first.hostNames, ...second.hostNames, ...last.hostNames]);
      // 50 + 20 + 20: no repeats (disjoint pages) and no gaps.
      expect(union.size).toBe(TOTAL);

      expect(first.data.hasMore).toBe(true);
      expect(second.data.hasMore).toBe(true);
      expect(last.data.hasMore).toBe(false);
    });

    it('reports hasMore false on the last page', async () => {
      const mockMetadataService = {
        getHostMetadataList: jest.fn().mockResolvedValue({
          data: Array.from({ length: 20 }, (_, i) => ({
            metadata: {
              host: { hostname: `host-${i}` },
              agent: { id: `agent-${i}` },
              Endpoint: { state: { isolation: false } },
            },
            last_checkin: '2024-06-01T12:00:00Z',
            host_status: 'healthy',
          })),
          total: 120,
        }),
      };

      jest
        .spyOn(mockEndpointAppContextService, 'getEndpointMetadataService')
        .mockImplementation(
          (() =>
            mockMetadataService) as unknown as EndpointAppContextService['getEndpointMetadataService']
        );

      const result = await tool.handler({ page: 2 }, mockContext);
      const data = assertStandardReturn(result)[0].data as Record<string, unknown>;

      expect(data.hasMore).toBe(false);
    });

    it('includes the applied policy for each endpoint', async () => {
      const mockMetadataService = {
        getHostMetadataList: jest.fn().mockResolvedValue({
          data: [
            {
              metadata: {
                host: { hostname: 'policy-host', os: { name: 'Ubuntu', version: '22.04' } },
                agent: { id: 'agent-policy' },
                Endpoint: {
                  state: { isolation: false },
                  policy: { applied: { id: 'policy-1', name: 'Production Defend' } },
                },
              },
              last_checkin: '2024-06-01T12:00:00Z',
              host_status: 'healthy',
            },
          ],
          total: 1,
        }),
      };

      jest
        .spyOn(mockEndpointAppContextService, 'getEndpointMetadataService')
        .mockImplementation(
          (() =>
            mockMetadataService) as unknown as EndpointAppContextService['getEndpointMetadataService']
        );

      const result = await tool.handler({}, mockContext);
      const data = assertStandardReturn(result)[0].data as {
        endpoints: Array<Record<string, unknown>>;
      };

      expect(data.endpoints[0].policy).toEqual({
        id: 'policy-1',
        name: 'Production Defend',
      });
    });

    it('returns policy: null when policy metadata is absent', async () => {
      const mockMetadataService = {
        getHostMetadataList: jest.fn().mockResolvedValue({
          data: [
            {
              metadata: {
                host: { hostname: 'no-policy-host' },
                agent: { id: 'agent-no-policy' },
                Endpoint: { state: { isolation: false } },
              },
              last_checkin: '2024-06-01T12:00:00Z',
              host_status: 'healthy',
            },
          ],
          total: 1,
        }),
      };

      jest
        .spyOn(mockEndpointAppContextService, 'getEndpointMetadataService')
        .mockImplementation(
          (() =>
            mockMetadataService) as unknown as EndpointAppContextService['getEndpointMetadataService']
        );

      const result = await tool.handler({}, mockContext);
      const data = assertStandardReturn(result)[0].data as {
        endpoints: Array<Record<string, unknown>>;
      };

      expect(data.endpoints[0].policy).toBeNull();
    });

    it('returns insufficient_privileges when caller lacks canReadSecuritySolution', async () => {
      const { getEndpointAuthzInitialStateMock } = jest.requireActual(
        '../../../../../../common/endpoint/service/authz/mocks'
      );
      mockEndpointAppContextService.getEndpointAuthz = jest.fn().mockResolvedValue(
        getEndpointAuthzInitialStateMock({
          canReadSecuritySolution: false,
          canAccessFleet: false,
        })
      );

      const result = await tool.handler({}, mockContext);

      const results = assertStandardReturn(result);
      expect(results[0].type).toBe(ToolResultType.error);
      const denialData = results[0].data as Record<string, unknown>;
      expect(denialData.error).toBe('insufficient_privileges');
      expect(denialData.privilege).toBe('canReadSecuritySolution');
    });
  });
});
