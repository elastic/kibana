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
import { updateRuleMigrationTool } from './update_rule_migration_tool';

const mockProductFeaturesService = {
  isEnabled: jest.fn().mockReturnValue(true),
} as unknown as ProductFeaturesService;

describe('updateRuleMigrationTool', () => {
  const {
    mockCore,
    mockLogger,
    mockEsClient,
    mockSecurityStart,
    mockCheckPrivileges,
    mockRequest,
  } = createToolTestMocks();
  let mockFetch: jest.Mock;

  const tool = updateRuleMigrationTool(mockCore, mockLogger, mockProductFeaturesService);

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch = jest.fn();
    const mockCoreStart = setupMockCoreStartServices(mockCore, mockEsClient, mockSecurityStart);
    (mockCoreStart.http.selfClient.asScoped as unknown as jest.Mock).mockReturnValue({
      fetch: mockFetch,
    });
  });

  it('should update a migration name and return { ok: true }', async () => {
    mockFetch.mockResolvedValueOnce({
      fetchOptions: { path: '/internal/siem_migrations/rules/abc' },
      request: new Request('http://localhost/x'),
      response: new Response(null, { status: 200 }),
      body: null,
    });

    const result = (await tool.handler(
      { migration_id: 'abc', name: 'Renamed Migration' },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    )) as ToolHandlerStandardReturn;

    expect(mockFetch).toHaveBeenCalledWith(
      '/internal/siem_migrations/rules/abc',
      expect.objectContaining({ method: 'PATCH', access: 'internal' })
    );
    const body = (mockFetch.mock.calls[0][1] as { body: unknown }).body;
    expect(body).toEqual({ name: 'Renamed Migration' });
    expect(body).not.toHaveProperty('migration_id');
    expect(result.results[0].type).toBe(ToolResultType.other);
    expect(result.results[0].data).toEqual({ ok: true, migration_id: 'abc' });
  });

  it('should reject a name that exceeds 256 characters', () => {
    const result = tool.schema.safeParse({
      migration_id: 'abc',
      name: 'x'.repeat(257),
    });
    expect(result.success).toBe(false);
  });

  it('should reject a migration_id that exceeds 256 characters', () => {
    const result = tool.schema.safeParse({
      migration_id: 'x'.repeat(257),
      name: 'Valid Name',
    });
    expect(result.success).toBe(false);
  });

  it('should return an error result without calling the endpoint when privileges are missing', async () => {
    mockCheckPrivileges.mockResolvedValueOnce({ hasAllRequested: false });

    const result = (await tool.handler(
      { migration_id: 'abc', name: 'New Name' },
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
    const error = new Error('Bad Request') as Error & { response?: Response; body?: unknown };
    error.name = 'HttpSelfFetchError';
    error.response = new Response(null, { status: 400 });
    error.body = { message: 'Invalid index pattern' };
    mockFetch.mockRejectedValueOnce(error);

    const result = (await tool.handler(
      { migration_id: 'abc', name: 'New Name' },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    )) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.error);
    expect((result.results[0].data as { message: string }).message).toContain(
      'Invalid index pattern'
    );
  });
});
