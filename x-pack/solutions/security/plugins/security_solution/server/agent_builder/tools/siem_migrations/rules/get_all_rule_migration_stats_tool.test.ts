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
import { getAllRuleMigrationStatsTool } from './get_all_rule_migration_stats_tool';
import { SIEM_RULE_MIGRATIONS_ALL_STATS_PATH } from '../../../../../common/siem_migrations/constants';

const mockProductFeaturesService = {
  isEnabled: jest.fn().mockReturnValue(true),
} as unknown as ProductFeaturesService;

describe('getAllRuleMigrationStatsTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const tool = getAllRuleMigrationStatsTool(mockCore, mockLogger, mockProductFeaturesService);
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    const mockCoreStart = setupMockCoreStartServices(mockCore, mockEsClient);
    mockFetch = jest.fn();
    (mockCoreStart.http.selfClient.asScoped as unknown as jest.Mock).mockReturnValue({
      fetch: mockFetch,
    });
  });

  it('should return the migrations array on a 200', async () => {
    const migrations = [
      { migration_id: 'abc', status: 'running' },
      { migration_id: 'def', status: 'finished' },
    ];
    mockFetch.mockResolvedValueOnce({
      fetchOptions: { path: SIEM_RULE_MIGRATIONS_ALL_STATS_PATH },
      request: new Request('http://localhost/x'),
      response: new Response(null, { status: 200 }),
      body: migrations,
    });

    const result = (await tool.handler(
      {},
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    )) as ToolHandlerStandardReturn;

    expect(mockFetch).toHaveBeenCalledWith(
      SIEM_RULE_MIGRATIONS_ALL_STATS_PATH,
      expect.objectContaining({ method: 'GET', access: 'internal', version: '1' })
    );
    expect(result.results[0].type).toBe(ToolResultType.other);
    expect(result.results[0].data).toEqual({ total: 2, migrations });
  });

  it('should return an error result when the endpoint fails', async () => {
    const error = new Error('Bad Request') as Error & {
      response?: Response;
      body?: unknown;
    };
    error.name = 'HttpSelfFetchError';
    error.response = new Response(null, { status: 400 });
    error.body = { message: 'Invalid license' };
    mockFetch.mockRejectedValueOnce(error);

    const result = (await tool.handler(
      {},
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    )) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.error);
    expect((result.results[0].data as { message: string }).message).toContain('Invalid license');
  });
});
