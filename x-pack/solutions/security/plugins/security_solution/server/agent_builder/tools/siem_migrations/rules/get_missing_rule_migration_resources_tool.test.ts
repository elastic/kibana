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
import { getMissingRuleMigrationResourcesTool } from './get_missing_rule_migration_resources_tool';

const mockProductFeaturesService = {
  isEnabled: jest.fn().mockReturnValue(true),
} as unknown as ProductFeaturesService;

describe('getMissingRuleMigrationResourcesTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockSecurityStart, mockRequest } =
    createToolTestMocks();
  const tool = getMissingRuleMigrationResourcesTool(
    mockCore,
    mockLogger,
    mockProductFeaturesService
  );
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    const mockCoreStart = setupMockCoreStartServices(mockCore, mockEsClient, mockSecurityStart);
    mockFetch = jest.fn();
    (mockCoreStart.http.selfClient.asScoped as unknown as jest.Mock).mockReturnValue({
      fetch: mockFetch,
    });
  });

  it('should return the missing resources array on a 200', async () => {
    const resources = [
      { name: 'my_macro', type: 'macro' },
      { name: 'my_lookup', type: 'lookup' },
    ];
    mockFetch.mockResolvedValueOnce({
      fetchOptions: { path: '/internal/siem_migrations/rules/abc/resources/missing' },
      request: new Request('http://localhost/x'),
      response: new Response(null, { status: 200 }),
      body: resources,
    });

    const result = (await tool.handler(
      { migration_id: 'abc' },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    )) as ToolHandlerStandardReturn;

    expect(mockFetch).toHaveBeenCalledWith(
      '/internal/siem_migrations/rules/abc/resources/missing',
      expect.objectContaining({ method: 'GET', access: 'internal' })
    );
    expect(result.results[0].type).toBe(ToolResultType.other);
    expect(result.results[0].data).toEqual(resources);
  });

  it('should return an empty array when no resources are missing', async () => {
    mockFetch.mockResolvedValueOnce({
      fetchOptions: { path: '/internal/siem_migrations/rules/abc/resources/missing' },
      request: new Request('http://localhost/x'),
      response: new Response(null, { status: 200 }),
      body: [],
    });

    const result = (await tool.handler(
      { migration_id: 'abc' },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    )) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.other);
    expect(result.results[0].data).toEqual([]);
  });

  it('should return an empty array for a nonexistent migration (route returns empty, not 404)', async () => {
    // The resources/missing route does not use withExistingMigration — nonexistent ids yield [].
    mockFetch.mockResolvedValueOnce({
      fetchOptions: { path: '/internal/siem_migrations/rules/nonexistent/resources/missing' },
      request: new Request('http://localhost/x'),
      response: new Response(null, { status: 200 }),
      body: [],
    });

    const result = (await tool.handler(
      { migration_id: 'nonexistent' },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    )) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.other);
    expect(result.results[0].data).toEqual([]);
  });

  it('should return an error result when the call fails', async () => {
    const error = new Error('Forbidden') as Error & { response?: Response; body?: unknown };
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
