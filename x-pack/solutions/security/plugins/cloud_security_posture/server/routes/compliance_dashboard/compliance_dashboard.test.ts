/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import type { RequestHandlerContext } from '@kbn/core/server';
import { kibanaResponseFactory } from '@kbn/core/server';
import { defineGetComplianceDashboardRoute } from './compliance_dashboard';

vi.mock('./get_trends', () => {
  const mocked = {
    getTrends: vi.fn().mockResolvedValue({ trends: [], namespaces: [] }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../benchmark_rules/get_states/v1', () => {
  const mocked = {
    getMutedRulesFilterQuery: vi.fn().mockResolvedValue([]),
  };
  return { ...mocked, default: mocked };
});

describe('compliance dashboard route PIT refresh', () => {
  const setup = () => {
    const httpService = httpServiceMock.createSetupContract();
    const router = httpService.createRouter();

    defineGetComplianceDashboardRoute(router as any);

    const addVersionCalls = router.versioned.get.mock.results[0].value.addVersion.mock.calls;
    const [v1RouteDefinition, v1RouteHandler] = addVersionCalls[0];
    const [v2RouteDefinition, v2RouteHandler] = addVersionCalls[1];

    return {
      v1RouteDefinition,
      v1RouteHandler,
      v2RouteDefinition,
      v2RouteHandler,
    };
  };

  it('v1 should roll forward pit_id between searches and for close', async () => {
    const { v1RouteHandler } = setup();

    const esClient = {
      openPointInTime: vi.fn().mockResolvedValue({ id: 'pit-0' }),
      search: vi
        .fn()
        .mockResolvedValueOnce({
          pit_id: 'pit-1',
          aggregations: {
            failed_findings: { doc_count: 1 },
            passed_findings: { doc_count: 2 },
            resources_evaluated: { value: 3 },
          },
        })
        .mockResolvedValueOnce({
          pit_id: 'pit-2',
          aggregations: { aggs_by_resource_type: { buckets: [] } },
        })
        .mockResolvedValueOnce({
          pit_id: 'pit-3',
          aggregations: { aggs_by_asset_identifier: { buckets: [] } },
        }),
      closePointInTime: vi.fn().mockResolvedValue({ succeeded: true, num_freed: 1 }),
    };

    const logger = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() };

    const mockRouteContext = {
      csp: Promise.resolve({
        logger,
        esClient: { asCurrentUser: esClient },
        encryptedSavedObjects: {},
      }),
    } as unknown as RequestHandlerContext;

    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      params: { policy_template: 'cspm' },
    });

    await v1RouteHandler(mockRouteContext, request as any, kibanaResponseFactory);

    expect(esClient.search.mock.calls[0][0].pit.id).toBe('pit-0');
    expect(esClient.search.mock.calls[1][0].pit.id).toBe('pit-1');
    expect(esClient.search.mock.calls[2][0].pit.id).toBe('pit-2');
    expect(esClient.closePointInTime).toHaveBeenCalledWith({ id: 'pit-3' });
  });

  it('v2 should roll forward pit_id between searches and for close', async () => {
    const { v2RouteHandler } = setup();

    const esClient = {
      openPointInTime: vi.fn().mockResolvedValue({ id: 'pit-0' }),
      search: vi
        .fn()
        .mockResolvedValueOnce({
          pit_id: 'pit-1',
          aggregations: {
            failed_findings: { doc_count: 1 },
            passed_findings: { doc_count: 2 },
            resources_evaluated: { value: 3 },
          },
        })
        .mockResolvedValueOnce({
          pit_id: 'pit-2',
          aggregations: { aggs_by_resource_type: { buckets: [] } },
        })
        .mockResolvedValueOnce({
          pit_id: 'pit-3',
          aggregations: {
            aggs_by_benchmark: {
              buckets: [{ key: 'cis', doc_count: 0, aggs_by_benchmark_version: { buckets: [] } }],
            },
          },
        }),
      closePointInTime: vi.fn().mockResolvedValue({ succeeded: true, num_freed: 1 }),
    };

    const logger = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() };

    const mockRouteContext = {
      csp: Promise.resolve({
        logger,
        esClient: { asCurrentUser: esClient },
        encryptedSavedObjects: {},
      }),
    } as unknown as RequestHandlerContext;

    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      params: { policy_template: 'cspm' },
      query: {},
    });

    await v2RouteHandler(mockRouteContext, request as any, kibanaResponseFactory);

    expect(esClient.search.mock.calls[0][0].pit.id).toBe('pit-0');
    expect(esClient.search.mock.calls[1][0].pit.id).toBe('pit-1');
    expect(esClient.search.mock.calls[2][0].pit.id).toBe('pit-2');
    expect(esClient.closePointInTime).toHaveBeenCalledWith({ id: 'pit-3' });
  });
});
