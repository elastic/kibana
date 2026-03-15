/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { createAlertEmbeddingService } from './alert_embedding_service';
import type { AlertVectorIndexService } from '../vector_storage';

describe('AlertEmbeddingService', () => {
  let esClient: jest.Mocked<ElasticsearchClient>;
  let logger: Logger;
  let vectorIndexService: jest.Mocked<AlertVectorIndexService>;

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
  });

  describe('generateEmbedding', () => {
    it('calls inference API and returns embedding', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3, 0.4];
      esClient.inference.inference.mockResolvedValue({
        text_embedding: { embedding: mockEmbedding },
      } as unknown as ReturnType<ElasticsearchClient['inference']['inference']>);

      const service = createAlertEmbeddingService({
        esClient,
        logger,
        vectorIndexService,
        inferenceEndpointId: 'test-endpoint',
      });

      const result = await service.generateEmbedding('Rule: Test.');

      expect(result).toEqual(mockEmbedding);
      expect(esClient.inference.inference).toHaveBeenCalledWith({
        inference_id: 'test-endpoint',
        task_type: 'text_embedding',
        input: 'Rule: Test.',
      });
    });

    it('throws on unexpected inference response format', async () => {
      esClient.inference.inference.mockResolvedValue({
        some_other_format: {},
      } as unknown as ReturnType<ElasticsearchClient['inference']['inference']>);

      const service = createAlertEmbeddingService({
        esClient,
        logger,
        vectorIndexService,
        inferenceEndpointId: 'test-endpoint',
      });

      await expect(service.generateEmbedding('Rule: Test.')).rejects.toThrow(
        'unexpected response format'
      );
    });
  });

  describe('vectorizeAlert', () => {
    it('skips vectorization when an existing vector with the same hash exists', async () => {
      vectorIndexService.findByAlertId.mockResolvedValue({
        alert_id: 'alert-1',
        alert_index: '.alerts-security.alerts-default',
        vector: [0.1, 0.2],
        feature_text_hash: '1d25dd7578cff4ff4fce12882f76a7ca80c8115ade4674be5f0282f15b5c284d',
        inference_endpoint_id: 'test',
        feature_text: 'Rule: Unknown Rule.',
        '@timestamp': '2026-03-15T00:00:00.000Z',
      });

      const service = createAlertEmbeddingService({
        esClient,
        logger,
        vectorIndexService,
      });

      const result = await service.vectorizeAlert('alert-1', '.alerts-security.alerts-default', {});

      expect(result.success).toBe(true);
      expect(esClient.inference.inference).not.toHaveBeenCalled();
    });

    it('generates embedding and stores vector for a new alert', async () => {
      vectorIndexService.findByAlertId.mockResolvedValue(undefined);
      vectorIndexService.storeVectorDocument.mockResolvedValue('doc-1');

      esClient.inference.inference.mockResolvedValue({
        text_embedding: { embedding: [0.1, 0.2, 0.3] },
      } as unknown as ReturnType<ElasticsearchClient['inference']['inference']>);

      const service = createAlertEmbeddingService({
        esClient,
        logger,
        vectorIndexService,
      });

      const alert = {
        kibana: { alert: { rule: { name: 'Test Rule' }, severity: 'high' } },
        process: { name: 'evil.exe' },
      };

      const result = await service.vectorizeAlert(
        'alert-1',
        '.alerts-security.alerts-default',
        alert
      );

      expect(result.success).toBe(true);
      expect(result.vectorDocumentId).toBe('doc-1');
      expect(vectorIndexService.storeVectorDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          alert_id: 'alert-1',
          vector: [0.1, 0.2, 0.3],
        })
      );
    });

    it('returns failure result on error', async () => {
      vectorIndexService.findByAlertId.mockRejectedValue(new Error('ES unavailable'));

      const service = createAlertEmbeddingService({
        esClient,
        logger,
        vectorIndexService,
      });

      const result = await service.vectorizeAlert('alert-1', '.alerts-security.alerts-default', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('ES unavailable');
    });
  });

  describe('batchVectorize', () => {
    it('processes alerts in batches and returns summary', async () => {
      vectorIndexService.findByAlertId.mockResolvedValue(undefined);
      vectorIndexService.storeVectorDocument.mockResolvedValue('doc-id');

      esClient.inference.inference.mockResolvedValue({
        text_embedding: { embedding: [0.1, 0.2, 0.3] },
      } as unknown as ReturnType<ElasticsearchClient['inference']['inference']>);

      const service = createAlertEmbeddingService({
        esClient,
        logger,
        vectorIndexService,
      });

      const alerts = Array.from({ length: 5 }, (_, i) => ({
        id: `alert-${i}`,
        index: '.alerts-security.alerts-default',
        doc: { kibana: { alert: { rule: { name: `Rule ${i}` } } } },
      }));

      const result = await service.batchVectorize(alerts, 2);

      expect(result.total).toBe(5);
      expect(result.succeeded).toBe(5);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(5);
    });

    it('handles partial failures in a batch', async () => {
      let callCount = 0;
      vectorIndexService.findByAlertId.mockImplementation(async () => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Inference error');
        }
        return undefined;
      });
      vectorIndexService.storeVectorDocument.mockResolvedValue('doc-id');

      esClient.inference.inference.mockResolvedValue({
        text_embedding: { embedding: [0.1] },
      } as unknown as ReturnType<ElasticsearchClient['inference']['inference']>);

      const service = createAlertEmbeddingService({
        esClient,
        logger,
        vectorIndexService,
      });

      const alerts = [
        { id: 'alert-0', index: 'idx', doc: { kibana: { alert: { rule: { name: 'A' } } } } },
        { id: 'alert-1', index: 'idx', doc: { kibana: { alert: { rule: { name: 'B' } } } } },
        { id: 'alert-2', index: 'idx', doc: { kibana: { alert: { rule: { name: 'C' } } } } },
      ];

      const result = await service.batchVectorize(alerts, 3);

      expect(result.total).toBe(3);
      expect(result.failed).toBe(1);
      expect(result.succeeded).toBe(2);
    });
  });
});
