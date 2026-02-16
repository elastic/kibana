/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { IScopedClusterClient } from '@kbn/core/server';
import { SloAggregationClient } from './slo_aggregation_client';
import { sevenDays } from './fixtures/duration';

const DEFAULT_SETTINGS = {
  useAllRemoteClusters: false,
  selectedRemoteClusters: [],
  staleThresholdInHours: 2,
};

describe('SloAggregationClient', () => {
  let scopedClusterClient: jest.Mocked<IScopedClusterClient>;
  let client: SloAggregationClient;

  beforeEach(() => {
    scopedClusterClient = {
      asCurrentUser: elasticsearchServiceMock.createElasticsearchClient(),
      asInternalUser: elasticsearchServiceMock.createElasticsearchClient(),
    };

    // Mock getSummaryIndices (returns empty indices, falls back to default pattern)
    scopedClusterClient.asInternalUser.indices.getAlias.mockResolvedValue({});

    client = new SloAggregationClient(scopedClusterClient, 'default', DEFAULT_SETTINGS);
  });

  it('returns aggregated groups by metadata field', async () => {
    scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce({
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: { hits: [] },
      aggregations: {
        groups: {
          buckets: [
            {
              key: 'platform',
              doc_count: 12,
              avg_sli: { value: 0.9975 },
              avg_error_budget_consumed: { value: 0.25 },
            },
            {
              key: 'search',
              doc_count: 8,
              avg_sli: { value: 0.993 },
              avg_error_budget_consumed: { value: 0.7 },
            },
          ],
        },
      },
    });

    const result = await client.aggregate({
      groupBy: 'slo.metadata.team',
    });

    expect(result.groups).toHaveLength(2);
    expect(result.groups[0]).toEqual({
      key: 'platform',
      count: 12,
      avgSliValue: 0.9975,
      avgErrorBudgetConsumed: 0.25,
    });
    expect(result.groups[1]).toEqual({
      key: 'search',
      count: 8,
      avgSliValue: 0.993,
      avgErrorBudgetConsumed: 0.7,
    });
  });

  it('applies metadata filter to the query', async () => {
    scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce({
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: { hits: [] },
      aggregations: {
        groups: { buckets: [] },
      },
    });

    await client.aggregate({
      groupBy: 'slo.metadata.team',
      filter: {
        metadata: { env: 'production' },
      },
    });

    expect(scopedClusterClient.asCurrentUser.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          bool: expect.objectContaining({
            filter: expect.arrayContaining([
              { term: { 'slo.metadata.env': 'production' } },
            ]),
          }),
        }),
      })
    );
  });

  it('applies status filter to the query', async () => {
    scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce({
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: { hits: [] },
      aggregations: {
        groups: { buckets: [] },
      },
    });

    await client.aggregate({
      groupBy: 'slo.metadata.team',
      filter: {
        status: ['VIOLATED', 'DEGRADING'],
      },
    });

    expect(scopedClusterClient.asCurrentUser.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          bool: expect.objectContaining({
            filter: expect.arrayContaining([
              { terms: { status: ['VIOLATED', 'DEGRADING'] } },
            ]),
          }),
        }),
      })
    );
  });

  it('returns empty groups when no buckets', async () => {
    scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce({
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: { hits: [] },
      aggregations: {
        groups: { buckets: [] },
      },
    });

    const result = await client.aggregate({
      groupBy: 'slo.metadata.cost_center',
    });

    expect(result.groups).toHaveLength(0);
  });
});
