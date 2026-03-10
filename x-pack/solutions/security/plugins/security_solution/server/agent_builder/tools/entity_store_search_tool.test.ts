/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, type ErrorResult } from '@kbn/agent-builder-common';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import { FF_ENABLE_ENTITY_STORE_V2, getLatestEntityStoreIndexName } from '@kbn/entity-store/common';
import {
  createToolAvailabilityContext,
  createToolHandlerContext,
  createToolTestMocks,
  setupMockCoreStartServices,
} from '../__mocks__/test_helpers';
import {
  entityStoreSearchTool,
  buildEntityStoreSearchQuery,
  type EntityStoreSearchParams,
} from './entity_store_search_tool';

describe('entityStoreSearchTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const tool = entityStoreSearchTool(mockCore, mockLogger);

  beforeEach(() => {
    jest.clearAllMocks();
    setupMockCoreStartServices(mockCore, mockEsClient);
  });

  describe('schema', () => {
    it('accepts minimal valid input (no params)', () => {
      const result = tool.schema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('accepts full valid input', () => {
      const result = tool.schema.safeParse({
        entityTypes: ['host', 'user'],
        entityName: 'server-1',
        riskLevel: 'High',
        riskScoreMin: 50,
        riskScoreMax: 100,
        criticalityLevel: 'extreme_impact',
        attributes: { managed: true, watchlists: ['privmon'] },
        behaviors: { ruleNames: ['brute-force'] },
        sortBy: 'risk_score',
        sortOrder: 'desc',
        limit: 20,
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid entity type', () => {
      const result = tool.schema.safeParse({ entityTypes: ['invalid'] });
      expect(result.success).toBe(false);
    });

    it('rejects invalid risk level', () => {
      const result = tool.schema.safeParse({ riskLevel: 'SuperHigh' });
      expect(result.success).toBe(false);
    });

    it('rejects invalid criticality level', () => {
      const result = tool.schema.safeParse({ criticalityLevel: 'unknown' });
      expect(result.success).toBe(false);
    });

    it('rejects risk score out of range', () => {
      expect(tool.schema.safeParse({ riskScoreMin: -1 }).success).toBe(false);
      expect(tool.schema.safeParse({ riskScoreMax: 101 }).success).toBe(false);
    });

    it('rejects limit out of range', () => {
      expect(tool.schema.safeParse({ limit: 0 }).success).toBe(false);
      expect(tool.schema.safeParse({ limit: 101 }).success).toBe(false);
    });
  });

  describe('buildEntityStoreSearchQuery', () => {
    const index = '.entities.v2.latest.security_default';

    it('builds a basic query with no filters', () => {
      const query = buildEntityStoreSearchQuery({}, index);
      expect(query).toContain(`FROM ${index}`);
      expect(query).toContain('WHERE entity.id IS NOT NULL');
      expect(query).toContain('SORT entity.risk.calculated_score_norm DESC');
      expect(query).toContain('LIMIT 10');
    });

    it('filters by a single entity type', () => {
      const query = buildEntityStoreSearchQuery({ entityTypes: ['host'] }, index);
      expect(query).toContain('entity.EngineMetadata.Type == "host"');
    });

    it('filters by multiple entity types using IN', () => {
      const query = buildEntityStoreSearchQuery(
        { entityTypes: ['host', 'user'] },
        index
      );
      expect(query).toContain('entity.EngineMetadata.Type IN ("host", "user")');
    });

    it('filters by exact entity name', () => {
      const query = buildEntityStoreSearchQuery({ entityName: 'server-1' }, index);
      expect(query).toContain('entity.name == "server-1"');
    });

    it('filters by wildcard entity name', () => {
      const query = buildEntityStoreSearchQuery({ entityName: 'server-*' }, index);
      expect(query).toContain('entity.name LIKE "server-*"');
    });

    it('filters by risk level', () => {
      const query = buildEntityStoreSearchQuery({ riskLevel: 'Critical' }, index);
      expect(query).toContain('entity.risk.calculated_level == "Critical"');
    });

    it('filters by risk score range', () => {
      const query = buildEntityStoreSearchQuery(
        { riskScoreMin: 50, riskScoreMax: 90 },
        index
      );
      expect(query).toContain('entity.risk.calculated_score_norm >= 50');
      expect(query).toContain('entity.risk.calculated_score_norm <= 90');
    });

    it('filters by criticality level', () => {
      const query = buildEntityStoreSearchQuery(
        { criticalityLevel: 'high_impact' },
        index
      );
      expect(query).toContain('asset.criticality == "high_impact"');
    });

    it('filters by attributes', () => {
      const query = buildEntityStoreSearchQuery(
        {
          attributes: {
            managed: true,
            mfa_enabled: false,
            asset: true,
            watchlists: ['privmon', 'insider_threat'],
          },
        },
        index
      );
      expect(query).toContain('entity.attributes.managed == true');
      expect(query).toContain('entity.attributes.mfa_enabled == false');
      expect(query).toContain('entity.attributes.asset == true');
      expect(query).toContain('entity.attributes.watchlists == "privmon"');
      expect(query).toContain('entity.attributes.watchlists == "insider_threat"');
    });

    it('filters by behaviors', () => {
      const query = buildEntityStoreSearchQuery(
        {
          behaviors: {
            ruleNames: ['brute-force'],
            anomalyJobIds: ['job-123'],
          },
        },
        index
      );
      expect(query).toContain('entity.behaviors.rule_names == "brute-force"');
      expect(query).toContain('entity.behaviors.anomaly_job_ids == "job-123"');
    });

    it('builds compound query with multiple filters', () => {
      const params: EntityStoreSearchParams = {
        entityTypes: ['host'],
        riskLevel: 'High',
        criticalityLevel: 'extreme_impact',
        limit: 5,
        sortBy: 'name',
        sortOrder: 'asc',
      };
      const query = buildEntityStoreSearchQuery(params, index);
      expect(query).toContain('entity.EngineMetadata.Type == "host"');
      expect(query).toContain('entity.risk.calculated_level == "High"');
      expect(query).toContain('asset.criticality == "extreme_impact"');
      expect(query).toContain('SORT entity.name ASC');
      expect(query).toContain('LIMIT 5');
    });

    it('sorts by last_activity', () => {
      const query = buildEntityStoreSearchQuery(
        { sortBy: 'last_activity', sortOrder: 'desc' },
        index
      );
      expect(query).toContain('SORT entity.lifecycle.last_activity DESC');
    });

    it('sorts by first_seen', () => {
      const query = buildEntityStoreSearchQuery({ sortBy: 'first_seen' }, index);
      expect(query).toContain('SORT entity.lifecycle.first_seen DESC');
    });

    it('escapes special characters in entity name', () => {
      const query = buildEntityStoreSearchQuery(
        { entityName: 'server"\\test' },
        index
      );
      expect(query).toContain('entity.name == "server\\"\\\\test"');
    });
  });

  describe('availability', () => {
    it('returns available when entity store v2 is enabled and index exists', async () => {
      const mockUiSettings = uiSettingsServiceMock.createClient();
      mockUiSettings.get.mockImplementation(async (key: string) => {
        if (key === FF_ENABLE_ENTITY_STORE_V2) return true;
        return false;
      });
      mockEsClient.asInternalUser.indices.exists.mockResolvedValueOnce(true);

      const result = await tool.availability!.handler(
        createToolAvailabilityContext(mockRequest, 'default', mockUiSettings)
      );

      expect(result.status).toBe('available');
    });

    it('returns unavailable when entity store v2 is disabled', async () => {
      const mockUiSettings = uiSettingsServiceMock.createClient();
      mockUiSettings.get.mockImplementation(async (key: string) => {
        if (key === FF_ENABLE_ENTITY_STORE_V2) return false;
        return false;
      });

      const result = await tool.availability!.handler(
        createToolAvailabilityContext(mockRequest, 'default', mockUiSettings)
      );

      expect(result.status).toBe('unavailable');
      expect(result.reason).toBe('Entity Store v2 is not enabled');
    });

    it('returns unavailable when index does not exist', async () => {
      const mockUiSettings = uiSettingsServiceMock.createClient();
      mockUiSettings.get.mockImplementation(async (key: string) => {
        if (key === FF_ENABLE_ENTITY_STORE_V2) return true;
        return false;
      });
      mockEsClient.asInternalUser.indices.exists.mockResolvedValueOnce(false);

      const result = await tool.availability!.handler(
        createToolAvailabilityContext(mockRequest, 'default', mockUiSettings)
      );

      expect(result.status).toBe('unavailable');
      expect(result.reason).toBe('Entity Store index does not exist for this space');
    });

    it('returns unavailable on error', async () => {
      const mockUiSettings = uiSettingsServiceMock.createClient();
      mockUiSettings.get.mockRejectedValueOnce(new Error('Settings error'));

      const result = await tool.availability!.handler(
        createToolAvailabilityContext(mockRequest, 'default', mockUiSettings)
      );

      expect(result.status).toBe('unavailable');
      expect(result.reason).toContain('Failed to check Entity Store availability');
    });
  });

  describe('handler', () => {
    it('executes ESQL query and returns results', async () => {
      const mockColumns = [
        { name: 'entity.id', type: 'keyword' },
        { name: 'entity.name', type: 'keyword' },
      ];
      const mockValues = [
        ['host:server-1', 'server-1'],
        ['host:server-2', 'server-2'],
      ];
      mockEsClient.asCurrentUser.esql.query.mockResolvedValueOnce({
        columns: mockColumns,
        values: mockValues,
      });

      const result = (await tool.handler(
        { entityTypes: ['host'], limit: 10 },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe(ToolResultType.esqlResults);

      const data = result.results[0].data as {
        query: string;
        columns: unknown[];
        values: unknown[][];
      };
      expect(data.query).toContain(getLatestEntityStoreIndexName('default'));
      expect(data.columns).toEqual(mockColumns);
      expect(data.values).toEqual(mockValues);

      expect(mockEsClient.asCurrentUser.esql.query).toHaveBeenCalledWith({
        query: expect.stringContaining('FROM .entities.v2.latest.security_default'),
        drop_null_columns: true,
      });
    });

    it('uses correct space ID for the index', async () => {
      mockEsClient.asCurrentUser.esql.query.mockResolvedValueOnce({
        columns: [],
        values: [],
      });

      await tool.handler(
        {},
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          spaceId: 'custom-space',
        })
      );

      expect(mockEsClient.asCurrentUser.esql.query).toHaveBeenCalledWith({
        query: expect.stringContaining('.entities.v2.latest.security_custom-space'),
        drop_null_columns: true,
      });
    });

    it('returns error result on ES failure', async () => {
      mockEsClient.asCurrentUser.esql.query.mockRejectedValueOnce(
        new Error('ES|QL query failed')
      );

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

    it('passes compound filters to ESQL query', async () => {
      mockEsClient.asCurrentUser.esql.query.mockResolvedValueOnce({
        columns: [],
        values: [],
      });

      await tool.handler(
        {
          entityTypes: ['host'],
          riskLevel: 'High',
          criticalityLevel: 'extreme_impact',
          sortBy: 'risk_score',
          sortOrder: 'desc',
          limit: 5,
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const calledQuery = mockEsClient.asCurrentUser.esql.query.mock.calls[0][0].query as string;
      expect(calledQuery).toContain('entity.EngineMetadata.Type == "host"');
      expect(calledQuery).toContain('entity.risk.calculated_level == "High"');
      expect(calledQuery).toContain('asset.criticality == "extreme_impact"');
      expect(calledQuery).toContain('SORT entity.risk.calculated_score_norm DESC');
      expect(calledQuery).toContain('LIMIT 5');
    });
  });
});
