/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { EntityType } from '../../../../../../common/entity_analytics/types';
import {
  boundsFromSample,
  pagesToRunIndices,
  sampleBasePageBounds,
  samplingProbability,
  splitPoint,
  typeIdsEnd,
} from './sampled_page_bounds';

const searchResponse = (fields: Partial<SearchResponse>): SearchResponse => ({
  took: 7,
  timed_out: false,
  _shards: { total: 1, successful: 1, failed: 0 },
  hits: { hits: [] },
  ...fields,
});

const countResponse = (entities: number, alerts: number) => ({
  took: 7,
  columns: [
    { name: 'entities', type: 'long' as const },
    { name: 'alerts', type: 'long' as const },
  ],
  values: [[entities, alerts]],
});

const sampleResponse = (keys: string[], afterKey?: string) =>
  searchResponse({
    aggregations: {
      sample: {
        doc_count: keys.length,
        keys: {
          buckets: keys.map((entityId) => ({ key: { entity_id: entityId }, doc_count: 1 })),
          ...(afterKey ? { after_key: { entity_id: afterKey } } : {}),
        },
      },
    },
  });

const ids = (prefix: string, count: number, from = 0) =>
  Array.from({ length: count }, (_, i) => `${prefix}${String(from + i).padStart(6, '0')}`);

describe('pagesToRunIndices', () => {
  it('runs every page by default', () => {
    expect(pagesToRunIndices(4)).toEqual([0, 1, 2, 3]);
  });

  it('picks the requested number of pages from the middle of equal shares', () => {
    expect(pagesToRunIndices(10, 3)).toEqual([1, 5, 8]);
  });

  it('runs every page when asked for at least as many as there are', () => {
    expect(pagesToRunIndices(3, 5)).toEqual([0, 1, 2]);
  });
});

describe('samplingProbability', () => {
  it('gives each page the requested samples, sampling alerts', () => {
    expect(
      samplingProbability({
        entities: 800_000,
        alerts: 3_200_000,
        targetPageSize: 8000,
        samplesPerPage: 250,
      })
    ).toBeCloseTo(0.0078125, 10);
  });

  it('stays under the 0.5 random_sampler limit', () => {
    expect(
      samplingProbability({ entities: 100, alerts: 1, targetPageSize: 10, samplesPerPage: 10 })
    ).toBe(0.49);
  });
});

describe('boundsFromSample', () => {
  it('takes every n-th sampled ID, where n samples stand for one page of entities', () => {
    const keys = ids('user:', 100);

    expect(boundsFromSample(keys, 1000, 100)).toEqual(
      [10, 20, 30, 40, 50, 60, 70, 80, 90].map((position) => keys[position - 1])
    );
  });

  it('makes a single page when the entities fit in one', () => {
    expect(boundsFromSample(ids('user:', 10), 8000, 8000)).toEqual([]);
  });

  it('never repeats a bound when there are fewer samples than pages', () => {
    const uppers = boundsFromSample(['user:a', 'user:b'], 100_000, 1000);

    expect(uppers).toEqual(['user:a', 'user:b']);
  });
});

describe('splitPoint', () => {
  const keys = ['user:a', 'user:b', 'user:c', 'user:d', 'user:e'];

  it('splits a page at its middle sampled ID', () => {
    expect(splitPoint(keys, { lower: 'user:a', upper: 'user:e' })).toBe('user:c');
  });

  it('only splits at IDs below the upper bound, so both halves hold entities', () => {
    expect(splitPoint(keys, { upper: 'user:c' })).toBe('user:a');
  });

  it('finds no split when no sampled ID falls strictly inside the page', () => {
    expect(splitPoint(keys, { lower: 'user:b', upper: 'user:c' })).toBeUndefined();
  });

  it('splits the last page, which ends after every ID of the type', () => {
    expect(splitPoint(keys, { lower: 'user:c', upper: typeIdsEnd(EntityType.user) })).toBe(
      'user:d'
    );
  });
});

describe('sampleBasePageBounds', () => {
  const config = { targetPageSize: 10, samplesPerPage: 2 };
  const params = (
    esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>
  ) => ({
    esClient,
    entityType: EntityType.host,
    alertFilters: [{ exists: { field: 'kibana.alert.risk_score' } }],
    alertsIndex: '.alerts-security.alerts-default',
    config,
  });

  it("counts the type's entities with alerts in ES|QL, expanding the stamped IDs to keep the type's", async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockResolvedValueOnce(countResponse(20, 40));
    esClient.search.mockResolvedValueOnce(sampleResponse(ids('host:', 8)));

    const result = await sampleBasePageBounds(params(esClient));

    const [countRequest] = esClient.esql.query.mock.calls[0];
    expect(countRequest.query).toContain('MV_EXPAND kibana.alert.entity.id');
    expect(countRequest.query).toContain('WHERE STARTS_WITH(kibana.alert.entity.id, "host:")');
    expect(countRequest.query).toContain('COUNT_DISTINCT(kibana.alert.entity.id, 40000)');
    expect(countRequest.filter).toEqual({
      bool: {
        filter: [
          { exists: { field: 'kibana.alert.risk_score' } },
          { prefix: { 'kibana.alert.entity.id': 'host:' } },
        ],
      },
    });
    expect(result).toEqual(
      expect.objectContaining({ entities: 20, alerts: 40, probability: 0.1, countTookMs: 7 })
    );
  });

  it('samples once with a fixed seed from the type prefix and derives the page bounds', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const keys = ids('host:', 8);
    esClient.esql.query.mockResolvedValueOnce(countResponse(20, 40));
    esClient.search.mockResolvedValueOnce(sampleResponse(keys));

    const result = await sampleBasePageBounds(params(esClient));

    const [sampleRequest] = esClient.search.mock.calls[0];
    expect(sampleRequest?.aggs?.sample).toEqual({
      random_sampler: { probability: 0.1, seed: 42 },
      aggs: {
        keys: {
          composite: {
            size: 10_000,
            sources: [{ entity_id: { terms: { field: 'kibana.alert.entity.id' } } }],
            after: { entity_id: 'host:' },
          },
        },
      },
    });
    expect(result.sampledKeys).toEqual(keys);
    // 8 samples stand for 20 entities, so every 4th one closes a page of 10.
    expect(result.uppers).toEqual([keys[3]]);
  });

  it('pages through the sample and stops at the first ID of another type', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const firstPage = ids('host:', 10_000);
    const lastHostIds = ids('host:', 3, 10_000);
    esClient.esql.query.mockResolvedValueOnce(countResponse(100_000, 400_000));
    esClient.search
      .mockResolvedValueOnce(sampleResponse(firstPage, firstPage[firstPage.length - 1]))
      .mockResolvedValueOnce(sampleResponse([...lastHostIds, 'user:a'], 'user:a'));

    const result = await sampleBasePageBounds(params(esClient));

    expect(esClient.search).toHaveBeenCalledTimes(2);
    const [secondSampleRequest] = esClient.search.mock.calls[1];
    expect(secondSampleRequest?.aggs?.sample?.aggs?.keys?.composite?.after).toEqual({
      entity_id: firstPage[firstPage.length - 1],
    });
    expect(result.sampledKeys).toEqual([...firstPage, ...lastHostIds]);
    expect(result.sampleRequests).toBe(2);
  });

  it('skips sampling when every entity fits in one page', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockResolvedValueOnce(countResponse(10, 30));

    const result = await sampleBasePageBounds(params(esClient));

    expect(esClient.search).not.toHaveBeenCalled();
    expect(result.uppers).toEqual([]);
  });
});
