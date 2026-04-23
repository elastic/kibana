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
import { getEntityTool, SECURITY_GET_ENTITY_TOOL_ID } from './get_entity_tool';

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

describe('getEntityTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const tool = getEntityTool(mockCore, mockLogger, mockExperimentalFeatures);
  let mockCoreStart: ReturnType<typeof coreMock.createStart>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCoreStart = setupMockCoreStartServices(mockCore, mockEsClient);
    mockGetAgentBuilderResourceAvailability.mockResolvedValue({
      status: 'available',
    });
  });

  describe('schema', () => {
    it('validates correct schema', () => {
      const result = tool.schema.safeParse({ entityType: 'host', entityId: 'host:server1' });
      expect(result.success).toBe(true);
    });

    it('allows optional entity type', () => {
      const result = tool.schema.safeParse({ entityId: 'host:server1' });
      expect(result.success).toBe(true);
    });

    it('rejects empty entity id', () => {
      const result = tool.schema.safeParse({ entityType: 'host', entityId: '' });
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
      const disabledTool = getEntityTool(mockCore, mockLogger, {
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
  });

  describe('handler', () => {
    it('normalizes non-prefixed entity ids in ES|QL query', async () => {
      (executeEsql as jest.Mock).mockResolvedValueOnce({
        columns: [{ name: 'entity.id', type: 'keyword' }],
        values: [['host:server1']],
      });

      const result = (await tool.handler(
        { entityType: 'host', entityId: 'server1' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(executeEsql).toHaveBeenCalledTimes(1);
      expect((executeEsql as jest.Mock).mock.calls[0][0].query).toEqual(
        `FROM entities-latest-default | WHERE entity.id == \"host:server1\" | LIMIT 1`
      );
      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe(ToolResultType.esqlResults);
    });

    it('keeps already-prefixed entity ids unchanged', async () => {
      (executeEsql as jest.Mock).mockResolvedValueOnce({
        columns: [{ name: 'entity.id', type: 'keyword' }],
        values: [['host:server1']],
      });

      await tool.handler(
        { entityType: 'host', entityId: 'host:server1' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect((executeEsql as jest.Mock).mock.calls[0][0].query).toContain(
        'WHERE entity.id == "host:server1"'
      );
      expect((executeEsql as jest.Mock).mock.calls[0][0].query).not.toContain(
        'WHERE entity.id == "host:host:server1"'
      );
    });

    it('merges alert data as risk_score_inputs column into entity result', async () => {
      (executeEsql as jest.Mock)
        // 1. Entity lookup: entity has a risk score
        .mockResolvedValueOnce({
          columns: [
            { name: 'entity.id', type: 'keyword' },
            { name: 'entity.name', type: 'keyword' },
            { name: 'entity.EngineMetadata.Type', type: 'keyword' },
            { name: 'entity.risk.calculated_score_norm', type: 'double' },
          ],
          values: [['host:server1', 'server1', 'host', 75.5]],
        })
        // 2. Risk score inputs lookup: returns multi-value alert IDs
        .mockResolvedValueOnce({
          columns: [{ name: 'host.risk.inputs.id', type: 'keyword' }],
          values: [[['alert-1', 'alert-2']]],
        })
        // 3. Alerts lookup: two alert rows
        .mockResolvedValueOnce({
          columns: [
            { name: '_id', type: 'keyword' },
            { name: 'kibana.alert.rule.name', type: 'keyword' },
          ],
          values: [
            ['alert-1', 'Rule A'],
            ['alert-2', 'Rule B'],
          ],
        });

      const result = (await tool.handler(
        { entityType: 'host', entityId: 'server1' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(executeEsql).toHaveBeenCalledTimes(3);

      expect((executeEsql as jest.Mock).mock.calls[1][0].query).toContain(
        'risk-score.risk-score-default'
      );
      expect((executeEsql as jest.Mock).mock.calls[1][0].query).toContain(
        'WHERE host.name == "host:server1"'
      );

      // Alerts query uses the IDs extracted from the risk score inputs
      expect((executeEsql as jest.Mock).mock.calls[2][0].query).toContain(
        'FROM .alerts-security.alerts-default'
      );
      expect((executeEsql as jest.Mock).mock.calls[2][0].query).toContain(
        'WHERE _id IN ("alert-1", "alert-2")'
      );

      // Single merged esqlResults result
      expect(result.results).toHaveLength(1);
      const mergedResult = result.results[0] as EsqlResults;
      expect(mergedResult.type).toBe(ToolResultType.esqlResults);

      const { columns, values } = mergedResult.data;

      // Entity columns come first, then a single risk_score_inputs column
      expect(columns.map((c) => c.name)).toEqual([
        'entity.id',
        'entity.name',
        'entity.EngineMetadata.Type',
        'entity.risk.calculated_score_norm',
        'risk_score_inputs',
      ]);

      // Single merged row: entity values followed by the JSON-serialised array of alert objects
      expect(values).toHaveLength(1);
      expect(values[0]).toEqual([
        'host:server1',
        'server1',
        'host',
        75.5,
        JSON.stringify([
          { _id: 'alert-1', 'kibana.alert.rule.name': 'Rule A' },
          { _id: 'alert-2', 'kibana.alert.rule.name': 'Rule B' },
        ]),
      ]);
    });

    it('skips alert lookup when entity has no risk score', async () => {
      (executeEsql as jest.Mock).mockResolvedValueOnce({
        columns: [
          { name: 'entity.id', type: 'keyword' },
          { name: 'entity.name', type: 'keyword' },
          { name: 'entity.type', type: 'keyword' },
        ],
        values: [['host:server1', 'server1', 'host']],
      });

      const result = (await tool.handler(
        { entityType: 'host', entityId: 'server1' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(executeEsql).toHaveBeenCalledTimes(1);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe(ToolResultType.esqlResults);
    });

    it('appends profile_history column when interval is provided', async () => {
      (executeEsql as jest.Mock)
        // 1. Entity lookup
        .mockResolvedValueOnce({
          columns: [
            { name: 'entity.id', type: 'keyword' },
            { name: 'entity.name', type: 'keyword' },
          ],
          values: [['host:server1', 'server1']],
        })
        // 2. Snapshot lookup
        .mockResolvedValueOnce({
          columns: [
            { name: '@timestamp', type: 'date' },
            { name: 'entity.risk.calculated_score_norm', type: 'double' },
          ],
          values: [
            ['2024-01-02T00:00:00Z', 80.0],
            ['2024-01-01T00:00:00Z', 70.0],
          ],
        });

      const result = (await tool.handler(
        { entityType: 'host', entityId: 'server1', interval: '7d' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(executeEsql).toHaveBeenCalledTimes(2);

      expect(result.results).toHaveLength(1);
      const esqlResult = result.results[0] as EsqlResults;
      expect(esqlResult.type).toBe(ToolResultType.esqlResults);

      const { columns, values } = esqlResult.data;

      expect(columns.map((c) => c.name)).toEqual(['entity.id', 'entity.name', 'profile_history']);

      expect(values).toHaveLength(1);
      expect(values[0]).toEqual([
        'host:server1',
        'server1',
        JSON.stringify([
          { '@timestamp': '2024-01-02T00:00:00Z', 'entity.risk.calculated_score_norm': 80.0 },
          { '@timestamp': '2024-01-01T00:00:00Z', 'entity.risk.calculated_score_norm': 70.0 },
        ]),
      ]);
    });

    it('includes both risk_score_inputs and profile_history when entity has a risk score and interval is provided', async () => {
      (executeEsql as jest.Mock)
        // 1. Entity lookup: entity has a risk score
        .mockResolvedValueOnce({
          columns: [
            { name: 'entity.id', type: 'keyword' },
            { name: 'entity.name', type: 'keyword' },
            { name: 'entity.EngineMetadata.Type', type: 'keyword' },
            { name: 'entity.risk.calculated_score_norm', type: 'double' },
          ],
          values: [['host:server1', 'server1', 'host', 75.5]],
        })
        // 2. Risk score inputs IDs lookup
        .mockResolvedValueOnce({
          columns: [{ name: 'host.risk.inputs.id', type: 'keyword' }],
          values: [[['alert-1', 'alert-2']]],
        })
        // 3. Alerts lookup
        .mockResolvedValueOnce({
          columns: [
            { name: '_id', type: 'keyword' },
            { name: 'kibana.alert.rule.name', type: 'keyword' },
          ],
          values: [
            ['alert-1', 'Rule A'],
            ['alert-2', 'Rule B'],
          ],
        })
        // 4. Snapshot lookup
        .mockResolvedValueOnce({
          columns: [
            { name: '@timestamp', type: 'date' },
            { name: 'entity.risk.calculated_score_norm', type: 'double' },
          ],
          values: [
            ['2024-01-02T00:00:00Z', 80.0],
            ['2024-01-01T00:00:00Z', 70.0],
          ],
        });

      const result = (await tool.handler(
        { entityType: 'host', entityId: 'server1', interval: '7d' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(executeEsql).toHaveBeenCalledTimes(4);

      expect(result.results).toHaveLength(1);
      const esqlResult = result.results[0] as EsqlResults;
      expect(esqlResult.type).toBe(ToolResultType.esqlResults);

      const { columns, values } = esqlResult.data;

      expect(columns.map((c) => c.name)).toEqual([
        'entity.id',
        'entity.name',
        'entity.EngineMetadata.Type',
        'entity.risk.calculated_score_norm',
        'risk_score_inputs',
        'profile_history',
      ]);

      expect(values).toHaveLength(1);
      expect(values[0]).toEqual([
        'host:server1',
        'server1',
        'host',
        75.5,
        JSON.stringify([
          { _id: 'alert-1', 'kibana.alert.rule.name': 'Rule A' },
          { _id: 'alert-2', 'kibana.alert.rule.name': 'Rule B' },
        ]),
        JSON.stringify([
          { '@timestamp': '2024-01-02T00:00:00Z', 'entity.risk.calculated_score_norm': 80.0 },
          { '@timestamp': '2024-01-01T00:00:00Z', 'entity.risk.calculated_score_norm': 70.0 },
        ]),
      ]);
    });

    it('returns only profile_history for a specific date, skipping risk inputs', async () => {
      (executeEsql as jest.Mock)
        // 1. Entity lookup: entity has a risk score (but risk inputs should still be skipped)
        .mockResolvedValueOnce({
          columns: [
            { name: 'entity.id', type: 'keyword' },
            { name: 'entity.name', type: 'keyword' },
            { name: 'entity.EngineMetadata.Type', type: 'keyword' },
            { name: 'entity.risk.calculated_score_norm', type: 'double' },
          ],
          values: [['host:server1', 'server1', 'host', 75.5]],
        })
        // 2. Date-range snapshot lookup
        .mockResolvedValueOnce({
          columns: [
            { name: '@timestamp', type: 'date' },
            { name: 'entity.risk.calculated_score_norm', type: 'double' },
          ],
          values: [['2024-01-15T10:00:00.000Z', 72.0]],
        });

      const result = (await tool.handler(
        { entityType: 'host', entityId: 'server1', date: '2024-01-15T00:00:00Z' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(executeEsql).toHaveBeenCalledTimes(2);

      // Snapshot query should use the UTC day range derived from the date
      expect((executeEsql as jest.Mock).mock.calls[1][0].query).toContain(
        '@timestamp >= "2024-01-15T00:00:00.000Z" AND @timestamp <= "2024-01-15T23:59:59.999Z"'
      );

      expect(result.results).toHaveLength(1);
      const esqlResult = result.results[0] as EsqlResults;
      expect(esqlResult.type).toBe(ToolResultType.esqlResults);

      const { columns, values } = esqlResult.data;

      // No risk_score_inputs column; profile_history is the only synthetic column
      expect(columns.map((c) => c.name)).toEqual([
        'entity.id',
        'entity.name',
        'entity.EngineMetadata.Type',
        'entity.risk.calculated_score_norm',
        'profile_history',
      ]);

      expect(values).toHaveLength(1);
      expect(values[0]).toEqual([
        'host:server1',
        'server1',
        'host',
        75.5,
        JSON.stringify([
          { '@timestamp': '2024-01-15T10:00:00.000Z', 'entity.risk.calculated_score_norm': 72.0 },
        ]),
      ]);
    });

    it('date takes priority over interval when both are supplied', async () => {
      (executeEsql as jest.Mock)
        // 1. Entity lookup
        .mockResolvedValueOnce({
          columns: [
            { name: 'entity.id', type: 'keyword' },
            { name: 'entity.name', type: 'keyword' },
            { name: 'entity.EngineMetadata.Type', type: 'keyword' },
            { name: 'entity.risk.calculated_score_norm', type: 'double' },
          ],
          values: [['host:server1', 'server1', 'host', 75.5]],
        })
        // 2. Date-range snapshot lookup (only this snapshot query should run)
        .mockResolvedValueOnce({
          columns: [{ name: '@timestamp', type: 'date' }],
          values: [['2024-01-15T08:00:00.000Z']],
        });

      const result = (await tool.handler(
        { entityType: 'host', entityId: 'server1', date: '2024-01-15T00:00:00Z', interval: '7d' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      // Only 2 calls: entity lookup + date snapshot; no risk inputs, no interval snapshot
      expect(executeEsql).toHaveBeenCalledTimes(2);

      // Snapshot query uses date range, not NOW() - interval
      expect((executeEsql as jest.Mock).mock.calls[1][0].query).toContain(
        '@timestamp >= "2024-01-15T00:00:00.000Z"'
      );
      expect((executeEsql as jest.Mock).mock.calls[1][0].query).not.toContain('NOW()');

      const esqlResult = result.results[0] as EsqlResults;
      expect(esqlResult.data.columns.map((c) => c.name)).toContain('profile_history');
      expect(esqlResult.data.columns.map((c) => c.name)).not.toContain('risk_score_inputs');
    });

    it('returns error result when no entity is found', async () => {
      (executeEsql as jest.Mock)
        // 1. Exact match — nothing found
        .mockResolvedValueOnce({ columns: [{ name: 'entity.id', type: 'keyword' }], values: [] })
        // 2. entity.id RLIKE fallback — also nothing found
        .mockResolvedValueOnce({ columns: [{ name: 'entity.id', type: 'keyword' }], values: [] })
        // 3. entity.name RLIKE fallback — also nothing found
        .mockResolvedValueOnce({ columns: [{ name: 'entity.name', type: 'keyword' }], values: [] });

      const result = (await tool.handler(
        { entityType: 'host', entityId: 'server1' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(executeEsql).toHaveBeenCalledTimes(3);
      expect(result.results).toHaveLength(1);
      const errorResult = result.results[0] as ErrorResult;
      expect(errorResult.type).toBe(ToolResultType.error);
      expect(errorResult.data.message).toContain('No entity found');
    });

    it('returns LIKE fallback results when exact match finds no entity', async () => {
      (executeEsql as jest.Mock)
        // 1. Exact match — empty
        .mockResolvedValueOnce({ columns: [{ name: 'entity.id', type: 'keyword' }], values: [] })
        // 2. LIKE fallback
        .mockResolvedValueOnce({
          columns: [
            { name: 'entity.id', type: 'keyword' },
            { name: 'entity.name', type: 'keyword' },
          ],
          values: [['host:server1', 'server1']],
        });

      const result = (await tool.handler(
        { entityType: 'host', entityId: 'server1' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(executeEsql).toHaveBeenCalledTimes(2);
      const rlikeQuery = (executeEsql as jest.Mock).mock.calls[1][0].query;
      expect(rlikeQuery).toContain('RLIKE ".*server1.*"');
      expect(rlikeQuery).toContain('LIMIT 5');
      expect(result.results).toHaveLength(1);
      const esqlResult = result.results[0] as EsqlResults;
      expect(esqlResult.type).toBe(ToolResultType.esqlResults);
      expect(esqlResult.data.values).toHaveLength(1);
    });

    it('uses raw entityId (not normalized) as the RLIKE pattern', async () => {
      (executeEsql as jest.Mock)
        // 1. Exact match — empty
        .mockResolvedValueOnce({ columns: [], values: [] })
        // 2. entity.id RLIKE fallback — empty (just checking query shape)
        .mockResolvedValueOnce({ columns: [], values: [] })
        // 3. entity.name RLIKE fallback — empty
        .mockResolvedValueOnce({ columns: [], values: [] });

      await tool.handler(
        { entityType: 'host', entityId: 'server1' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const rlikeQuery = (executeEsql as jest.Mock).mock.calls[1][0].query;
      expect(rlikeQuery).toContain('RLIKE ".*server1.*"');
      expect(rlikeQuery).not.toContain('RLIKE ".*host:server1.*"');
    });

    it('returns entity.name RLIKE fallback results when entity.id searches find nothing', async () => {
      (executeEsql as jest.Mock)
        // 1. Exact match — empty
        .mockResolvedValueOnce({ columns: [{ name: 'entity.id', type: 'keyword' }], values: [] })
        // 2. entity.id RLIKE fallback — empty
        .mockResolvedValueOnce({ columns: [{ name: 'entity.id', type: 'keyword' }], values: [] })
        // 3. entity.name RLIKE fallback — returns a match
        .mockResolvedValueOnce({
          columns: [
            { name: 'entity.id', type: 'keyword' },
            { name: 'entity.name', type: 'keyword' },
          ],
          values: [['host:server1', 'server1']],
        });

      const result = (await tool.handler(
        { entityType: 'host', entityId: 'server1' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(executeEsql).toHaveBeenCalledTimes(3);
      const nameQuery = (executeEsql as jest.Mock).mock.calls[2][0].query;
      expect(nameQuery).toContain('entity.name RLIKE ".*server1.*"');
      expect(nameQuery).toContain('user.full_name RLIKE ".*server1.*"');
      expect(nameQuery).toContain('LIMIT 5');
      expect(result.results).toHaveLength(1);
      const esqlResult = result.results[0] as EsqlResults;
      expect(esqlResult.type).toBe(ToolResultType.esqlResults);
      expect(esqlResult.data.values).toHaveLength(1);
    });

    it('returns user.full_name RLIKE match when user is found by full name', async () => {
      (executeEsql as jest.Mock)
        // 1. Exact match — empty
        .mockResolvedValueOnce({ columns: [{ name: 'entity.id', type: 'keyword' }], values: [] })
        // 2. entity.id RLIKE fallback — empty
        .mockResolvedValueOnce({ columns: [{ name: 'entity.id', type: 'keyword' }], values: [] })
        // 3. entity.name / user.full_name RLIKE fallback — returns a user entity matched by full name
        .mockResolvedValueOnce({
          columns: [
            { name: 'entity.id', type: 'keyword' },
            { name: 'entity.name', type: 'keyword' },
            { name: 'user.full_name', type: 'keyword' },
          ],
          values: [['user:jdoe', 'jdoe', 'John Doe']],
        });

      const result = (await tool.handler(
        { entityType: 'user', entityId: 'John Doe' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(executeEsql).toHaveBeenCalledTimes(3);
      const nameQuery = (executeEsql as jest.Mock).mock.calls[2][0].query;
      expect(nameQuery).toContain('user.full_name RLIKE ".*John Doe.*"');
      expect(result.results).toHaveLength(1);
      const esqlResult = result.results[0] as EsqlResults;
      expect(esqlResult.type).toBe(ToolResultType.esqlResults);
      expect(esqlResult.data.values).toHaveLength(1);
      expect(esqlResult.data.values[0]).toContain('John Doe');
    });

    it('uses raw entityId (not normalized) as the entity.name RLIKE pattern', async () => {
      (executeEsql as jest.Mock)
        // 1. Exact match — empty
        .mockResolvedValueOnce({ columns: [], values: [] })
        // 2. entity.id RLIKE fallback — empty
        .mockResolvedValueOnce({ columns: [], values: [] })
        // 3. entity.name RLIKE fallback — empty (just checking query shape)
        .mockResolvedValueOnce({ columns: [], values: [] });

      await tool.handler(
        { entityType: 'host', entityId: 'server1' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const nameQuery = (executeEsql as jest.Mock).mock.calls[2][0].query;
      expect(nameQuery).toContain('entity.name RLIKE ".*server1.*"');
      expect(nameQuery).toContain('user.full_name RLIKE ".*server1.*"');
      expect(nameQuery).not.toContain('entity.name RLIKE ".*host:server1.*"');
      expect(nameQuery).not.toContain('user.full_name RLIKE ".*host:server1.*"');
    });

    it('escapes regex metacharacters in the entity.name RLIKE pattern', async () => {
      (executeEsql as jest.Mock)
        // 1. Exact match — empty
        .mockResolvedValueOnce({ columns: [], values: [] })
        // 2. entity.id RLIKE fallback — empty
        .mockResolvedValueOnce({ columns: [], values: [] })
        // 3. entity.name RLIKE fallback — empty
        .mockResolvedValueOnce({ columns: [], values: [] });

      await tool.handler(
        { entityId: 'server.1*test' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const nameQuery = (executeEsql as jest.Mock).mock.calls[2][0].query;
      expect(nameQuery).toContain('entity.name RLIKE ".*server\\\\.1\\\\*test.*"');
      expect(nameQuery).toContain('user.full_name RLIKE ".*server\\\\.1\\\\*test.*"');
    });

    it('escapes regex metacharacters in the entity.id RLIKE pattern', async () => {
      (executeEsql as jest.Mock)
        // 1. Exact match — empty
        .mockResolvedValueOnce({ columns: [], values: [] })
        // 2. entity.id RLIKE fallback — empty
        .mockResolvedValueOnce({ columns: [], values: [] })
        // 3. entity.name RLIKE fallback — empty
        .mockResolvedValueOnce({ columns: [], values: [] });

      await tool.handler(
        { entityId: 'server.1*test' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const rlikeQuery = (executeEsql as jest.Mock).mock.calls[1][0].query;
      expect(rlikeQuery).toContain('RLIKE ".*server\\\\.1\\\\*test.*"');
    });

    it('uses resolved entity.id from RLIKE result for subsequent snapshot queries', async () => {
      (executeEsql as jest.Mock)
        // 1. Exact match — empty
        .mockResolvedValueOnce({ columns: [], values: [] })
        // 2. RLIKE fallback — returns entity with a prefixed ID
        .mockResolvedValueOnce({
          columns: [
            { name: 'entity.id', type: 'keyword' },
            { name: 'entity.name', type: 'keyword' },
          ],
          values: [['host:server1', 'server1']],
        })
        // 3. Interval snapshot
        .mockResolvedValueOnce({ columns: [{ name: '@timestamp', type: 'date' }], values: [] });

      await tool.handler(
        { entityId: 'server1', interval: '7d' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(executeEsql).toHaveBeenCalledTimes(3);
      const snapshotQuery = (executeEsql as jest.Mock).mock.calls[2][0].query;
      expect(snapshotQuery).toContain('WHERE entity.id == "host:server1"');
    });

    it('returns one result per RLIKE entity with profile_history when interval is provided', async () => {
      (executeEsql as jest.Mock)
        // 1. Exact match — empty
        .mockResolvedValueOnce({ columns: [], values: [] })
        // 2. RLIKE fallback — 2 entities (no risk score, so no extra enrichment calls)
        .mockResolvedValueOnce({
          columns: [
            { name: 'entity.id', type: 'keyword' },
            { name: 'entity.name', type: 'keyword' },
          ],
          values: [
            ['host:server1', 'server1'],
            ['host:server10', 'server10'],
          ],
        })
        // 3. Interval snapshot for host:server1
        .mockResolvedValueOnce({
          columns: [{ name: '@timestamp', type: 'date' }],
          values: [['2024-01-01T00:00:00Z']],
        })
        // 4. Interval snapshot for host:server10
        .mockResolvedValueOnce({
          columns: [{ name: '@timestamp', type: 'date' }],
          values: [['2024-01-02T00:00:00Z']],
        });

      const result = (await tool.handler(
        { entityId: 'server', interval: '7d' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(executeEsql).toHaveBeenCalledTimes(4);
      expect(result.results).toHaveLength(2);

      const [r1, r2] = result.results as EsqlResults[];
      expect(r1.type).toBe(ToolResultType.esqlResults);
      expect(r2.type).toBe(ToolResultType.esqlResults);

      expect(r1.data.values).toHaveLength(1);
      expect(r2.data.values).toHaveLength(1);

      expect(r1.data.columns.map((c) => c.name)).toContain('profile_history');
      expect(r2.data.columns.map((c) => c.name)).toContain('profile_history');

      // Each snapshot query uses the entity.id from the respective RLIKE result row
      const snapshotCalls = (executeEsql as jest.Mock).mock.calls.slice(2);
      expect(snapshotCalls[0][0].query).toContain('WHERE entity.id == "host:server1"');
      expect(snapshotCalls[1][0].query).toContain('WHERE entity.id == "host:server10"');
    });

    it('returns one result per RLIKE entity when date is provided with early exit', async () => {
      (executeEsql as jest.Mock)
        // 1. Exact match — empty
        .mockResolvedValueOnce({ columns: [], values: [] })
        // 2. RLIKE fallback — 2 entities (with risk score; date path exits before risk score fetch)
        .mockResolvedValueOnce({
          columns: [
            { name: 'entity.id', type: 'keyword' },
            { name: 'entity.name', type: 'keyword' },
            { name: 'entity.risk.calculated_score_norm', type: 'double' },
          ],
          values: [
            ['host:server1', 'server1', 75.5],
            ['host:server10', 'server10', 60.0],
          ],
        })
        // 3. Date snapshot for host:server1
        .mockResolvedValueOnce({
          columns: [{ name: '@timestamp', type: 'date' }],
          values: [['2024-01-15T10:00:00Z']],
        })
        // 4. Date snapshot for host:server10
        .mockResolvedValueOnce({
          columns: [{ name: '@timestamp', type: 'date' }],
          values: [['2024-01-15T11:00:00Z']],
        });

      const result = (await tool.handler(
        { entityId: 'server', date: '2024-01-15T00:00:00Z' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(executeEsql).toHaveBeenCalledTimes(4);
      expect(result.results).toHaveLength(2);

      const [r1, r2] = result.results as EsqlResults[];
      expect(r1.type).toBe(ToolResultType.esqlResults);
      expect(r2.type).toBe(ToolResultType.esqlResults);

      // Date path: profile_history column, no risk_score_inputs
      expect(r1.data.columns.map((c) => c.name)).toContain('profile_history');
      expect(r2.data.columns.map((c) => c.name)).toContain('profile_history');
      expect(r1.data.columns.map((c) => c.name)).not.toContain('risk_score_inputs');
      expect(r2.data.columns.map((c) => c.name)).not.toContain('risk_score_inputs');
    });

    it('returns unenriched entity result when enrichment query fails', async () => {
      (executeEsql as jest.Mock)
        // 1. Entity lookup: entity has a risk score (triggers enrichment path)
        .mockResolvedValueOnce({
          columns: [
            { name: 'entity.id', type: 'keyword' },
            { name: 'entity.name', type: 'keyword' },
            { name: 'entity.EngineMetadata.Type', type: 'keyword' },
            { name: 'entity.risk.calculated_score_norm', type: 'double' },
          ],
          values: [['host:server1', 'server1', 'host', 75.5]],
        })
        // 2. Risk score inputs query: fails
        .mockRejectedValueOnce(new Error('risk index unavailable'));

      const result = (await tool.handler(
        { entityType: 'host', entityId: 'server1' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      const esqlResult = result.results[0] as EsqlResults;
      expect(esqlResult.type).toBe(ToolResultType.esqlResults);

      const { columns, values } = esqlResult.data;
      expect(columns.map((c) => c.name)).not.toContain('risk_score_inputs');
      expect(columns.map((c) => c.name)).not.toContain('profile_history');
      expect(values).toHaveLength(1);
      expect(values[0]).toEqual(['host:server1', 'server1', 'host', 75.5]);
    });

    it('returns error result when ES|QL query fails', async () => {
      (executeEsql as jest.Mock).mockRejectedValueOnce(new Error('ES|QL failure'));

      const result = (await tool.handler(
        { entityType: 'host', entityId: 'server1' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      const errorResult = result.results[0] as ErrorResult;
      expect(errorResult.type).toBe(ToolResultType.error);
      expect(errorResult.data.message).toContain(
        'Error fetching entity from Entity Store: ES|QL failure'
      );
    });

    describe('telemetry', () => {
      it('reports success=true and entitiesReturned=1 when an entity is found', async () => {
        (executeEsql as jest.Mock).mockResolvedValueOnce({
          columns: [{ name: 'entity.id', type: 'keyword' }],
          values: [['host:server1']],
        });

        await tool.handler(
          { entityType: 'host', entityId: 'server1' },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledWith(
          ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT.eventType,
          {
            toolId: SECURITY_GET_ENTITY_TOOL_ID,
            entityTypes: ['host'],
            spaceId: 'default',
            success: true,
            entitiesReturned: 1,
            errorMessage: undefined,
          }
        );
      });

      it('reports success=true and entitiesReturned=0 when no entity is found', async () => {
        (executeEsql as jest.Mock)
          .mockResolvedValueOnce({ columns: [], values: [] })
          .mockResolvedValueOnce({ columns: [], values: [] })
          .mockResolvedValueOnce({ columns: [], values: [] });

        await tool.handler(
          { entityType: 'host', entityId: 'server1' },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledWith(
          ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT.eventType,
          {
            toolId: SECURITY_GET_ENTITY_TOOL_ID,
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
          { entityType: 'host', entityId: 'server1' },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledWith(
          ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT.eventType,
          {
            toolId: SECURITY_GET_ENTITY_TOOL_ID,
            entityTypes: ['host'],
            spaceId: 'default',
            success: false,
            entitiesReturned: 0,
            errorMessage: 'ES|QL failure',
          }
        );
      });

      it('reports entityTypes=[] when no entityType param is provided', async () => {
        (executeEsql as jest.Mock).mockResolvedValueOnce({
          columns: [{ name: 'entity.id', type: 'keyword' }],
          values: [['host:server1']],
        });

        await tool.handler(
          { entityId: 'server1' },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledWith(
          ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT.eventType,
          expect.objectContaining({ entityTypes: [] })
        );
      });
    });
  });
});
