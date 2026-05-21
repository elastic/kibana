/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ToolResultType,
  type ErrorResult,
  type EsqlResults,
  type OtherResult,
} from '@kbn/agent-builder-common';
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
import { SecurityAgentBuilderAttachments } from '../../../../common/constants';
import { ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT } from '../../../lib/telemetry/event_based/events';
import {
  buildListEntityAttachmentId,
  buildRenderAttachmentTag,
  buildSingleEntityAttachmentId,
} from './entity_attachment_utils';
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

    it('accepts sortBy: "riskScore"', () => {
      const result = tool.schema.safeParse({ sortBy: 'riskScore' });
      expect(result.success).toBe(true);
    });

    it('accepts sortBy: "criticality"', () => {
      const result = tool.schema.safeParse({ sortBy: 'criticality' });
      expect(result.success).toBe(true);
    });

    it('rejects unknown sortBy values', () => {
      const result = tool.schema.safeParse({ sortBy: 'firstSeen' });
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

    it('accepts sources (raw integration keys)', () => {
      const result = tool.schema.safeParse({
        sources: ['crowdstrike', 'island_browser'],
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty source string', () => {
      const result = tool.schema.safeParse({ sources: [''] });
      expect(result.success).toBe(false);
    });

    it('accepts namespaces (canonical vendor namespaces)', () => {
      const result = tool.schema.safeParse({
        namespaces: ['okta', 'entra_id', 'aws'],
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty namespace string', () => {
      const result = tool.schema.safeParse({ namespaces: [''] });
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
      // The default risk-score sort always pairs with an IS NOT NULL guard so
      // that ES|QL's NULLS-FIRST DESC ordering doesn't fill LIMIT N with
      // unscored entities. The test still asserts that no caller-driven filter
      // clauses (identity / risk floor) were emitted for empty params.
      expect(query).toContain('WHERE entity.risk.calculated_score_norm IS NOT NULL');
      expect(query).not.toContain('WHERE entity.EngineMetadata.Type');
      expect(query).not.toContain('WHERE entity.risk.calculated_score_norm >=');

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
        { riskScoreMin: 70, riskScoreMax: 95 },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
      expect(query).toContain('WHERE entity.risk.calculated_score_norm >= 70');
      expect(query).toContain('WHERE entity.risk.calculated_score_norm <= 95');
    });

    it('treats riskScoreMin:0 as "no floor" and does not emit a calculated_score_norm >= clause (keeps null-scored entities)', async () => {
      mockSingleEntityResponse();

      await tool.handler(
        { riskScoreMin: 0 },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
      expect(query).not.toContain('entity.risk.calculated_score_norm >=');
    });

    it('still emits the >= clause when riskScoreMin is strictly positive', async () => {
      mockSingleEntityResponse();

      await tool.handler(
        { riskScoreMin: 1 },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
      expect(query).toContain('WHERE entity.risk.calculated_score_norm >= 1');
    });

    it('does not emit the >= clause when riskScoreMin is omitted', async () => {
      mockSingleEntityResponse();

      await tool.handler(
        { entityTypes: ['user'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
      expect(query).not.toContain('entity.risk.calculated_score_norm >=');
    });

    it('still emits riskScoreMax when it is set to 0 (upper bound is not ambiguous)', async () => {
      mockSingleEntityResponse();

      await tool.handler(
        { riskScoreMax: 0 },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
      expect(query).toContain('WHERE entity.risk.calculated_score_norm <= 0');
    });

    it('drops riskScoreMax when it is 100 (no upper bound needed, preserves NULL rows)', async () => {
      mockSingleEntityResponse();

      await tool.handler(
        { riskScoreMax: 100 },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
      expect(query).not.toContain('entity.risk.calculated_score_norm <=');
    });

    it('still emits riskScoreMax when it is 99 (regression)', async () => {
      mockSingleEntityResponse();

      await tool.handler(
        { riskScoreMax: 99 },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
      expect(query).toContain('WHERE entity.risk.calculated_score_norm <= 99');
    });

    it('drops both firstSeen bounds when firstSeenAfter === firstSeenBefore (zero-width window)', async () => {
      mockSingleEntityResponse();

      await tool.handler(
        {
          firstSeenAfter: '2024-06-15T12:00:00Z',
          firstSeenBefore: '2024-06-15T12:00:00Z',
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
      expect(query).not.toContain('entity.lifecycle.first_seen >=');
      expect(query).not.toContain('entity.lifecycle.first_seen <=');
    });

    it('drops both lastSeen bounds when lastSeenAfter === lastSeenBefore (zero-width window)', async () => {
      mockSingleEntityResponse();

      await tool.handler(
        {
          lastSeenAfter: '2024-06-15T12:00:00Z',
          lastSeenBefore: '2024-06-15T12:00:00Z',
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
      expect(query).not.toContain('entity.lifecycle.last_activity >=');
      expect(query).not.toContain('entity.lifecycle.last_activity <=');
    });

    it('still emits both lifecycle bounds when the firstSeen values differ (regression)', async () => {
      mockSingleEntityResponse();

      await tool.handler(
        {
          firstSeenAfter: '2024-01-01T00:00:00Z',
          firstSeenBefore: '2024-12-31T23:59:59Z',
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
      expect(query).toContain('WHERE entity.lifecycle.first_seen >= "2024-01-01T00:00:00Z"');
      expect(query).toContain('WHERE entity.lifecycle.first_seen <= "2024-12-31T23:59:59Z"');
    });

    it('drops firstSeenAfter when it is at or before the 2000-01-01 epoch cutoff', async () => {
      mockSingleEntityResponse();

      await tool.handler(
        { firstSeenAfter: '1970-01-01T00:00:00Z' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
      expect(query).not.toContain('entity.lifecycle.first_seen >=');
    });

    it('drops firstSeenAfter exactly at 2000-01-01 (cutoff boundary)', async () => {
      mockSingleEntityResponse();

      await tool.handler(
        { firstSeenAfter: '2000-01-01T00:00:00Z' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
      expect(query).not.toContain('entity.lifecycle.first_seen >=');
    });

    it('keeps firstSeenAfter just past the cutoff (regression)', async () => {
      mockSingleEntityResponse();

      await tool.handler(
        { firstSeenAfter: '2000-01-02T00:00:00Z' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
      expect(query).toContain('WHERE entity.lifecycle.first_seen >= "2000-01-02T00:00:00Z"');
    });

    it('drops firstSeenBefore when it is strictly after now (year 9999 sentinel)', async () => {
      mockSingleEntityResponse();

      await tool.handler(
        { firstSeenBefore: '9999-12-31T23:59:59Z' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
      expect(query).not.toContain('entity.lifecycle.first_seen <=');
    });

    it('drops firstSeenBefore when it is strictly after now (year 2099 sentinel)', async () => {
      mockSingleEntityResponse();

      await tool.handler(
        { firstSeenBefore: '2099-12-31T23:59:59Z' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
      expect(query).not.toContain('entity.lifecycle.first_seen <=');
    });

    it('keeps firstSeenBefore when it is in the past (regression)', async () => {
      mockSingleEntityResponse();

      await tool.handler(
        { firstSeenBefore: '2020-01-01T00:00:00Z' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
      expect(query).toContain('WHERE entity.lifecycle.first_seen <= "2020-01-01T00:00:00Z"');
    });

    it('drops lastSeenAfter / lastSeenBefore using the same rule (parity with firstSeen*)', async () => {
      mockSingleEntityResponse();

      await tool.handler(
        {
          lastSeenAfter: '1970-01-01T00:00:00Z',
          lastSeenBefore: '2099-12-31T23:59:59Z',
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
      expect(query).not.toContain('entity.lifecycle.last_activity >=');
      expect(query).not.toContain('entity.lifecycle.last_activity <=');
    });

    it('keeps the genuine half when only one bound is a sentinel', async () => {
      mockSingleEntityResponse();

      await tool.handler(
        {
          firstSeenAfter: '2024-01-01T00:00:00Z',
          firstSeenBefore: '9999-12-31T23:59:59Z',
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
      expect(query).toContain('WHERE entity.lifecycle.first_seen >= "2024-01-01T00:00:00Z"');
      expect(query).not.toContain('entity.lifecycle.first_seen <=');
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

    describe('sortBy', () => {
      const EXPECTED_CRITICALITY_RANK_EVAL =
        'EVAL criticality_rank = CASE(' +
        'asset.criticality == "extreme_impact", 4, ' +
        'asset.criticality == "high_impact", 3, ' +
        'asset.criticality == "medium_impact", 2, ' +
        'asset.criticality == "low_impact", 1, ' +
        '0)';
      const EXPECTED_CRITICALITY_SORT_CLAUSE =
        'SORT criticality_rank DESC, entity.risk.calculated_score_norm DESC';

      it('defaults to risk score sort and emits no criticality_rank EVAL when sortBy is omitted', async () => {
        mockSingleEntityResponse();

        await tool.handler({}, createToolHandlerContext(mockRequest, mockEsClient, mockLogger));

        const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
        expect(query).toContain(EXPECTED_SORT_CLAUSE);
        expect(query).not.toContain('criticality_rank');
      });

      it('keeps risk score sort when sortBy is explicitly "riskScore"', async () => {
        mockSingleEntityResponse();

        await tool.handler(
          { sortBy: 'riskScore' },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
        expect(query).toContain(EXPECTED_SORT_CLAUSE);
        expect(query).not.toContain('criticality_rank');
      });

      it('emits criticality_rank EVAL and composite SORT when sortBy is "criticality"', async () => {
        mockSingleEntityResponse();

        await tool.handler(
          { sortBy: 'criticality' },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
        expect(query).toContain(EXPECTED_CRITICALITY_RANK_EVAL);
        expect(query).toContain(EXPECTED_CRITICALITY_SORT_CLAUSE);
        // Plain risk-score SORT should not be present when ordering by criticality.
        expect(query).not.toMatch(/SORT entity\.risk\.calculated_score_norm DESC$/m);
      });

      it('applies the EVAL before the SORT so criticality_rank is defined when sorting', async () => {
        mockSingleEntityResponse();

        await tool.handler(
          { sortBy: 'criticality' },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
        const evalIdx = query.indexOf(EXPECTED_CRITICALITY_RANK_EVAL);
        const sortIdx = query.indexOf(EXPECTED_CRITICALITY_SORT_CLAUSE);
        expect(evalIdx).toBeGreaterThan(-1);
        expect(sortIdx).toBeGreaterThan(evalIdx);
      });

      it('does not leak criticality_rank into the KEEP projection', async () => {
        mockSingleEntityResponse();

        await tool.handler(
          { sortBy: 'criticality' },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
        expect(query).toContain(EXPECTED_KEEP_CLAUSE);
        // The KEEP list is an exact field enumeration, so criticality_rank
        // is dropped from the projected columns after the SORT consumes it.
        expect(query).not.toMatch(/KEEP[^\n]*criticality_rank/);
      });

      it('composes sortBy: "criticality" with criticalityLevels filter', async () => {
        mockSingleEntityResponse();

        await tool.handler(
          {
            sortBy: 'criticality',
            criticalityLevels: ['extreme_impact', 'high_impact'],
          },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
        expect(query).toContain('WHERE asset.criticality IN ("extreme_impact", "high_impact")');
        expect(query).toContain(EXPECTED_CRITICALITY_RANK_EVAL);
        expect(query).toContain(EXPECTED_CRITICALITY_SORT_CLAUSE);
      });

      it('drops riskScoreChangeInterval silently when sortBy: "criticality" is set (sortBy wins)', async () => {
        mockSingleEntityResponse();

        await tool.handler(
          { sortBy: 'criticality', riskScoreChangeInterval: '30d' },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        expect(executeEsql).toHaveBeenCalledTimes(1);
        const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
        expect(query).toContain(EXPECTED_CRITICALITY_RANK_EVAL);
        expect(query).toContain(EXPECTED_CRITICALITY_SORT_CLAUSE);
        expect(query).not.toContain('risk_score_change');
        expect(query).not.toContain('STATS');
      });

      it('drops riskScoreChangeInterval silently when sortBy: "riskScore" is set (sortBy wins)', async () => {
        mockSingleEntityResponse();

        await tool.handler(
          { sortBy: 'riskScore', riskScoreChangeInterval: '7d' },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        expect(executeEsql).toHaveBeenCalledTimes(1);
        const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
        expect(query).toContain(EXPECTED_SORT_CLAUSE);
        expect(query).not.toContain('risk_score_change');
        expect(query).not.toContain('STATS');
      });

      it('handles the full ChatGPT over-fill shape gracefully (criticality sort, no STATS, no lifecycle, no <= 100)', async () => {
        mockSingleEntityResponse();

        await tool.handler(
          {
            entityTypes: ['user'],
            sortBy: 'criticality',
            maxResults: 5,
            riskScoreChangeInterval: '1d',
            riskScoreMax: 100,
            riskScoreMin: 0,
            firstSeenAfter: '1970-01-01T00:00:00Z',
            firstSeenBefore: '2099-12-31T23:59:59Z',
            lastSeenAfter: '1970-01-01T00:00:00Z',
            lastSeenBefore: '2099-12-31T23:59:59Z',
            managedOnly: false,
            mfaEnabledOnly: false,
            assetOnly: false,
            riskLevels: [],
            criticalityLevels: [],
            sources: [],
            watchlists: [],
            namespaces: [],
          },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        expect(executeEsql).toHaveBeenCalledTimes(1);
        const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
        expect(query).toContain(EXPECTED_CRITICALITY_RANK_EVAL);
        expect(query).toContain(EXPECTED_CRITICALITY_SORT_CLAUSE);
        expect(query).not.toContain('risk_score_change');
        expect(query).not.toContain('STATS');
        expect(query).not.toContain('entity.risk.calculated_score_norm <=');
        expect(query).not.toContain('entity.lifecycle.first_seen >=');
        expect(query).not.toContain('entity.lifecycle.first_seen <=');
        expect(query).not.toContain('entity.lifecycle.last_activity >=');
        expect(query).not.toContain('entity.lifecycle.last_activity <=');
        expect(query).toContain('WHERE entity.EngineMetadata.Type IN ("user")');
        expect(query).toContain('LIMIT 5');
      });

      it('adds entity.risk.calculated_score_norm IS NOT NULL when sortBy is omitted (default risk-score sort)', async () => {
        mockSingleEntityResponse();

        await tool.handler(
          { entityTypes: ['user'] },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
        // ES|QL sorts NULL FIRST in DESC, so the default risk-score sort is
        // paired with an IS NOT NULL guard so that LIMIT N doesn't get filled
        // with unscored rows at the top of a "top N riskiest" ranking.
        expect(query).toContain('WHERE entity.risk.calculated_score_norm IS NOT NULL');
        expect(query).toContain(EXPECTED_SORT_CLAUSE);
      });

      it('adds entity.risk.calculated_score_norm IS NOT NULL when sortBy is explicit "riskScore"', async () => {
        mockSingleEntityResponse();

        await tool.handler(
          { sortBy: 'riskScore' },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
        expect(query).toContain('WHERE entity.risk.calculated_score_norm IS NOT NULL');
        expect(query).toContain(EXPECTED_SORT_CLAUSE);
      });

      it('does NOT add the IS NOT NULL guard when sortBy is "criticality" (criticality_rank handles nulls)', async () => {
        mockSingleEntityResponse();

        await tool.handler(
          { sortBy: 'criticality' },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
        // The criticality branch deliberately keeps unscored entities in the
        // result set; they land at the bottom because criticality_rank defaults
        // to 0 for rows without an asset.criticality match.
        expect(query).not.toContain('entity.risk.calculated_score_norm IS NOT NULL');
        expect(query).toContain(EXPECTED_CRITICALITY_RANK_EVAL);
        expect(query).toContain(EXPECTED_CRITICALITY_SORT_CLAUSE);
      });

      it('keeps exactly one IS NOT NULL guard when riskScoreChangeInterval is set (no duplication with the default branch)', async () => {
        mockSingleEntityResponse();

        await tool.handler(
          { riskScoreChangeInterval: '30d' },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
        // The two branches are mutually exclusive via `else if`, so the
        // riskScoreChangeInterval path should emit exactly one IS NOT NULL
        // clause — not one from its own branch plus another from the default
        // risk-score fallback.
        const matches = query.match(/WHERE entity\.risk\.calculated_score_norm IS NOT NULL/g);
        expect(matches).not.toBeNull();
        expect(matches).toHaveLength(1);
      });
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

    it('includes data source filter using exact-or-prefix match on entity.source', async () => {
      mockSingleEntityResponse();

      await tool.handler(
        { sources: ['crowdstrike', 'island_browser'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
      expect(query).toContain(
        'WHERE (MV_CONTAINS(entity.source, "crowdstrike") OR entity.source LIKE "crowdstrike.*") OR (MV_CONTAINS(entity.source, "island_browser") OR entity.source LIKE "island_browser.*")'
      );
    });

    it('expands a single-vendor source to exact-or-prefix match (e.g. "aws" matches "aws.cloudtrail")', async () => {
      mockSingleEntityResponse();

      await tool.handler(
        { sources: ['aws'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
      expect(query).toContain(
        'WHERE (MV_CONTAINS(entity.source, "aws") OR entity.source LIKE "aws.*")'
      );
    });

    it('does not include entity.source filter when sources param is absent', async () => {
      mockSingleEntityResponse();

      await tool.handler(
        { entityTypes: ['host'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
      expect(query).not.toContain('MV_CONTAINS(entity.source');
      expect(query).not.toContain('entity.source LIKE');
    });

    it('includes namespace filter using IN list on entity.namespace', async () => {
      mockSingleEntityResponse();

      await tool.handler(
        { namespaces: ['okta', 'entra_id'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
      expect(query).toContain('WHERE entity.namespace IN ("okta", "entra_id")');
    });

    it('combines sources (prefix) and namespaces filters in the same query', async () => {
      mockSingleEntityResponse();

      await tool.handler(
        { entityTypes: ['user'], sources: ['aws'], namespaces: ['aws'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
      expect(query).toContain(
        'WHERE (MV_CONTAINS(entity.source, "aws") OR entity.source LIKE "aws.*")'
      );
      expect(query).toContain('WHERE entity.namespace IN ("aws")');
    });

    it('does not include entity.namespace filter when namespaces param is absent', async () => {
      mockSingleEntityResponse();

      await tool.handler(
        { entityTypes: ['user'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const { query } = (executeEsql as jest.Mock).mock.calls[0][0];
      expect(query).not.toContain('entity.namespace');
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
          sources: ['crowdstrike'],
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
      expect(query).toContain(
        'WHERE (MV_CONTAINS(entity.source, "crowdstrike") OR entity.source LIKE "crowdstrike.*")'
      );
      expect(query).toContain('WHERE entity.attributes.managed == true');
      expect(query).toContain('WHERE entity.attributes.mfa_enabled == true');
      expect(query).toContain('WHERE entity.attributes.asset == true');
      expect(query).toContain('WHERE entity.lifecycle.last_activity >= "2024-01-01T00:00:00Z"');
      expect(query).toContain(EXPECTED_KEEP_CLAUSE);
      expect(query).toContain(EXPECTED_SORT_CLAUSE);
      expect(query).toContain('LIMIT 5');
    });
  });

  describe('entity attachment side effect', () => {
    const multiRowResponse = {
      columns: [
        { name: 'entity.id', type: 'keyword' },
        { name: 'entity.name', type: 'keyword' },
        { name: 'entity.EngineMetadata.Type', type: 'keyword' },
      ],
      values: [
        ['host:server1', 'server1', 'host'],
        ['host:server2', 'server2', 'host'],
        ['user:alice', 'alice', 'user'],
      ],
    };

    const expectedListEntities = [
      {
        identifierType: 'host' as const,
        identifier: 'server1',
        entityStoreId: 'host:server1',
      },
      {
        identifierType: 'host' as const,
        identifier: 'server2',
        entityStoreId: 'host:server2',
      },
      {
        identifierType: 'user' as const,
        identifier: 'alice',
        entityStoreId: 'user:alice',
      },
    ];
    const expectedListAttachmentId = buildListEntityAttachmentId(expectedListEntities);

    const singleRowResponse = {
      columns: [
        { name: 'entity.id', type: 'keyword' },
        { name: 'entity.name', type: 'keyword' },
        { name: 'entity.EngineMetadata.Type', type: 'keyword' },
      ],
      values: [['host:server1', 'server1', 'host']],
    };

    const expectedSingleAttachmentId = buildSingleEntityAttachmentId('host', 'server1');

    it('creates a list attachment when 3 rows are returned and appends an other result', async () => {
      (executeEsql as jest.Mock).mockResolvedValueOnce(multiRowResponse);

      const context = createToolHandlerContext(mockRequest, mockEsClient, mockLogger);
      (context.attachments.getAttachmentRecord as jest.Mock).mockReturnValueOnce(undefined);
      (context.attachments.add as jest.Mock).mockResolvedValueOnce({
        id: expectedListAttachmentId,
        current_version: 1,
      });

      const result = (await tool.handler({}, context)) as ToolHandlerStandardReturn;

      expect(context.attachments.add).toHaveBeenCalledTimes(1);
      expect(context.attachments.add).toHaveBeenCalledWith({
        id: expectedListAttachmentId,
        type: SecurityAgentBuilderAttachments.entity,
        data: {
          entities: expectedListEntities,
          attachmentLabel: 'Entity search results',
        },
        description: 'Entity search results (3)',
      });
      expect(context.attachments.update).not.toHaveBeenCalled();

      // 3 esqlResults rows + 1 other side-effect
      expect(result.results).toHaveLength(4);
      expect(result.results[0].type).toBe(ToolResultType.esqlResults);
      expect(result.results[1].type).toBe(ToolResultType.esqlResults);
      expect(result.results[2].type).toBe(ToolResultType.esqlResults);

      const otherResult = result.results[3] as OtherResult<{
        attachmentId: string;
        version: number;
        renderTag: string;
      }>;
      expect(otherResult.type).toBe(ToolResultType.other);
      expect(otherResult.data).toEqual({
        attachmentId: expectedListAttachmentId,
        version: 1,
        renderTag: buildRenderAttachmentTag({
          attachmentId: expectedListAttachmentId,
          version: 1,
        }),
      });
    });

    it('creates a single-entity attachment (via add) when exactly 1 row is returned', async () => {
      (executeEsql as jest.Mock).mockResolvedValueOnce(singleRowResponse);

      const context = createToolHandlerContext(mockRequest, mockEsClient, mockLogger);
      (context.attachments.getAttachmentRecord as jest.Mock).mockReturnValueOnce(undefined);
      (context.attachments.add as jest.Mock).mockResolvedValueOnce({
        id: expectedSingleAttachmentId,
        current_version: 1,
      });

      const result = (await tool.handler({}, context)) as ToolHandlerStandardReturn;

      expect(context.attachments.add).toHaveBeenCalledTimes(1);
      expect(context.attachments.add).toHaveBeenCalledWith({
        id: expectedSingleAttachmentId,
        type: SecurityAgentBuilderAttachments.entity,
        data: {
          identifierType: 'host',
          identifier: 'server1',
          attachmentLabel: 'host: server1',
          entityStoreId: 'host:server1',
        },
        description: 'host: server1',
      });
      expect(context.attachments.update).not.toHaveBeenCalled();

      expect(result.results).toHaveLength(2);
      expect(result.results[0].type).toBe(ToolResultType.esqlResults);
      const otherResult = result.results[1] as OtherResult<{
        attachmentId: string;
        version: number;
        renderTag: string;
      }>;
      expect(otherResult.type).toBe(ToolResultType.other);
      expect(otherResult.data).toEqual({
        attachmentId: expectedSingleAttachmentId,
        version: 1,
        renderTag: buildRenderAttachmentTag({
          attachmentId: expectedSingleAttachmentId,
          version: 1,
        }),
      });
    });

    it('updates the existing single-entity attachment (bumping version) when it already exists', async () => {
      (executeEsql as jest.Mock).mockResolvedValueOnce(singleRowResponse);

      const context = createToolHandlerContext(mockRequest, mockEsClient, mockLogger);
      (context.attachments.getAttachmentRecord as jest.Mock).mockReturnValueOnce({
        id: expectedSingleAttachmentId,
        current_version: 1,
      });
      (context.attachments.update as jest.Mock).mockResolvedValueOnce({
        id: expectedSingleAttachmentId,
        current_version: 2,
      });

      const result = (await tool.handler({}, context)) as ToolHandlerStandardReturn;

      expect(context.attachments.update).toHaveBeenCalledTimes(1);
      expect(context.attachments.update).toHaveBeenCalledWith(expectedSingleAttachmentId, {
        data: {
          identifierType: 'host',
          identifier: 'server1',
          attachmentLabel: 'host: server1',
          entityStoreId: 'host:server1',
        },
        description: 'host: server1',
      });
      expect(context.attachments.add).not.toHaveBeenCalled();

      const otherResult = result.results[1] as OtherResult<{
        attachmentId: string;
        version: number;
        renderTag: string;
      }>;
      expect(otherResult.type).toBe(ToolResultType.other);
      expect(otherResult.data).toEqual({
        attachmentId: expectedSingleAttachmentId,
        version: 2,
        renderTag: buildRenderAttachmentTag({
          attachmentId: expectedSingleAttachmentId,
          version: 2,
        }),
      });
    });

    it('filters out rows with an invalid entity.EngineMetadata.Type but still creates the attachment for the valid ones', async () => {
      (executeEsql as jest.Mock).mockResolvedValueOnce({
        columns: [
          { name: 'entity.id', type: 'keyword' },
          { name: 'entity.name', type: 'keyword' },
          { name: 'entity.EngineMetadata.Type', type: 'keyword' },
        ],
        values: [
          ['host:server1', 'server1', 'host'],
          ['device:d1', 'd1', 'device'], // unknown type — must be skipped
          ['user:alice', 'alice', 'user'],
        ],
      });

      const filteredEntities = [
        {
          identifierType: 'host' as const,
          identifier: 'server1',
          entityStoreId: 'host:server1',
        },
        {
          identifierType: 'user' as const,
          identifier: 'alice',
          entityStoreId: 'user:alice',
        },
      ];
      const filteredAttachmentId = buildListEntityAttachmentId(filteredEntities);

      const context = createToolHandlerContext(mockRequest, mockEsClient, mockLogger);
      (context.attachments.getAttachmentRecord as jest.Mock).mockReturnValueOnce(undefined);
      (context.attachments.add as jest.Mock).mockResolvedValueOnce({
        id: filteredAttachmentId,
        current_version: 1,
      });

      const result = (await tool.handler({}, context)) as ToolHandlerStandardReturn;

      expect(context.attachments.add).toHaveBeenCalledTimes(1);
      expect(context.attachments.add).toHaveBeenCalledWith(
        expect.objectContaining({
          id: filteredAttachmentId,
          type: SecurityAgentBuilderAttachments.entity,
          data: {
            entities: filteredEntities,
            attachmentLabel: 'Entity search results',
          },
          description: 'Entity search results (2)',
        })
      );

      // 3 esqlResults rows preserved + 1 other side-effect
      expect(result.results).toHaveLength(4);
      const otherResult = result.results[3] as OtherResult<{
        attachmentId: string;
        version: number;
        renderTag: string;
      }>;
      expect(otherResult.type).toBe(ToolResultType.other);
      expect(otherResult.data).toEqual({
        attachmentId: filteredAttachmentId,
        version: 1,
        renderTag: buildRenderAttachmentTag({
          attachmentId: filteredAttachmentId,
          version: 1,
        }),
      });
    });

    it('does not create an attachment when every row has an invalid entity.EngineMetadata.Type', async () => {
      (executeEsql as jest.Mock).mockResolvedValueOnce({
        columns: [
          { name: 'entity.id', type: 'keyword' },
          { name: 'entity.name', type: 'keyword' },
          { name: 'entity.EngineMetadata.Type', type: 'keyword' },
        ],
        values: [
          ['device:d1', 'd1', 'device'],
          ['device:d2', 'd2', 'device'],
        ],
      });

      const context = createToolHandlerContext(mockRequest, mockEsClient, mockLogger);

      const result = (await tool.handler({}, context)) as ToolHandlerStandardReturn;

      expect(context.attachments.add).not.toHaveBeenCalled();
      expect(context.attachments.update).not.toHaveBeenCalled();

      expect(result.results).toHaveLength(2);
      result.results.forEach((r) => {
        expect(r.type).toBe(ToolResultType.esqlResults);
      });
    });

    it('omits entityStoreId from the attachment payload when the row has no entity.id', async () => {
      // Rows without an entity.id still produce a usable attachment via
      // entity.name, but the payload should not carry a synthetic entity
      // store id — the client falls back to per-type identity filtering.
      (executeEsql as jest.Mock).mockResolvedValueOnce({
        columns: [
          { name: 'entity.name', type: 'keyword' },
          { name: 'entity.EngineMetadata.Type', type: 'keyword' },
        ],
        values: [['server1', 'host']],
      });

      const context = createToolHandlerContext(mockRequest, mockEsClient, mockLogger);
      (context.attachments.getAttachmentRecord as jest.Mock).mockReturnValueOnce(undefined);
      (context.attachments.add as jest.Mock).mockResolvedValueOnce({
        id: expectedSingleAttachmentId,
        current_version: 1,
      });

      await tool.handler({}, context);

      expect(context.attachments.add).toHaveBeenCalledTimes(1);
      const addCall = (context.attachments.add as jest.Mock).mock.calls[0][0];
      expect(addCall.data).toEqual({
        identifierType: 'host',
        identifier: 'server1',
        attachmentLabel: 'host: server1',
      });
      expect(addCall.data).not.toHaveProperty('entityStoreId');
    });

    it('does not create an attachment when riskScoreChangeInterval is set (STATS branch limitation)', async () => {
      // The STATS projection drops the identity columns, so descriptors
      // cannot be derived reliably — we skip the attachment side-effect.
      (executeEsql as jest.Mock).mockResolvedValueOnce({
        columns: [
          { name: 'entity.id', type: 'keyword' },
          { name: 'risk_score_change', type: 'double' },
        ],
        values: [
          ['host:server1', 25.0],
          ['host:server2', 40.5],
        ],
      });

      const context = createToolHandlerContext(mockRequest, mockEsClient, mockLogger);

      const result = (await tool.handler(
        { riskScoreChangeInterval: '30d' },
        context
      )) as ToolHandlerStandardReturn;

      expect(context.attachments.add).not.toHaveBeenCalled();
      expect(context.attachments.update).not.toHaveBeenCalled();
      expect(result.results).toHaveLength(2);
      result.results.forEach((r) => {
        expect(r.type).toBe(ToolResultType.esqlResults);
      });
    });

    it('does not create an attachment when zero rows are returned (returns the existing error result)', async () => {
      (executeEsql as jest.Mock).mockResolvedValueOnce({
        columns: [{ name: 'entity.id', type: 'keyword' }],
        values: [],
      });

      const context = createToolHandlerContext(mockRequest, mockEsClient, mockLogger);

      const result = (await tool.handler(
        { riskLevels: ['Critical'] },
        context
      )) as ToolHandlerStandardReturn;

      expect(context.attachments.add).not.toHaveBeenCalled();
      expect(context.attachments.update).not.toHaveBeenCalled();
      expect(result.results).toHaveLength(1);
      const errorResult = result.results[0] as ErrorResult;
      expect(errorResult.type).toBe(ToolResultType.error);
      expect(errorResult.data.message).toContain('No entities found');
    });
  });
});
