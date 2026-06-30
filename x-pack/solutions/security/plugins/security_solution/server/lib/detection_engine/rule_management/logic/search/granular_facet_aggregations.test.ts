/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import { rulesClientMock } from '@kbn/alerting-plugin/server/mocks';
import {
  buildAggregations,
  expandRawAggregationResult,
  fetchGranularFacetCountsChunked,
} from './granular_facet_aggregations';
import { findRules } from './find_rules';

jest.mock('./find_rules');

const findRulesMock = findRules as jest.MockedFunction<typeof findRules>;

const aggregationsResponse = (
  raw: Record<string, { buckets: Array<{ key: string; doc_count: number }> }>
) =>
  ({
    page: 1,
    perPage: 0,
    total: 0,
    data: [],
    aggregations: raw,
  } as unknown as Awaited<ReturnType<typeof findRules>>);

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

describe('fetchGranularFacetCountsChunked', () => {
  let rulesClient: RulesClient;

  beforeEach(() => {
    rulesClient = rulesClientMock.create() as unknown as RulesClient;
    findRulesMock.mockReset();
  });

  it('short-circuits to {} and never calls findRules when ruleIds is empty', async () => {
    const result = await fetchGranularFacetCountsChunked({
      rulesClient,
      ruleIds: [],
      categories: ['tags'],
    });

    expect(result).toEqual({});
    expect(findRulesMock).not.toHaveBeenCalled();
  });

  it('short-circuits to {} and never calls findRules when categories is empty', async () => {
    const result = await fetchGranularFacetCountsChunked({
      rulesClient,
      ruleIds: ['so-1', 'so-2'],
      categories: [],
    });

    expect(result).toEqual({});
    expect(findRulesMock).not.toHaveBeenCalled();
  });

  it('runs a single chunk when ruleIds.length <= chunkSize and returns the passthrough counts', async () => {
    findRulesMock.mockResolvedValueOnce(
      aggregationsResponse({
        facet_tags: {
          buckets: [
            { key: 'tag-a', doc_count: 2 },
            { key: 'tag-b', doc_count: 1 },
          ],
        },
      })
    );

    const result = await fetchGranularFacetCountsChunked({
      rulesClient,
      ruleIds: ['so-1', 'so-2', 'so-3'],
      categories: ['tags'],
      chunkSize: 1024,
    });

    expect(findRulesMock).toHaveBeenCalledTimes(1);
    const call = findRulesMock.mock.calls[0][0];
    expect(call.ruleIds).toEqual(['so-1', 'so-2', 'so-3']);
    expect(call.perPage).toBe(0);
    expect(call.filter).toBeUndefined();
    expect(call.aggregations).toBeDefined();

    expect(result).toEqual({
      tags: { 'tag-a': 2, 'tag-b': 1 },
    });
  });

  it('chunks the id list and merges per-chunk bucket counts by summing doc_count per (category, key)', async () => {
    findRulesMock
      .mockResolvedValueOnce(
        aggregationsResponse({
          facet_tags: {
            buckets: [
              { key: 'tag-a', doc_count: 1 },
              { key: 'tag-b', doc_count: 1 },
            ],
          },
        })
      )
      .mockResolvedValueOnce(
        aggregationsResponse({
          facet_tags: {
            buckets: [
              { key: 'tag-a', doc_count: 2 },
              { key: 'tag-c', doc_count: 1 },
            ],
          },
        })
      )
      .mockResolvedValueOnce(
        aggregationsResponse({
          facet_tags: {
            buckets: [{ key: 'tag-b', doc_count: 1 }],
          },
        })
      );

    const result = await fetchGranularFacetCountsChunked({
      rulesClient,
      ruleIds: ['so-1', 'so-2', 'so-3', 'so-4', 'so-5'],
      categories: ['tags'],
      chunkSize: 2,
    });

    expect(findRulesMock).toHaveBeenCalledTimes(3);
    expect(findRulesMock.mock.calls[0][0].ruleIds).toEqual(['so-1', 'so-2']);
    expect(findRulesMock.mock.calls[1][0].ruleIds).toEqual(['so-3', 'so-4']);
    expect(findRulesMock.mock.calls[2][0].ruleIds).toEqual(['so-5']);

    expect(result).toEqual({
      tags: {
        'tag-a': 3,
        'tag-b': 2,
        'tag-c': 1,
      },
    });
  });

  it('tolerates a chunk response that is missing aggregations and continues to the next chunk', async () => {
    findRulesMock
      .mockResolvedValueOnce({
        page: 1,
        perPage: 0,
        total: 0,
        data: [],
      } as unknown as Awaited<ReturnType<typeof findRules>>)
      .mockResolvedValueOnce(
        aggregationsResponse({
          facet_tags: { buckets: [{ key: 'tag-z', doc_count: 4 }] },
        })
      );

    const result = await fetchGranularFacetCountsChunked({
      rulesClient,
      ruleIds: ['so-1', 'so-2', 'so-3'],
      categories: ['tags'],
      chunkSize: 2,
    });

    expect(findRulesMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ tags: { 'tag-z': 4 } });
  });
});
