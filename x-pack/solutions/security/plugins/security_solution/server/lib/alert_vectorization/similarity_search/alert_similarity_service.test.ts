/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { createAlertSimilarityService } from './alert_similarity_service';
import type { AlertVectorIndexService } from '../vector_storage';
import type { AlertEmbeddingService } from '../embedding';

describe('AlertSimilarityService', () => {
  let esClient: jest.Mocked<ElasticsearchClient>;
  let logger: Logger;
  let vectorIndexService: jest.Mocked<AlertVectorIndexService>;
  let embeddingService: jest.Mocked<AlertEmbeddingService>;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    logger = loggingSystemMock.createLogger();
    vectorIndexService = {
      createIndex: jest.fn(),
      doesIndexExist: jest.fn(),
      deleteIndex: jest.fn(),
      storeVectorDocument: jest.fn(),
      bulkStoreVectorDocuments: jest.fn(),
      findByAlertId: jest.fn(),
      findByFeatureHash: jest.fn(),
      getIndexName: jest.fn().mockReturnValue('.security-alert-vectors-default'),
    };
    embeddingService = {
      generateEmbedding: jest.fn(),
      vectorizeAlert: jest.fn(),
      batchVectorize: jest.fn(),
      getInferenceEndpointId: jest.fn().mockReturnValue('test-endpoint'),
    };
  });

  describe('searchByAlertId', () => {
    it('returns empty results when no vector exists for the alert', async () => {
      vectorIndexService.findByAlertId.mockResolvedValue(undefined);

      const service = createAlertSimilarityService({
        esClient,
        logger,
        vectorIndexService,
        embeddingService,
      });

      const result = await service.searchByAlertId('nonexistent');

      expect(result.similarAlerts).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('performs kNN search when a stored vector exists', async () => {
      vectorIndexService.findByAlertId.mockResolvedValue({
        alert_id: 'alert-1',
        alert_index: '.alerts-security.alerts-default',
        vector: [0.1, 0.2, 0.3],
        feature_text_hash: 'abc',
        inference_endpoint_id: 'test',
        feature_text: 'Rule: Test.',
        '@timestamp': '2026-03-15T00:00:00.000Z',
      });

      esClient.search.mockResolvedValue({
        took: 5,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          total: { value: 2, relation: 'eq' },
          max_score: 0.95,
          hits: [
            {
              _id: 'vec-2',
              _index: '.security-alert-vectors-default',
              _score: 0.95,
              _source: {
                alert_id: 'alert-2',
                alert_index: '.alerts-security.alerts-default',
                feature_text: 'Rule: Similar Rule.',
              },
            },
            {
              _id: 'vec-3',
              _index: '.security-alert-vectors-default',
              _score: 0.8,
              _source: {
                alert_id: 'alert-3',
                alert_index: '.alerts-security.alerts-default',
                feature_text: 'Rule: Less Similar.',
              },
            },
          ],
        },
      } as unknown as SearchResponse);

      const service = createAlertSimilarityService({
        esClient,
        logger,
        vectorIndexService,
        embeddingService,
      });

      const result = await service.searchByAlertId('alert-1', {
        threshold: 0.85,
        maxResults: 10,
      });

      expect(result.similarAlerts).toHaveLength(1);
      expect(result.similarAlerts[0].alertId).toBe('alert-2');
      expect(result.similarAlerts[0].score).toBe(0.95);
      expect(result.total).toBe(1);
      expect(result.threshold).toBe(0.85);
    });
  });

  describe('searchByText', () => {
    it('generates embedding and performs kNN search', async () => {
      embeddingService.generateEmbedding.mockResolvedValue([0.5, 0.6, 0.7]);

      esClient.search.mockResolvedValue({
        took: 3,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          total: { value: 1, relation: 'eq' },
          max_score: 0.92,
          hits: [
            {
              _id: 'vec-1',
              _index: '.security-alert-vectors-default',
              _score: 0.92,
              _source: {
                alert_id: 'alert-1',
                alert_index: '.alerts-security.alerts-default',
                feature_text: 'Rule: Matching Alert.',
              },
            },
          ],
        },
      } as unknown as SearchResponse);

      const service = createAlertSimilarityService({
        esClient,
        logger,
        vectorIndexService,
        embeddingService,
      });

      const result = await service.searchByText('suspicious powershell execution', {
        threshold: 0.9,
      });

      expect(embeddingService.generateEmbedding).toHaveBeenCalledWith(
        'suspicious powershell execution'
      );
      expect(result.similarAlerts).toHaveLength(1);
      expect(result.query.text).toBe('suspicious powershell execution');
    });
  });
});
