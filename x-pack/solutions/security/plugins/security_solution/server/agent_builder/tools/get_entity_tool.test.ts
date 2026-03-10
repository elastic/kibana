/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, type ErrorResult, type EsqlResults } from '@kbn/agent-builder-common';
import { executeEsql } from '@kbn/agent-builder-genai-utils';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';
import {
  createToolAvailabilityContext,
  createToolHandlerContext,
  createToolTestMocks,
  setupMockCoreStartServices,
} from '../__mocks__/test_helpers';
import { getEntityTool } from './get_entity_tool';

jest.mock('../utils/get_agent_builder_resource_availability', () => ({
  getAgentBuilderResourceAvailability: jest.fn(),
}));

jest.mock('@kbn/agent-builder-genai-utils', () => ({
  executeEsql: jest.fn(),
}));

const mockGetAgentBuilderResourceAvailability = getAgentBuilderResourceAvailability as jest.Mock;
const mockUiSettingsClient = uiSettingsServiceMock.createClient();

describe('getEntityTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const tool = getEntityTool(mockCore, mockLogger);

  beforeEach(() => {
    jest.clearAllMocks();
    setupMockCoreStartServices(mockCore, mockEsClient);
    mockGetAgentBuilderResourceAvailability.mockResolvedValue({
      status: 'available',
    });
    mockUiSettingsClient.get.mockResolvedValue(true);
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
        createToolAvailabilityContext(mockRequest, 'default', mockUiSettingsClient)
      );

      expect(result.status).toBe('unavailable');
    });

    it('returns unavailable when entity store v2 is disabled', async () => {
      mockUiSettingsClient.get.mockResolvedValueOnce(false);

      const result = await tool.availability!.handler(
        createToolAvailabilityContext(mockRequest, 'default', mockUiSettingsClient)
      );

      expect(result.status).toBe('unavailable');
      expect(result.reason).toContain('Entity Store V2 is not enabled');
    });

    it('returns unavailable when entity store v2 index does not exist', async () => {
      mockEsClient.asInternalUser.indices.exists.mockResolvedValueOnce(false);

      const result = await tool.availability!.handler(
        createToolAvailabilityContext(mockRequest, 'default', mockUiSettingsClient)
      );

      expect(result.status).toBe('unavailable');
      expect(result.reason).toBe('Entity Store V2 index does not exist for this space');
    });

    it('returns available when all requirements are met', async () => {
      mockEsClient.asInternalUser.indices.exists.mockResolvedValueOnce(true);

      const result = await tool.availability!.handler(
        createToolAvailabilityContext(mockRequest, 'default', mockUiSettingsClient)
      );

      expect(result.status).toBe('available');
      expect(mockEsClient.asInternalUser.indices.exists).toHaveBeenCalledWith({
        index: '.entities.v2.latest.security_default',
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
        `FROM .entities.v2.latest.security_default | WHERE entity.id == \"host:server1\" | LIMIT 1`
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
        // 2. LIKE fallback — also nothing found
        .mockResolvedValueOnce({ columns: [{ name: 'entity.id', type: 'keyword' }], values: [] });

      const result = (await tool.handler(
        { entityType: 'host', entityId: 'server1' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(executeEsql).toHaveBeenCalledTimes(2);
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
      expect((executeEsql as jest.Mock).mock.calls[1][0].query).toContain('RLIKE ".*server1.*"');
      expect(result.results).toHaveLength(1);
      const esqlResult = result.results[0] as EsqlResults;
      expect(esqlResult.type).toBe(ToolResultType.esqlResults);
      expect(esqlResult.data.values).toHaveLength(1);
    });

    it('uses raw entityId (not normalized) as the RLIKE pattern', async () => {
      (executeEsql as jest.Mock)
        // 1. Exact match — empty
        .mockResolvedValueOnce({ columns: [], values: [] })
        // 2. RLIKE fallback — empty (just checking query shape)
        .mockResolvedValueOnce({ columns: [], values: [] });

      await tool.handler(
        { entityType: 'host', entityId: 'server1' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const rlikeQuery = (executeEsql as jest.Mock).mock.calls[1][0].query;
      expect(rlikeQuery).toContain('RLIKE ".*server1.*"');
      expect(rlikeQuery).not.toContain('RLIKE ".*host:server1.*"');
    });

    it('escapes regex metacharacters in the RLIKE pattern', async () => {
      (executeEsql as jest.Mock)
        // 1. Exact match — empty
        .mockResolvedValueOnce({ columns: [], values: [] })
        // 2. RLIKE fallback — empty
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
  });
});
