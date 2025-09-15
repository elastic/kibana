/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getListsOverview } from './get_lists_overview';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';

describe('getListsOverview', () => {
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
        by_type: { buckets: [] },
      },
      hits: {
        total: { value: 0, relation: 'eq' },
        max_score: null,
        hits: [],
      },
    });

    const result = await getListsOverview({ esClient, logger });

    expect(result).toEqual({
      binary: 0,
      boolean: 0,
      byte: 0,
      date: 0,
      date_nanos: 0,
      date_range: 0,
      double: 0,
      double_range: 0,
      float: 0,
      float_range: 0,
      geo_point: 0,
      geo_shape: 0,
      half_float: 0,
      integer: 0,
      integer_range: 0,
      ip: 0,
      ip_range: 0,
      keyword: 0,
      long: 0,
      long_range: 0,
      shape: 0,
      short: 0,
      text: 0,
      total: 0,
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
        by_type: {
          buckets: [
            { key: 'keyword', doc_count: 5 },
            { key: 'ip', doc_count: 3 },
            { key: 'text', doc_count: 2 },
          ],
        },
      },
      hits: {
        total: { value: 10, relation: 'eq' },
        max_score: null,
        hits: [],
      },
    });

    const result = await getListsOverview({ esClient, logger });

    expect(result).toEqual({
      binary: 0,
      boolean: 0,
      byte: 0,
      date: 0,
      date_nanos: 0,
      date_range: 0,
      double: 0,
      double_range: 0,
      float: 0,
      float_range: 0,
      geo_point: 0,
      geo_shape: 0,
      half_float: 0,
      integer: 0,
      integer_range: 0,
      ip: 3,
      ip_range: 0,
      keyword: 5,
      long: 0,
      long_range: 0,
      shape: 0,
      short: 0,
      text: 2,
      total: 10,
    });
  });

  it('returns default metrics when Elasticsearch query fails', async () => {
    esClient.search.mockRejectedValueOnce(new Error('Elasticsearch query failed'));

    const result = await getListsOverview({ esClient, logger });

    expect(result).toEqual({
      binary: 0,
      boolean: 0,
      byte: 0,
      date: 0,
      date_nanos: 0,
      date_range: 0,
      double: 0,
      double_range: 0,
      float: 0,
      float_range: 0,
      geo_point: 0,
      geo_shape: 0,
      half_float: 0,
      integer: 0,
      integer_range: 0,
      ip: 0,
      ip_range: 0,
      keyword: 0,
      long: 0,
      long_range: 0,
      shape: 0,
      short: 0,
      text: 0,
      total: 0,
    });
  });
});
