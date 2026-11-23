/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { createCompositeSlo } from '../fixtures/composite_slo';
import { createCompositeSLORepositoryMock } from '../mocks';
import { findCompositeSlo } from './find_composite_slo';

describe('findCompositeSlo', () => {
  it('returns the composite SLOs in their wire form', async () => {
    const compositeSlo = createCompositeSlo({ id: 'composite-slo-1' });
    const compositeRepository = createCompositeSLORepositoryMock();
    compositeRepository.findAllByIds.mockResolvedValue([compositeSlo]);
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search
      .mockResolvedValueOnce({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          total: { value: 1, relation: 'eq' },
          hits: [
            {
              _index: 'idx',
              _id: 'default:composite-slo-1',
              _source: { compositeSlo: { id: 'composite-slo-1' } },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 0, relation: 'eq' }, hits: [] },
      });

    const result = await findCompositeSlo(
      {},
      { spaceId: 'default', compositeRepository, esClient }
    );

    expect(result.total).toBe(1);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].timeWindow).toEqual({ duration: '30d', type: 'rolling' });
    expect(result.results[0].createdAt).toBe('2024-01-01T00:00:00.000Z');
    expect(result.results[0].summary.status).toBe('NO_DATA');
  });

  it('returns an empty page when no composite SLO matches', async () => {
    const compositeRepository = createCompositeSLORepositoryMock();
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValueOnce({
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: { total: { value: 0, relation: 'eq' }, hits: [] },
    });

    const result = await findCompositeSlo(
      {},
      { spaceId: 'default', compositeRepository, esClient }
    );

    expect(result).toEqual({ page: 1, perPage: 25, total: 0, results: [] });
  });
});
