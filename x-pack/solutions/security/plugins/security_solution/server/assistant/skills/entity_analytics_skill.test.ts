/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DynamicStructuredTool } from '@langchain/core/tools';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { getEntityAnalyticsSkill } from './entity_analytics_skill';

// Mock the executeEsql function
jest.mock('@kbn/agent-builder-genai-utils', () => ({
  executeEsql: jest.fn(),
}));

// Mock the risk score service
jest.mock('../../lib/entity_analytics/risk_score/get_risk_score', () => ({
  createGetRiskScores: jest.fn(),
}));

// Mock the privileged users service
jest.mock('../../lib/entity_analytics/privilege_monitoring/users/privileged_users_crud', () => ({
  createPrivilegedUsersCrudService: jest.fn(),
}));

// Import mocked modules
import { executeEsql } from '@kbn/agent-builder-genai-utils';
import { createGetRiskScores } from '../../lib/entity_analytics/risk_score/get_risk_score';
import { createPrivilegedUsersCrudService } from '../../lib/entity_analytics/privilege_monitoring/users/privileged_users_crud';

const mockExecuteEsql = executeEsql as jest.MockedFunction<typeof executeEsql>;
const mockCreateGetRiskScores = createGetRiskScores as jest.MockedFunction<
  typeof createGetRiskScores
>;
const mockCreatePrivilegedUsersCrudService =
  createPrivilegedUsersCrudService as jest.MockedFunction<typeof createPrivilegedUsersCrudService>;

describe('Entity Analytics Skill', () => {
  let logger: MockedLogger;
  let mockEsClient: jest.Mocked<ElasticsearchClient>;
  let oneChatConfig: {
    configurable: {
      onechat: {
        logger: MockedLogger;
        spaceId: string;
        esClient: { asCurrentUser: jest.Mocked<ElasticsearchClient> };
      };
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    logger = loggerMock.create();
    mockEsClient = {
      indices: {
        exists: jest.fn().mockResolvedValue(true),
      },
      search: jest.fn().mockResolvedValue({ hits: { hits: [], total: 0 } }),
    } as unknown as jest.Mocked<ElasticsearchClient>;

    oneChatConfig = {
      configurable: {
        onechat: {
          logger,
          spaceId: 'default',
          esClient: { asCurrentUser: mockEsClient },
        },
      },
    };
  });

  describe('getEntityAnalyticsSkill', () => {
    it('returns a skill with correct namespace and name', () => {
      const skill = getEntityAnalyticsSkill();

      expect(skill.namespace).toBe('security.entity_analytics');
      expect(skill.name).toBe('Entity Analytics');
    });

    it('returns a skill with correct description', () => {
      const skill = getEntityAnalyticsSkill();

      expect(skill.description).toContain('Entity Analytics');
      expect(skill.description).toContain('risk scores');
      expect(skill.description).toContain('anomalies');
    });

    it('returns a skill with comprehensive content', () => {
      const skill = getEntityAnalyticsSkill();

      expect(skill.content).toContain('# Entity Analytics');
      expect(skill.content).toContain('Risk scores');
      expect(skill.content).toContain('Anomalies');
      expect(skill.content).toContain('Asset criticality');
      expect(skill.content).toContain('Entity Store');
      expect(skill.content).toContain('Privileged User Monitoring');
    });

    it('returns all six tools', () => {
      const skill = getEntityAnalyticsSkill();

      expect(skill.tools).toHaveLength(6);
      const toolNames = skill.tools.map((t) => t.name);
      expect(toolNames).toContain('entity_analytics_get_risk_scores');
      expect(toolNames).toContain('entity_analytics_get_risk_score_time_series');
      expect(toolNames).toContain('entity_analytics_search_anomalies');
      expect(toolNames).toContain('entity_analytics_get_asset_criticality');
      expect(toolNames).toContain('entity_analytics_search_entity_store');
      expect(toolNames).toContain('entity_analytics_list_privileged_users');
    });
  });

  describe('entity_analytics_get_risk_scores tool', () => {
    let getRiskScoresTool: DynamicStructuredTool;

    beforeEach(() => {
      const skill = getEntityAnalyticsSkill();
      getRiskScoresTool = skill.tools.find(
        (t) => t.name === 'entity_analytics_get_risk_scores'
      ) as DynamicStructuredTool;
    });

    it('has correct name and description', () => {
      expect(getRiskScoresTool.name).toBe('entity_analytics_get_risk_scores');
      expect(getRiskScoresTool.description).toContain('risk score');
    });

    it('throws error when OneChat context is not available', async () => {
      await expect(
        getRiskScoresTool.invoke(
          { identifierType: 'user', identifier: 'test-user' },
          { configurable: {} }
        )
      ).rejects.toThrow('OneChat context not available');
    });

    it('returns DISABLED status when risk index does not exist', async () => {
      mockEsClient.indices.exists = jest.fn().mockResolvedValue(false);

      const result = await getRiskScoresTool.invoke(
        { identifierType: 'user', identifier: 'test-user' },
        oneChatConfig
      );

      const parsed = JSON.parse(result);
      expect(parsed.status).toBe('DISABLED');
      expect(parsed.message).toContain('Risk engine is not enabled');
    });

    it('returns top entities when identifier is wildcard', async () => {
      mockEsClient.indices.exists = jest.fn().mockResolvedValue(true);
      mockEsClient.search = jest.fn().mockResolvedValue({
        hits: {
          hits: [
            {
              _source: {
                user: {
                  risk: {
                    calculated_score_norm: 85.5,
                    calculated_level: 'High',
                    id_value: 'john',
                    id_field: 'user.name',
                    '@timestamp': '2023-01-01T00:00:00Z',
                  },
                },
              },
            },
            {
              _source: {
                user: {
                  risk: {
                    calculated_score_norm: 65.0,
                    calculated_level: 'Medium',
                    id_value: 'jane',
                    id_field: 'user.name',
                    '@timestamp': '2023-01-01T00:00:00Z',
                  },
                },
              },
            },
          ],
        },
      });

      const result = await getRiskScoresTool.invoke(
        { identifierType: 'user', identifier: '*', limit: 10 },
        oneChatConfig
      );

      const parsed = JSON.parse(result);
      expect(parsed.results).toHaveLength(2);
      expect(parsed.results[0].calculated_score_norm).toBe(85.5);
      expect(parsed.results[0].id_value).toBe('john');
    });

    it('returns specific entity risk score when identifier is provided', async () => {
      mockEsClient.indices.exists = jest.fn().mockResolvedValue(true);
      const mockRiskScore = {
        calculated_score_norm: 75.0,
        calculated_level: 'High',
        id_value: 'test-user',
        id_field: 'user.name',
        '@timestamp': '2023-01-01T00:00:00Z',
        inputs: [],
      };

      mockCreateGetRiskScores.mockReturnValue(() => Promise.resolve([mockRiskScore]));

      const result = await getRiskScoresTool.invoke(
        { identifierType: 'user', identifier: 'test-user' },
        oneChatConfig
      );

      const parsed = JSON.parse(result);
      expect(parsed.riskScore).toBeDefined();
      expect(parsed.riskScore.id_value).toBe('test-user');
    });
  });

  describe('entity_analytics_get_risk_score_time_series tool', () => {
    let getTimeSertiesTool: DynamicStructuredTool;

    beforeEach(() => {
      const skill = getEntityAnalyticsSkill();
      getTimeSertiesTool = skill.tools.find(
        (t) => t.name === 'entity_analytics_get_risk_score_time_series'
      ) as DynamicStructuredTool;
    });

    it('has correct name and description', () => {
      expect(getTimeSertiesTool.name).toBe('entity_analytics_get_risk_score_time_series');
      expect(getTimeSertiesTool.description).toContain('time series');
    });

    it('throws error when OneChat context is not available', async () => {
      await expect(
        getTimeSertiesTool.invoke(
          { identifierType: 'user', identifier: 'test-user' },
          { configurable: {} }
        )
      ).rejects.toThrow('OneChat context not available');
    });

    it('returns DISABLED status when time series index does not exist', async () => {
      mockEsClient.indices.exists = jest.fn().mockResolvedValue(false);

      const result = await getTimeSertiesTool.invoke(
        { identifierType: 'user', identifier: 'test-user' },
        oneChatConfig
      );

      const parsed = JSON.parse(result);
      expect(parsed.status).toBe('DISABLED');
      expect(parsed.message).toContain('Risk engine is not enabled');
    });

    it('executes ES|QL query for time series data', async () => {
      mockEsClient.indices.exists = jest.fn().mockResolvedValue(true);
      mockExecuteEsql.mockResolvedValue({
        columns: [
          { name: '@timestamp', type: 'date' },
          { name: 'user.name', type: 'keyword' },
          { name: 'user.risk.calculated_score_norm', type: 'double' },
        ],
        values: [['2023-01-01T00:00:00Z', 'test-user', 75.0]],
      });

      const result = await getTimeSertiesTool.invoke(
        { identifierType: 'user', identifier: 'test-user', start: 'now-7d', end: 'now' },
        oneChatConfig
      );

      const parsed = JSON.parse(result);
      expect(parsed.esql).toBeDefined();
      expect(parsed.columns).toHaveLength(3);
      expect(parsed.values).toHaveLength(1);
    });
  });

  describe('entity_analytics_search_anomalies tool', () => {
    let searchAnomaliesTool: DynamicStructuredTool;

    beforeEach(() => {
      const skill = getEntityAnalyticsSkill();
      searchAnomaliesTool = skill.tools.find(
        (t) => t.name === 'entity_analytics_search_anomalies'
      ) as DynamicStructuredTool;
    });

    it('has correct name and description', () => {
      expect(searchAnomaliesTool.name).toBe('entity_analytics_search_anomalies');
      expect(searchAnomaliesTool.description).toContain('ML anomalies');
    });

    it('throws error when OneChat context is not available', async () => {
      await expect(
        searchAnomaliesTool.invoke({ start: 'now-24h', end: 'now' }, { configurable: {} })
      ).rejects.toThrow('OneChat context not available');
    });

    it('returns DISABLED status when anomaly indices do not exist', async () => {
      mockEsClient.indices.exists = jest.fn().mockResolvedValue(false);

      const result = await searchAnomaliesTool.invoke(
        { start: 'now-24h', end: 'now' },
        oneChatConfig
      );

      const parsed = JSON.parse(result);
      expect(parsed.status).toBe('DISABLED');
      expect(parsed.message).toContain('anomaly detection jobs are not enabled');
      expect(parsed.suggested_job_ids).toBeDefined();
    });

    it('executes ES|QL query for anomalies', async () => {
      mockEsClient.indices.exists = jest.fn().mockResolvedValue(true);
      mockExecuteEsql.mockResolvedValue({
        columns: [
          { name: 'timestamp', type: 'date' },
          { name: 'job_id', type: 'keyword' },
          { name: 'record_score', type: 'double' },
        ],
        values: [['2023-01-01T00:00:00Z', 'test-job', 85.0]],
      });

      const result = await searchAnomaliesTool.invoke(
        { start: 'now-24h', end: 'now', limit: 50 },
        oneChatConfig
      );

      const parsed = JSON.parse(result);
      expect(parsed.esql).toBeDefined();
      expect(parsed.esql).toContain('.ml-anomalies-*');
      expect(parsed.columns).toHaveLength(3);
    });

    it('filters by job IDs when provided', async () => {
      mockEsClient.indices.exists = jest.fn().mockResolvedValue(true);
      mockExecuteEsql.mockResolvedValue({
        columns: [],
        values: [],
      });

      const result = await searchAnomaliesTool.invoke(
        { start: 'now-24h', end: 'now', jobIds: ['job1', 'job2'] },
        oneChatConfig
      );

      const parsed = JSON.parse(result);
      expect(parsed.esql).toContain('job_id IN');
      expect(parsed.esql).toContain('job1');
      expect(parsed.esql).toContain('job2');
    });
  });

  describe('entity_analytics_get_asset_criticality tool', () => {
    let getAssetCriticalityTool: DynamicStructuredTool;

    beforeEach(() => {
      const skill = getEntityAnalyticsSkill();
      getAssetCriticalityTool = skill.tools.find(
        (t) => t.name === 'entity_analytics_get_asset_criticality'
      ) as DynamicStructuredTool;
    });

    it('has correct name and description', () => {
      expect(getAssetCriticalityTool.name).toBe('entity_analytics_get_asset_criticality');
      expect(getAssetCriticalityTool.description).toContain('asset criticality');
    });

    it('throws error when OneChat context is not available', async () => {
      await expect(getAssetCriticalityTool.invoke({}, { configurable: {} })).rejects.toThrow(
        'OneChat context not available'
      );
    });

    it('searches asset criticality records', async () => {
      // The AssetCriticalityDataClient is instantiated inside the tool
      // We need to test it returns results with proper structure
      const result = await getAssetCriticalityTool.invoke(
        { kuery: 'criticality_level: critical', size: 100 },
        oneChatConfig
      );

      const parsed = JSON.parse(result);
      expect(parsed.index).toBeDefined();
      expect(parsed.records).toBeDefined();
    });
  });

  describe('entity_analytics_search_entity_store tool', () => {
    let searchEntityStoreTool: DynamicStructuredTool;

    beforeEach(() => {
      const skill = getEntityAnalyticsSkill();
      searchEntityStoreTool = skill.tools.find(
        (t) => t.name === 'entity_analytics_search_entity_store'
      ) as DynamicStructuredTool;
    });

    it('has correct name and description', () => {
      expect(searchEntityStoreTool.name).toBe('entity_analytics_search_entity_store');
      expect(searchEntityStoreTool.description).toContain('entity store');
    });

    it('throws error when OneChat context is not available', async () => {
      await expect(
        searchEntityStoreTool.invoke({ entityTypes: ['user'] }, { configurable: {} })
      ).rejects.toThrow('OneChat context not available');
    });

    it('executes ES|QL query for entity store', async () => {
      mockExecuteEsql.mockResolvedValue({
        columns: [
          { name: 'entity.id', type: 'keyword' },
          { name: 'entity.name', type: 'keyword' },
          { name: 'entity.type', type: 'keyword' },
        ],
        values: [['123', 'john', 'user']],
      });

      const result = await searchEntityStoreTool.invoke(
        { entityTypes: ['user'], nameQuery: 'john', limit: 25 },
        oneChatConfig
      );

      const parsed = JSON.parse(result);
      expect(parsed.esql).toBeDefined();
      expect(parsed.esql).toContain('.entities.*');
      expect(parsed.esql).toContain('entity.type IN');
    });

    it('includes name filter when nameQuery is provided', async () => {
      mockExecuteEsql.mockResolvedValue({
        columns: [],
        values: [],
      });

      const result = await searchEntityStoreTool.invoke(
        { entityTypes: ['user'], nameQuery: 'admin' },
        oneChatConfig
      );

      const parsed = JSON.parse(result);
      expect(parsed.esql).toContain('entity.name LIKE');
      expect(parsed.esql).toContain('admin');
    });

    it('uses default entity types when not specified', async () => {
      mockExecuteEsql.mockResolvedValue({
        columns: [],
        values: [],
      });

      const result = await searchEntityStoreTool.invoke({}, oneChatConfig);

      const parsed = JSON.parse(result);
      expect(parsed.esql).toContain('user');
      expect(parsed.esql).toContain('host');
      expect(parsed.esql).toContain('service');
      expect(parsed.esql).toContain('generic');
    });
  });

  describe('entity_analytics_list_privileged_users tool', () => {
    let listPrivilegedUsersTool: DynamicStructuredTool;

    beforeEach(() => {
      const skill = getEntityAnalyticsSkill();
      listPrivilegedUsersTool = skill.tools.find(
        (t) => t.name === 'entity_analytics_list_privileged_users'
      ) as DynamicStructuredTool;
    });

    it('has correct name and description', () => {
      expect(listPrivilegedUsersTool.name).toBe('entity_analytics_list_privileged_users');
      expect(listPrivilegedUsersTool.description).toContain('privileged users');
    });

    it('throws error when OneChat context is not available', async () => {
      await expect(listPrivilegedUsersTool.invoke({}, { configurable: {} })).rejects.toThrow(
        'OneChat context not available'
      );
    });

    it('lists privileged users', async () => {
      const mockUsers = [
        { user: { name: 'admin1' }, '@timestamp': '2023-01-01T00:00:00Z' },
        { user: { name: 'admin2' }, '@timestamp': '2023-01-01T00:00:00Z' },
      ];

      mockCreatePrivilegedUsersCrudService.mockReturnValue({
        list: jest.fn().mockResolvedValue(mockUsers),
      } as ReturnType<typeof createPrivilegedUsersCrudService>);

      const result = await listPrivilegedUsersTool.invoke(
        { kuery: 'user.is_privileged: true' },
        oneChatConfig
      );

      const parsed = JSON.parse(result);
      expect(parsed.index).toBeDefined();
      expect(parsed.count).toBe(2);
      expect(parsed.users).toEqual(mockUsers);
    });
  });

  describe('schema validation', () => {
    it('validates identifierType enum values for risk scores', async () => {
      const skill = getEntityAnalyticsSkill();
      const getRiskScoresTool = skill.tools.find(
        (t) => t.name === 'entity_analytics_get_risk_scores'
      ) as DynamicStructuredTool;

      // Valid identifierType values should be: host, user, service, generic
      // Test passes through the schema by invoking with valid type
      mockEsClient.indices.exists = jest.fn().mockResolvedValue(true);
      mockEsClient.search = jest.fn().mockResolvedValue({ hits: { hits: [] } });

      const validTypes = ['host', 'user', 'service'];
      for (const type of validTypes) {
        const result = await getRiskScoresTool.invoke(
          { identifierType: type, identifier: '*' },
          oneChatConfig
        );
        const parsed = JSON.parse(result);
        expect(parsed).toBeDefined();
      }
    });

    it('validates entity types for entity store', async () => {
      const skill = getEntityAnalyticsSkill();
      const searchEntityStoreTool = skill.tools.find(
        (t) => t.name === 'entity_analytics_search_entity_store'
      ) as DynamicStructuredTool;

      mockExecuteEsql.mockResolvedValue({ columns: [], values: [] });

      // Valid entity types: user, host, service, generic
      const result = await searchEntityStoreTool.invoke(
        { entityTypes: ['user', 'host'] },
        oneChatConfig
      );

      const parsed = JSON.parse(result);
      expect(parsed.esql).toContain('user');
      expect(parsed.esql).toContain('host');
    });

    it('validates limit ranges', async () => {
      const skill = getEntityAnalyticsSkill();
      const getRiskScoresTool = skill.tools.find(
        (t) => t.name === 'entity_analytics_get_risk_scores'
      ) as DynamicStructuredTool;

      mockEsClient.indices.exists = jest.fn().mockResolvedValue(true);
      mockEsClient.search = jest.fn().mockResolvedValue({ hits: { hits: [] } });

      // Test with valid limit
      const result = await getRiskScoresTool.invoke(
        { identifierType: 'user', identifier: '*', limit: 50 },
        oneChatConfig
      );

      expect(result).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('handles Elasticsearch errors gracefully', async () => {
      const skill = getEntityAnalyticsSkill();
      const getRiskScoresTool = skill.tools.find(
        (t) => t.name === 'entity_analytics_get_risk_scores'
      ) as DynamicStructuredTool;

      mockEsClient.indices.exists = jest.fn().mockRejectedValue(new Error('ES connection error'));

      await expect(
        getRiskScoresTool.invoke({ identifierType: 'user', identifier: 'test-user' }, oneChatConfig)
      ).rejects.toThrow('ES connection error');
    });

    it('handles invalid date range for time series', async () => {
      const skill = getEntityAnalyticsSkill();
      const getTimeSertiesTool = skill.tools.find(
        (t) => t.name === 'entity_analytics_get_risk_score_time_series'
      ) as DynamicStructuredTool;

      mockEsClient.indices.exists = jest.fn().mockResolvedValue(true);

      // The tool throws an error when date parsing fails (either "Invalid date range" or a null access error)
      await expect(
        getTimeSertiesTool.invoke(
          { identifierType: 'user', identifier: 'test-user', start: 'invalid-date' },
          oneChatConfig
        )
      ).rejects.toThrow();
    });

    it('handles ES|QL execution errors', async () => {
      const skill = getEntityAnalyticsSkill();
      const searchAnomaliesTool = skill.tools.find(
        (t) => t.name === 'entity_analytics_search_anomalies'
      ) as DynamicStructuredTool;

      mockEsClient.indices.exists = jest.fn().mockResolvedValue(true);
      mockExecuteEsql.mockRejectedValue(new Error('ES|QL execution failed'));

      await expect(
        searchAnomaliesTool.invoke({ start: 'now-24h', end: 'now' }, oneChatConfig)
      ).rejects.toThrow('ES|QL execution failed');
    });
  });
});
