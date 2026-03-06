/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { findIndicesForMlJobsNode } from './find_indices_for_ml_jobs_node';

const createMockEsClient = (
  searchResponse: Awaited<ReturnType<ElasticsearchClient['search']>>
): jest.Mocked<ElasticsearchClient> => {
  const search = jest.fn().mockResolvedValue(searchResponse);
  return { search } as unknown as jest.Mocked<ElasticsearchClient>;
};

describe('findIndicesForMlJobsNode', () => {
  describe('search request', () => {
    it('calls esClient.search with .ml-anomalies-* index, size 0, and correct query and aggs', async () => {
      const esClient = createMockEsClient({
        took: 10,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 0, relation: 'eq' }, hits: [] },
        aggregations: { ml_indices: { buckets: [] } },
      });
      const recommendedStartedJobIds = ['job-1', 'job-2'];
      const threshold = 50;

      await findIndicesForMlJobsNode({
        esClient,
        recommendedStartedJobIds,
        threshold,
      });

      expect(esClient.search).toHaveBeenCalledTimes(1);
      expect(esClient.search).toHaveBeenCalledWith({
        index: '.ml-anomalies-*',
        size: 0,
        query: {
          bool: {
            filter: [
              { terms: { job_id: recommendedStartedJobIds } },
              { range: { record_score: { gt: threshold } } },
            ],
          },
        },
        aggs: {
          ml_indices: {
            terms: {
              field: '_index',
              size: 100,
            },
          },
        },
      });
    });
  });

  describe('return value', () => {
    it('returns indices from aggregation buckets when buckets have string keys', async () => {
      const esClient = createMockEsClient({
        took: 10,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 0, relation: 'eq' }, hits: [] },
        aggregations: {
          ml_indices: {
            buckets: [
              { key: '.ml-anomalies-custom-auth_rare_hour_for_a_user-000001', doc_count: 3 },
              { key: '.ml-anomalies-security_auth', doc_count: 2 },
            ],
          },
        },
      });

      const result = await findIndicesForMlJobsNode({
        esClient,
        recommendedStartedJobIds: ['job-1'],
        threshold: 75,
      });

      expect(result).toEqual({
        indices: [
          '.ml-anomalies-custom-auth_rare_hour_for_a_user-000001',
          '.ml-anomalies-security_auth',
        ],
      });
    });

    it('returns empty indices when buckets is empty', async () => {
      const esClient = createMockEsClient({
        took: 10,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 0, relation: 'eq' }, hits: [] },
        aggregations: { ml_indices: { buckets: [] } },
      });

      const result = await findIndicesForMlJobsNode({
        esClient,
        recommendedStartedJobIds: ['job-1'],
        threshold: 50,
      });

      expect(result).toEqual({ indices: [] });
    });

    it('returns empty indices when aggregations is undefined', async () => {
      const esClient = createMockEsClient(
        {} as unknown as Awaited<ReturnType<ElasticsearchClient['search']>>
      );

      const result = await findIndicesForMlJobsNode({
        esClient,
        recommendedStartedJobIds: ['job-1'],
        threshold: 50,
      });

      expect(result).toEqual({ indices: [] });
    });

    it('returns empty indices when ml_indices is undefined', async () => {
      const esClient = createMockEsClient({
        took: 10,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 0, relation: 'eq' }, hits: [] },
        aggregations: { other_agg: { buckets: [] } },
      });

      const result = await findIndicesForMlJobsNode({
        esClient,
        recommendedStartedJobIds: ['job-1'],
        threshold: 50,
      });

      expect(result).toEqual({ indices: [] });
    });

    it('returns empty indices when buckets is undefined', async () => {
      const esClient = createMockEsClient({
        took: 10,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 0, relation: 'eq' }, hits: [] },
        aggregations: { ml_indices: {} },
      });

      const result = await findIndicesForMlJobsNode({
        esClient,
        recommendedStartedJobIds: ['job-1'],
        threshold: 50,
      });

      expect(result).toEqual({ indices: [] });
    });

    it('filters out bucket entries whose key is not a string', async () => {
      const esClient = createMockEsClient({
        took: 10,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 0, relation: 'eq' }, hits: [] },
        aggregations: {
          ml_indices: {
            buckets: [
              { key: 'valid-index', doc_count: 1 },
              { key: 12345, doc_count: 1 },
              { key: null, doc_count: 1 },
              { key: undefined, doc_count: 1 },
              { key: '.ml-anomalies-another', doc_count: 2 },
            ],
          },
        },
      });

      const result = await findIndicesForMlJobsNode({
        esClient,
        recommendedStartedJobIds: ['job-1'],
        threshold: 50,
      });

      expect(result).toEqual({
        indices: ['valid-index', '.ml-anomalies-another'],
      });
    });

    it('returns single index when only one bucket is returned', async () => {
      const esClient = createMockEsClient({
        took: 10,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 0, relation: 'eq' }, hits: [] },
        aggregations: {
          ml_indices: {
            buckets: [{ key: '.ml-anomalies-single-job', doc_count: 10 }],
          },
        },
      });

      const result = await findIndicesForMlJobsNode({
        esClient,
        recommendedStartedJobIds: ['single-job'],
        threshold: 0,
      });

      expect(result).toEqual({ indices: ['.ml-anomalies-single-job'] });
    });

    it('returns only the latest rollover index when multiple versions exist for same base', async () => {
      const esClient = createMockEsClient({
        took: 10,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 0, relation: 'eq' }, hits: [] },
        aggregations: {
          ml_indices: {
            buckets: [
              { key: '.ml-anomalies-custom-auth_rare_user-000001', doc_count: 1 },
              { key: '.ml-anomalies-custom-auth_rare_user-000003', doc_count: 1 },
              { key: '.ml-anomalies-custom-auth_rare_user-000002', doc_count: 1 },
            ],
          },
        },
      });

      const result = await findIndicesForMlJobsNode({
        esClient,
        recommendedStartedJobIds: ['job-1'],
        threshold: 50,
      });

      expect(result).toEqual({
        indices: ['.ml-anomalies-custom-auth_rare_user-000003'],
      });
    });

    it('prefers rollover index over non-rollover base index for same job', async () => {
      const esClient = createMockEsClient({
        took: 10,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 0, relation: 'eq' }, hits: [] },
        aggregations: {
          ml_indices: {
            buckets: [
              { key: '.ml-anomalies-custom-auth_rare_user', doc_count: 1 },
              { key: '.ml-anomalies-custom-auth_rare_user-000001', doc_count: 1 },
            ],
          },
        },
      });

      const result = await findIndicesForMlJobsNode({
        esClient,
        recommendedStartedJobIds: ['job-1'],
        threshold: 50,
      });

      expect(result).toEqual({
        indices: ['.ml-anomalies-custom-auth_rare_user-000001'],
      });
    });

    it('keeps one latest index per base across mixed buckets', async () => {
      const esClient = createMockEsClient({
        took: 10,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 0, relation: 'eq' }, hits: [] },
        aggregations: {
          ml_indices: {
            buckets: [
              { key: '.ml-anomalies-custom-auth_rare_user', doc_count: 1 },
              { key: '.ml-anomalies-custom-auth_rare_user-000001', doc_count: 1 },
              { key: '.ml-anomalies-custom-auth_rare_user-000003', doc_count: 1 },
              { key: '.ml-anomalies-custom-auth_rare_user-000002', doc_count: 1 },
              { key: '.ml-anomalies-security_auth', doc_count: 2 },
              { key: '.ml-anomalies-custom-network_spike-000001', doc_count: 3 },
            ],
          },
        },
      });

      const result = await findIndicesForMlJobsNode({
        esClient,
        recommendedStartedJobIds: ['job-1'],
        threshold: 50,
      });

      expect(result).toEqual({
        indices: [
          '.ml-anomalies-custom-auth_rare_user-000003',
          '.ml-anomalies-security_auth',
          '.ml-anomalies-custom-network_spike-000001',
        ],
      });
    });
  });

  describe('error handling', () => {
    it('propagates search errors', async () => {
      const esClient = createMockEsClient(
        {} as unknown as Awaited<ReturnType<ElasticsearchClient['search']>>
      );
      (esClient.search as jest.Mock).mockRejectedValueOnce(new Error('Connection refused'));

      await expect(
        findIndicesForMlJobsNode({
          esClient,
          recommendedStartedJobIds: ['job-1'],
          threshold: 50,
        })
      ).rejects.toThrow('Connection refused');
    });
  });
});
