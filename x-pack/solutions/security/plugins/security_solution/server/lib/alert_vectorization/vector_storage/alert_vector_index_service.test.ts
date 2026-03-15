/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { createAlertVectorIndexService } from './alert_vector_index_service';
import { getAlertVectorIndexName } from '../types';

describe('AlertVectorIndexService', () => {
  let esClient: jest.Mocked<ElasticsearchClient>;
  let logger: Logger;
  const spaceId = 'default';

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    logger = loggingSystemMock.createLogger();
  });

  describe('createIndex', () => {
    it('creates the index when it does not exist', async () => {
      esClient.indices.exists.mockResolvedValue(false);
      esClient.indices.create.mockResolvedValue({
        acknowledged: true,
        shards_acknowledged: true,
        index: getAlertVectorIndexName(spaceId),
      });

      const service = createAlertVectorIndexService({ esClient, logger, spaceId });
      await service.createIndex();

      expect(esClient.indices.create).toHaveBeenCalledWith(
        expect.objectContaining({
          index: '.security-alert-vectors-default',
          mappings: expect.objectContaining({
            properties: expect.objectContaining({
              vector: expect.objectContaining({
                type: 'dense_vector',
              }),
              alert_id: expect.objectContaining({
                type: 'keyword',
              }),
            }),
          }),
        })
      );
    });

    it('updates mappings when the index already exists', async () => {
      esClient.indices.exists.mockResolvedValue(true);
      esClient.indices.get.mockResolvedValue({
        '.security-alert-vectors-default': {
          aliases: {},
          mappings: {},
          settings: {},
        },
      } as unknown as ReturnType<ElasticsearchClient['indices']['get']>);
      esClient.indices.putMapping.mockResolvedValue({ acknowledged: true });
      esClient.indices.putSettings.mockResolvedValue({ acknowledged: true });

      const service = createAlertVectorIndexService({ esClient, logger, spaceId });
      await service.createIndex();

      expect(esClient.indices.create).not.toHaveBeenCalled();
      expect(esClient.indices.putMapping).toHaveBeenCalled();
    });
  });

  describe('doesIndexExist', () => {
    it('returns true when the index exists', async () => {
      esClient.indices.exists.mockResolvedValue(true);
      const service = createAlertVectorIndexService({ esClient, logger, spaceId });

      const result = await service.doesIndexExist();
      expect(result).toBe(true);
    });

    it('returns false when the index does not exist', async () => {
      esClient.indices.exists.mockResolvedValue(false);
      const service = createAlertVectorIndexService({ esClient, logger, spaceId });

      const result = await service.doesIndexExist();
      expect(result).toBe(false);
    });

    it('returns false on error', async () => {
      esClient.indices.exists.mockRejectedValue(new Error('connection error'));
      const service = createAlertVectorIndexService({ esClient, logger, spaceId });

      const result = await service.doesIndexExist();
      expect(result).toBe(false);
    });
  });

  describe('storeVectorDocument', () => {
    it('indexes a vector document and returns the ID', async () => {
      esClient.index.mockResolvedValue({
        _id: 'doc-1',
        _index: '.security-alert-vectors-default',
        _primary_term: 1,
        _seq_no: 1,
        _version: 1,
        result: 'created',
      });

      const service = createAlertVectorIndexService({ esClient, logger, spaceId });
      const docId = await service.storeVectorDocument({
        alert_id: 'alert-1',
        alert_index: '.alerts-security.alerts-default',
        vector: [0.1, 0.2, 0.3],
        feature_text_hash: 'abc123',
        inference_endpoint_id: '.multilingual-e5-small-elasticsearch',
        feature_text: 'Rule: Test.',
        '@timestamp': '2026-03-15T00:00:00.000Z',
      });

      expect(docId).toBe('doc-1');
      expect(esClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          index: '.security-alert-vectors-default',
          refresh: 'wait_for',
        })
      );
    });
  });

  describe('findByAlertId', () => {
    it('finds a vector document by alert ID', async () => {
      const mockDoc = {
        alert_id: 'alert-1',
        alert_index: '.alerts-security.alerts-default',
        vector: [0.1, 0.2],
        feature_text_hash: 'abc',
        inference_endpoint_id: 'test',
        feature_text: 'Rule: Test.',
        '@timestamp': '2026-03-15T00:00:00.000Z',
      };

      esClient.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          total: { value: 1, relation: 'eq' },
          max_score: 1.0,
          hits: [{ _id: 'doc-1', _index: 'test', _score: 1.0, _source: mockDoc }],
        },
      });

      const service = createAlertVectorIndexService({ esClient, logger, spaceId });
      const result = await service.findByAlertId('alert-1');

      expect(result).toEqual(mockDoc);
    });

    it('returns undefined when no document found', async () => {
      esClient.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          total: { value: 0, relation: 'eq' },
          max_score: null,
          hits: [],
        },
      });

      const service = createAlertVectorIndexService({ esClient, logger, spaceId });
      const result = await service.findByAlertId('nonexistent');

      expect(result).toBeUndefined();
    });
  });

  describe('bulkStoreVectorDocuments', () => {
    it('returns empty array for empty input', async () => {
      const service = createAlertVectorIndexService({ esClient, logger, spaceId });
      const result = await service.bulkStoreVectorDocuments([]);

      expect(result).toEqual([]);
      expect(esClient.bulk).not.toHaveBeenCalled();
    });

    it('bulk indexes documents and returns IDs', async () => {
      esClient.bulk.mockResolvedValue({
        took: 10,
        errors: false,
        items: [
          { index: { _id: 'doc-1', _index: 'test', status: 201, result: 'created' } },
          { index: { _id: 'doc-2', _index: 'test', status: 201, result: 'created' } },
        ],
      });

      const service = createAlertVectorIndexService({ esClient, logger, spaceId });
      const result = await service.bulkStoreVectorDocuments([
        {
          alert_id: 'alert-1',
          alert_index: '.alerts-security.alerts-default',
          vector: [0.1],
          feature_text_hash: 'a',
          inference_endpoint_id: 'test',
          feature_text: 'Rule: A.',
          '@timestamp': '2026-03-15T00:00:00.000Z',
        },
        {
          alert_id: 'alert-2',
          alert_index: '.alerts-security.alerts-default',
          vector: [0.2],
          feature_text_hash: 'b',
          inference_endpoint_id: 'test',
          feature_text: 'Rule: B.',
          '@timestamp': '2026-03-15T00:00:00.000Z',
        },
      ]);

      expect(result).toEqual(['doc-1', 'doc-2']);
    });
  });
});
