/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import { createUpdateDetectionService } from './update_detection';
import type { MonitoringEntitySource } from '../../../../../../../common/api/entity_analytics';
import type { EntityStoreEntityIdsByType } from '../../../entities/service';
import { MonitoringEntitySourceDescriptorClient } from '../../../../privilege_monitoring/saved_objects';

const mockGetLastProcessedMarker = jest.fn();
const mockUpdateLastProcessedMarker = jest.fn();

jest.mock('../../../../privilege_monitoring/saved_objects', () => ({
  MonitoringEntitySourceDescriptorClient: jest.fn().mockImplementation(() => ({
    getLastProcessedMarker: mockGetLastProcessedMarker,
    updateLastProcessedMarker: mockUpdateLastProcessedMarker,
  })),
}));

type CapturedSearchRequest = SearchRequest & {
  aggs?: {
    entities?: {
      aggs?: {
        latest_doc?: unknown;
      };
    };
  };
  query?: {
    bool?: {
      must?: unknown[];
    };
  };
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

const createEntityStoreEntityIdsByType = (
  overrides: Partial<EntityStoreEntityIdsByType> = {}
): EntityStoreEntityIdsByType => ({
  user: [],
  host: [],
  service: [],
  generic: [],
  ...overrides,
});

describe('Watchlist update detection service', () => {
  const createDescriptorClient = () =>
    new MonitoringEntitySourceDescriptorClient({
      soClient: savedObjectsClientMock.create(),
      namespace: 'default',
    });

  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = loggingSystemMock.createLogger();
  });

  describe('index source (plain sync)', () => {
    it('uses buildEntitiesSearchBody without syncMarker and applies bulk upsert', async () => {
      const searchCalls: CapturedSearchRequest[] = [];
      const targetIndex = '.watchlist-entities-default';
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.search.mockImplementation((params?: SearchRequest) => {
        if (!params) {
          throw new Error('Expected search params');
        }
        searchCalls.push(params as CapturedSearchRequest);
        if (params.index === targetIndex) {
          return Promise.resolve({ hits: { hits: [] } } as never);
        }
        return Promise.resolve({
          aggregations: {
            entities: {
              buckets: [{ key: { euid: 'user:jdoe' }, doc_count: 1 }],
              after_key: undefined,
            },
          },
        } as never);
      });
      esClient.bulk.mockResolvedValue({ errors: false } as never);

      const service = createUpdateDetectionService({
        esClient,
        logger,
        targetIndex,
      });

      await service.updateDetection(
        indexSource,
        createEntityStoreEntityIdsByType({ user: ['user:jdoe'] })
      );

      expect(searchCalls.length).toBeGreaterThan(0);
      const firstSearchParams = searchCalls[0];
      expect(firstSearchParams.aggs?.entities?.aggs).toBeUndefined();
      expect(firstSearchParams.query?.bool?.must).toHaveLength(2);
      expect(firstSearchParams.query?.bool?.must).toContainEqual({
        terms: { euid: ['user:jdoe'] },
      });
      expect(esClient.bulk).toHaveBeenCalled();
    });

    it('skips source searching when the allowlist is empty for all entity types', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();

      const service = createUpdateDetectionService({
        esClient,
        logger,
        targetIndex: '.watchlist-entities-default',
      });

      const result = await service.updateDetection(indexSource, createEntityStoreEntityIdsByType());

      expect(result).toEqual([]);
      expect(esClient.search).not.toHaveBeenCalled();
      expect(esClient.bulk).not.toHaveBeenCalled();
    });
  });

  describe('integration source without descriptorClient', () => {
    it('logs warning and returns empty array without calling search or bulk', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();

      const service = createUpdateDetectionService({
        esClient,
        logger,
        targetIndex: '.watchlist-entities-default',
      });

      const result = await service.updateDetection(
        integrationSource,
        createEntityStoreEntityIdsByType({ user: ['user:jdoe'] })
      );

      expect(result).toEqual([]);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('descriptorClient not available')
      );
      expect(esClient.search).not.toHaveBeenCalled();
      expect(esClient.bulk).not.toHaveBeenCalled();
    });
  });

  describe('integration source with descriptorClient', () => {
    it('fetches sync marker, uses it in search, and updates marker after processing', async () => {
      const syncMarker = '2024-01-01T00:00:00Z';
      const descriptorClient = createDescriptorClient();
      mockGetLastProcessedMarker.mockResolvedValue(syncMarker);
      mockUpdateLastProcessedMarker.mockResolvedValue(undefined);

      const searchCalls: CapturedSearchRequest[] = [];
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.search.mockImplementation((params?: SearchRequest) => {
        if (!params) {
          throw new Error('Expected search params');
        }
        searchCalls.push(params as CapturedSearchRequest);
        return Promise.resolve({
          aggregations: {
            entities: {
              buckets: [],
              after_key: undefined,
            },
          },
        } as never);
      });
      esClient.bulk.mockResolvedValue({ errors: false } as never);

      const service = createUpdateDetectionService({
        esClient,
        logger,
        targetIndex: '.watchlist-entities-default',
        descriptorClient,
      });

      await service.updateDetection(
        integrationSource,
        createEntityStoreEntityIdsByType({ user: ['user:jdoe'] })
      );

      expect(mockGetLastProcessedMarker).toHaveBeenCalledWith(integrationSource);
      expect(searchCalls.length).toBeGreaterThan(0);
      const firstSearchParams = searchCalls[0];
      expect(firstSearchParams.query?.bool?.must).toContainEqual({
        terms: { euid: ['user:jdoe'] },
      });
      expect(firstSearchParams.query?.bool?.must).toContainEqual({
        range: { '@timestamp': { gte: syncMarker, lte: 'now' } },
      });
      expect(firstSearchParams.aggs?.entities?.aggs?.latest_doc).toBeDefined();
      expect(mockUpdateLastProcessedMarker).not.toHaveBeenCalled();
    });

    it('updates sync marker when maxTimestamp is extracted from buckets', async () => {
      const syncMarker = '2024-01-01T00:00:00Z';
      const maxTimestamp = '2024-01-15T12:00:00Z';
      const descriptorClient = createDescriptorClient();
      mockGetLastProcessedMarker.mockResolvedValue(syncMarker);
      mockUpdateLastProcessedMarker.mockResolvedValue(undefined);

      const targetIndex = '.watchlist-entities-default';
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.search.mockImplementation((params?: SearchRequest) => {
        if (!params) {
          throw new Error('Expected search params');
        }
        if (params.index === targetIndex) {
          return Promise.resolve({ hits: { hits: [] } } as never);
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
        } as never);
      });
      esClient.bulk.mockResolvedValue({ errors: false } as never);

      const service = createUpdateDetectionService({
        esClient,
        logger,
        targetIndex: '.watchlist-entities-default',
        descriptorClient,
      });

      await service.updateDetection(
        integrationSource,
        createEntityStoreEntityIdsByType({ user: ['user:jdoe'] })
      );

      expect(mockUpdateLastProcessedMarker).toHaveBeenCalledWith(integrationSource, maxTimestamp);
    });
  });
});
