/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getListItemsOverview } from './get_list_items_overview';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';

describe('getListItemsOverview', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    logger = loggingSystemMock.createLogger();
  });

  it('returns default metrics when no data is found', async () => {
    esClient.search.mockResolvedValueOnce({
      took: 0,
      timed_out: false,
      _shards: {
        total: 1,
        successful: 1,
        skipped: 0,
        failed: 0,
      },
      aggregations: {
        items_per_list: { buckets: [] },
        min_items_per_list: { value: null },
        max_items_per_list: { value: null },
        median_items_per_list: { value: null },
      },
      hits: {
        total: { value: 0, relation: 'eq' },
        max_score: null,
        hits: [],
      },
    });

    const result = await getListItemsOverview({ esClient, logger });

    expect(result).toEqual({
      total: 0,
      max_items_per_list: 0,
      min_items_per_list: 0,
      median_items_per_list: 0,
    });
  });

  it('aggregates metrics correctly when data is present', async () => {
    esClient.search.mockResolvedValueOnce({
      took: 0,
      timed_out: false,
      _shards: {
        total: 1,
        successful: 1,
        skipped: 0,
        failed: 0,
      },
      aggregations: {
        items_per_list: {
          buckets: [
            { key: 'list_1', doc_count: 5 },
            { key: 'list_2', doc_count: 10 },
          ],
        },
        min_items_per_list: { value: 5 },
        max_items_per_list: { value: 10 },
        median_items_per_list: { values: { '50.0': 7.5 } },
      },
      hits: {
        total: { value: 15, relation: 'eq' },
        max_score: null,
        hits: [],
      },
    });

    const result = await getListItemsOverview({ esClient, logger });

    expect(result).toEqual({
      total: 15,
      max_items_per_list: 10,
      min_items_per_list: 5,
      median_items_per_list: 7.5,
    });
  });

  it('returns default metrics when Elasticsearch query fails', async () => {
    esClient.search.mockRejectedValueOnce(new Error('Elasticsearch query failed'));

    const result = await getListItemsOverview({ esClient, logger });

    expect(result).toEqual({
      total: 0,
      max_items_per_list: 0,
      min_items_per_list: 0,
      median_items_per_list: 0,
    });
  });
});
