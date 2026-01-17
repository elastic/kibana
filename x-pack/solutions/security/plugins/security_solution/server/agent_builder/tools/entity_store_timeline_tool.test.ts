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
  entityStoreTimelineTool,
  SECURITY_ENTITY_STORE_TIMELINE_TOOL_ID,
} from './entity_store_timeline_tool';

describe('entityStoreTimelineTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const tool = entityStoreTimelineTool(mockCore, mockLogger);

  beforeEach(() => {
    jest.clearAllMocks();
    setupMockCoreStartServices(mockCore, mockEsClient);
  });

  describe('tool definition', () => {
    it('has the correct ID', () => {
      expect(tool.id).toBe(SECURITY_ENTITY_STORE_TIMELINE_TOOL_ID);
    });

    it('has correct tags', () => {
      expect(tool.tags).toEqual(['security', 'entity-store', 'entities', 'timeline', 'activity']);
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
          behaviors: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            Brute_force_victim: false,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            New_country_login: true,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            Used_usb_device: false,
          },
          relationships: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            Communicates_with: ['service-api', 'service-db'],
            // eslint-disable-next-line @typescript-eslint/naming-convention
            Depends_on: ['service-auth'],
            // eslint-disable-next-line @typescript-eslint/naming-convention
            Owned_by: ['admin-user'],
            // eslint-disable-next-line @typescript-eslint/naming-convention
            Accesses_frequently: ['file-server'],
          },
          ...((overrides.entity as Record<string, unknown>) || {}),
        },
        ...overrides,
      };

      // Add entity-type-specific risk data and identity fields
      if (entityType === 'host') {
        return {
          ...baseEntity,
          host: {
            name: 'test-host',
            os: { name: 'Ubuntu' },
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

    it('successfully retrieves timeline for a host entity', async () => {
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
        { entityType: 'host', identifier: 'server-01' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe(ToolResultType.other);

      const otherResult = result.results[0] as OtherResult;
      expect(otherResult.data).toHaveProperty('timeline');

      const { timeline } = otherResult.data as { timeline: Record<string, unknown> };
      expect(timeline).toHaveProperty('entity_id');
      expect(timeline).toHaveProperty('entity_name');
      expect(timeline).toHaveProperty('entity_type');
      expect(timeline).toHaveProperty('lifecycle');
      expect(timeline).toHaveProperty('current_risk');
      expect(timeline).toHaveProperty('behaviors');
      expect(timeline).toHaveProperty('relationships');
    });

    it('includes correct lifecycle information', async () => {
      const mockEntity = createMockEntity({
        entity: {
          lifecycle: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            First_seen: '2024-01-01T00:00:00Z',
            // eslint-disable-next-line @typescript-eslint/naming-convention
            Last_activity: '2024-01-15T10:00:00Z',
          },
        },
      });

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
        { entityType: 'host', identifier: 'server-01' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const otherResult = result.results[0] as OtherResult;
      const { timeline } = otherResult.data as {
        timeline: { lifecycle: Record<string, unknown> };
      };

      expect(timeline.lifecycle).toHaveProperty('first_seen', '2024-01-01T00:00:00Z');
      expect(timeline.lifecycle).toHaveProperty('last_activity', '2024-01-15T10:00:00Z');
      expect(timeline.lifecycle).toHaveProperty('activity_duration');
      expect(timeline.lifecycle).toHaveProperty('days_since_first_seen');
      expect(timeline.lifecycle).toHaveProperty('days_since_last_activity');
    });

    it('calculates activity duration correctly', async () => {
      // Set dates to fixed values for predictable testing
      const firstSeen = '2024-01-01T00:00:00Z';
      const lastActivity = '2024-01-15T00:00:00Z'; // 14 days later

      const mockEntity = createMockEntity({
        entity: {
          lifecycle: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            First_seen: firstSeen,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            Last_activity: lastActivity,
          },
        },
      });

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
        { entityType: 'host', identifier: 'server-01' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const otherResult = result.results[0] as OtherResult;
      const { timeline } = otherResult.data as {
        timeline: { lifecycle: { activity_duration: string } };
      };

      expect(timeline.lifecycle.activity_duration).toContain('14 days');
    });

    it('includes current risk information', async () => {
      // Risk is stored under host.risk for host entities
      const mockEntity = createMockEntity({
        host: {
          name: 'test-host',
          os: { name: 'Ubuntu' },
          risk: {
            calculated_score_norm: 85,
            calculated_level: 'Critical',
          },
        },
      });

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
        { entityType: 'host', identifier: 'server-01' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const otherResult = result.results[0] as OtherResult;
      const { timeline } = otherResult.data as {
        timeline: { current_risk: Record<string, unknown> };
      };

      expect(timeline.current_risk).toEqual({
        level: 'Critical',
        score_norm: 85,
      });
    });

    it('includes behavior information with active behaviors list', async () => {
      const mockEntity = createMockEntity({
        entity: {
          behaviors: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            Brute_force_victim: true,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            New_country_login: true,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            Used_usb_device: false,
          },
        },
      });

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
        { entityType: 'host', identifier: 'server-01' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const otherResult = result.results[0] as OtherResult;
      const { timeline } = otherResult.data as {
        timeline: {
          behaviors: {
            brute_force_victim: boolean;
            new_country_login: boolean;
            used_usb_device: boolean;
            active_behaviors: string[];
          };
        };
      };

      expect(timeline.behaviors.brute_force_victim).toBe(true);
      expect(timeline.behaviors.new_country_login).toBe(true);
      expect(timeline.behaviors.used_usb_device).toBe(false);
      expect(timeline.behaviors.active_behaviors).toContain('brute force victim');
      expect(timeline.behaviors.active_behaviors).toContain('new country login');
      expect(timeline.behaviors.active_behaviors).not.toContain('used usb device');
    });

    it('includes relationships information', async () => {
      const mockEntity = createMockEntity({
        entity: {
          relationships: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            Communicates_with: ['service-api', 'service-db'],
            // eslint-disable-next-line @typescript-eslint/naming-convention
            Depends_on: ['service-auth'],
            // eslint-disable-next-line @typescript-eslint/naming-convention
            Dependent_of: ['monitoring-service'],
            // eslint-disable-next-line @typescript-eslint/naming-convention
            Owned_by: ['admin-user'],
            Owns: ['virtual-machine-1'],
            // eslint-disable-next-line @typescript-eslint/naming-convention
            Accesses_frequently: ['file-server'],
            // eslint-disable-next-line @typescript-eslint/naming-convention
            Accessed_frequently_by: ['backup-service'],
            Supervises: ['junior-user'],
            // eslint-disable-next-line @typescript-eslint/naming-convention
            Supervised_by: ['manager-user'],
          },
        },
      });

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
        { entityType: 'host', identifier: 'server-01' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const otherResult = result.results[0] as OtherResult;
      const { timeline } = otherResult.data as {
        timeline: { relationships: Record<string, unknown> };
      };

      expect(timeline.relationships).toEqual({
        communicates_with: ['service-api', 'service-db'],
        depends_on: ['service-auth'],
        dependent_of: ['monitoring-service'],
        owned_by: ['admin-user'],
        owns: ['virtual-machine-1'],
        accesses_frequently: ['file-server'],
        accessed_frequently_by: ['backup-service'],
        supervises: ['junior-user'],
        supervised_by: ['manager-user'],
      });
    });

    it('includes host-specific details for host entity type', async () => {
      const mockEntity = createMockEntity({
        host: {
          name: 'server-01',
          os: { name: 'Ubuntu', version: '22.04' },
          ip: ['192.168.1.100'],
        },
      });

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
        { entityType: 'host', identifier: 'server-01' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const otherResult = result.results[0] as OtherResult;
      const { timeline } = otherResult.data as {
        timeline: { host_details: Record<string, unknown> };
      };

      expect(timeline.host_details).toEqual({
        name: 'server-01',
        os: { name: 'Ubuntu', version: '22.04' },
        ip: ['192.168.1.100'],
      });
    });

    it('includes user-specific details for user entity type', async () => {
      // Risk is stored under user.risk for user entities
      const mockUserEntity = {
        '@timestamp': '2024-01-15T10:00:00Z',
        entity: {
          id: 'user-123',
          name: 'jsmith',
          type: 'user',
          // eslint-disable-next-line @typescript-eslint/naming-convention
          lifecycle: { First_seen: '2024-01-01T00:00:00Z', Last_activity: '2024-01-15T10:00:00Z' },
          behaviors: {},
          relationships: {},
        },
        user: {
          name: 'jsmith',
          email: 'jsmith@example.com',
          domain: 'CORP',
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
        { entityType: 'user', identifier: 'jsmith' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const otherResult = result.results[0] as OtherResult;
      const { timeline } = otherResult.data as {
        timeline: { user_details: Record<string, unknown> };
      };

      expect(timeline.user_details).toEqual({
        name: 'jsmith',
        email: 'jsmith@example.com',
        domain: 'CORP',
      });
    });

    it('includes service-specific details for service entity type', async () => {
      // Risk is stored under service.risk for service entities
      const mockServiceEntity = {
        '@timestamp': '2024-01-15T10:00:00Z',
        entity: {
          id: 'service-123',
          name: 'api-gateway',
          type: 'service',
          // eslint-disable-next-line @typescript-eslint/naming-convention
          lifecycle: { First_seen: '2024-01-01T00:00:00Z', Last_activity: '2024-01-15T10:00:00Z' },
          behaviors: {},
          relationships: {},
        },
        service: {
          name: 'api-gateway',
          version: '2.0.0',
          environment: 'production',
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
        { entityType: 'service', identifier: 'api-gateway' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const otherResult = result.results[0] as OtherResult;
      const { timeline } = otherResult.data as {
        timeline: { service_details: Record<string, unknown> };
      };

      expect(timeline.service_details).toEqual({
        name: 'api-gateway',
        version: '2.0.0',
        environment: 'production',
      });
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

    it('uses correct identity field for user entity type', async () => {
      const mockUserEntity = {
        '@timestamp': '2024-01-15T10:00:00Z',
        entity: {
          id: 'user-123',
          name: 'jsmith',
          type: 'user',
          lifecycle: {},
          behaviors: {},
          relationships: {},
        },
        user: { name: 'jsmith' },
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

      await tool.handler(
        { entityType: 'user', identifier: 'jsmith' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(mockEsClient.asCurrentUser.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { term: { 'user.name': 'jsmith' } },
        })
      );
    });

    it('uses correct identity field for service entity type', async () => {
      const mockServiceEntity = {
        '@timestamp': '2024-01-15T10:00:00Z',
        entity: {
          id: 'service-123',
          name: 'api-gateway',
          type: 'service',
          lifecycle: {},
          behaviors: {},
          relationships: {},
        },
        service: { name: 'api-gateway' },
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

      await tool.handler(
        { entityType: 'service', identifier: 'api-gateway' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(mockEsClient.asCurrentUser.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { term: { 'service.name': 'api-gateway' } },
        })
      );
    });

    it('uses correct identity field for generic entity type', async () => {
      const mockGenericEntity = {
        '@timestamp': '2024-01-15T10:00:00Z',
        entity: {
          id: 'generic-123',
          name: 'custom-entity',
          type: 'generic',
          lifecycle: {},
          behaviors: {},
          relationships: {},
        },
      };

      mockEsClient.asCurrentUser.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [{ _id: 'entity-1', _index: 'test-index', _source: mockGenericEntity }],
          total: { value: 1, relation: 'eq' },
        },
      });

      await tool.handler(
        { entityType: 'generic', identifier: 'generic-123' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(mockEsClient.asCurrentUser.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { term: { 'entity.id': 'generic-123' } },
        })
      );
    });

    it('handles entity without lifecycle data', async () => {
      const mockEntity = createMockEntity({
        entity: {
          id: 'entity-123',
          name: 'test-entity',
          type: 'host',
          lifecycle: undefined,
          behaviors: {},
          relationships: {},
        },
      });

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
        { entityType: 'host', identifier: 'server-01' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const otherResult = result.results[0] as OtherResult;
      const { timeline } = otherResult.data as {
        timeline: { lifecycle: Record<string, unknown> };
      };

      expect(timeline.lifecycle.first_seen).toBeNull();
      expect(timeline.lifecycle.last_activity).toBeNull();
      expect(timeline.lifecycle.activity_duration).toBeNull();
    });

    it('handles entity without risk data', async () => {
      // Create an entity without risk data in the host field
      const mockEntity = {
        '@timestamp': '2024-01-15T10:00:00Z',
        entity: {
          id: 'entity-123',
          name: 'test-entity',
          type: 'host',
          lifecycle: {},
          behaviors: {},
          relationships: {},
        },
        host: {
          name: 'test-host',
          // No risk field
        },
      };

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
        { entityType: 'host', identifier: 'server-01' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const otherResult = result.results[0] as OtherResult;
      const { timeline } = otherResult.data as {
        timeline: { current_risk: unknown };
      };

      expect(timeline.current_risk).toBeNull();
    });

    it('handles entity without behaviors data', async () => {
      const mockEntity = createMockEntity({
        entity: {
          id: 'entity-123',
          name: 'test-entity',
          type: 'host',
          lifecycle: {},
          behaviors: undefined,
          relationships: {},
        },
      });

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
        { entityType: 'host', identifier: 'server-01' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const otherResult = result.results[0] as OtherResult;
      const { timeline } = otherResult.data as {
        timeline: { behaviors: { active_behaviors: string[] } };
      };

      expect(timeline.behaviors.active_behaviors).toEqual([]);
    });

    it('handles entity without relationships data', async () => {
      const mockEntity = createMockEntity({
        entity: {
          id: 'entity-123',
          name: 'test-entity',
          type: 'host',
          lifecycle: {},
          behaviors: {},
          relationships: undefined,
        },
      });

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
        { entityType: 'host', identifier: 'server-01' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const otherResult = result.results[0] as OtherResult;
      const { timeline } = otherResult.data as {
        timeline: { relationships: Record<string, unknown> };
      };

      expect(timeline.relationships).toEqual({});
    });

    it('includes last_updated timestamp', async () => {
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
        { entityType: 'host', identifier: 'server-01' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const otherResult = result.results[0] as OtherResult;
      const { timeline } = otherResult.data as {
        timeline: { last_updated: string };
      };

      expect(timeline.last_updated).toBe('2024-01-15T10:00:00Z');
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
      expect(errorResult.data.message).toContain('Error retrieving entity timeline');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('logs debug message when tool is called', async () => {
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

      await tool.handler(
        { entityType: 'host', identifier: 'server-01' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('entity_store_timeline')
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('host'));
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('server-01'));
    });
  });
});
