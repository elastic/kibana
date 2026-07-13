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

  describe('error flags', () => {
    it('should set errors.pipelineMap and warn when getSettings rejects', async () => {
      const logger = createMockLogger();
      const esClient = createMockEsClient({
        indices: {
          getSettings: jest.fn().mockRejectedValue(new Error('ES unavailable')),
          resolveIndex: jest.fn().mockResolvedValue({ indices: [], data_streams: [] }),
        },
      } as unknown as ElasticsearchClient);

      const result = await fetchRulesReverseMap({
        rulesClient: createMockRulesClient([]),
        esClient,
        dataViewsService: createMockDataViewsService(),
        logger,
      });

      expect(result.errors.pipelineMap).toBe(true);
      expect(result.errors.categoryMap).toBe(false);
      expect(result.errors.rulesPartial).toBe(false);
      expect(result.pipelineToIndices.size).toBe(0);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('failed to build pipeline->indices map')
      );
    });

    it('should set errors.categoryMap and warn when the category iteration throws', async () => {
      const logger = createMockLogger();
      // Provide malformed categoriesData that will throw during iteration
      const badCategoriesData = {
        rawCategoriesMap: [],
        // mainCategoriesMap is not an array — iterating it will throw
        mainCategoriesMap: null as unknown as [],
      };

      const result = await fetchRulesReverseMap({
        rulesClient: createMockRulesClient([]),
        esClient: createMockEsClient(),
        dataViewsService: createMockDataViewsService(),
        logger,
        categoriesData: badCategoriesData,
      });

      expect(result.errors.categoryMap).toBe(true);
      expect(result.errors.pipelineMap).toBe(false);
      expect(result.errors.rulesPartial).toBe(false);
      expect(result.categoryToIndices.size).toBe(0);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('failed to build category->indices map')
      );
    });

    it('should set errors.rulesPartial and warn when resolveIndex rejects for a rule', async () => {
      const logger = createMockLogger();
      const mockRule = {
        id: 'rule-1',
        name: 'Test Rule',
        enabled: true,
        params: { type: 'query', index: ['logs-*'], threat: [] },
        tags: [],
      };

      const esClient = createMockEsClient({
        indices: {
          getSettings: jest.fn().mockResolvedValue({}),
          resolveIndex: jest.fn().mockRejectedValue(new Error('index resolution failed')),
        },
      } as unknown as ElasticsearchClient);

      const result = await fetchRulesReverseMap({
        rulesClient: createMockRulesClient([mockRule]),
        esClient,
        dataViewsService: createMockDataViewsService(),
        logger,
      });

      expect(result.errors.rulesPartial).toBe(true);
      expect(result.errors.pipelineMap).toBe(false);
      expect(result.indexToRules.size).toBe(0);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('resolveIndex failed'));
    });

    it('should propagate (rethrow) when rule pagination (findRules) fails', async () => {
      const logger = createMockLogger();
      const rulesClient = {
        find: jest.fn().mockRejectedValue(new Error('findRules failed')),
      } as unknown as RulesClient;

      await expect(
        fetchRulesReverseMap({
          rulesClient,
          esClient: createMockEsClient(),
          dataViewsService: createMockDataViewsService(),
          logger,
        })
      ).rejects.toThrow('findRules failed');

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('rule pagination failed'));
    });

    it('should set errors.pipelineMap but still build the rules map when only getSettings fails', async () => {
      const mockRule = {
        id: 'rule-1',
        name: 'Test Rule',
        enabled: true,
        params: { type: 'query', index: ['logs-*'], threat: [] },
        tags: [],
      };

      const esClient = createMockEsClient({
        indices: {
          getSettings: jest.fn().mockRejectedValue(new Error('ES unavailable')),
          resolveIndex: jest.fn().mockResolvedValue({
            indices: [{ name: 'logs-test' }],
            data_streams: [],
          }),
        },
      } as unknown as ElasticsearchClient);

      const result = await fetchRulesReverseMap({
        rulesClient: createMockRulesClient([mockRule]),
        esClient,
        dataViewsService: createMockDataViewsService(),
        logger: createMockLogger(),
      });

      expect(result.errors.pipelineMap).toBe(true);
      // Rules map still built from successful resolveIndex
      expect(result.indexToRules.has('logs-test')).toBe(true);
    });

    it('should return errors object with all false when everything succeeds', async () => {
      const result = await fetchRulesReverseMap({
        rulesClient: createMockRulesClient([]),
        esClient: createMockEsClient(),
        dataViewsService: createMockDataViewsService(),
        logger: createMockLogger(),
      });

      expect(result.errors).toEqual({
        pipelineMap: false,
        categoryMap: false,
        rulesPartial: false,
      });
    });
  });
});
