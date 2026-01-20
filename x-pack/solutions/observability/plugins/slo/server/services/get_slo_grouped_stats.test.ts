/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { GetSLOGroupedStats } from './get_slo_grouped_stats';
import { DEFAULT_SETTINGS } from './slo_settings_repository';

describe('GetSLOGroupedStats', () => {
  let scopedClusterClient: IScopedClusterClient;
  let esClientMock: ElasticsearchClientMock;
  let internalEsClientMock: ElasticsearchClientMock;
  let service: GetSLOGroupedStats;

  beforeEach(() => {
    scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    esClientMock = scopedClusterClient.asCurrentUser as ElasticsearchClientMock;
    internalEsClientMock = scopedClusterClient.asInternalUser as ElasticsearchClientMock;

    internalEsClientMock.indices.getAlias.mockResolvedValue({
      '.slo-observability.summary-v3': { aliases: {} },
    });

    service = new GetSLOGroupedStats(scopedClusterClient, 'default', DEFAULT_SETTINGS);
  });

  describe('execute', () => {
    describe('apm', () => {
      it('returns empty results when no buckets are found', async () => {
        esClientMock.search.mockResolvedValue({
          took: 0,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { total: { value: 0, relation: 'eq' }, hits: [] },
          aggregations: {
            groups: {
              buckets: [],
            },
          },
        });

        const result = await service.execute({
          type: 'apm',
        });

        expect(result).toEqual({ results: [] });
      });

      it('returns grouped stats by service.name', async () => {
        esClientMock.search.mockResolvedValue({
          took: 0,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { total: { value: 10, relation: 'eq' }, hits: [] },
          aggregations: {
            groups: {
              buckets: [
                {
                  key: 'service-a',
                  doc_count: 5,
                  violated: { doc_count: 1 },
                  degrading: { doc_count: 1 },
                  healthy: { doc_count: 2 },
                  noData: { doc_count: 1 },
                },
                {
                  key: 'service-b',
                  doc_count: 3,
                  violated: { doc_count: 0 },
                  degrading: { doc_count: 0 },
                  healthy: { doc_count: 3 },
                  noData: { doc_count: 0 },
                },
              ],
            },
          },
        });

        const result = await service.execute({
          type: 'apm',
        });

        expect(result).toEqual({
          results: [
            {
              entity: 'service-a',
              summary: { violated: 1, degrading: 1, healthy: 2, noData: 1 },
            },
            {
              entity: 'service-b',
              summary: { violated: 0, degrading: 0, healthy: 3, noData: 0 },
            },
          ],
        });
      });

      it('builds correct query with serviceNames filter', async () => {
        esClientMock.search.mockResolvedValue({
          took: 0,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { total: { value: 0, relation: 'eq' }, hits: [] },
          aggregations: { groups: { buckets: [] } },
        });

        await service.execute({
          type: 'apm',
          serviceNames: ['service-a', 'service-b'],
          size: 50,
        });

        expect(esClientMock.search).toHaveBeenCalledTimes(1);
        const searchCall = esClientMock.search.mock.calls[0][0] as any;

        expect(searchCall.size).toBe(0);
        expect(searchCall.index).toEqual(['.slo-observability.summary-v3*']);

        const filters = searchCall.query.bool.filter;
        expect(filters).toContainEqual({ term: { spaceId: 'default' } });
        expect(filters).toContainEqual({
          terms: {
            'slo.indicator.type': ['sli.apm.transactionDuration', 'sli.apm.transactionErrorRate'],
          },
        });
        expect(filters).toContainEqual({
          terms: { 'service.name': ['service-a', 'service-b'] },
        });

        expect(searchCall.aggs.groups.terms.size).toBe(50);
        expect(searchCall.aggs.groups.terms.field).toBe('service.name');
      });

      it('builds correct query with environment filter', async () => {
        esClientMock.search.mockResolvedValue({
          took: 0,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { total: { value: 0, relation: 'eq' }, hits: [] },
          aggregations: { groups: { buckets: [] } },
        });

        await service.execute({
          type: 'apm',
          environment: 'production',
        });

        expect(esClientMock.search).toHaveBeenCalledTimes(1);
        const searchCall = esClientMock.search.mock.calls[0][0] as any;

        const filters = searchCall.query.bool.filter;
        expect(filters).toContainEqual({ term: { 'service.environment': 'production' } });
      });

      it('handles missing status counts gracefully', async () => {
        esClientMock.search.mockResolvedValue({
          took: 0,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { total: { value: 1, relation: 'eq' }, hits: [] },
          aggregations: {
            groups: {
              buckets: [
                {
                  key: 'service-a',
                  doc_count: 1,
                  healthy: { doc_count: 1 },
                },
              ],
            },
          },
        });

        const result = await service.execute({
          type: 'apm',
        });

        expect(result).toEqual({
          results: [
            {
              entity: 'service-a',
              summary: { violated: 0, degrading: 0, healthy: 1, noData: 0 },
            },
          ],
        });
      });

      it('uses default size of 100', async () => {
        esClientMock.search.mockResolvedValue({
          took: 0,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { total: { value: 0, relation: 'eq' }, hits: [] },
          aggregations: { groups: { buckets: [] } },
        });

        await service.execute({
          type: 'apm',
        });

        const searchCall = esClientMock.search.mock.calls[0][0] as any;
        expect(searchCall.aggs.groups.terms.size).toBe(100);
      });
    });
  });
});
