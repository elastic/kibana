/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import {
  createToolTestMocks,
  createToolHandlerContext,
  setupMockCoreStartServices,
} from '../../../__mocks__/test_helpers';
import type { ProductFeaturesService } from '../../../../lib/product_features_service/product_features_service';
import { getMigrationRulesTool } from './get_migration_rules_tool';

const mockProductFeaturesService = {
  isEnabled: jest.fn().mockReturnValue(true),
} as unknown as ProductFeaturesService;

describe('getMigrationRulesTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockSecurityStart, mockRequest } =
    createToolTestMocks();
  const tool = getMigrationRulesTool(mockCore, mockLogger, mockProductFeaturesService);
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    const mockCoreStart = setupMockCoreStartServices(mockCore, mockEsClient, mockSecurityStart);
    mockFetch = jest.fn();
    (mockCoreStart.http.selfClient.asScoped as unknown as jest.Mock).mockReturnValue({
      fetch: mockFetch,
    });
  });

  it('should project rules to id + titles + translation result + status on a 200', async () => {
    mockFetch.mockResolvedValueOnce({
      fetchOptions: { path: '/internal/siem_migrations/rules/abc/rules' },
      request: new Request('http://localhost/x'),
      response: new Response(null, { status: 200 }),
      body: {
        total: 2,
        data: [
          {
            id: 'rule-1',
            original_rule: { title: 'Splunk rule', vendor: 'splunk', id: 's-1' },
            elastic_rule: { title: 'Elastic rule', prebuilt_rule_id: 'pre-1' },
            translation_result: 'full',
            status: 'completed',
          },
          {
            id: 'rule-2',
            original_rule: { title: 'Failed rule', vendor: 'splunk', id: 's-2' },
            elastic_rule: undefined,
            translation_result: 'failed',
            status: 'failed',
          },
        ],
      },
    });

    const result = (await tool.handler(
      { migration_id: 'abc', page: 0, per_page: 50 },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    )) as ToolHandlerStandardReturn;

    expect(mockFetch).toHaveBeenCalledWith(
      '/internal/siem_migrations/rules/abc/rules',
      expect.objectContaining({ method: 'GET', access: 'internal' })
    );
    expect(result.results[0].type).toBe(ToolResultType.other);
    const data = result.results[0].data as {
      total: number;
      page: number;
      per_page: number;
      data: Array<Record<string, unknown>>;
    };
    expect(data.total).toBe(2);
    expect(data.page).toBe(0);
    expect(data.per_page).toBe(50);
    // Projected fields only — no original query body or elastic ES|QL.
    expect(data.data[0]).toEqual({
      id: 'rule-1',
      original_rule: { title: 'Splunk rule', vendor: 'splunk' },
      elastic_rule: {
        title: 'Elastic rule',
        prebuilt_rule_id: 'pre-1',
        integration_ids: undefined,
      },
      translation_result: 'full',
      status: 'completed',
    });
    expect(data.data[1]).toEqual({
      id: 'rule-2',
      original_rule: { title: 'Failed rule', vendor: 'splunk' },
      elastic_rule: undefined,
      translation_result: 'failed',
      status: 'failed',
    });
  });

  it('should not impose a hardcoded sort — lets the API default apply when no sort is provided', async () => {
    mockFetch.mockResolvedValueOnce({
      fetchOptions: { path: '/internal/siem_migrations/rules/abc/rules' },
      request: new Request('http://localhost/x'),
      response: new Response(null, { status: 200 }),
      body: { total: 0, data: [] },
    });

    await tool.handler(
      { migration_id: 'abc', page: 0, per_page: 50 },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    );

    // When the model does not supply sort_field / sort_direction, neither is set in the query
    // — the server applies DEFAULT_SORTING (translation_result desc), matching the Kibana UI.
    const query = (mockFetch.mock.calls[0][1] as { query: Record<string, unknown> }).query;
    expect(query.sort_field).toBeUndefined();
    expect(query.sort_direction).toBeUndefined();
  });

  it('should pass filters and pagination through in the query', async () => {
    mockFetch.mockResolvedValueOnce({
      fetchOptions: { path: '/internal/siem_migrations/rules/abc/rules' },
      request: new Request('http://localhost/x'),
      response: new Response(null, { status: 200 }),
      body: { total: 0, data: [] },
    });

    await tool.handler(
      {
        migration_id: 'abc',
        page: 2,
        per_page: 100,
        sort_field: 'elastic_rule.title',
        sort_direction: 'desc',
        search_term: 'failed login',
        is_failed: true,
      },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    );

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        query: expect.objectContaining({
          page: 2,
          per_page: 100,
          sort_field: 'elastic_rule.title',
          sort_direction: 'desc',
          search_term: 'failed login',
          is_failed: true,
        }),
      })
    );
  });

  it('should return an error result when the call fails', async () => {
    const error = new Error('Not Found') as Error & {
      response?: Response;
      body?: unknown;
    };
    error.name = 'HttpSelfFetchError';
    error.response = new Response(null, { status: 404 });
    error.body = { message: 'Migration not found' };
    mockFetch.mockRejectedValueOnce(error);

    const result = (await tool.handler(
      { migration_id: 'missing', page: 0, per_page: 50 },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    )) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.error);
    expect((result.results[0].data as { message: string }).message).toContain(
      'Migration not found'
    );
  });
});
