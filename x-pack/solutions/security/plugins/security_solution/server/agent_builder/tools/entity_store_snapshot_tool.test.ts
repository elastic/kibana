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
  entityStoreSnapshotTool,
  SECURITY_ENTITY_STORE_SNAPSHOT_TOOL_ID,
} from './entity_store_snapshot_tool';

describe('entityStoreSnapshotTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const tool = entityStoreSnapshotTool(mockCore, mockLogger);

  beforeEach(() => {
    jest.clearAllMocks();
    setupMockCoreStartServices(mockCore, mockEsClient);
  });

  describe('tool definition', () => {
    it('has the correct ID', () => {
      expect(tool.id).toBe(SECURITY_ENTITY_STORE_SNAPSHOT_TOOL_ID);
    });

    it('has correct tags', () => {
      expect(tool.tags).toEqual(['security', 'entity-store', 'entities', 'snapshot', 'history']);
    });
  });

  describe('schema', () => {
    it('validates correct schema with required parameters', () => {
      const validInput = {
        entityType: 'host',
        identifier: 'server-01',
        snapshotDate: '2024-03-15',
      };

      const result = tool.schema.safeParse(validInput);

      expect(result.success).toBe(true);
    });

    it('validates correct schema with optional compareWithCurrent parameter', () => {
      const validInput = {
        entityType: 'user',
        identifier: 'jsmith',
        snapshotDate: '2024-03-15',
        compareWithCurrent: false,
      };

      const result = tool.schema.safeParse(validInput);

      expect(result.success).toBe(true);
    });

    it('validates all entity types', () => {
      const entityTypes = ['host', 'user', 'service', 'generic'];

      entityTypes.forEach((entityType) => {
        const result = tool.schema.safeParse({
          entityType,
          identifier: 'test-entity',
          snapshotDate: '2024-03-15',
        });
        expect(result.success).toBe(true);
      });
    });

    it('rejects invalid entityType', () => {
      const invalidInput = {
        entityType: 'invalid',
        identifier: 'hostname-1',
        snapshotDate: '2024-03-15',
      };

      const result = tool.schema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    it('rejects empty identifier', () => {
      const invalidInput = {
        entityType: 'host',
        identifier: '',
        snapshotDate: '2024-03-15',
      };

      const result = tool.schema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    it('rejects missing snapshotDate', () => {
      const invalidInput = {
        entityType: 'host',
        identifier: 'server-01',
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
        '@timestamp': '2024-03-15T00:00:00Z',
        entity: {
          id: 'entity-123',
          name: 'test-entity',
          type: entityType,
          lifecycle: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            First_seen: '2024-01-01T00:00:00Z',
            // eslint-disable-next-line @typescript-eslint/naming-convention
            Last_activity: '2024-03-15T00:00:00Z',
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
              calculated_score: 150,
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
              calculated_score: 150,
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
              calculated_score: 150,
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
              calculated_score: 150,
            },
            ...((overrides.entity as Record<string, unknown>) || {}),
          },
        };
      }
    };

    it('successfully retrieves historical snapshot for a host entity', async () => {
      const historicalEntity = createMockEntity();

      // Mock snapshot search
      mockEsClient.asCurrentUser.search.mockResolvedValueOnce({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [{ _id: 'snapshot-1', _index: 'test-snapshot-index', _source: historicalEntity }],
          total: { value: 1, relation: 'eq' },
        },
      });

      // Mock cat.indices for available snapshots
      mockEsClient.asCurrentUser.cat.indices.mockResolvedValueOnce([
        { index: '.entities.v1.history.2024-03-15.security_host_default' },
        { index: '.entities.v1.history.2024-03-14.security_host_default' },
      ]);

      // Mock current entity search
      mockEsClient.asCurrentUser.search.mockResolvedValueOnce({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [{ _id: 'current-1', _index: 'test-index', _source: createMockEntity() }],
          total: { value: 1, relation: 'eq' },
        },
      });

      const result = (await tool.handler(
        { entityType: 'host', identifier: 'server-01', snapshotDate: '2024-03-15' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe(ToolResultType.other);

      const otherResult = result.results[0] as OtherResult;
      expect(otherResult.data).toHaveProperty('snapshot_date');
      expect(otherResult.data).toHaveProperty('historical_profile');
      expect(otherResult.data).toHaveProperty('current_profile');
      expect(otherResult.data).toHaveProperty('available_snapshot_dates');
    });

    it('compares historical and current profiles when compareWithCurrent is true', async () => {
      // Risk is stored under host.risk for host entities
      const historicalEntity = createMockEntity({
        host: {
          name: 'test-host',
          risk: { calculated_score_norm: 50, calculated_level: 'Moderate', calculated_score: 100 },
        },
      });

      const currentEntity = createMockEntity({
        host: {
          name: 'test-host',
          risk: { calculated_score_norm: 75, calculated_level: 'High', calculated_score: 150 },
        },
      });

      // Mock snapshot search
      mockEsClient.asCurrentUser.search.mockResolvedValueOnce({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [{ _id: 'snapshot-1', _index: 'test-snapshot-index', _source: historicalEntity }],
          total: { value: 1, relation: 'eq' },
        },
      });

      // Mock cat.indices
      mockEsClient.asCurrentUser.cat.indices.mockResolvedValueOnce([]);

      // Mock current entity search
      mockEsClient.asCurrentUser.search.mockResolvedValueOnce({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [{ _id: 'current-1', _index: 'test-index', _source: currentEntity }],
          total: { value: 1, relation: 'eq' },
        },
      });

      const result = (await tool.handler(
        {
          entityType: 'host',
          identifier: 'server-01',
          snapshotDate: '2024-03-15',
          compareWithCurrent: true,
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const otherResult = result.results[0] as OtherResult;
      expect(otherResult.data).toHaveProperty('changes');
      expect(otherResult.data).toHaveProperty('has_changed');

      const { changes, has_changed: hasChanged } = otherResult.data as {
        changes: Array<{ field: string; from: unknown; to: unknown }>;
        has_changed: boolean;
      };
      expect(hasChanged).toBe(true);
      expect(changes).toContainEqual(
        expect.objectContaining({
          field: 'risk_level',
          from: 'Moderate',
          to: 'High',
        })
      );
    });

    it('skips comparison when compareWithCurrent is false', async () => {
      const historicalEntity = createMockEntity();

      // Mock snapshot search
      mockEsClient.asCurrentUser.search.mockResolvedValueOnce({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [{ _id: 'snapshot-1', _index: 'test-snapshot-index', _source: historicalEntity }],
          total: { value: 1, relation: 'eq' },
        },
      });

      // Mock cat.indices
      mockEsClient.asCurrentUser.cat.indices.mockResolvedValueOnce([]);

      const result = (await tool.handler(
        {
          entityType: 'host',
          identifier: 'server-01',
          snapshotDate: '2024-03-15',
          compareWithCurrent: false,
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const otherResult = result.results[0] as OtherResult;
      expect(otherResult.data).not.toHaveProperty('current_profile');
      expect(otherResult.data).not.toHaveProperty('changes');

      // Should only have made 2 search calls (snapshot + cat.indices), not 3 (no current entity)
      expect(mockEsClient.asCurrentUser.search).toHaveBeenCalledTimes(1);
    });

    it('returns error for invalid date format', async () => {
      const result = (await tool.handler(
        {
          entityType: 'host',
          identifier: 'server-01',
          snapshotDate: 'invalid-date',
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      const errorResult = result.results[0] as ErrorResult;
      expect(errorResult.type).toBe(ToolResultType.error);
      expect(errorResult.data.message).toContain('Invalid date format');
    });

    it('returns error when snapshot not found with available snapshots info', async () => {
      // Mock snapshot search returning no results
      mockEsClient.asCurrentUser.search.mockResolvedValueOnce({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [],
          total: { value: 0, relation: 'eq' },
        },
      });

      // Mock cat.indices showing available snapshots
      mockEsClient.asCurrentUser.cat.indices.mockResolvedValueOnce([
        { index: '.entities.v1.history.2024-03-14.security_host_default' },
        { index: '.entities.v1.history.2024-03-13.security_host_default' },
      ]);

      const result = (await tool.handler(
        {
          entityType: 'host',
          identifier: 'server-01',
          snapshotDate: '2024-03-15',
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      const errorResult = result.results[0] as ErrorResult;
      expect(errorResult.type).toBe(ToolResultType.error);
      expect(errorResult.data.message).toContain('No snapshot found');
      expect(errorResult.data.message).toContain('Available snapshot dates');
      expect(errorResult.data).toHaveProperty('available_snapshots');
    });

    it('returns error when no snapshots are available at all', async () => {
      // Mock snapshot search returning no results
      mockEsClient.asCurrentUser.search.mockResolvedValueOnce({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [],
          total: { value: 0, relation: 'eq' },
        },
      });

      // Mock cat.indices showing no available snapshots
      mockEsClient.asCurrentUser.cat.indices.mockResolvedValueOnce([]);

      const result = (await tool.handler(
        {
          entityType: 'host',
          identifier: 'server-01',
          snapshotDate: '2024-03-15',
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      const errorResult = result.results[0] as ErrorResult;
      expect(errorResult.type).toBe(ToolResultType.error);
      expect(errorResult.data.message).toContain('No historical snapshots are available');
    });

    it('handles current entity no longer existing', async () => {
      const historicalEntity = createMockEntity();

      // Mock snapshot search
      mockEsClient.asCurrentUser.search.mockResolvedValueOnce({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [{ _id: 'snapshot-1', _index: 'test-snapshot-index', _source: historicalEntity }],
          total: { value: 1, relation: 'eq' },
        },
      });

      // Mock cat.indices
      mockEsClient.asCurrentUser.cat.indices.mockResolvedValueOnce([]);

      // Mock current entity search returning no results
      mockEsClient.asCurrentUser.search.mockResolvedValueOnce({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [],
          total: { value: 0, relation: 'eq' },
        },
      });

      const result = (await tool.handler(
        {
          entityType: 'host',
          identifier: 'server-01',
          snapshotDate: '2024-03-15',
          compareWithCurrent: true,
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const otherResult = result.results[0] as OtherResult;
      expect(otherResult.data).toHaveProperty('current_profile', null);
      expect(otherResult.data).toHaveProperty('note');
      expect((otherResult.data as { note: string }).note).toContain(
        'Entity no longer exists in the current Entity Store'
      );
    });

    it('formats historical profile correctly', async () => {
      const historicalEntity = createMockEntity();

      mockEsClient.asCurrentUser.search.mockResolvedValueOnce({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [{ _id: 'snapshot-1', _index: 'test-snapshot-index', _source: historicalEntity }],
          total: { value: 1, relation: 'eq' },
        },
      });

      mockEsClient.asCurrentUser.cat.indices.mockResolvedValueOnce([]);

      const result = (await tool.handler(
        {
          entityType: 'host',
          identifier: 'server-01',
          snapshotDate: '2024-03-15',
          compareWithCurrent: false,
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const otherResult = result.results[0] as OtherResult;
      const { historical_profile: historicalProfile } = otherResult.data as {
        historical_profile: Record<string, unknown>;
      };

      expect(historicalProfile).toHaveProperty('entity_id');
      expect(historicalProfile).toHaveProperty('entity_name');
      expect(historicalProfile).toHaveProperty('entity_type');
      expect(historicalProfile).toHaveProperty('risk');
      expect(historicalProfile).toHaveProperty('asset_criticality');
      expect(historicalProfile).toHaveProperty('lifecycle');
      expect(historicalProfile).toHaveProperty('attributes');
      expect(historicalProfile).toHaveProperty('behaviors');
      expect(historicalProfile).toHaveProperty('timestamp');
    });

    it('uses correct identity field for user entity type', async () => {
      // For user entities, risk is under user.risk
      const historicalEntity = createMockEntity(
        {
          entity: { type: 'user', name: 'jsmith' },
          user: {
            name: 'jsmith',
            risk: { calculated_score_norm: 75, calculated_level: 'High', calculated_score: 150 },
          },
        },
        'user'
      );

      mockEsClient.asCurrentUser.search.mockResolvedValueOnce({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [{ _id: 'snapshot-1', _index: 'test-snapshot-index', _source: historicalEntity }],
          total: { value: 1, relation: 'eq' },
        },
      });

      mockEsClient.asCurrentUser.cat.indices.mockResolvedValueOnce([]);

      await tool.handler(
        {
          entityType: 'user',
          identifier: 'jsmith',
          snapshotDate: '2024-03-15',
          compareWithCurrent: false,
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(mockEsClient.asCurrentUser.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { term: { 'user.name': 'jsmith' } },
        })
      );
    });

    it('uses correct identity field for service entity type', async () => {
      // For service entities, risk is under service.risk
      const historicalEntity = createMockEntity(
        {
          entity: { type: 'service', name: 'api-gateway' },
          service: {
            name: 'api-gateway',
            risk: { calculated_score_norm: 75, calculated_level: 'High', calculated_score: 150 },
          },
        },
        'service'
      );

      mockEsClient.asCurrentUser.search.mockResolvedValueOnce({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [{ _id: 'snapshot-1', _index: 'test-snapshot-index', _source: historicalEntity }],
          total: { value: 1, relation: 'eq' },
        },
      });

      mockEsClient.asCurrentUser.cat.indices.mockResolvedValueOnce([]);

      await tool.handler(
        {
          entityType: 'service',
          identifier: 'api-gateway',
          snapshotDate: '2024-03-15',
          compareWithCurrent: false,
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(mockEsClient.asCurrentUser.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { term: { 'service.name': 'api-gateway' } },
        })
      );
    });

    it('uses correct identity field for generic entity type', async () => {
      // For generic entities, risk is under entity.risk
      const historicalEntity = createMockEntity(
        {
          entity: {
            type: 'generic',
            id: 'generic-123',
            risk: { calculated_score_norm: 75, calculated_level: 'High', calculated_score: 150 },
          },
        },
        'generic'
      );

      mockEsClient.asCurrentUser.search.mockResolvedValueOnce({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [{ _id: 'snapshot-1', _index: 'test-snapshot-index', _source: historicalEntity }],
          total: { value: 1, relation: 'eq' },
        },
      });

      mockEsClient.asCurrentUser.cat.indices.mockResolvedValueOnce([]);

      await tool.handler(
        {
          entityType: 'generic',
          identifier: 'generic-123',
          snapshotDate: '2024-03-15',
          compareWithCurrent: false,
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(mockEsClient.asCurrentUser.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { term: { 'entity.id': 'generic-123' } },
        })
      );
    });

    it('handles 404 error from snapshot index gracefully', async () => {
      const error = new Error('Index not found');
      (error as unknown as { meta: { statusCode: number } }).meta = { statusCode: 404 };

      mockEsClient.asCurrentUser.search.mockRejectedValueOnce(error);
      mockEsClient.asCurrentUser.cat.indices.mockResolvedValueOnce([]);

      const result = (await tool.handler(
        {
          entityType: 'host',
          identifier: 'server-01',
          snapshotDate: '2024-03-15',
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      // Should handle 404 as "no snapshot found" rather than throwing
      const errorResult = result.results[0] as ErrorResult;
      expect(errorResult.type).toBe(ToolResultType.error);
      expect(errorResult.data.message).toContain('No snapshot found');
    });

    it('handles ES client failures', async () => {
      mockEsClient.asCurrentUser.search.mockRejectedValue(new Error('ES connection error'));

      const result = (await tool.handler(
        {
          entityType: 'host',
          identifier: 'server-01',
          snapshotDate: '2024-03-15',
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      const errorResult = result.results[0] as ErrorResult;
      expect(errorResult.type).toBe(ToolResultType.error);
      expect(errorResult.data.message).toContain('Error retrieving entity snapshot');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('logs debug message when tool is called', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValueOnce({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [{ _id: 'snapshot-1', _index: 'test-snapshot-index', _source: createMockEntity() }],
          total: { value: 1, relation: 'eq' },
        },
      });

      mockEsClient.asCurrentUser.cat.indices.mockResolvedValueOnce([]);

      await tool.handler(
        {
          entityType: 'host',
          identifier: 'server-01',
          snapshotDate: '2024-03-15',
          compareWithCurrent: false,
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('entity_store_snapshot')
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('host'));
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('server-01'));
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('2024-03-15'));
    });

    it('detects attribute changes between profiles', async () => {
      const historicalEntity = createMockEntity({
        entity: {
          attributes: { Privileged: false, Managed: false },
        },
      });

      const currentEntity = createMockEntity({
        entity: {
          attributes: { Privileged: true, Managed: true },
        },
      });

      mockEsClient.asCurrentUser.search
        .mockResolvedValueOnce({
          took: 1,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: {
            hits: [{ _id: 'snapshot-1', _index: 'test-snapshot-index', _source: historicalEntity }],
            total: { value: 1, relation: 'eq' },
          },
        })
        .mockResolvedValueOnce({
          took: 1,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: {
            hits: [{ _id: 'current-1', _index: 'test-index', _source: currentEntity }],
            total: { value: 1, relation: 'eq' },
          },
        });

      mockEsClient.asCurrentUser.cat.indices.mockResolvedValueOnce([]);

      const result = (await tool.handler(
        {
          entityType: 'host',
          identifier: 'server-01',
          snapshotDate: '2024-03-15',
          compareWithCurrent: true,
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const otherResult = result.results[0] as OtherResult;
      const { changes } = otherResult.data as {
        changes: Array<{ field: string; from: unknown; to: unknown }>;
      };

      expect(changes).toContainEqual(
        expect.objectContaining({
          field: 'attributes.Privileged',
          from: false,
          to: true,
        })
      );
      expect(changes).toContainEqual(
        expect.objectContaining({
          field: 'attributes.Managed',
          from: false,
          to: true,
        })
      );
    });

    it('detects behavior changes between profiles', async () => {
      const historicalEntity = createMockEntity({
        entity: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          behaviors: { Brute_force_victim: false },
        },
      });

      const currentEntity = createMockEntity({
        entity: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          behaviors: { Brute_force_victim: true },
        },
      });

      mockEsClient.asCurrentUser.search
        .mockResolvedValueOnce({
          took: 1,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: {
            hits: [{ _id: 'snapshot-1', _index: 'test-snapshot-index', _source: historicalEntity }],
            total: { value: 1, relation: 'eq' },
          },
        })
        .mockResolvedValueOnce({
          took: 1,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: {
            hits: [{ _id: 'current-1', _index: 'test-index', _source: currentEntity }],
            total: { value: 1, relation: 'eq' },
          },
        });

      mockEsClient.asCurrentUser.cat.indices.mockResolvedValueOnce([]);

      const result = (await tool.handler(
        {
          entityType: 'host',
          identifier: 'server-01',
          snapshotDate: '2024-03-15',
          compareWithCurrent: true,
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const otherResult = result.results[0] as OtherResult;
      const { changes } = otherResult.data as {
        changes: Array<{ field: string; from: unknown; to: unknown }>;
      };

      expect(changes).toContainEqual(
        expect.objectContaining({
          field: 'behaviors.Brute_force_victim',
          from: false,
          to: true,
        })
      );
    });
  });
});
