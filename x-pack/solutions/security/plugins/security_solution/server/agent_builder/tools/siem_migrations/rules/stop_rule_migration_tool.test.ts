/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { SIEM_MIGRATIONS_API_ACTION_ALL } from '@kbn/security-solution-features/actions';
import { RULES_API_READ } from '@kbn/security-solution-features/constants';
import {
  createToolTestMocks,
  createToolHandlerContext,
  setupMockCoreStartServices,
} from '../../../__mocks__/test_helpers';
import type { ProductFeaturesService } from '../../../../lib/product_features_service/product_features_service';
import { stopRuleMigrationTool } from './stop_rule_migration_tool';

const mockProductFeaturesService = {
  isEnabled: jest.fn().mockReturnValue(true),
} as unknown as ProductFeaturesService;

describe('stopRuleMigrationTool', () => {
  const {
    mockCore,
    mockLogger,
    mockEsClient,
    mockSecurityStart,
    mockCheckPrivileges,
    mockRequest,
  } = createToolTestMocks();
  let mockFetch: jest.Mock;

  const tool = stopRuleMigrationTool(mockCore, mockLogger, mockProductFeaturesService);

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch = jest.fn();
    const mockCoreStart = setupMockCoreStartServices(mockCore, mockEsClient, mockSecurityStart);
    (mockCoreStart.http.selfClient.asScoped as unknown as jest.Mock).mockReturnValue({
      fetch: mockFetch,
    });
  });

  it('should stop a migration and return { stopped: true } on success', async () => {
    mockFetch.mockResolvedValueOnce({
      fetchOptions: { path: '/internal/siem_migrations/rules/abc/stop' },
      request: new Request('http://localhost/x'),
      response: new Response(null, { status: 200 }),
      body: { stopped: true },
    });

    const result = (await tool.handler(
      { migration_id: 'abc' },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    )) as ToolHandlerStandardReturn;

    expect(mockSecurityStart.authz.actions.api.get).toHaveBeenCalledWith(
      SIEM_MIGRATIONS_API_ACTION_ALL
    );
    expect(mockSecurityStart.authz.actions.api.get).toHaveBeenCalledWith(RULES_API_READ);
    expect(mockCheckPrivileges).toHaveBeenCalledWith({
      kibana: [`api:${SIEM_MIGRATIONS_API_ACTION_ALL}`, `api:${RULES_API_READ}`],
    });
    expect(mockFetch).toHaveBeenCalledWith(
      '/internal/siem_migrations/rules/abc/stop',
      expect.objectContaining({ method: 'POST', access: 'internal' })
    );
    expect(result.results[0].type).toBe(ToolResultType.other);
    expect(result.results[0].data).toEqual({ stopped: true });
  });

  it('should return an error result without calling the endpoint when privileges are missing', async () => {
    mockCheckPrivileges.mockResolvedValueOnce({ hasAllRequested: false });

    const result = (await tool.handler(
      { migration_id: 'abc' },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    )) as ToolHandlerStandardReturn;

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.results[0].type).toBe(ToolResultType.error);
    expect((result.results[0].data as { message: string }).message).toContain(
      'Automatic Migration: All'
    );
    expect((result.results[0].data as { message: string }).message).toContain('Rules: Read');
  });

  it('should surface an endpoint failure as an error result', async () => {
    const error = new Error('Not Found') as Error & { response?: Response; body?: unknown };
    error.name = 'HttpSelfFetchError';
    error.response = new Response(null, { status: 404 });
    error.body = { message: 'Migration not found' };
    mockFetch.mockRejectedValueOnce(error);

    const result = (await tool.handler(
      { migration_id: 'abc' },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    )) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.error);
    expect((result.results[0].data as { message: string }).message).toContain(
      'Migration not found'
    );
  });
});
