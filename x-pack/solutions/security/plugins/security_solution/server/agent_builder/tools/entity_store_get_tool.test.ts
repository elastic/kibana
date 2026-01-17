/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, type ErrorResult, type OtherResult } from '@kbn/agent-builder-common';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import {
  createToolAvailabilityContext,
  createToolHandlerContext,
  createToolTestMocks,
  setupMockCoreStartServices,
} from '../__mocks__/test_helpers';
import { entityStoreGetTool, SECURITY_ENTITY_STORE_GET_TOOL_ID } from './entity_store_get_tool';

describe('entityStoreGetTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const tool = entityStoreGetTool(mockCore, mockLogger);

  beforeEach(() => {
    jest.clearAllMocks();
    setupMockCoreStartServices(mockCore, mockEsClient);
  });

  describe('tool definition', () => {
    it('has the correct ID', () => {
      expect(tool.id).toBe(SECURITY_ENTITY_STORE_GET_TOOL_ID);
    });

    it('has correct tags', () => {
      expect(tool.tags).toEqual(['security', 'entity-store', 'entities', 'profile']);
    });
  });

  describe('schema', () => {
    it('validates correct schema with host entity type', () => {
      const validInput = {
        entityType: 'host',
        identifier: 'server-01',
      };

      const result = tool.schema.safeParse(validInput);

      expect(result.success).toBe(true);
    });

    it('validates correct schema with user entity type', () => {
      const validInput = {
        entityType: 'user',
        identifier: 'jsmith',
      };

      const result = tool.schema.safeParse(validInput);

      expect(result.success).toBe(true);
    });

    it('validates correct schema with service entity type', () => {
      const validInput = {
        entityType: 'service',
        identifier: 'api-gateway',
      };

      const result = tool.schema.safeParse(validInput);

      expect(result.success).toBe(true);
    });

    it('validates correct schema with generic entity type', () => {
      const validInput = {
        entityType: 'generic',
        identifier: 'entity-123',
      };

      const result = tool.schema.safeParse(validInput);

      expect(result.success).toBe(true);
    });

    it('rejects invalid entityType', () => {
      const invalidInput = {
        entityType: 'invalid',
        identifier: 'hostname-1',
      };

      const result = tool.schema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    it('rejects empty identifier', () => {
      const invalidInput = {
        entityType: 'host',
        identifier: '',
      };

      const result = tool.schema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    it('rejects missing entityType', () => {
      const invalidInput = {
        identifier: 'hostname-1',
      };

      const result = tool.schema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    it('rejects missing identifier', () => {
      const invalidInput = {
        entityType: 'host',
      };

      const result = tool.schema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });
  });

  describe('availability', () => {
    it('returns available when entity store indices exist', async () => {
      mockEsClient.asInternalUser.indices.exists.mockResolvedValue(true);

      const result = await tool.availability!.handler(
        createToolAvailabilityContext(mockRequest, 'default')
      );

      expect(result.status).toBe('available');
      expect(mockEsClient.asInternalUser.indices.exists).toHaveBeenCalled();
    });

    it('returns unavailable when entity store indices do not exist', async () => {
      mockEsClient.asInternalUser.indices.exists.mockResolvedValue(false);

      const result = await tool.availability!.handler(
        createToolAvailabilityContext(mockRequest, 'default')
      );

      expect(result.status).toBe('unavailable');
      expect(result.reason).toBe('Entity Store indices do not exist for this space');
    });

    it('returns unavailable when index check throws error', async () => {
      mockEsClient.asInternalUser.indices.exists.mockRejectedValue(new Error('ES error'));

      const result = await tool.availability!.handler(
        createToolAvailabilityContext(mockRequest, 'default')
      );

      expect(result.status).toBe('unavailable');
      expect(result.reason).toContain('Failed to check Entity Store availability');
    });
  });

  describe('handler', () => {
    // Risk data is stored under entity-type-specific paths:
    // - host.risk for host entities
    // - user.risk for user entities
    // - service.risk for service entities
    // - entity.risk for generic entities
    const mockHostEntity = {
      '@timestamp': '2024-01-15T10:00:00Z',
      entity: {
        id: 'host-123',
        name: 'server-01',
        type: 'host',
        sub_type: 'server',
        source: 'entity-store',
        lifecycle: {
          First_seen: '2024-01-01T00:00:00Z',
          Last_activity: '2024-01-15T10:00:00Z',
        },
        attributes: {
          Privileged: false,
          Managed: true,
        },
        behaviors: {
          Brute_force_victim: false,
          New_country_login: false,
        },
        relationships: {
          Communicates_with: ['service-api'],
        },
      },
      host: {
        name: 'server-01',
        os: { name: 'Ubuntu' },
        risk: {
          calculated_score_norm: 75,
          calculated_level: 'High',
          calculated_score: 150,
        },
      },
      asset: {
        criticality: 'high_impact',
        id: 'asset-123',
        name: 'Production Server',
        owner: 'devops',
        environment: 'production',
        business_unit: 'engineering',
      },
    };

    it('successfully retrieves a host entity by identifier', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [{ _id: 'entity-1', _index: 'test-index', _source: mockHostEntity }],
          total: { value: 1, relation: 'eq' },
        },
      });

      const result = (await tool.handler(
        { entityType: 'host', identifier: 'server-01' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe(ToolResultType.other);

      const otherResult = result.results[0] as OtherResult;
      expect(otherResult.data).toHaveProperty('entity');

      const entity = (otherResult.data as { entity: Record<string, unknown> }).entity;
      expect(entity.entity_id).toBe('host-123');
      expect(entity.entity_name).toBe('server-01');
      expect(entity.entity_type).toBe('host');
      expect(entity.risk).toEqual({
        calculated_score_norm: 75,
        calculated_level: 'High',
        calculated_score: 150,
      });
      expect(entity.asset_criticality).toBe('high_impact');
    });

    it('successfully retrieves a user entity by identifier', async () => {
      const mockUserEntity = {
        '@timestamp': '2024-01-15T10:00:00Z',
        entity: {
          id: 'user-123',
          name: 'jsmith',
          type: 'user',
        },
        user: {
          name: 'jsmith',
          email: 'jsmith@example.com',
          risk: {
            calculated_score_norm: 50,
            calculated_level: 'Moderate',
            calculated_score: 100,
          },
        },
      };

      mockEsClient.asCurrentUser.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [{ _id: 'entity-2', _index: 'test-index', _source: mockUserEntity }],
          total: { value: 1, relation: 'eq' },
        },
      });

      const result = (await tool.handler(
        { entityType: 'user', identifier: 'jsmith' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe(ToolResultType.other);

      const otherResult = result.results[0] as OtherResult;
      const entity = (otherResult.data as { entity: Record<string, unknown> }).entity;
      expect(entity.entity_name).toBe('jsmith');
      expect(entity.entity_type).toBe('user');

      // Verify the correct identity field was used
      expect(mockEsClient.asCurrentUser.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { term: { 'user.name': 'jsmith' } },
        })
      );
    });

    it('successfully retrieves a service entity by identifier', async () => {
      const mockServiceEntity = {
        '@timestamp': '2024-01-15T10:00:00Z',
        entity: {
          id: 'service-123',
          name: 'api-gateway',
          type: 'service',
        },
        service: {
          name: 'api-gateway',
          version: '2.0.0',
          risk: {
            calculated_score_norm: 30,
            calculated_level: 'Low',
            calculated_score: 60,
          },
        },
      };

      mockEsClient.asCurrentUser.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [{ _id: 'entity-3', _index: 'test-index', _source: mockServiceEntity }],
          total: { value: 1, relation: 'eq' },
        },
      });

      const result = (await tool.handler(
        { entityType: 'service', identifier: 'api-gateway' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe(ToolResultType.other);

      // Verify the correct identity field was used
      expect(mockEsClient.asCurrentUser.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { term: { 'service.name': 'api-gateway' } },
        })
      );
    });

    it('successfully retrieves a generic entity by identifier', async () => {
      const mockGenericEntity = {
        '@timestamp': '2024-01-15T10:00:00Z',
        entity: {
          id: 'generic-123',
          name: 'custom-entity',
          type: 'generic',
          risk: {
            calculated_score_norm: 40,
            calculated_level: 'Moderate',
            calculated_score: 80,
          },
        },
      };

      mockEsClient.asCurrentUser.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [{ _id: 'entity-4', _index: 'test-index', _source: mockGenericEntity }],
          total: { value: 1, relation: 'eq' },
        },
      });

      const result = (await tool.handler(
        { entityType: 'generic', identifier: 'generic-123' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe(ToolResultType.other);

      // Verify the correct identity field was used
      expect(mockEsClient.asCurrentUser.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { term: { 'entity.id': 'generic-123' } },
        })
      );
    });

    it('returns error when entity is not found', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [],
          total: { value: 0, relation: 'eq' },
        },
      });

      const result = (await tool.handler(
        { entityType: 'host', identifier: 'nonexistent-host' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      const errorResult = result.results[0] as ErrorResult;
      expect(errorResult.type).toBe(ToolResultType.error);
      expect(errorResult.data.message).toContain('No host entity found with identifier');
      expect(errorResult.data.message).toContain('nonexistent-host');
    });

    it('includes lifecycle data when present', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [{ _id: 'entity-1', _index: 'test-index', _source: mockHostEntity }],
          total: { value: 1, relation: 'eq' },
        },
      });

      const result = (await tool.handler(
        { entityType: 'host', identifier: 'server-01' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const otherResult = result.results[0] as OtherResult;
      const entity = (otherResult.data as { entity: Record<string, unknown> }).entity;
      expect(entity.lifecycle).toEqual({
        first_seen: '2024-01-01T00:00:00Z',
        last_activity: '2024-01-15T10:00:00Z',
      });
    });

    it('includes attributes and behaviors when present', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [{ _id: 'entity-1', _index: 'test-index', _source: mockHostEntity }],
          total: { value: 1, relation: 'eq' },
        },
      });

      const result = (await tool.handler(
        { entityType: 'host', identifier: 'server-01' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const otherResult = result.results[0] as OtherResult;
      const entity = (otherResult.data as { entity: Record<string, unknown> }).entity;
      expect(entity.attributes).toEqual({ Privileged: false, Managed: true });
      expect(entity.behaviors).toEqual({
        Brute_force_victim: false,
        New_country_login: false,
      });
    });

    it('includes asset information when available', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [{ _id: 'entity-1', _index: 'test-index', _source: mockHostEntity }],
          total: { value: 1, relation: 'eq' },
        },
      });

      const result = (await tool.handler(
        { entityType: 'host', identifier: 'server-01' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const otherResult = result.results[0] as OtherResult;
      const entity = (otherResult.data as { entity: Record<string, unknown> }).entity;
      expect(entity.asset_criticality).toBe('high_impact');
      expect(entity.asset).toBeDefined();
    });

    it('handles ES client failures', async () => {
      mockEsClient.asCurrentUser.search.mockRejectedValue(new Error('ES error'));

      const result = (await tool.handler(
        { entityType: 'host', identifier: 'server-01' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      const errorResult = result.results[0] as ErrorResult;
      expect(errorResult.type).toBe(ToolResultType.error);
      expect(errorResult.data.message).toContain('Error retrieving entity');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('logs debug message when tool is called', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [{ _id: 'entity-1', _index: 'test-index', _source: mockHostEntity }],
          total: { value: 1, relation: 'eq' },
        },
      });

      await tool.handler(
        { entityType: 'host', identifier: 'server-01' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('entity_store_get')
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('host')
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('server-01')
      );
    });
  });
});
