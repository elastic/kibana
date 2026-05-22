/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import {
  buildAggregations,
  expandRawAggregationResult,
  fetchGranularFacetCounts,
} from './granular_facet_aggregations';

const makeSoClient = (
  aggregations?: Record<string, { buckets: Array<{ key: string; doc_count: number }> }>
): SavedObjectsClientContract => {
  const client = savedObjectsClientMock.create();
  client.search.mockResolvedValue({
    total: 0,
    hits: [],
    aggregations: aggregations ?? {},
  } as unknown as Awaited<ReturnType<SavedObjectsClientContract['search']>>);
  return client;
};

describe('buildAggregations', () => {
  it('maps friendly facet names to ES fields', () => {
    const aggs = buildAggregations({ categories: ['tags', 'enabled'] });

    expect(aggs).toEqual({
      facet_tags: { terms: expect.objectContaining({ field: 'alert.attributes.tags' }) },
      facet_enabled: { terms: expect.objectContaining({ field: 'alert.attributes.enabled' }) },
    });
  });

  it('includes the default size on every terms aggregation', () => {
    const aggs = buildAggregations({ categories: ['tags'] }) as Record<string, unknown>;

    expect((aggs.facet_tags as { terms: { size: number } }).terms.size).toBe(200);
  });
});

describe('expandRawAggregationResult', () => {
  it('flattens buckets into count maps keyed by category', () => {
    const raw = {
      facet_tags: { buckets: [{ key: 'tag1', doc_count: 3 }] },
      facet_enabled: {
        buckets: [
          { key: true, doc_count: 1 },
          { key: false, doc_count: 0 },
        ],
      },
    };

    const counts = expandRawAggregationResult(raw, ['tags', 'enabled']);

    expect(counts).toEqual({
      tags: { tag1: 3 },
      enabled: { true: 1, false: 0 },
    });
  });
});

describe('fetchGranularFacetCounts', () => {
  it('short-circuits to {} and never calls search when ruleIds is empty', async () => {
    const savedObjectsClient = makeSoClient();

    const result = await fetchGranularFacetCounts({
      savedObjectsClient,
      ruleIds: [],
      categories: ['tags'],
    });

    expect(result).toEqual({});
    expect(savedObjectsClient.search).not.toHaveBeenCalled();
  });

  it('short-circuits to {} and never calls search when categories is empty', async () => {
    const savedObjectsClient = makeSoClient();

    const result = await fetchGranularFacetCounts({
      savedObjectsClient,
      ruleIds: ['so-1', 'so-2'],
      categories: [],
    });

    expect(result).toEqual({});
    expect(savedObjectsClient.search).not.toHaveBeenCalled();
  });

  it('issues a single search with terms: { _id } and returns the aggregation result', async () => {
    const savedObjectsClient = makeSoClient({
      facet_tags: {
        buckets: [
          { key: 'tag-a', doc_count: 2 },
          { key: 'tag-b', doc_count: 1 },
        ],
      },
    });

    const result = await fetchGranularFacetCounts({
      savedObjectsClient,
      ruleIds: ['so-1', 'so-2', 'so-3'],
      categories: ['tags'],
    });

    expect(savedObjectsClient.search).toHaveBeenCalledTimes(1);
    const call = (savedObjectsClient.search as jest.Mock).mock.calls[0][0];
    expect(call.query).toEqual({ terms: { _id: ['alert:so-1', 'alert:so-2', 'alert:so-3'] } });
    expect(call.size).toBe(0);
    expect(call.aggs).toBeDefined();

    expect(result).toEqual({
      tags: { 'tag-a': 2, 'tag-b': 1 },
    });
  });

  it('returns {} when the search response has no aggregations', async () => {
    const savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.search.mockResolvedValue({
      total: 0,
      hits: [],
    } as unknown as Awaited<ReturnType<SavedObjectsClientContract['search']>>);

    const result = await fetchGranularFacetCounts({
      savedObjectsClient,
      ruleIds: ['so-1'],
      categories: ['tags'],
    });

    expect(result).toEqual({});
  });
});
