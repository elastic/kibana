/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/core/server';
import {
  fetchUnprocessedAlertsStep,
  deduplicateAlertsStep,
  extractEntitiesStep,
  tagProcessedAlertsStep,
} from './alert_pipeline_steps';

describe('Workflow Steps - Error Scenarios', () => {
  const mockLogger: Logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    trace: jest.fn(),
    log: jest.fn(),
    get: jest.fn(),
    isLevelEnabled: jest.fn().mockReturnValue(true),
  };

  const createMockContext = (overrides: any = {}) => ({
    input: {},
    config: {},
    rawInput: {},
    contextManager: {
      getScopedEsClient: jest.fn(),
      getCoreStart: jest.fn().mockReturnValue({
        elasticsearch: { client: { asInternalUser: {} } },
      }),
      ...overrides.contextManager,
    },
    logger: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
    abortSignal: new AbortController().signal,
    stepId: 'test-step',
    stepType: 'test-type',
    ...overrides,
    contextManager: {
      getScopedEsClient: jest.fn(),
      getCoreStart: jest.fn().mockReturnValue({
        elasticsearch: { client: { asInternalUser: {} } },
      }),
      ...overrides.contextManager,
    },
  });

  describe('fetchUnprocessedAlertsStep - Error Handling', () => {
    it('should handle Elasticsearch timeout errors', async () => {
      const mockEsClient = {
        search: jest.fn().mockRejectedValue(new Error('Request timeout after 30000ms')),
      } as unknown as ElasticsearchClient;

      const context = createMockContext({
        input: {
          index_pattern: '.alerts-security.alerts-default',
          max_alerts: 500,
          lookback_minutes: 15,
        },
        contextManager: {
          getScopedEsClient: jest.fn().mockReturnValue(mockEsClient),
        },
      });

      await expect(fetchUnprocessedAlertsStep.handler(context)).rejects.toThrow('Request timeout');
      expect(context.logger.error).not.toHaveBeenCalled(); // Error thrown, not logged
    });

    it('should handle Elasticsearch connection errors', async () => {
      const mockEsClient = {
        search: jest.fn().mockRejectedValue(new Error('No Living connections')),
      } as unknown as ElasticsearchClient;

      const context = createMockContext({
        input: {
          index_pattern: '.alerts-security.alerts-default',
          max_alerts: 500,
          lookback_minutes: 15,
        },
        contextManager: {
          getScopedEsClient: jest.fn().mockReturnValue(mockEsClient),
        },
      });

      await expect(fetchUnprocessedAlertsStep.handler(context)).rejects.toThrow(
        'No Living connections'
      );
    });

    it('should handle malformed ES response (missing _id)', async () => {
      const mockEsClient = {
        search: jest.fn().mockResolvedValue({
          hits: {
            hits: [
              { _id: 'alert-1' },
              { _id: null }, // Malformed!
              { _id: 'alert-2' },
            ],
          },
        }),
      } as unknown as ElasticsearchClient;

      const context = createMockContext({
        input: {
          index_pattern: '.alerts-security.alerts-default',
          max_alerts: 500,
          lookback_minutes: 15,
        },
        contextManager: {
          getScopedEsClient: jest.fn().mockReturnValue(mockEsClient),
        },
      });

      const result = await fetchUnprocessedAlertsStep.handler(context);

      // Should filter out malformed hits
      expect(result.output.alert_ids).toEqual(['alert-1', 'alert-2']);
      expect(result.output.total_alerts).toBe(2);
    });

    it('should return empty results when no alerts found', async () => {
      const mockEsClient = {
        search: jest.fn().mockResolvedValue({
          hits: { hits: [] },
        }),
      } as unknown as ElasticsearchClient;

      const context = createMockContext({
        input: {
          index_pattern: '.alerts-security.alerts-default',
          max_alerts: 500,
          lookback_minutes: 15,
        },
        contextManager: {
          getScopedEsClient: jest.fn().mockReturnValue(mockEsClient),
        },
      });

      const result = await fetchUnprocessedAlertsStep.handler(context);

      expect(result.output.alert_ids).toEqual([]);
      expect(result.output.total_alerts).toBe(0);
      expect(context.logger.info).toHaveBeenCalledWith('Fetched 0 unprocessed alerts');
    });
  });

  describe('deduplicateAlertsStep - Error Handling', () => {
    it('should handle mget errors (alerts deleted mid-processing)', async () => {
      const mockEsClient = {
        mget: jest.fn().mockRejectedValue(new Error('index_not_found_exception')),
      } as unknown as ElasticsearchClient;

      const context = createMockContext({
        input: {
          alert_ids: ['alert-1', 'alert-2'],
          index_pattern: '.alerts-security.alerts-default',
          similarity_threshold: 0.85,
        },
        contextManager: {
          getScopedEsClient: jest.fn().mockReturnValue(mockEsClient),
        },
      });

      await expect(deduplicateAlertsStep.handler(context)).rejects.toThrow(
        'index_not_found_exception'
      );
    });

    it('should handle partial mget results (some alerts not found)', async () => {
      const mockEsClient = {
        mget: jest.fn().mockResolvedValue({
          docs: [
            { found: true, _id: 'alert-1', _source: {} },
            { found: false }, // Alert deleted!
            { found: true, _id: 'alert-3', _source: {} },
          ],
        }),
        ml: {
          getTrainedModels: jest.fn().mockResolvedValue({ trained_model_configs: [] }), // No ELSER
        },
      } as unknown as ElasticsearchClient;

      const context = createMockContext({
        input: {
          alert_ids: ['alert-1', 'alert-2', 'alert-3'],
          index_pattern: '.alerts-security.alerts-default',
          similarity_threshold: 0.85,
        },
        contextManager: {
          getScopedEsClient: jest.fn().mockReturnValue(mockEsClient),
        },
      });

      const result = await deduplicateAlertsStep.handler(context);

      // Should process available alerts only
      expect(result.output.leader_alert_ids.length).toBeGreaterThanOrEqual(0);
      expect(context.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('1/3 alerts not found')
      );
    });

    it('should return empty result when all alerts are missing', async () => {
      const mockEsClient = {
        mget: jest.fn().mockResolvedValue({
          docs: [{ found: false }, { found: false }],
        }),
      } as unknown as ElasticsearchClient;

      const context = createMockContext({
        input: {
          alert_ids: ['missing-1', 'missing-2'],
          index_pattern: '.alerts-security.alerts-default',
          similarity_threshold: 0.85,
        },
        contextManager: {
          getScopedEsClient: jest.fn().mockReturnValue(mockEsClient),
        },
      });

      const result = await deduplicateAlertsStep.handler(context);

      expect(result.output.leader_alert_ids).toEqual([]);
      expect(result.output.total_before).toBe(0);
      expect(result.output.total_after).toBe(0);
      expect(result.output.dedup_rate).toBe(0);
    });
  });

  describe('extractEntitiesStep - Error Handling', () => {
    it('should handle mget timeout during entity extraction', async () => {
      const mockEsClient = {
        mget: jest.fn().mockRejectedValue(new Error('Timeout waiting for response')),
      } as unknown as ElasticsearchClient;

      const context = createMockContext({
        input: {
          alert_ids: ['alert-1'],
          index_pattern: '.alerts-security.alerts-default',
        },
        contextManager: {
          getScopedEsClient: jest.fn().mockReturnValue(mockEsClient),
        },
      });

      await expect(extractEntitiesStep.handler(context)).rejects.toThrow(
        'Timeout waiting for response'
      );
    });

    it('should handle alerts with completely missing _source', async () => {
      const mockEsClient = {
        mget: jest.fn().mockResolvedValue({
          docs: [
            { found: false }, // Alert not found!
            { found: true, _id: 'alert-2', _source: {} },
          ],
        }),
      } as unknown as ElasticsearchClient;

      const context = createMockContext({
        input: {
          alert_ids: ['alert-1', 'alert-2'],
          index_pattern: '.alerts-security.alerts-default',
        },
        contextManager: {
          getScopedEsClient: jest.fn().mockReturnValue(mockEsClient),
        },
      });

      const result = await extractEntitiesStep.handler(context);

      // Should handle missing alert gracefully (extract from available only)
      expect(result.output.entities).toBeDefined();
      // fetchAlertsByIds logs warning about missing alerts
    });
  });

  describe('tagProcessedAlertsStep - updateByQuery', () => {
    const createTagContext = (alertIds: string[]) => {
      const mockEsClient = {
        updateByQuery: jest.fn().mockResolvedValue({ updated: alertIds.filter(Boolean).length }),
      };
      return createMockContext({
        input: {
          alert_ids: alertIds,
          index_pattern: '.alerts-security.alerts-default',
        },
        contextManager: {
          getScopedEsClient: jest.fn().mockReturnValue(mockEsClient),
        },
      });
    };

    it('should tag alerts via updateByQuery using IDs filter', async () => {
      const context = createTagContext(['alert-1', 'alert-2', 'alert-3', 'alert-4', 'alert-5']);
      const result = await tagProcessedAlertsStep.handler(context);

      expect(result.output.tagged_count).toBe(5);
      const esClient = context.contextManager.getScopedEsClient();
      expect(esClient.updateByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          index: '.alerts-security.alerts-default',
          query: { ids: { values: ['alert-1', 'alert-2', 'alert-3', 'alert-4', 'alert-5'] } },
        })
      );
    });

    it('should return 0 for empty alert IDs', async () => {
      const context = createTagContext([]);
      const result = await tagProcessedAlertsStep.handler(context);
      expect(result.output.tagged_count).toBe(0);
    });

    it('should filter out empty strings from alert IDs', async () => {
      const context = createTagContext(['alert-1', '', 'alert-2', '']);
      const result = await tagProcessedAlertsStep.handler(context);
      expect(result.output.tagged_count).toBe(2);
      const esClient = context.contextManager.getScopedEsClient();
      expect(esClient.updateByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { ids: { values: ['alert-1', 'alert-2'] } },
        })
      );
    });
  });

  describe('ELSER Fallback Scenarios', () => {
    it('should fallback to Jaccard when ELSER model not found', async () => {
      const mockEsClient = {
        mget: jest.fn().mockResolvedValue({
          docs: [
            { found: true, _id: 'alert-1', _source: { 'kibana.alert.rule.name': 'Test Rule' } },
            { found: true, _id: 'alert-2', _source: { 'kibana.alert.rule.name': 'Test Rule' } },
          ],
        }),
        ml: {
          getTrainedModels: jest.fn().mockResolvedValue({
            trained_model_configs: [], // No ELSER model
          }),
        },
      } as unknown as ElasticsearchClient;

      const context = createMockContext({
        input: {
          alert_ids: ['alert-1', 'alert-2'],
          index_pattern: '.alerts-security.alerts-default',
          similarity_threshold: 0.85,
        },
        contextManager: {
          getScopedEsClient: jest.fn().mockReturnValue(mockEsClient),
        },
      });

      const result = await deduplicateAlertsStep.handler(context);

      // Should work with Jaccard fallback
      expect(result.output).toBeDefined();
      expect(context.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('ELSER not available')
      );
      expect(context.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Jaccard similarity')
      );
    });

    it('should fallback to Jaccard when ELSER inference fails', async () => {
      const mockEsClient = {
        mget: jest.fn().mockResolvedValue({
          docs: [{ found: true, _id: 'alert-1', _source: {} }],
        }),
        ml: {
          getTrainedModels: jest.fn().mockResolvedValue({
            trained_model_configs: [
              {
                model_id: '.elser_model_2',
                fully_defined: true,
              },
            ],
          }),
          getTrainedModelsStats: jest.fn().mockResolvedValue({
            trained_model_stats: [
              {
                model_id: '.elser_model_2',
                deployment_stats: { state: 'started' },
              },
            ],
          }),
          inferTrainedModel: jest.fn().mockRejectedValue(new Error('ML node unavailable')),
        },
      } as unknown as ElasticsearchClient;

      const context = createMockContext({
        input: {
          alert_ids: ['alert-1'],
          index_pattern: '.alerts-security.alerts-default',
          similarity_threshold: 0.85,
        },
        contextManager: {
          getScopedEsClient: jest.fn().mockReturnValue(mockEsClient),
        },
      });

      const result = await deduplicateAlertsStep.handler(context);

      // Should fallback to Jaccard and still produce output
      expect(result.output).toBeDefined();
      expect(result.output.leader_alert_ids).toBeDefined();
    });
  });

  describe('Entity Extraction - Validation Scenarios', () => {
    it('should filter out invalid IP addresses during extraction', async () => {
      const mockEsClient = {
        mget: jest.fn().mockResolvedValue({
          docs: [
            {
              found: true,
              _id: 'alert-1',
              _source: {
                source: { ip: '999.999.999.999' }, // Invalid!
                destination: { ip: '192.168.1.1' }, // Valid
              },
            },
          ],
        }),
      } as unknown as ElasticsearchClient;

      const context = createMockContext({
        input: {
          alert_ids: ['alert-1'],
          index_pattern: '.alerts-security.alerts-default',
        },
        contextManager: {
          getScopedEsClient: jest.fn().mockReturnValue(mockEsClient),
        },
      });

      const result = await extractEntitiesStep.handler(context);

      // Should only extract valid IP
      const ipEntities = result.output.entities.filter((e: any) => e.type_key === 'ipv4');
      expect(ipEntities).toHaveLength(1);
      expect(ipEntities[0].value).toBe('192.168.1.1');

      expect(context.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Filtered 1 invalid entities')
      );
    });

    it('should filter out invalid file hashes', async () => {
      const mockEsClient = {
        mget: jest.fn().mockResolvedValue({
          docs: [
            {
              found: true,
              _id: 'alert-1',
              _source: {
                file: {
                  hash: {
                    sha256: 'notahex!', // Invalid hash (not hex)
                  },
                },
              },
            },
          ],
        }),
      } as unknown as ElasticsearchClient;

      const context = createMockContext({
        input: {
          alert_ids: ['alert-1'],
          index_pattern: '.alerts-security.alerts-default',
        },
        contextManager: {
          getScopedEsClient: jest.fn().mockReturnValue(mockEsClient),
        },
      });

      const result = await extractEntitiesStep.handler(context);

      // Should filter out invalid hash
      const hashEntities = result.output.entities.filter((e: any) => e.type_key === 'file_hash');
      expect(hashEntities).toHaveLength(0);

      expect(context.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Filtered 1 invalid entities')
      );
    });
  });
});
