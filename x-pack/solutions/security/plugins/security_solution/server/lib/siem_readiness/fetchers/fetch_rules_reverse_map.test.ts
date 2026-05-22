/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fetchRulesReverseMap } from './fetch_rules_reverse_map';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { DataViewsService } from '@kbn/data-views-plugin/common';
import type { Logger } from '@kbn/logging';

const createMockLogger = (): Logger =>
  ({
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  } as unknown as Logger);

const createMockEsClient = (overrides: Partial<ElasticsearchClient> = {}): ElasticsearchClient =>
  ({
    indices: {
      getSettings: jest.fn().mockResolvedValue({}),
      resolveIndex: jest.fn().mockResolvedValue({ indices: [], data_streams: [] }),
    },
    search: jest.fn().mockResolvedValue({
      aggregations: {
        by_index: {
          buckets: [],
        },
      },
    }),
    ...overrides,
  } as unknown as ElasticsearchClient);

const createMockRulesClient = (rules: unknown[] = []): RulesClient =>
  ({
    find: jest.fn().mockResolvedValue({
      data: rules,
      total: rules.length,
      page: 1,
      perPage: 1000,
    }),
  } as unknown as RulesClient);

const createMockDataViewsService = (): DataViewsService =>
  ({
    get: jest.fn().mockResolvedValue({
      getIndexPattern: () => 'logs-*',
    }),
  } as unknown as DataViewsService);

describe('fetchRulesReverseMap', () => {
  describe('index-pattern rules', () => {
    it('should map index-pattern rules to resolved backing indices', async () => {
      const mockRule = {
        id: 'rule-1',
        name: 'Test Rule',
        enabled: true,
        params: {
          type: 'query',
          index: ['logs-aws.*'],
          threat: [],
        },
        tags: [],
      };

      const rulesClient = createMockRulesClient([mockRule]);
      const esClient = createMockEsClient({
        indices: {
          getSettings: jest.fn().mockResolvedValue({}),
          resolveIndex: jest.fn().mockResolvedValue({
            indices: [{ name: 'logs-aws.cloudtrail-default' }],
            data_streams: [],
          }),
        },
        search: jest.fn().mockResolvedValue({
          aggregations: { by_index: { buckets: [] } },
        }),
      } as unknown as ElasticsearchClient);

      const result = await fetchRulesReverseMap({
        rulesClient,
        esClient,
        dataViewsService: createMockDataViewsService(),
        logger: createMockLogger(),
      });

      expect(result.indexToRules.has('logs-aws.cloudtrail-default')).toBe(true);
      expect(result.indexToRules.get('logs-aws.cloudtrail-default')?.[0].id).toBe('rule-1');
    });
  });

  describe('data-view rules', () => {
    it('should resolve data view ID to index patterns and map rules', async () => {
      const mockRule = {
        id: 'rule-2',
        name: 'Data View Rule',
        enabled: true,
        params: {
          type: 'query',
          dataViewId: 'security-data-view',
          threat: [],
        },
        tags: [],
      };

      const rulesClient = createMockRulesClient([mockRule]);
      const dataViewsService = {
        get: jest.fn().mockResolvedValue({
          getIndexPattern: () => 'logs-endpoint.*',
        }),
      } as unknown as DataViewsService;

      const esClient = createMockEsClient({
        indices: {
          getSettings: jest.fn().mockResolvedValue({}),
          resolveIndex: jest.fn().mockResolvedValue({
            indices: [{ name: 'logs-endpoint.events-default' }],
            data_streams: [],
          }),
        },
        search: jest.fn().mockResolvedValue({
          aggregations: { by_index: { buckets: [] } },
        }),
      } as unknown as ElasticsearchClient);

      const result = await fetchRulesReverseMap({
        rulesClient,
        esClient,
        dataViewsService,
        logger: createMockLogger(),
      });

      expect(dataViewsService.get).toHaveBeenCalledWith('security-data-view');
      expect(result.indexToRules.has('logs-endpoint.events-default')).toBe(true);
    });
  });

  describe('threat_match rules', () => {
    it('should add threat_match rules to both index and threatIndex entries', async () => {
      const mockRule = {
        id: 'rule-3',
        name: 'Threat Match Rule',
        enabled: true,
        params: {
          type: 'threat_match',
          index: ['logs-*'],
          threatIndex: ['threat-intel-*'],
          threat: [],
        },
        tags: [],
      };

      const rulesClient = createMockRulesClient([mockRule]);
      const esClient = createMockEsClient({
        indices: {
          getSettings: jest.fn().mockResolvedValue({}),
          resolveIndex: jest
            .fn()
            .mockResolvedValueOnce({
              indices: [{ name: 'logs-endpoint-default' }],
              data_streams: [],
            })
            .mockResolvedValueOnce({
              indices: [{ name: 'threat-intel-iocs' }],
              data_streams: [],
            }),
        },
        search: jest.fn().mockResolvedValue({
          aggregations: { by_index: { buckets: [] } },
        }),
      } as unknown as ElasticsearchClient);

      const result = await fetchRulesReverseMap({
        rulesClient,
        esClient,
        dataViewsService: createMockDataViewsService(),
        logger: createMockLogger(),
      });

      expect(result.indexToRules.has('logs-endpoint-default')).toBe(true);
      expect(result.indexToRules.has('threat-intel-iocs')).toBe(true);
    });
  });

  describe('ML rules', () => {
    it('should add ML rules to mlRules array, not indexToRules', async () => {
      const mockRule = {
        id: 'rule-ml',
        name: 'ML Rule',
        enabled: true,
        params: {
          type: 'machine_learning',
          machineLearningJobId: ['job-1'],
          threat: [],
        },
        tags: [],
      };

      const rulesClient = createMockRulesClient([mockRule]);
      const esClient = createMockEsClient();

      const result = await fetchRulesReverseMap({
        rulesClient,
        esClient,
        dataViewsService: createMockDataViewsService(),
        logger: createMockLogger(),
      });

      expect(result.mlRules.length).toBe(1);
      expect(result.mlRules[0].id).toBe('rule-ml');
      expect(result.indexToRules.size).toBe(0);
    });
  });

  describe('no-MITRE-tactics rules', () => {
    it('should handle rules without MITRE tactics with empty tactics array', async () => {
      const mockRule = {
        id: 'rule-no-mitre',
        name: 'No MITRE Rule',
        enabled: true,
        params: {
          type: 'query',
          index: ['logs-*'],
          threat: [],
        },
        tags: [],
      };

      const rulesClient = createMockRulesClient([mockRule]);
      const esClient = createMockEsClient({
        indices: {
          getSettings: jest.fn().mockResolvedValue({}),
          resolveIndex: jest.fn().mockResolvedValue({
            indices: [{ name: 'logs-test' }],
            data_streams: [],
          }),
        },
        search: jest.fn().mockResolvedValue({
          aggregations: { by_index: { buckets: [] } },
        }),
      } as unknown as ElasticsearchClient);

      const result = await fetchRulesReverseMap({
        rulesClient,
        esClient,
        dataViewsService: createMockDataViewsService(),
        logger: createMockLogger(),
      });

      const rules = result.indexToRules.get('logs-test');
      expect(rules?.[0].tactics).toEqual([]);
    });
  });

  describe('tactic totals', () => {
    it('should compute global tactic totals across all rules', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          name: 'Rule 1',
          enabled: true,
          params: {
            type: 'query',
            index: ['logs-*'],
            threat: [{ tactic: { id: 'TA0001', name: 'Initial Access' } }],
          },
          tags: [],
        },
        {
          id: 'rule-2',
          name: 'Rule 2',
          enabled: true,
          params: {
            type: 'query',
            index: ['logs-*'],
            threat: [
              { tactic: { id: 'TA0001', name: 'Initial Access' } },
              { tactic: { id: 'TA0002', name: 'Execution' } },
            ],
          },
          tags: [],
        },
      ];

      const rulesClient = createMockRulesClient(mockRules);
      const esClient = createMockEsClient({
        indices: {
          getSettings: jest.fn().mockResolvedValue({}),
          resolveIndex: jest.fn().mockResolvedValue({
            indices: [{ name: 'logs-test' }],
            data_streams: [],
          }),
        },
        search: jest.fn().mockResolvedValue({
          aggregations: { by_index: { buckets: [] } },
        }),
      } as unknown as ElasticsearchClient);

      const result = await fetchRulesReverseMap({
        rulesClient,
        esClient,
        dataViewsService: createMockDataViewsService(),
        logger: createMockLogger(),
      });

      expect(result.tacticTotals.get('TA0001')?.totalRules).toBe(2);
      expect(result.tacticTotals.get('TA0002')?.totalRules).toBe(1);
    });
  });

  describe('pipeline mapping', () => {
    it('should build pipelineToIndices map from index settings', async () => {
      const rulesClient = createMockRulesClient([]);
      const esClient = createMockEsClient({
        indices: {
          getSettings: jest.fn().mockResolvedValue({
            'logs-endpoint': {
              settings: {
                'index.default_pipeline': 'endpoint-pipeline',
              },
            },
            'logs-aws': {
              settings: {
                'index.default_pipeline': 'aws-pipeline',
              },
            },
          }),
          resolveIndex: jest.fn().mockResolvedValue({
            indices: [],
            data_streams: [],
          }),
        },
        search: jest.fn().mockResolvedValue({
          aggregations: { by_index: { buckets: [] } },
        }),
      } as unknown as ElasticsearchClient);

      const result = await fetchRulesReverseMap({
        rulesClient,
        esClient,
        dataViewsService: createMockDataViewsService(),
        logger: createMockLogger(),
      });

      expect(result.pipelineToIndices.get('endpoint-pipeline')).toContain('logs-endpoint');
      expect(result.pipelineToIndices.get('aws-pipeline')).toContain('logs-aws');
    });
  });

  describe('platform extraction', () => {
    it('should extract platform from related_integrations', async () => {
      const mockRule = {
        id: 'rule-aws',
        name: 'AWS Rule',
        enabled: true,
        params: {
          type: 'query',
          index: ['logs-aws.*'],
          relatedIntegrations: [{ package: 'aws', version: '1.0.0' }],
          threat: [],
        },
        tags: [],
      };

      const rulesClient = createMockRulesClient([mockRule]);
      const esClient = createMockEsClient({
        indices: {
          getSettings: jest.fn().mockResolvedValue({}),
          resolveIndex: jest.fn().mockResolvedValue({
            indices: [{ name: 'logs-aws-test' }],
            data_streams: [],
          }),
        },
        search: jest.fn().mockResolvedValue({
          aggregations: { by_index: { buckets: [] } },
        }),
      } as unknown as ElasticsearchClient);

      const result = await fetchRulesReverseMap({
        rulesClient,
        esClient,
        dataViewsService: createMockDataViewsService(),
        logger: createMockLogger(),
      });

      const rules = result.indexToRules.get('logs-aws-test');
      expect(rules?.[0].platform).toBe('AWS');
    });

    it('should extract platform from tags when related_integrations is not present', async () => {
      const mockRule = {
        id: 'rule-windows',
        name: 'Windows Rule',
        enabled: true,
        params: {
          type: 'query',
          index: ['winlogbeat-*'],
          threat: [],
        },
        tags: ['OS: Windows', 'Use Case: Threat Detection'],
      };

      const rulesClient = createMockRulesClient([mockRule]);
      const esClient = createMockEsClient({
        indices: {
          getSettings: jest.fn().mockResolvedValue({}),
          resolveIndex: jest.fn().mockResolvedValue({
            indices: [{ name: 'winlogbeat-test' }],
            data_streams: [],
          }),
        },
        search: jest.fn().mockResolvedValue({
          aggregations: { by_index: { buckets: [] } },
        }),
      } as unknown as ElasticsearchClient);

      const result = await fetchRulesReverseMap({
        rulesClient,
        esClient,
        dataViewsService: createMockDataViewsService(),
        logger: createMockLogger(),
      });

      const rules = result.indexToRules.get('winlogbeat-test');
      expect(rules?.[0].platform).toBe('Windows');
    });
  });
});
