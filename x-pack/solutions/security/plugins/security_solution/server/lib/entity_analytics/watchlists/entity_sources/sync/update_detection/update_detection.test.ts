/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createUpdateDetectionService } from './update_detection';
import type { MonitoringEntitySource } from '../../../../../../../common/api/entity_analytics';

const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const indexSource: MonitoringEntitySource = {
  id: 'index-source-1',
  type: 'index',
  name: 'test-index',
  indexPattern: 'logs-*',
  enabled: true,
};

const integrationSource: MonitoringEntitySource = {
  id: 'integration-source-1',
  type: 'entity_analytics_integration',
  name: 'test-integration',
  indexPattern: 'logs-entityanalytics_okta.user-default',
  integrationName: 'entityanalytics_okta',
  enabled: true,
};

describe('Watchlist update detection service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('index source (plain sync)', () => {
    it('uses buildEntitiesSearchBody without syncMarker and applies bulk upsert', async () => {
      const searchCalls: Array<Record<string, unknown>> = [];
      const esClient = {
        search: jest.fn().mockImplementation((params: Record<string, unknown>) => {
          searchCalls.push(params);
          return Promise.resolve({
            aggregations: {
              entities: {
                buckets: [],
                after_key: undefined,
              },
            },
          });
        }),
        bulk: jest.fn().mockResolvedValue({ errors: false }),
      };

      const service = createUpdateDetectionService({
        esClient: esClient as never,
        logger: mockLogger as never,
        targetIndex: '.watchlist-entities-default',
      });

      await service.updateDetection(indexSource);

      expect(searchCalls.length).toBeGreaterThan(0);
      const firstSearchParams = searchCalls[0];
      expect(firstSearchParams.aggs?.entities?.aggs).toBeUndefined();
      expect(firstSearchParams.query?.bool?.must).toHaveLength(1);
      expect(esClient.bulk).toHaveBeenCalled();
    });
  });

  describe('integration source without descriptorClient', () => {
    it('logs warning and returns empty array without calling search or bulk', async () => {
      const esClient = {
        search: jest.fn(),
        bulk: jest.fn(),
      };

      const service = createUpdateDetectionService({
        esClient: esClient as never,
        logger: mockLogger as never,
        targetIndex: '.watchlist-entities-default',
      });

      const result = await service.updateDetection(integrationSource);

      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('descriptorClient not available')
      );
      expect(esClient.search).not.toHaveBeenCalled();
      expect(esClient.bulk).not.toHaveBeenCalled();
    });
  });

  describe('integration source with descriptorClient', () => {
    it('fetches sync marker, uses it in search, and updates marker after processing', async () => {
      const syncMarker = '2024-01-01T00:00:00Z';
      const descriptorClient = {
        getLastProcessedMarker: jest.fn().mockResolvedValue(syncMarker),
        updateLastProcessedMarker: jest.fn().mockResolvedValue(undefined),
      };

      const searchCalls: Array<Record<string, unknown>> = [];
      const esClient = {
        search: jest.fn().mockImplementation((params: Record<string, unknown>) => {
          searchCalls.push(params);
          return Promise.resolve({
            aggregations: {
              entities: {
                buckets: [],
                after_key: undefined,
              },
            },
          });
        }),
        bulk: jest.fn().mockResolvedValue({ errors: false }),
      };

      const service = createUpdateDetectionService({
        esClient: esClient as never,
        logger: mockLogger as never,
        targetIndex: '.watchlist-entities-default',
        descriptorClient: descriptorClient as never,
      });

      await service.updateDetection(integrationSource);

      expect(descriptorClient.getLastProcessedMarker).toHaveBeenCalledWith(integrationSource);
      expect(searchCalls.length).toBeGreaterThan(0);
      const firstSearchParams = searchCalls[0];
      expect(firstSearchParams.query?.bool?.must).toContainEqual({
        range: { '@timestamp': { gte: syncMarker, lte: 'now' } },
      });
      expect(firstSearchParams.aggs?.entities?.aggs?.latest_doc).toBeDefined();
      expect(descriptorClient.updateLastProcessedMarker).not.toHaveBeenCalled();
    });

    it('updates sync marker when maxTimestamp is extracted from buckets', async () => {
      const syncMarker = '2024-01-01T00:00:00Z';
      const maxTimestamp = '2024-01-15T12:00:00Z';
      const descriptorClient = {
        getLastProcessedMarker: jest.fn().mockResolvedValue(syncMarker),
        updateLastProcessedMarker: jest.fn().mockResolvedValue(undefined),
      };

      const targetIndex = '.watchlist-entities-default';
      const esClient = {
        search: jest.fn().mockImplementation((params: { index: string }) => {
          if (params.index === targetIndex) {
            return Promise.resolve({ hits: { hits: [] } });
          }
          return Promise.resolve({
            aggregations: {
              entities: {
                buckets: [
                  {
                    key: { euid: 'user:jdoe' },
                    latest_doc: {
                      hits: {
                        hits: [{ _source: { '@timestamp': maxTimestamp, 'user.name': 'jdoe' } }],
                      },
                    },
                  },
                ],
                after_key: undefined,
              },
            },
          });
        }),
        bulk: jest.fn().mockResolvedValue({ errors: false }),
      };

      const service = createUpdateDetectionService({
        esClient: esClient as never,
        logger: mockLogger as never,
        targetIndex: '.watchlist-entities-default',
        descriptorClient: descriptorClient as never,
      });

      await service.updateDetection(integrationSource);

      expect(descriptorClient.updateLastProcessedMarker).toHaveBeenCalledWith(
        integrationSource,
        maxTimestamp
      );
    });
  });
});
