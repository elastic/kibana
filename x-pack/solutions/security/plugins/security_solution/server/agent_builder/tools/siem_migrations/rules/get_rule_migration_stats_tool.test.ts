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
import { getRuleMigrationStatsTool } from './get_rule_migration_stats_tool';

const mockProductFeaturesService = {
  isEnabled: jest.fn().mockReturnValue(true),
} as unknown as ProductFeaturesService;

describe('getRuleMigrationStatsTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const tool = getRuleMigrationStatsTool(mockCore, mockLogger, mockProductFeaturesService);
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    const mockCoreStart = setupMockCoreStartServices(mockCore, mockEsClient);
    mockFetch = jest.fn();
    (mockCoreStart.http.selfClient.asScoped as unknown as jest.Mock).mockReturnValue({
      fetch: mockFetch,
    });
  });

  it('should return the stats body on a 200', async () => {
    const stats = {
      id: 'abc',
      name: 'My migration',
      status: 'running',
      items: { total: 10, pending: 3, processing: 2, completed: 4, failed: 1 },
      created_at: '2024-01-01T00:00:00Z',
      last_updated_at: '2024-01-02T00:00:00Z',
    };
    mockFetch.mockResolvedValueOnce({
      fetchOptions: { path: '/internal/siem_migrations/rules/abc/stats' },
      request: new Request('http://localhost/x'),
      response: new Response(null, { status: 200 }),
      body: stats,
    });

    const result = (await tool.handler(
      { migration_id: 'abc' },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    )) as ToolHandlerStandardReturn;

    expect(mockFetch).toHaveBeenCalledWith(
      '/internal/siem_migrations/rules/abc/stats',
      expect.objectContaining({ method: 'GET', access: 'internal' })
    );
    expect(result.results[0].type).toBe(ToolResultType.other);
    expect(result.results[0].data).toEqual(stats);
  });

  it('should normalize a 204 (no items) to an explicit empty zero-shape', async () => {
    // 204 No Content → body is null/undefined. The tool must return a readable empty shape
    // so the skill/state-matrix zero-checks (items.pending === 0) always have a shape.
    mockFetch.mockResolvedValueOnce({
      fetchOptions: { path: '/internal/siem_migrations/rules/abc/stats' },
      request: new Request('http://localhost/x'),
      response: new Response(null, { status: 204 }),
      body: null,
    });

    const result = (await tool.handler(
      { migration_id: 'abc' },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    )) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.other);
    const data = result.results[0].data as {
      id: string;
      status: string;
      items: Record<string, number>;
    };
    expect(data.id).toBe('abc');
    expect(data.status).toBe('finished');
    expect(data.items).toEqual({
      total: 0,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    });
  });

  it('should return an error result when the call fails', async () => {
    const error = new Error('Forbidden') as Error & {
      response?: Response;
      body?: unknown;
    };
    error.name = 'HttpSelfFetchError';
    error.response = new Response(null, { status: 403 });
    error.body = { message: 'Insufficient privileges' };
    mockFetch.mockRejectedValueOnce(error);

    const result = (await tool.handler(
      { migration_id: 'abc' },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    )) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.error);
    expect((result.results[0].data as { message: string }).message).toContain(
      'Insufficient privileges'
    );
  });
});
