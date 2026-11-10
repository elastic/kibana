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

  it('should return queries and descriptions when detail is full; comments only for non-Splunk rules (first comment)', async () => {
    mockFetch.mockResolvedValueOnce({
      fetchOptions: { path: '/internal/siem_migrations/rules/abc/rules' },
      request: new Request('http://localhost/x'),
      response: new Response(null, { status: 200 }),
      body: {
        total: 4,
        data: [
          {
            id: 'rule-1',
            original_rule: {
              title: 'Splunk rule',
              description: 'Detects something bad',
              vendor: 'splunk',
              id: 's-1',
            },
            elastic_rule: {
              id: 'installed-rule-1',
              title: 'Elastic rule',
              prebuilt_rule_id: 'pre-1',
            },
            translation_result: 'full',
            status: 'completed',
            comments: [{ content: 'Initial translation', created_at: '2024-01-01T00:00:00Z' }],
          },
          {
            id: 'rule-2',
            original_rule: { title: 'Failed rule', vendor: 'splunk', id: 's-2' },
            elastic_rule: undefined,
            translation_result: 'failed',
            status: 'failed',
          },
          {
            id: 'rule-3',
            original_rule: { title: 'QRadar rule', vendor: 'qradar', id: 'q-1' },
            elastic_rule: undefined,
            translation_result: 'partial',
            status: 'completed',
            comments: [
              { content: 'First comment', created_at: '2024-01-01T00:00:00Z' },
              { content: 'Second comment', created_at: '2024-01-02T00:00:00Z' },
            ],
          },
          {
            id: 'rule-4',
            original_rule: { title: 'QRadar rule without comments', vendor: 'qradar', id: 'q-2' },
            elastic_rule: undefined,
            translation_result: 'partial',
            status: 'completed',
          },
        ],
      },
    });

    const result = (await tool.handler(
      { migration_id: 'abc', page: 0, per_page: 50, detail: 'full' },
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
    expect(data.total).toBe(4);
    expect(data.page).toBe(0);
    expect(data.per_page).toBe(50);
    // Projected fields — original query body and query_language are stripped when absent from
    // the fixture. Splunk rules never carry comments; other vendors carry only the first comment.
    expect(data.data[0]).toStrictEqual({
      id: 'rule-1',
      original_rule: {
        title: 'Splunk rule',
        description: 'Detects something bad',
        vendor: 'splunk',
        query: undefined,
        query_language: undefined,
      },
      elastic_rule: {
        id: 'installed-rule-1',
        title: 'Elastic rule',
        prebuilt_rule_id: 'pre-1',
        integration_ids: undefined,
        query: undefined,
        query_language: undefined,
      },
      translation_result: 'full',
      status: 'completed',
      comments: [],
    });
    expect(data.data[1]).toStrictEqual({
      id: 'rule-2',
      original_rule: {
        title: 'Failed rule',
        description: undefined,
        vendor: 'splunk',
        query: undefined,
        query_language: undefined,
      },
      elastic_rule: undefined,
      translation_result: 'failed',
      status: 'failed',
      comments: [],
    });
    expect(data.data[2].comments).toStrictEqual({
      content: 'First comment',
      created_at: '2024-01-01T00:00:00Z',
    });
    expect(data.data[3].comments).toBeUndefined();
  });

  it('should return only id, titles, installed rule id, translation result and status by default', async () => {
    mockFetch.mockResolvedValueOnce({
      fetchOptions: { path: '/internal/siem_migrations/rules/abc/rules' },
      request: new Request('http://localhost/x'),
      response: new Response(null, { status: 200 }),
      body: {
        total: 16,
        data: [
          {
            id: 'rule-1',
            original_rule: {
              title: 'Splunk rule',
              description: 'Detects something bad',
              vendor: 'splunk',
              query: 'index=main | stats count',
              query_language: 'spl',
              id: 's-1',
            },
            elastic_rule: {
              id: 'installed-rule-1',
              title: 'Elastic rule',
              integration_ids: ['endpoint'],
              query: 'FROM [indexPattern] | STATS count = COUNT()',
              query_language: 'esql',
            },
            translation_result: 'partial',
            status: 'completed',
            comments: [
              { content: 'Long translation reasoning', created_at: '2024-01-01T00:00:00Z' },
            ],
          },
        ],
      },
    });

    // Parse through the tool schema so the default `detail` applies, as it does at runtime.
    const result = (await tool.handler(
      tool.schema.parse({ migration_id: 'abc', per_page: 5 }),
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    )) as ToolHandlerStandardReturn;

    const data = result.results[0].data as { data: Array<Record<string, unknown>> };
    expect(data.data).toStrictEqual([
      {
        id: 'rule-1',
        original_rule: { title: 'Splunk rule' },
        elastic_rule: { id: 'installed-rule-1', title: 'Elastic rule' },
        translation_result: 'partial',
        status: 'completed',
      },
    ]);
  });

  it('should report the full matching total alongside a summary page', async () => {
    mockFetch.mockResolvedValueOnce({
      fetchOptions: { path: '/internal/siem_migrations/rules/abc/rules' },
      request: new Request('http://localhost/x'),
      response: new Response(null, { status: 200 }),
      body: { total: 16, data: [] },
    });

    const result = (await tool.handler(
      { migration_id: 'abc', page: 0, per_page: 5, detail: 'summary' },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    )) as ToolHandlerStandardReturn;

    expect(result.results[0].data).toEqual(
      expect.objectContaining({ total: 16, page: 0, per_page: 5 })
    );
  });

  it('should not send the detail option to the rules API', async () => {
    mockFetch.mockResolvedValueOnce({
      fetchOptions: { path: '/internal/siem_migrations/rules/abc/rules' },
      request: new Request('http://localhost/x'),
      response: new Response(null, { status: 200 }),
      body: { total: 0, data: [] },
    });

    await tool.handler(
      { migration_id: 'abc', page: 0, per_page: 5, detail: 'summary' },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    );

    const query = (mockFetch.mock.calls[0][1] as { query: Record<string, unknown> }).query;
    expect(query).not.toHaveProperty('detail');
  });

  it('should not impose a hardcoded sort — lets the API default apply when no sort is provided', async () => {
    mockFetch.mockResolvedValueOnce({
      fetchOptions: { path: '/internal/siem_migrations/rules/abc/rules' },
      request: new Request('http://localhost/x'),
      response: new Response(null, { status: 200 }),
      body: { total: 0, data: [] },
    });

    await tool.handler(
      { migration_id: 'abc', page: 0, per_page: 50, detail: 'summary' },
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
        detail: 'summary',
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
      { migration_id: 'missing', page: 0, per_page: 50, detail: 'summary' },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    )) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.error);
    expect((result.results[0].data as { message: string }).message).toContain(
      'Migration not found'
    );
  });
});
