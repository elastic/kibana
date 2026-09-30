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
import { getRuleMigrationTranslationStatsTool } from './get_rule_migration_translation_stats_tool';

const mockProductFeaturesService = {
  isEnabled: jest.fn().mockReturnValue(true),
} as unknown as ProductFeaturesService;

describe('getRuleMigrationTranslationStatsTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockSecurityStart, mockRequest } =
    createToolTestMocks();
  const tool = getRuleMigrationTranslationStatsTool(
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

  it('should return the translation stats body on a 200', async () => {
    const stats = {
      id: 'abc',
      rules: {
        total: 10,
        success: {
          total: 8,
          result: { full: 5, partial: 2, untranslatable: 1 },
          installable: 4,
          prebuilt: 1,
          missing_index: 0,
        },
        failed: 2,
      },
    };
    mockFetch.mockResolvedValueOnce({
      fetchOptions: { path: '/internal/siem_migrations/rules/abc/translation_stats' },
      request: new Request('http://localhost/x'),
      response: new Response(null, { status: 200 }),
      body: stats,
    });

    const result = (await tool.handler(
      { migration_id: 'abc' },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    )) as ToolHandlerStandardReturn;

    expect(mockFetch).toHaveBeenCalledWith(
      '/internal/siem_migrations/rules/abc/translation_stats',
      expect.objectContaining({ method: 'GET', access: 'internal' })
    );
    expect(result.results[0].type).toBe(ToolResultType.other);
    expect(result.results[0].data).toEqual(stats);
  });

  it('should normalize a 204 (no items) to an explicit empty zero-shape', async () => {
    mockFetch.mockResolvedValueOnce({
      fetchOptions: { path: '/internal/siem_migrations/rules/abc/translation_stats' },
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
      rules: { total: number; success: Record<string, number>; failed: number };
    };
    expect(data.id).toBe('abc');
    expect(data.rules.total).toBe(0);
    expect(data.rules.success.installable).toBe(0);
    expect(data.rules.failed).toBe(0);
    expect(data.rules.success.result).toEqual({
      full: 0,
      partial: 0,
      untranslatable: 0,
    });
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
      { migration_id: 'missing' },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    )) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.error);
    expect((result.results[0].data as { message: string }).message).toContain(
      'Migration not found'
    );
  });
});
