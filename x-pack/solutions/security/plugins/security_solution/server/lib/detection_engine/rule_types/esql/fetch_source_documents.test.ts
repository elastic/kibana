/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { estypes } from '@elastic/elasticsearch';
import type { Filter } from '@kbn/es-query';

import { fetchSourceDocuments } from './fetch_source_documents';

const mockEsClient = elasticsearchServiceMock.createElasticsearchClient();

interface SearchBoolQuery {
  filter: estypes.QueryDslQueryContainer[];
  must_not?: estypes.QueryDslQueryContainer[];
}

const getSearchBoolQuery = (): SearchBoolQuery => {
  const searchArgs = mockEsClient.search.mock.calls[0][0] as {
    query: { bool: SearchBoolQuery };
  };
  return searchArgs.query.bool;
};

const rangeFilter = {
  range: {
    '@timestamp': {
      lte: '2025-06-01T00:00:00.000Z',
      gte: '2025-05-01T00:00:00.000Z',
      format: 'strict_date_optional_time',
    },
  },
};

const defaultArgs = {
  isRuleAggregating: false,
  esClient: mockEsClient,
  index: ['test-index'],
  results: [{ _id: 'doc-1' }, { _id: 'doc-2' }],
  hasLoggedRequestsReachedLimit: false,
  runtimeMappings: undefined,
  excludedDocuments: {},
  from: '2025-05-01T00:00:00.000Z',
  to: '2025-06-01T00:00:00.000Z',
  primaryTimestamp: '@timestamp' as const,
  secondaryTimestamp: undefined,
};

describe('fetchSourceDocuments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEsClient.search.mockResolvedValue({ hits: { hits: [] } } as never);
  });

  it('should return empty object for aggregating rules', async () => {
    const result = await fetchSourceDocuments({ ...defaultArgs, isRuleAggregating: true });
    expect(result).toEqual({});
    expect(mockEsClient.search).not.toHaveBeenCalled();
  });

  it('should return empty object when results have no _id', async () => {
    const result = await fetchSourceDocuments({
      ...defaultArgs,
      results: [{ field: 'value' }],
    });
    expect(result).toEqual({});
    expect(mockEsClient.search).not.toHaveBeenCalled();
  });

  it('should include ids, time range filter, and sort in the query', async () => {
    await fetchSourceDocuments(defaultArgs);

    expect(mockEsClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: {
          bool: {
            filter: [{ ids: { values: ['doc-1', 'doc-2'] } }, rangeFilter],
          },
        },
        sort: [{ '@timestamp': { order: 'asc', unmapped_type: 'date' } }],
      })
    );
  });

  it('should include ids and time range filter when filters is empty', async () => {
    await fetchSourceDocuments({ ...defaultArgs, filters: [] });

    expect(mockEsClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: {
          bool: {
            filter: [{ ids: { values: ['doc-1', 'doc-2'] } }, rangeFilter],
          },
        },
      })
    );
  });

  it('should include data tier exclusion filter in the query', async () => {
    const dataTierFilter: Filter = {
      meta: { negate: true },
      query: { terms: { _tier: ['data_cold', 'data_frozen'] } },
    };

    await fetchSourceDocuments({ ...defaultArgs, filters: [dataTierFilter] });

    const { filter } = getSearchBoolQuery();

    expect(filter).toHaveLength(3);
    expect(filter[0]).toEqual({ ids: { values: ['doc-1', 'doc-2'] } });
    expect(filter[1]).toEqual(rangeFilter);
    expect(filter[2]).toEqual({
      bool: {
        must: [],
        filter: [],
        should: [],
        must_not: [{ terms: { _tier: ['data_cold', 'data_frozen'] } }],
      },
    });
  });

  it('should include data stream namespace filter in the query', async () => {
    const namespaceFilter: Filter = {
      meta: { negate: false },
      query: {
        bool: {
          filter: { terms: { 'data_stream.namespace': ['default', 'production'] } },
        },
      },
    };

    await fetchSourceDocuments({ ...defaultArgs, filters: [namespaceFilter] });

    const { filter } = getSearchBoolQuery();

    expect(filter).toHaveLength(3);
    expect(filter[0]).toEqual({ ids: { values: ['doc-1', 'doc-2'] } });
    expect(filter[1]).toEqual(rangeFilter);
    expect(filter[2]).toEqual({
      bool: {
        must: [],
        filter: [
          {
            bool: {
              filter: { terms: { 'data_stream.namespace': ['default', 'production'] } },
            },
          },
        ],
        should: [],
        must_not: [],
      },
    });
  });

  it('should include both data tier and namespace filters in the query', async () => {
    const dataTierFilter: Filter = {
      meta: { negate: true },
      query: { terms: { _tier: ['data_frozen'] } },
    };
    const namespaceFilter: Filter = {
      meta: { negate: false },
      query: {
        bool: {
          filter: { terms: { 'data_stream.namespace': ['default'] } },
        },
      },
    };

    await fetchSourceDocuments({
      ...defaultArgs,
      filters: [dataTierFilter, namespaceFilter],
    });

    const { filter } = getSearchBoolQuery();

    expect(filter).toHaveLength(3);
    expect(filter[0]).toEqual({ ids: { values: ['doc-1', 'doc-2'] } });
    expect(filter[1]).toEqual(rangeFilter);
    expect(filter[2]).toEqual({
      bool: {
        must: [],
        filter: [
          {
            bool: {
              filter: { terms: { 'data_stream.namespace': ['default'] } },
            },
          },
        ],
        should: [],
        must_not: [{ terms: { _tier: ['data_frozen'] } }],
      },
    });
  });

  it('should include excludedDocuments must_not alongside filters', async () => {
    const dataTierFilter: Filter = {
      meta: { negate: true },
      query: { terms: { _tier: ['data_cold'] } },
    };

    await fetchSourceDocuments({
      ...defaultArgs,
      filters: [dataTierFilter],
      excludedDocuments: {
        'test-index': [{ id: 'doc-1', timestamp: '2025-01-01T00:00:00Z' }],
      },
    });

    const boolQuery = getSearchBoolQuery();

    expect(boolQuery.filter).toHaveLength(3);
    expect(boolQuery.must_not).toEqual([
      {
        bool: {
          filter: [{ ids: { values: ['doc-1'] } }, { term: { _index: 'test-index' } }],
        },
      },
    ]);
  });

  it('should use secondary timestamp for range filter and sort when provided', async () => {
    await fetchSourceDocuments({
      ...defaultArgs,
      primaryTimestamp: 'event.ingested',
      secondaryTimestamp: '@timestamp',
    });

    const searchCall = mockEsClient.search.mock.calls[0][0] as {
      query: { bool: SearchBoolQuery };
      sort: estypes.Sort;
    };
    const { filter } = searchCall.query.bool;

    expect(filter).toHaveLength(2);
    expect(filter[1]).toEqual({
      bool: {
        minimum_should_match: 1,
        should: [
          {
            range: {
              'event.ingested': {
                lte: '2025-06-01T00:00:00.000Z',
                gte: '2025-05-01T00:00:00.000Z',
                format: 'strict_date_optional_time',
              },
            },
          },
          {
            bool: {
              filter: [
                {
                  range: {
                    '@timestamp': {
                      lte: '2025-06-01T00:00:00.000Z',
                      gte: '2025-05-01T00:00:00.000Z',
                      format: 'strict_date_optional_time',
                    },
                  },
                },
                {
                  bool: {
                    must_not: {
                      exists: { field: 'event.ingested' },
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    });

    expect(searchCall.sort).toEqual([
      { 'event.ingested': { order: 'asc', unmapped_type: 'date' } },
      { '@timestamp': { order: 'asc', unmapped_type: 'date' } },
    ]);
  });
});
