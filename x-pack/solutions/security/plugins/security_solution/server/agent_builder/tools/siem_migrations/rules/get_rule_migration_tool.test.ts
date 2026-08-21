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
import { getRuleMigrationTool } from './get_rule_migration_tool';

const mockProductFeaturesService = {
  isEnabled: jest.fn().mockReturnValue(true),
} as unknown as ProductFeaturesService;

describe('getRuleMigrationTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const tool = getRuleMigrationTool(mockCore, mockLogger, mockProductFeaturesService);
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    const mockCoreStart = setupMockCoreStartServices(mockCore, mockEsClient);
    mockFetch = jest.fn();
    (mockCoreStart.http.selfClient.asScoped as unknown as jest.Mock).mockReturnValue({
      fetch: mockFetch,
    });
  });

  it('should return the migration body on a 200', async () => {
    const migration = { migration_id: 'abc', name: 'My migration' };
    mockFetch.mockResolvedValueOnce({
      fetchOptions: { path: '/internal/siem_migrations/rules/abc' },
      request: new Request('http://localhost/x'),
      response: new Response(null, { status: 200 }),
      body: migration,
    });

    const result = (await tool.handler(
      { migration_id: 'abc' },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    )) as ToolHandlerStandardReturn;

    expect(mockFetch).toHaveBeenCalledWith(
      '/internal/siem_migrations/rules/abc',
      expect.objectContaining({ method: 'GET', access: 'internal' })
    );
    expect(result.results[0].type).toBe(ToolResultType.other);
    expect(result.results[0].data).toEqual(migration);
  });

  it('should return an error result when the migration is not found', async () => {
    const error = new Error('Not Found') as Error & {
      response?: Response;
      body?: unknown;
    };
    error.name = 'HttpSelfFetchError';
    error.response = new Response(null, { status: 404 });
    error.body = { message: 'Migration not found' };
    mockFetch.mockRejectedValueOnce(error);

    const result = (await tool.handler(
      { migration_id: 'missing' },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    )) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.error);
    expect((result.results[0].data as { message: string }).message).toContain(
      'Migration not found'
    );
  });
});
