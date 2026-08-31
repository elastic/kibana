/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { createToolTestMocks, createToolHandlerContext } from '../../../__mocks__/test_helpers';
import { coreMock } from '@kbn/core/server/mocks';
import type { ProductFeaturesService } from '../../../../lib/product_features_service/product_features_service';
import { startRuleMigrationTool } from './start_rule_migration_tool';

const mockProductFeaturesService = {
  isEnabled: jest.fn().mockReturnValue(true),
} as unknown as ProductFeaturesService;

describe('startRuleMigrationTool', () => {
  const { mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  let mockCore: ReturnType<typeof coreMock.createSetup>;
  let mockFetch: jest.Mock;
  let checkPrivileges: jest.Mock;

  const tool = () => startRuleMigrationTool(mockCore, mockLogger, mockProductFeaturesService);

  beforeEach(() => {
    jest.clearAllMocks();
    mockCore = coreMock.createSetup();
    mockFetch = jest.fn();
    checkPrivileges = jest.fn();
    const mockCoreStart = coreMock.createStart();
    (mockCoreStart.http.selfClient.asScoped as unknown as jest.Mock).mockReturnValue({
      fetch: mockFetch,
    });
    checkPrivileges.mockResolvedValue({ hasAllRequested: true });
    mockCore.getStartServices.mockResolvedValue([
      mockCoreStart,
      {
        security: {
          authz: {
            checkPrivilegesDynamicallyWithRequest: () => checkPrivileges,
            actions: { ui: { get: (feature: string, priv: string) => `${feature}.${priv}` } },
          },
        },
      } as never,
      {},
    ]);
  });

  it('should forward the start body to the endpoint on a successful privilege check', async () => {
    mockFetch.mockResolvedValueOnce({
      fetchOptions: { path: '/internal/siem_migrations/rules/abc/start' },
      request: new Request('http://localhost/x'),
      response: new Response(null, { status: 200 }),
      body: { started: true },
    });

    const result = (await tool().handler(
      {
        migration_id: 'abc',
        settings: { connector_id: 'c1' },
      },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    )) as ToolHandlerStandardReturn;

    expect(checkPrivileges).toHaveBeenCalledWith({
      kibana: ['securitySolutionSiemMigrations.all'],
    });
    expect(mockFetch).toHaveBeenCalledWith(
      '/internal/siem_migrations/rules/abc/start',
      expect.objectContaining({ method: 'POST', access: 'internal' })
    );
    expect(result.results[0].type).toBe(ToolResultType.other);
    expect(result.results[0].data).toEqual({ started: true });
  });

  it('should omit migration_id from the forwarded body', async () => {
    mockFetch.mockResolvedValueOnce({
      fetchOptions: { path: '/internal/siem_migrations/rules/abc/start' },
      request: new Request('http://localhost/x'),
      response: new Response(null, { status: 200 }),
      body: { started: true },
    });

    await tool().handler(
      { migration_id: 'abc', settings: { connector_id: 'c1' } },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    );

    const body = (mockFetch.mock.calls[0][1] as { body: unknown }).body;
    expect(body).toEqual({ settings: { connector_id: 'c1' } });
    expect(body).not.toHaveProperty('migration_id');
  });

  it('should return an error result without calling the endpoint when privileges are missing', async () => {
    checkPrivileges.mockResolvedValueOnce({ hasAllRequested: false });

    const result = (await tool().handler(
      { migration_id: 'abc', settings: { connector_id: 'c1' } },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    )) as ToolHandlerStandardReturn;

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.results[0].type).toBe(ToolResultType.error);
    expect((result.results[0].data as { message: string }).message).toContain(
      'Automatic Migration: All'
    );
  });

  it('should surface an endpoint failure as an error result', async () => {
    const error = new Error('Bad Request') as Error & {
      response?: Response;
      body?: unknown;
    };
    error.name = 'HttpSelfFetchError';
    error.response = new Response(null, { status: 400 });
    error.body = { message: 'Connector not found' };
    mockFetch.mockRejectedValueOnce(error);

    const result = (await tool().handler(
      { migration_id: 'abc', settings: { connector_id: 'bad' } },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    )) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.error);
    expect((result.results[0].data as { message: string }).message).toContain(
      'Connector not found'
    );
  });
});
