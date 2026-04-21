/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, type ErrorResult, type EsqlResults } from '@kbn/agent-builder-common';
import { executeEsql } from '@kbn/agent-builder-genai-utils';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import type { coreMock } from '@kbn/core/server/mocks';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import {
  createToolAvailabilityContext,
  createToolHandlerContext,
  createToolTestMocks,
  setupMockCoreStartServices,
} from '../../__mocks__/test_helpers';
import type { ExperimentalFeatures } from '../../../../common';
import { ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT } from '../../../lib/telemetry/event_based/events';
import { searchEntitiesTool, SECURITY_SEARCH_ENTITIES_TOOL_ID } from './search_entities_tool';

jest.mock('../../utils/get_agent_builder_resource_availability', () => ({
  getAgentBuilderResourceAvailability: jest.fn(),
}));

jest.mock('@kbn/agent-builder-genai-utils', () => ({
  executeEsql: jest.fn(),
}));

const mockGetAgentBuilderResourceAvailability = getAgentBuilderResourceAvailability as jest.Mock;

const mockExperimentalFeatures = {
  entityAnalyticsEntityStoreV2: true,
} as ExperimentalFeatures;

const EXPECTED_KEEP_CLAUSE =
  'KEEP @timestamp, entity.id, entity.name, entity.EngineMetadata.Type, entity.risk.calculated_score_norm, entity.risk.calculated_level, asset.criticality, entity.source, entity.lifecycle.first_seen, entity.lifecycle.last_activity, entity.attributes.watchlists, entity.attributes.managed, entity.attributes.mfa_enabled, entity.attributes.asset, entity.behaviors.rule_names, entity.behaviors.anomaly_job_ids';

const EXPECTED_SORT_CLAUSE = 'SORT entity.risk.calculated_score_norm DESC';

const mockSingleEntityResponse = () =>
  (executeEsql as jest.Mock).mockResolvedValueOnce({
    columns: [{ name: 'entity.id', type: 'keyword' }],
    values: [['host:server1']],
  });

describe('searchEntitiesTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const tool = searchEntitiesTool(mockCore, mockLogger, mockExperimentalFeatures);
  let mockCoreStart: ReturnType<typeof coreMock.createStart>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCoreStart = setupMockCoreStartServices(mockCore, mockEsClient);
    mockGetAgentBuilderResourceAvailability.mockResolvedValue({
      status: 'available',
    });
  });

  describe('schema', () => {
    it('accepts empty params (all filters optional)', () => {
      const result = tool.schema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('accepts valid entity types filter', () => {
      const result = tool.schema.safeParse({ entityTypes: ['host', 'user'] });
      expect(result.success).toBe(true);
    });

    it('rejects invalid entity type', () => {
      const result = tool.schema.safeParse({ entityTypes: ['invalid_type'] });
      expect(result.success).toBe(false);
    });

    it('accepts valid risk score range', () => {
      const result = tool.schema.safeParse({ riskScoreMin: 50, riskScoreMax: 100 });
      expect(result.success).toBe(true);
    });

    it('rejects risk score out of range', () => {
      const result = tool.schema.safeParse({ riskScoreMin: -1 });
      expect(result.success).toBe(false);
    });

    it('accepts valid risk levels', () => {
      const result = tool.schema.safeParse({ riskLevels: ['High', 'Critical'] });
      expect(result.success).toBe(true);
    });

    it('rejects invalid risk level', () => {
      const result = tool.schema.safeParse({ riskLevels: ['SuperHigh'] });
      expect(result.success).toBe(false);
    });

    it('accepts valid asset criticalities', () => {
      const result = tool.schema.safeParse({
        criticalityLevels: ['high_impact', 'extreme_impact'],
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid asset criticality', () => {
      const result = tool.schema.safeParse({ criticalityLevels: ['very_high'] });
      expect(result.success).toBe(false);
    });

    it('accepts watchlists', () => {
      const result = tool.schema.safeParse({ watchlists: ['vip', 'threat-actors'] });
      expect(result.success).toBe(true);
    });

    it('rejects empty watchlist string', () => {
      const result = tool.schema.safeParse({ watchlists: [''] });
      expect(result.success).toBe(false);
    });

    it('accepts managedOnly boolean', () => {
      const result = tool.schema.safeParse({ managedOnly: true });
      expect(result.success).toBe(true);
    });

    it('accepts mfaEnabledOnly boolean', () => {
      const result = tool.schema.safeParse({ mfaEnabledOnly: true });
      expect(result.success).toBe(true);
    });

    it('accepts assetOnly boolean', () => {
      const result = tool.schema.safeParse({ assetOnly: true });
      expect(result.success).toBe(true);
    });

    it('accepts ISO date strings for lifecycle filters', () => {
      const result = tool.schema.safeParse({
        firstSeenAfter: '2024-01-01T00:00:00Z',
        firstSeenBefore: '2024-12-31T23:59:59Z',
        lastSeenAfter: '2024-06-01T00:00:00Z',
        lastSeenBefore: '2024-12-31T23:59:59Z',
      });
      expect(result.success).toBe(true);
    });

    it('accepts valid riskScoreChangeInterval', () => {
      const result = tool.schema.safeParse({ riskScoreChangeInterval: '30d' });
      expect(result.success).toBe(true);
    });

    it('rejects invalid riskScoreChangeInterval', () => {
      const result = tool.schema.safeParse({ riskScoreChangeInterval: '30x' });
      expect(result.success).toBe(false);
    });

    it('rejects riskScoreChangeInterval shorter than 1 day', () => {
      for (const interval of ['30m', '6h', '23h', '59m', '1s']) {
        const result = tool.schema.safeParse({ riskScoreChangeInterval: interval });
        expect(result.success).toBe(false);
      }
    });

    it('accepts riskScoreChangeInterval of exactly 1 day', () => {
      const result = tool.schema.safeParse({ riskScoreChangeInterval: '1d' });
      expect(result.success).toBe(true);
    });

    it('accepts riskScoreChangeInterval in weeks and months', () => {
      for (const interval of ['1w', '2w', '1M', '3M']) {
        const result = tool.schema.safeParse({ riskScoreChangeInterval: interval });
        expect(result.success).toBe(true);
      }
    });

    it('accepts valid maxResults', () => {
      const result = tool.schema.safeParse({ maxResults: 22 });
      expect(result.success).toBe(true);
    });

    it('rejects maxResults above 100', () => {
      const result = tool.schema.safeParse({ maxResults: 101 });
      expect(result.success).toBe(false);
    });

    it('rejects maxResults below 1', () => {
      const result = tool.schema.safeParse({ maxResults: 0 });
      expect(result.success).toBe(false);
    });
  });

  describe('availability', () => {
    it('returns unavailable when resource availability check fails', async () => {
      mockGetAgentBuilderResourceAvailability.mockResolvedValueOnce({
        status: 'unavailable',
      });

      const result = await tool.availability!.handler(
        createToolAvailabilityContext(mockRequest, 'default')
      );

      expect(result.status).toBe('unavailable');
    });

    it('returns unavailable when entity store v2 experimental feature is disabled', async () => {
      const disabledTool = searchEntitiesTool(mockCore, mockLogger, {
        ...mockExperimentalFeatures,
        entityAnalyticsEntityStoreV2: false,
      });

      const result = await disabledTool.availability!.handler(
        createToolAvailabilityContext(mockRequest, 'default')
      );

      expect(result.status).toBe('unavailable');
      expect(result.reason).toContain('Entity Store V2 is not enabled');
    });

    it('returns unavailable when entity store v2 index does not exist', async () => {
      mockEsClient.asInternalUser.indices.exists.mockResolvedValueOnce(false);

      const result = await tool.availability!.handler(
        createToolAvailabilityContext(mockRequest, 'default')
      );

      expect(result.status).toBe('unavailable');
      expect(result.reason).toBe('Entity Store V2 index does not exist for this space');
    });

    it('returns available when all requirements are met', async () => {
      mockEsClient.asInternalUser.indices.exists.mockResolvedValueOnce(true);

      const result = await tool.availability!.handler(
        createToolAvailabilityContext(mockRequest, 'default')
      );

      expect(result.status).toBe('available');
      expect(mockEsClient.asInternalUser.indices.exists).toHaveBeenCalledWith({
        index: 'entities-latest-default',
      });
    });

    it('returns unavailable when an unexpected error is thrown', async () => {
      mockGetAgentBuilderResourceAvailability.mockRejectedValueOnce(
        new Error('Unexpected failure')
      );

      const result = await tool.availability!.handler(
        createToolAvailabilityContext(mockRequest, 'default')
      );

      expect(result.status).toBe('unavailable');
      expect(result.reason).toContain('Unexpected failure');
    });
  });

  describe('handler', () => {
    it('builds query with no filters, includes KEEP clause, and returns one result per entity', async () => {
      (executeEsql as jest.Mock).mockResolvedValueOnce({
        columns: [
          { name: 'entity.id', type: 'keyword' },
          { name: 'entity.EngineMetadata.Type', type: 'keyword' },
        ],
        values: [
          ['host:server1', 'host'],
          ['user:alice', 'user'],
        ],
      });

      const result = (await tool.handler(
        {},
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(executeEsql).toHaveBeenCalledTimes(1);
      const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
      expect(query).toContain('FROM entities-latest-default');
      expect(query).toContain(EXPECTED_KEEP_CLAUSE);
      expect(query).toContain(EXPECTED_SORT_CLAUSE);
      expect(query).toContain('LIMIT 10');
      expect(query).not.toContain('WHERE');

      expect(result.results).toHaveLength(2);
      expect(result.results[0].type).toBe(ToolResultType.esqlResults);
      expect(result.results[1].type).toBe(ToolResultType.esqlResults);
    });

    it('uses entity.EngineMetadata.Type for entity type filter', async () => {
      mockSingleEntityResponse();

      await tool.handler(
        { entityTypes: ['host', 'user'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
      expect(query).toContain('WHERE entity.EngineMetadata.Type IN ("host", "user")');
    });

    it('includes risk score min/max filters in query', async () => {
      mockSingleEntityResponse();

      await tool.handler(
        { riskScoreMin: 70, riskScoreMax: 100 },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
      expect(query).toContain('WHERE entity.risk.calculated_score_norm >= 70');
      expect(query).toContain('WHERE entity.risk.calculated_score_norm <= 100');
    });

    it('includes risk level filter in query', async () => {
      mockSingleEntityResponse();

      await tool.handler(
        { riskLevels: ['High', 'Critical'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
      expect(query).toContain('WHERE entity.risk.calculated_level IN ("High", "Critical")');
    });

    it('includes asset criticality filter in query', async () => {
      mockSingleEntityResponse();

      await tool.handler(
        { criticalityLevels: ['high_impact', 'extreme_impact'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
      expect(query).toContain('WHERE asset.criticality IN ("high_impact", "extreme_impact")');
    });

    it('includes watchlist filter using MV_CONTAINS in query', async () => {
      mockSingleEntityResponse();

      await tool.handler(
        { watchlists: ['vip', 'threat-actors'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
      expect(query).toContain('MV_CONTAINS(entity.attributes.watchlists, "vip")');
      expect(query).toContain('MV_CONTAINS(entity.attributes.watchlists, "threat-actors")');
    });

    it('includes managedOnly filter in query', async () => {
      mockSingleEntityResponse();

      await tool.handler(
        { managedOnly: true },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
      expect(query).toContain('WHERE entity.attributes.managed == true');
    });

    it('does not include managed filter when managedOnly is false', async () => {
      mockSingleEntityResponse();

      await tool.handler(
        { managedOnly: false },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
      expect(query).not.toContain('WHERE entity.attributes.managed');
    });

    it('includes mfaEnabledOnly filter in query', async () => {
      mockSingleEntityResponse();

      await tool.handler(
        { mfaEnabledOnly: true },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
      expect(query).toContain('WHERE entity.attributes.mfa_enabled == true');
    });

    it('includes assetOnly filter in query', async () => {
      mockSingleEntityResponse();

      await tool.handler(
        { assetOnly: true },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
      expect(query).toContain('WHERE entity.attributes.asset == true');
    });

    it('includes lifecycle timestamp filters in query', async () => {
      mockSingleEntityResponse();

      await tool.handler(
        {
          firstSeenAfter: '2024-01-01T00:00:00Z',
          firstSeenBefore: '2024-06-30T23:59:59Z',
          lastSeenAfter: '2024-03-01T00:00:00Z',
          lastSeenBefore: '2024-12-31T23:59:59Z',
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
      expect(query).toContain('WHERE entity.lifecycle.first_seen >= "2024-01-01T00:00:00Z"');
      expect(query).toContain('WHERE entity.lifecycle.first_seen <= "2024-06-30T23:59:59Z"');
      expect(query).toContain('WHERE entity.lifecycle.last_activity >= "2024-03-01T00:00:00Z"');
      expect(query).toContain('WHERE entity.lifecycle.last_activity <= "2024-12-31T23:59:59Z"');
    });

    it('uses custom maxResults in LIMIT clause', async () => {
      mockSingleEntityResponse();

      await tool.handler(
        { maxResults: 25 },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
      expect(query).toContain('LIMIT 25');
    });

    it('KEEP clause appears before LIMIT clause', async () => {
      mockSingleEntityResponse();

      await tool.handler({}, createToolHandlerContext(mockRequest, mockEsClient, mockLogger));

      const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
      const keepIdx = query.indexOf('KEEP');
      const limitIdx = query.indexOf('LIMIT');
      expect(keepIdx).toBeGreaterThan(-1);
      expect(limitIdx).toBeGreaterThan(keepIdx);
    });

    it('returns one esqlResults result per entity row', async () => {
      (executeEsql as jest.Mock).mockResolvedValueOnce({
        columns: [
          { name: 'entity.id', type: 'keyword' },
          { name: 'entity.risk.calculated_score_norm', type: 'double' },
        ],
        values: [
          ['host:server1', 85.0],
          ['user:alice', 92.3],
          ['host:server2', 70.1],
        ],
      });

      const result = (await tool.handler(
        { riskScoreMin: 70 },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(3);
      result.results.forEach((r) => {
        expect(r.type).toBe(ToolResultType.esqlResults);
      });

      const firstResult = result.results[0] as EsqlResults;
      expect(firstResult.data.values).toEqual([['host:server1', 85.0]]);

      const secondResult = result.results[1] as EsqlResults;
      expect(secondResult.data.values).toEqual([['user:alice', 92.3]]);
    });

    it('returns error result when no entities are found', async () => {
      (executeEsql as jest.Mock).mockResolvedValueOnce({
        columns: [{ name: 'entity.id', type: 'keyword' }],
        values: [],
      });

      const result = (await tool.handler(
        { riskLevels: ['Critical'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      const errorResult = result.results[0] as ErrorResult;
      expect(errorResult.type).toBe(ToolResultType.error);
      expect(errorResult.data.message).toContain('No entities found');
    });

    it('returns error result when ES|QL query fails', async () => {
      (executeEsql as jest.Mock).mockRejectedValueOnce(new Error('ES|QL failure'));

      const result = (await tool.handler(
        {},
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      const errorResult = result.results[0] as ErrorResult;
      expect(errorResult.type).toBe(ToolResultType.error);
      expect(errorResult.data.message).toContain(
        'Error searching entities in Entity Store: ES|QL failure'
      );
    });

    describe('telemetry', () => {
      it('reports success=true and entitiesReturned=N when entities are found', async () => {
        (executeEsql as jest.Mock).mockResolvedValueOnce({
          columns: [{ name: 'entity.id', type: 'keyword' }],
          values: [['host:server1'], ['user:alice'], ['host:server2']],
        });

        await tool.handler(
          { entityTypes: ['host', 'user'] },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledWith(
          ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT.eventType,
          {
            toolId: SECURITY_SEARCH_ENTITIES_TOOL_ID,
            entityTypes: ['host', 'user'],
            spaceId: 'default',
            success: true,
            entitiesReturned: 3,
            errorMessage: undefined,
          }
        );
      });

      it('reports success=true and entitiesReturned=0 when no entities are found', async () => {
        (executeEsql as jest.Mock).mockResolvedValueOnce({
          columns: [{ name: 'entity.id', type: 'keyword' }],
          values: [],
        });

        await tool.handler(
          { entityTypes: ['host'] },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledWith(
          ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT.eventType,
          {
            toolId: SECURITY_SEARCH_ENTITIES_TOOL_ID,
            entityTypes: ['host'],
            spaceId: 'default',
            success: true,
            entitiesReturned: 0,
            errorMessage: undefined,
          }
        );
      });

      it('reports success=false and errorMessage when the query throws', async () => {
        (executeEsql as jest.Mock).mockRejectedValueOnce(new Error('ES|QL failure'));

        await tool.handler(
          { entityTypes: ['user'] },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledWith(
          ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT.eventType,
          {
            toolId: SECURITY_SEARCH_ENTITIES_TOOL_ID,
            entityTypes: ['user'],
            spaceId: 'default',
            success: false,
            entitiesReturned: 0,
            errorMessage: 'ES|QL failure',
          }
        );
      });

      it('reports entityTypes=[] when no entityTypes filter is provided', async () => {
        mockSingleEntityResponse();

        await tool.handler({}, createToolHandlerContext(mockRequest, mockEsClient, mockLogger));

        expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledWith(
          ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT.eventType,
          expect.objectContaining({ entityTypes: [] })
        );
      });
    });

    it('builds risk score change query when riskScoreChangeInterval is provided', async () => {
      mockSingleEntityResponse();

      await tool.handler(
        { riskScoreChangeInterval: '30d' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const { query } = (executeEsql as jest.Mock).mock.calls[0][0];

      // FROM includes both entity index and snapshot index
      expect(query).toContain('entities-latest-default');
      expect(query).toContain('.entities.v2.history.security_default*');

      // Risk score IS NOT NULL and timestamp range filters
      expect(query).toContain('WHERE entity.risk.calculated_score_norm IS NOT NULL');
      expect(query).toContain('WHERE @timestamp >= DATE_TRUNC(1 day, NOW() - 30 days)');

      // STATS aggregation
      expect(query).toContain(
        'STATS earliest_score = FIRST(entity.risk.calculated_score_norm, @timestamp), latest_score = LAST(entity.risk.calculated_score_norm, @timestamp) BY entity.id'
      );

      // EVAL derived fields
      expect(query).toContain('EVAL risk_score_change = latest_score - earliest_score');
      expect(query).toContain(
        'EVAL significant_increase = CASE(risk_score_change > 20, true, risk_score_change <= 20, false)'
      );

      // SORT by risk_score_change, not by risk score
      expect(query).toContain('SORT risk_score_change DESC');
      expect(query).not.toContain('SORT entity.risk.calculated_score_norm DESC');

      // KEEP clause is omitted
      expect(query).not.toContain('KEEP');
    });

    it('omits snapshot index from FROM clause when snapshot index does not exist', async () => {
      mockEsClient.asCurrentUser.indices.exists.mockResolvedValueOnce(false);
      mockSingleEntityResponse();

      await tool.handler(
        { riskScoreChangeInterval: '30d' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
      expect(query).toContain('FROM entities-latest-default');
      expect(query).not.toContain('.entities.v2.history.security_default');
    });

    it('uses start-of-day truncation for the timestamp filter', async () => {
      mockSingleEntityResponse();

      await tool.handler(
        { riskScoreChangeInterval: '1d' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
      expect(query).toContain('WHERE @timestamp >= DATE_TRUNC(1 day, NOW() - 1 day)');
    });

    it('combines all filter types in a single query with KEEP clause', async () => {
      mockSingleEntityResponse();

      await tool.handler(
        {
          entityTypes: ['host'],
          riskScoreMin: 80,
          riskLevels: ['High', 'Critical'],
          criticalityLevels: ['extreme_impact'],
          watchlists: ['vip'],
          managedOnly: true,
          mfaEnabledOnly: true,
          assetOnly: true,
          lastSeenAfter: '2024-01-01T00:00:00Z',
          maxResults: 5,
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
      expect(query).toContain('FROM entities-latest-default');
      expect(query).toContain('WHERE entity.EngineMetadata.Type IN ("host")');
      expect(query).toContain('WHERE entity.risk.calculated_score_norm >= 80');
      expect(query).toContain('WHERE entity.risk.calculated_level IN ("High", "Critical")');
      expect(query).toContain('WHERE asset.criticality IN ("extreme_impact")');
      expect(query).toContain('MV_CONTAINS(entity.attributes.watchlists, "vip")');
      expect(query).toContain('WHERE entity.attributes.managed == true');
      expect(query).toContain('WHERE entity.attributes.mfa_enabled == true');
      expect(query).toContain('WHERE entity.attributes.asset == true');
      expect(query).toContain('WHERE entity.lifecycle.last_activity >= "2024-01-01T00:00:00Z"');
      expect(query).toContain(EXPECTED_KEEP_CLAUSE);
      expect(query).toContain(EXPECTED_SORT_CLAUSE);
      expect(query).toContain('LIMIT 5');
    });
  });
});
