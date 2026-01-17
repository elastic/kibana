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
import {
  entityStoreSearchTool,
  SECURITY_ENTITY_STORE_SEARCH_TOOL_ID,
} from './entity_store_search_tool';

describe('entityStoreSearchTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const tool = entityStoreSearchTool(mockCore, mockLogger);

  beforeEach(() => {
    jest.clearAllMocks();
    setupMockCoreStartServices(mockCore, mockEsClient);
  });

  describe('tool definition', () => {
    it('has the correct ID', () => {
      expect(tool.id).toBe(SECURITY_ENTITY_STORE_SEARCH_TOOL_ID);
    });

    it('has correct tags', () => {
      expect(tool.tags).toEqual(['security', 'entity-store', 'entities', 'search']);
    });
  });

  describe('schema', () => {
    it('validates correct schema with single entity type', () => {
      const validInput = {
        entityTypes: ['host'],
      };

      const result = tool.schema.safeParse(validInput);

      expect(result.success).toBe(true);
    });

    it('validates correct schema with multiple entity types', () => {
      const validInput = {
        entityTypes: ['host', 'user', 'service'],
      };

      const result = tool.schema.safeParse(validInput);

      expect(result.success).toBe(true);
    });

    it('validates correct schema with all optional parameters', () => {
      const validInput = {
        entityTypes: ['user'],
        riskLevels: ['Critical', 'High'],
        assetCriticality: ['extreme_impact', 'high_impact'],
        attributes: {
          privileged: true,
          managed: false,
          mfa_enabled: true,
          asset: true,
        },
        behaviors: {
          brute_force_victim: true,
          new_country_login: false,
          used_usb_device: true,
        },
        sortBy: 'risk_score',
        sortOrder: 'desc',
        limit: 20,
      };

      const result = tool.schema.safeParse(validInput);

      expect(result.success).toBe(true);
    });

    it('rejects empty entityTypes array', () => {
      const invalidInput = {
        entityTypes: [],
      };

      const result = tool.schema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    it('rejects invalid entityType', () => {
      const invalidInput = {
        entityTypes: ['invalid'],
      };

      const result = tool.schema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    it('rejects invalid riskLevel', () => {
      const invalidInput = {
        entityTypes: ['host'],
        riskLevels: ['InvalidLevel'],
      };

      const result = tool.schema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    it('rejects invalid assetCriticality', () => {
      const invalidInput = {
        entityTypes: ['host'],
        assetCriticality: ['invalid_criticality'],
      };

      const result = tool.schema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    it('rejects invalid sortBy value', () => {
      const invalidInput = {
        entityTypes: ['host'],
        sortBy: 'invalid_sort',
      };

      const result = tool.schema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    it('rejects invalid sortOrder value', () => {
      const invalidInput = {
        entityTypes: ['host'],
        sortOrder: 'invalid',
      };

      const result = tool.schema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    it('rejects limit below minimum', () => {
      const invalidInput = {
        entityTypes: ['host'],
        limit: 0,
      };

      const result = tool.schema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    it('rejects limit above maximum', () => {
      const invalidInput = {
        entityTypes: ['host'],
        limit: 101,
      };

      const result = tool.schema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    it('validates all risk levels', () => {
      const validInput = {
        entityTypes: ['host'],
        riskLevels: ['Critical', 'High', 'Moderate', 'Low', 'Unknown'],
      };

      const result = tool.schema.safeParse(validInput);

      expect(result.success).toBe(true);
    });

    it('validates all asset criticality levels', () => {
      const validInput = {
        entityTypes: ['host'],
        assetCriticality: ['extreme_impact', 'high_impact', 'medium_impact', 'low_impact'],
      };

      const result = tool.schema.safeParse(validInput);

      expect(result.success).toBe(true);
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
    const createMockEntity = (
      overrides: Record<string, unknown> = {},
      entityType: 'host' | 'user' | 'service' | 'generic' = 'host'
    ) => {
      const baseEntity = {
        '@timestamp': '2024-01-15T10:00:00Z',
        entity: {
          id: 'entity-123',
          name: 'test-entity',
          type: entityType,
          lifecycle: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            First_seen: '2024-01-01T00:00:00Z',
            // eslint-disable-next-line @typescript-eslint/naming-convention
            Last_activity: '2024-01-15T10:00:00Z',
          },
          attributes: {
            Privileged: false,
            Managed: true,
          },
          behaviors: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            Brute_force_victim: false,
          },
          ...((overrides.entity as Record<string, unknown>) || {}),
        },
        asset: {
          criticality: 'high_impact',
        },
        ...overrides,
      };

      // Add entity-type-specific risk data
      if (entityType === 'host') {
        return {
          ...baseEntity,
          host: {
            name: 'test-host',
            risk: {
              calculated_score_norm: 75,
              calculated_level: 'High',
            },
            ...((overrides.host as Record<string, unknown>) || {}),
          },
        };
      } else if (entityType === 'user') {
        return {
          ...baseEntity,
          user: {
            name: 'test-user',
            risk: {
              calculated_score_norm: 75,
              calculated_level: 'High',
            },
            ...((overrides.user as Record<string, unknown>) || {}),
          },
        };
      } else if (entityType === 'service') {
        return {
          ...baseEntity,
          service: {
            name: 'test-service',
            risk: {
              calculated_score_norm: 75,
              calculated_level: 'High',
            },
            ...((overrides.service as Record<string, unknown>) || {}),
          },
        };
      } else {
        // generic - risk is under entity.risk
        return {
          ...baseEntity,
          entity: {
            ...baseEntity.entity,
            risk: {
              calculated_score_norm: 75,
              calculated_level: 'High',
            },
            ...((overrides.entity as Record<string, unknown>) || {}),
          },
        };
      }
    };

    it('successfully searches entities with minimal parameters', async () => {
      const mockEntities = [createMockEntity(), createMockEntity({ entity: { name: 'entity-2' } })];

      mockEsClient.asCurrentUser.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: mockEntities.map((entity, i) => ({
            _id: `entity-${i}`,
            _index: 'test-index',
            _source: entity,
          })),
          total: { value: mockEntities.length, relation: 'eq' },
        },
      });

      const result = (await tool.handler(
        { entityTypes: ['host'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe(ToolResultType.other);

      const otherResult = result.results[0] as OtherResult;
      expect(otherResult.data).toHaveProperty('total_found');
      expect(otherResult.data).toHaveProperty('entities');
      const { entities, total_found: totalFound } = otherResult.data as {
        entities: Array<Record<string, unknown>>;
        total_found: number;
      };
      expect(totalFound).toBe(2);
      expect(entities).toHaveLength(2);
    });

    it('filters by risk levels using entity-type-specific fields', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [{ _id: 'entity-1', _index: 'test-index', _source: createMockEntity() }],
          total: { value: 1, relation: 'eq' },
        },
      });

      await tool.handler(
        { entityTypes: ['host'], riskLevels: ['Critical', 'High'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      // Risk level filter should use entity-type-specific field (host.risk.calculated_level)
      expect(mockEsClient.asCurrentUser.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              must: expect.arrayContaining([
                {
                  bool: {
                    should: [{ terms: { 'host.risk.calculated_level': ['Critical', 'High'] } }],
                    minimum_should_match: 1,
                  },
                },
              ]),
            },
          },
        })
      );
    });

    it('filters by asset criticality', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [{ _id: 'entity-1', _index: 'test-index', _source: createMockEntity() }],
          total: { value: 1, relation: 'eq' },
        },
      });

      await tool.handler(
        { entityTypes: ['host'], assetCriticality: ['extreme_impact', 'high_impact'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(mockEsClient.asCurrentUser.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              must: expect.arrayContaining([
                { terms: { 'asset.criticality': ['extreme_impact', 'high_impact'] } },
              ]),
            },
          },
        })
      );
    });

    it('filters by attributes', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [{ _id: 'entity-1', _index: 'test-index', _source: createMockEntity() }],
          total: { value: 1, relation: 'eq' },
        },
      });

      await tool.handler(
        {
          entityTypes: ['user'],
          attributes: { privileged: true, managed: false, mfa_enabled: true, asset: true },
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(mockEsClient.asCurrentUser.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              must: expect.arrayContaining([
                { term: { 'entity.attributes.Privileged': true } },
                { term: { 'entity.attributes.Managed': false } },
                { term: { 'entity.attributes.Mfa_enabled': true } },
                { term: { 'entity.attributes.Asset': true } },
              ]),
            },
          },
        })
      );
    });

    it('filters by behaviors', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [{ _id: 'entity-1', _index: 'test-index', _source: createMockEntity() }],
          total: { value: 1, relation: 'eq' },
        },
      });

      await tool.handler(
        {
          entityTypes: ['user'],
          behaviors: { brute_force_victim: true, new_country_login: false, used_usb_device: true },
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(mockEsClient.asCurrentUser.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              must: expect.arrayContaining([
                { term: { 'entity.behaviors.Brute_force_victim': true } },
                { term: { 'entity.behaviors.New_country_login': false } },
                { term: { 'entity.behaviors.Used_usb_device': true } },
              ]),
            },
          },
        })
      );
    });

    it('uses default sort by risk_score desc with script sort for entity-type-specific fields', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [{ _id: 'entity-1', _index: 'test-index', _source: createMockEntity() }],
          total: { value: 1, relation: 'eq' },
        },
      });

      await tool.handler(
        { entityTypes: ['host'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      // Default sort by risk_score uses a script sort to handle entity-type-specific risk fields
      expect(mockEsClient.asCurrentUser.search).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: [
            expect.objectContaining({
              _script: expect.objectContaining({
                type: 'number',
                order: 'desc',
                script: expect.objectContaining({
                  params: {
                    prefixes: ['host'],
                  },
                }),
              }),
            }),
          ],
        })
      );
    });

    it('sorts by last_activity when specified', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [{ _id: 'entity-1', _index: 'test-index', _source: createMockEntity() }],
          total: { value: 1, relation: 'eq' },
        },
      });

      await tool.handler(
        { entityTypes: ['host'], sortBy: 'last_activity', sortOrder: 'asc' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(mockEsClient.asCurrentUser.search).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: [
            {
              'entity.lifecycle.Last_activity': {
                order: 'asc',
                unmapped_type: 'date',
              },
            },
          ],
        })
      );
    });

    it('sorts by first_seen when specified', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [{ _id: 'entity-1', _index: 'test-index', _source: createMockEntity() }],
          total: { value: 1, relation: 'eq' },
        },
      });

      await tool.handler(
        { entityTypes: ['host'], sortBy: 'first_seen' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(mockEsClient.asCurrentUser.search).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: [
            {
              'entity.lifecycle.First_seen': {
                order: 'desc',
                unmapped_type: 'date',
              },
            },
          ],
        })
      );
    });

    it('sorts by name when specified', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [{ _id: 'entity-1', _index: 'test-index', _source: createMockEntity() }],
          total: { value: 1, relation: 'eq' },
        },
      });

      await tool.handler(
        { entityTypes: ['host'], sortBy: 'name' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(mockEsClient.asCurrentUser.search).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: [
            {
              'entity.name': {
                order: 'desc',
                unmapped_type: 'keyword',
              },
            },
          ],
        })
      );
    });

    it('uses custom limit when specified', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [{ _id: 'entity-1', _index: 'test-index', _source: createMockEntity() }],
          total: { value: 1, relation: 'eq' },
        },
      });

      await tool.handler(
        { entityTypes: ['host'], limit: 50 },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(mockEsClient.asCurrentUser.search).toHaveBeenCalledWith(
        expect.objectContaining({
          size: 50,
        })
      );
    });

    it('uses default limit of 10', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [{ _id: 'entity-1', _index: 'test-index', _source: createMockEntity() }],
          total: { value: 1, relation: 'eq' },
        },
      });

      await tool.handler(
        { entityTypes: ['host'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(mockEsClient.asCurrentUser.search).toHaveBeenCalledWith(
        expect.objectContaining({
          size: 10,
        })
      );
    });

    it('searches multiple entity type indices', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [{ _id: 'entity-1', _index: 'test-index', _source: createMockEntity() }],
          total: { value: 1, relation: 'eq' },
        },
      });

      await tool.handler(
        { entityTypes: ['host', 'user', 'service'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(mockEsClient.asCurrentUser.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: expect.arrayContaining([
            expect.stringContaining('host'),
            expect.stringContaining('user'),
            expect.stringContaining('service'),
          ]),
        })
      );
    });

    it('returns error when no entities found', async () => {
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
        { entityTypes: ['host'], riskLevels: ['Critical'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      const errorResult = result.results[0] as ErrorResult;
      expect(errorResult.type).toBe(ToolResultType.error);
      expect(errorResult.data.message).toContain(
        'No entities found matching the specified criteria'
      );
    });

    it('formats entities with all available fields', async () => {
      const mockEntity = createMockEntity();

      mockEsClient.asCurrentUser.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [{ _id: 'entity-1', _index: 'test-index', _source: mockEntity }],
          total: { value: 1, relation: 'eq' },
        },
      });

      const result = (await tool.handler(
        { entityTypes: ['host'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const otherResult = result.results[0] as OtherResult;
      const { entities } = otherResult.data as { entities: Array<Record<string, unknown>> };
      const entity = entities[0];

      expect(entity).toHaveProperty('entity_id');
      expect(entity).toHaveProperty('entity_name');
      expect(entity).toHaveProperty('entity_type');
      expect(entity).toHaveProperty('risk_score_norm');
      expect(entity).toHaveProperty('risk_level');
      expect(entity).toHaveProperty('asset_criticality');
      expect(entity).toHaveProperty('first_seen');
      expect(entity).toHaveProperty('last_activity');
      expect(entity).toHaveProperty('attributes');
      expect(entity).toHaveProperty('behaviors');
      expect(entity).toHaveProperty('host');
    });

    it('uses match_all query when no filters provided', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [{ _id: 'entity-1', _index: 'test-index', _source: createMockEntity() }],
          total: { value: 1, relation: 'eq' },
        },
      });

      await tool.handler(
        { entityTypes: ['host'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(mockEsClient.asCurrentUser.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { match_all: {} },
        })
      );
    });

    it('handles ES client failures', async () => {
      mockEsClient.asCurrentUser.search.mockRejectedValue(new Error('ES error'));

      const result = (await tool.handler(
        { entityTypes: ['host'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      const errorResult = result.results[0] as ErrorResult;
      expect(errorResult.type).toBe(ToolResultType.error);
      expect(errorResult.data.message).toContain('Error searching Entity Store');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('logs debug message when tool is called', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [{ _id: 'entity-1', _index: 'test-index', _source: createMockEntity() }],
          total: { value: 1, relation: 'eq' },
        },
      });

      await tool.handler(
        { entityTypes: ['host', 'user'], riskLevels: ['High'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('entity_store_search'));
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('host, user'));
    });

    it('includes user-specific fields for user entities', async () => {
      // Risk data for user entities is stored under user.risk
      const mockUserEntity = {
        '@timestamp': '2024-01-15T10:00:00Z',
        entity: {
          id: 'user-123',
          name: 'jsmith',
          type: 'user',
          // eslint-disable-next-line @typescript-eslint/naming-convention
          lifecycle: { First_seen: '2024-01-01T00:00:00Z', Last_activity: '2024-01-15T10:00:00Z' },
        },
        user: {
          name: 'jsmith',
          email: 'jsmith@example.com',
          risk: { calculated_score_norm: 50, calculated_level: 'Moderate' },
        },
      };

      mockEsClient.asCurrentUser.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [{ _id: 'entity-1', _index: 'test-index', _source: mockUserEntity }],
          total: { value: 1, relation: 'eq' },
        },
      });

      const result = (await tool.handler(
        { entityTypes: ['user'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const otherResult = result.results[0] as OtherResult;
      const { entities } = otherResult.data as { entities: Array<Record<string, unknown>> };
      expect(entities[0]).toHaveProperty('user');
      expect(entities[0].user).toEqual({ name: 'jsmith', email: 'jsmith@example.com' });
    });

    it('includes service-specific fields for service entities', async () => {
      // Risk data for service entities is stored under service.risk
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
          risk: { calculated_score_norm: 30, calculated_level: 'Low' },
        },
      };

      mockEsClient.asCurrentUser.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [{ _id: 'entity-1', _index: 'test-index', _source: mockServiceEntity }],
          total: { value: 1, relation: 'eq' },
        },
      });

      const result = (await tool.handler(
        { entityTypes: ['service'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const otherResult = result.results[0] as OtherResult;
      const { entities } = otherResult.data as { entities: Array<Record<string, unknown>> };
      expect(entities[0]).toHaveProperty('service');
      expect(entities[0].service).toEqual({ name: 'api-gateway', version: '2.0.0' });
    });
  });
});
